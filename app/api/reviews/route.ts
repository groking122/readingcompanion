import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { flashcards, reviewAttempts } from "@/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { updateCard } from "@/lib/sm2"
import { sql } from "drizzle-orm"
import { trackMetric, logError, logWarning } from "@/lib/metrics"

interface ReviewItem {
  flashcardId: string
  quality: number
  responseMs?: number
  exerciseType?: string
}

interface ReviewRequest {
  sessionId: string
  attemptId: string
  sessionStartedAt: string // ISO timestamp
  items: ReviewItem[]
}

// In-memory idempotency store (in production, use Redis or database table)
const processedAttempts = new Map<string, { timestamp: number; results: any[] }>()
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000 // 24 hours

function isAttemptProcessed(attemptId: string): boolean {
  const stored = processedAttempts.get(attemptId)
  if (!stored) return false
  
  // Check if still within TTL
  if (Date.now() - stored.timestamp > IDEMPOTENCY_TTL) {
    processedAttempts.delete(attemptId)
    return false
  }
  
  return true
}

function storeAttempt(attemptId: string, results: any[]) {
  processedAttempts.set(attemptId, { timestamp: Date.now(), results })
  
  // Clean up old entries periodically
  if (processedAttempts.size > 1000) {
    const now = Date.now()
    // Convert iterator to array for ES5 compatibility
    for (const [id, data] of Array.from(processedAttempts.entries())) {
      if (now - data.timestamp > IDEMPOTENCY_TTL) {
        processedAttempts.delete(id)
      }
    }
  }
}

