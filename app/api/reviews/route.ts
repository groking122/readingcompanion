import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { flashcards } from "@/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { updateCard } from "@/lib/sm2"
import { sql } from "drizzle-orm"

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
    for (const [id, data] of processedAttempts.entries()) {
      if (now - data.timestamp > IDEMPOTENCY_TTL) {
        processedAttempts.delete(id)
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: ReviewRequest = await request.json()
    const { sessionId, attemptId, sessionStartedAt, items } = body

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
        easeFactor: flashcards.easeFactor,
        interval: flashcards.interval,
        repetitions: flashcards.repetitions,
        dueAt: flashcards.dueAt,
        lastReviewedAt: flashcards.lastReviewedAt,
      })
      .from(flashcards)
      .where(
        and(
          eq(flashcards.userId, user.id),
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

          results.push({
            flashcardId: item.flashcardId,
            success: true,
          })
        }

        // Execute all updates
        await Promise.all(updates)
      })

      // Store attempt for idempotency
      storeAttempt(attemptId, results)

      // Get updated due count
      const dueCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(flashcards)
        .where(
          and(
            eq(flashcards.userId, user.id),
            sql`${flashcards.dueAt} <= NOW()`
          )
        )

      return NextResponse.json({
        success: true,
        results,
        nextDueCount: Number(dueCount[0]?.count || 0),
      })
    } catch (error) {
      console.error("Error in batch update transaction:", error)
      return NextResponse.json(
        {
          error: "Failed to update flashcards",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error processing review batch:", error)
    return NextResponse.json(
      { error: "Failed to process review batch" },
      { status: 500 }
    )
  }
}