export async function POST(request: NextRequest) {
  let user: Awaited<ReturnType<typeof currentUser>> = null
  let sessionId: string | undefined
  let attemptId: string | undefined
  
  try {
    user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Create const reference for TypeScript type narrowing
    const authenticatedUser = user

    const body: ReviewRequest = await request.json()
    const { sessionId: extractedSessionId, attemptId: extractedAttemptId, sessionStartedAt, items } = body
    sessionId = extractedSessionId
    attemptId = extractedAttemptId

    // Validate request
    if (!attemptId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "attemptId and items array are required" },
        { status: 400 }
      )
    }

    // Check idempotency
    if (isAttemptProcessed(attemptId)) {
      const stored = processedAttempts.get(attemptId)!
      return NextResponse.json({
        success: true,
        idempotent: true,
        results: stored.results,
      })
    }

    // Validate all flashcard IDs belong to user
    const flashcardIds = items.map(item => item.flashcardId)
    const userFlashcards = await db
      .select({
        id: flashcards.id,
        vocabularyId: flashcards.vocabularyId,
        easeFactor: flashcards.easeFactor,
        interval: flashcards.interval,
        repetitions: flashcards.repetitions,
        dueAt: flashcards.dueAt,
        lastReviewedAt: flashcards.lastReviewedAt,
      })
      .from(flashcards)
      .where(
        and(
          eq(flashcards.userId, authenticatedUser.id),
          inArray(flashcards.id, flashcardIds)
        )
      )

    // Check for concurrency conflicts
    const sessionStartTime = new Date(sessionStartedAt)
    const conflicts: string[] = []
    
    for (const flashcard of userFlashcards) {
      if (flashcard.lastReviewedAt && flashcard.lastReviewedAt > sessionStartTime) {
        conflicts.push(flashcard.id)
      }
    }

    if (conflicts.length > 0) {
      trackMetric("session_conflict", {
        userId: authenticatedUser.id,
        sessionId,
        metadata: { conflictCount: conflicts.length },
      })
      logWarning("Session conflict detected", {
        userId: authenticatedUser.id,
        sessionId,
        attemptId,
        endpoint: "/api/reviews",
        metadata: { conflicts },
      })
      
      return NextResponse.json(
        {
          error: "Session out of sync",
          message: "Some flashcards were updated by another session",
          conflicts,
        },
        { status: 409 }
      )
    }

    // Verify we have all flashcards
    const foundIds = new Set(userFlashcards.map(fc => fc.id))
    const missingIds = flashcardIds.filter(id => !foundIds.has(id))
    
    if (missingIds.length > 0) {
      return NextResponse.json(
        {
          error: "Some flashcards not found",
          missingIds,
        },
        { status: 404 }
      )
    }

    // Create a map for quick lookup
    const flashcardMap = new Map(
      userFlashcards.map(fc => [fc.id, fc])
    )

    // Process all updates in a transaction
    const results: Array<{ flashcardId: string; success: boolean; error?: string }> = []
    
    try {
      // Use drizzle transaction
      await db.transaction(async (tx) => {
        const updates: Promise<any>[] = []
        const attemptLogs: Array<{
          flashcardId: string
          vocabularyId: string
          oldState: { easeFactor: number; interval: number; repetitions: number }
          newState: { easeFactor: number; interval: number; repetitions: number }
          quality: number
          responseMs?: number
          exerciseType?: string
        }> = []
        
        for (const item of items) {
          const flashcard = flashcardMap.get(item.flashcardId)
          if (!flashcard) {
            results.push({
              flashcardId: item.flashcardId,
              success: false,
              error: "Flashcard not found",
            })
            continue
          }

          // Store old state for logging
          const oldState = {
            easeFactor: flashcard.easeFactor,
            interval: flashcard.interval,
            repetitions: flashcard.repetitions,
          }

          // Update using SM-2 algorithm
          const updated = updateCard(
            {
              easeFactor: flashcard.easeFactor,
              interval: flashcard.interval,
              repetitions: flashcard.repetitions,
              dueAt: flashcard.dueAt,
            },
            item.quality
          )

          // Queue update
          updates.push(
            tx
              .update(flashcards)
              .set({
                easeFactor: updated.easeFactor,
                interval: updated.interval,
                repetitions: updated.repetitions,
                dueAt: updated.dueAt,
                lastReviewedAt: new Date(),
              })
              .where(eq(flashcards.id, item.flashcardId))
              .returning()
          )

          // Store attempt data for logging
          attemptLogs.push({
            flashcardId: item.flashcardId,
            vocabularyId: flashcard.vocabularyId,
            oldState,
            newState: {
              easeFactor: updated.easeFactor,
              interval: updated.interval,
              repetitions: updated.repetitions,
            },
            quality: item.quality,
            responseMs: item.responseMs,
            exerciseType: item.exerciseType,
          })

          results.push({
            flashcardId: item.flashcardId,
            success: true,
          })
        }

        // Execute all updates
        await Promise.all(updates)

        // Log attempts to review_attempts table (non-blocking, don't fail if logging fails)
        try {
          const logPromises = attemptLogs.map(async (log) => {
            // Create unique attempt ID for each item in batch
            const itemAttemptId = `${attemptId}-${log.flashcardId}`
            
            try {
              await tx.insert(reviewAttempts).values({
                userId: authenticatedUser.id,
                flashcardId: log.flashcardId,
                vocabularyId: log.vocabularyId,
                sessionId: sessionId,
                attemptId: itemAttemptId,
                quality: log.quality,
                responseMs: log.responseMs,
                exerciseType: log.exerciseType,
                oldEaseFactor: log.oldState.easeFactor,
                newEaseFactor: log.newState.easeFactor,
                oldInterval: log.oldState.interval,
                newInterval: log.newState.interval,
                oldRepetitions: log.oldState.repetitions,
                newRepetitions: log.newState.repetitions,
              })
            } catch (insertError: any) {
              // Ignore unique constraint violations (idempotency - attempt already logged)
              if (insertError?.code === "23505" || insertError?.message?.includes("unique constraint")) {
                // Attempt already logged, ignore
                return
              }
              // Re-throw other errors
              throw insertError
            }
          })
          
          await Promise.all(logPromises)
          
          // Track successful logging
          trackMetric("review_attempt_logged", {
            userId: authenticatedUser.id,
            sessionId,
            attemptId,
            metadata: { count: attemptLogs.length },
          })
        } catch (err) {
          // Log error but don't fail the review update
          logError("Error logging review attempts", err, {
            userId: authenticatedUser.id,
            sessionId,
            attemptId,
            endpoint: "/api/reviews",
            metadata: { attemptCount: attemptLogs.length },
          })
        }
      })

      // Store attempt for idempotency
      storeAttempt(attemptId, results)

      // Get updated due count
      const dueCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(flashcards)
        .where(
          and(
            eq(flashcards.userId, authenticatedUser.id),
            sql`${flashcards.dueAt} <= NOW()`
          )
        )

      return NextResponse.json({
        success: true,
        results,
        nextDueCount: Number(dueCount[0]?.count || 0),
      })
    } catch (error) {
      trackMetric("attempt_submit_fail", {
        userId: authenticatedUser.id,
        sessionId,
        attemptId,
        metadata: { itemCount: items.length },
      })
      logError("Error in batch update transaction", error, {
        userId: authenticatedUser.id,
        sessionId,
        attemptId,
        endpoint: "/api/reviews",
        metadata: { itemCount: items.length },
      })
      
      return NextResponse.json(
        {
          error: "Failed to update flashcards",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      )
    }
  } catch (error) {
    trackMetric("attempt_submit_fail", {
      userId: user?.id,
      sessionId,
      attemptId,
    })
    logError("Error processing review batch", error, {
      userId: user?.id,
      sessionId,
      attemptId,
      endpoint: "/api/reviews",
    })
    
    return NextResponse.json(
      { error: "Failed to process review batch" },
      { status: 500 }
    )
  }
}

