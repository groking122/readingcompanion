import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { flashcards, vocabulary, reviewAttempts } from "@/db/schema"
import { eq, and, lte, asc, desc, isNotNull, inArray, sql } from "drizzle-orm"
import { updateCard } from "@/lib/sm2"
import { trackMetric, logError, logWarning } from "@/lib/metrics"

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const due = searchParams.get("due") === "true"

    const conditions = due
      ? and(
          eq(flashcards.userId, user.id),
          lte(flashcards.dueAt, new Date())
        )
      : eq(flashcards.userId, user.id)

    const results = await db
      .select({
        flashcard: flashcards,
        vocabulary: vocabulary,
      })
      .from(flashcards)
      .innerJoin(vocabulary, eq(flashcards.vocabularyId, vocabulary.id))
      .where(conditions)
      .orderBy(asc(flashcards.dueAt), asc(flashcards.lastReviewedAt))
    return NextResponse.json(results)
  } catch (error) {
    console.error("Error fetching flashcards:", error)
    return NextResponse.json(
      { error: "Failed to fetch flashcards" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  let sessionStartedAt: string | undefined
  let flashcardId: string | undefined
  
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = body as { flashcardId?: string; quality?: number; sessionStartedAt?: string; exerciseType?: string; responseMs?: number }
    flashcardId = parsed.flashcardId
    sessionStartedAt = parsed.sessionStartedAt
    const { quality, exerciseType, responseMs } = parsed

    if (!flashcardId || quality === undefined) {
      return NextResponse.json(
        { error: "flashcardId and quality are required" },
        { status: 400 }
      )
    }

    // Get current flashcard
    const [currentFlashcard] = await db
      .select()
      .from(flashcards)
      .where(
        and(eq(flashcards.id, flashcardId), eq(flashcards.userId, user.id))
      )
      .limit(1)

    if (!currentFlashcard) {
      return NextResponse.json(
        { error: "Flashcard not found" },
        { status: 404 }
      )
    }

    // Check for concurrency conflicts if sessionStartedAt is provided
    if (sessionStartedAt) {
      const sessionStartTime = new Date(sessionStartedAt)
      if (
        currentFlashcard.lastReviewedAt &&
        currentFlashcard.lastReviewedAt > sessionStartTime
      ) {
        const sessionId = `session-${sessionStartedAt}`
        trackMetric("session_conflict", {
          userId: user.id,
          sessionId,
          metadata: { flashcardId },
        })
        logWarning("Session conflict detected", {
          userId: user.id,
          sessionId,
          endpoint: "/api/flashcards",
          metadata: { flashcardId },
        })
        
        return NextResponse.json(
          {
            error: "Session out of sync",
            message: "Flashcard was updated by another session",
          },
          { status: 409 }
        )
      }
    }

    // Update using SM-2 algorithm
    const updated = updateCard(
      {
        easeFactor: currentFlashcard.easeFactor,
        interval: currentFlashcard.interval,
        repetitions: currentFlashcard.repetitions,
        dueAt: currentFlashcard.dueAt,
      },
      quality
    )

    // Store old state for logging
    const oldState = {
      easeFactor: currentFlashcard.easeFactor,
      interval: currentFlashcard.interval,
      repetitions: currentFlashcard.repetitions,
    }

    // Update database
    const [updatedFlashcard] = await db
      .update(flashcards)
      .set({
        easeFactor: updated.easeFactor,
        interval: updated.interval,
        repetitions: updated.repetitions,
        dueAt: updated.dueAt,
        lastReviewedAt: new Date(),
      })
      .where(eq(flashcards.id, flashcardId))
      .returning()

    // Log attempt to review_attempts table (non-blocking, don't fail if logging fails)
    const sessionId = sessionStartedAt ? `session-${sessionStartedAt}` : undefined
    const attemptId = `single-${flashcardId}-${Date.now()}`
    
    try {
      await db.insert(reviewAttempts).values({
        userId: user.id,
        flashcardId: flashcardId,
        vocabularyId: currentFlashcard.vocabularyId,
        sessionId: sessionId,
        attemptId: attemptId,
        quality: quality,
        responseMs: responseMs,
        exerciseType: exerciseType,
        oldEaseFactor: oldState.easeFactor,
        newEaseFactor: updated.easeFactor,
        oldInterval: oldState.interval,
        newInterval: updated.interval,
        oldRepetitions: oldState.repetitions,
        newRepetitions: updated.repetitions,
      })
      
      trackMetric("review_attempt_logged", {
        userId: user.id,
        sessionId,
        attemptId,
      })
    } catch (logError: any) {
      // Ignore unique constraint violations (idempotency - attempt already logged)
      if (logError?.code !== "23505" && !logError?.message?.includes("unique constraint")) {
        logError("Error logging review attempt", logError, {
          userId: user.id,
          sessionId,
          attemptId,
          endpoint: "/api/flashcards",
          metadata: { flashcardId },
        })
      }
    }

    return NextResponse.json(updatedFlashcard)
  } catch (error) {
    // Get user for error logging (may not be available if auth failed earlier)
    const errorUser = await currentUser().catch(() => null)
    
    trackMetric("attempt_submit_fail", {
      userId: errorUser?.id,
      sessionId: sessionStartedAt ? `session-${sessionStartedAt}` : undefined,
      metadata: { flashcardId },
    })
    logError("Error updating flashcard", error, {
      userId: errorUser?.id,
      sessionId: sessionStartedAt ? `session-${sessionStartedAt}` : undefined,
      endpoint: "/api/flashcards",
      metadata: { flashcardId },
    })
    
    return NextResponse.json(
      { error: "Failed to update flashcard" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { flashcardId, vocabularyId } = body as { flashcardId?: string; vocabularyId?: string }

    if (!flashcardId && !vocabularyId) {
      return NextResponse.json(
        { error: "flashcardId or vocabularyId is required" },
        { status: 400 }
      )
    }

    // Find flashcard by ID or vocabularyId
    let flashcard
    if (flashcardId) {
      const [found] = await db
        .select()
        .from(flashcards)
        .where(
          and(eq(flashcards.id, flashcardId), eq(flashcards.userId, user.id))
        )
        .limit(1)
      
      if (!found) {
        return NextResponse.json(
          { error: "Flashcard not found" },
          { status: 404 }
        )
      }
      flashcard = found
    } else if (vocabularyId) {
      const [found] = await db
        .select()
        .from(flashcards)
        .where(
          and(
            eq(flashcards.vocabularyId, vocabularyId),
            eq(flashcards.userId, user.id)
          )
        )
        .limit(1)
      
      if (!found) {
        return NextResponse.json(
          { error: "Flashcard not found for this vocabulary" },
          { status: 404 }
        )
      }
      flashcard = found
    }

    if (!flashcard) {
      return NextResponse.json(
        { error: "Flashcard not found" },
        { status: 404 }
      )
    }

    // Reset dueAt to now (make it due immediately)
    const now = new Date()
    const [updatedFlashcard] = await db
      .update(flashcards)
      .set({
        dueAt: now,
      })
      .where(eq(flashcards.id, flashcard.id))
      .returning()

    trackMetric("flashcard_reset", {
      userId: user.id,
      metadata: {
        flashcardId: flashcard.id,
        vocabularyId: flashcard.vocabularyId,
      },
    })

    return NextResponse.json({
      success: true,
      flashcard: updatedFlashcard,
    })
  } catch (error) {
    const errorUser = await currentUser().catch(() => null)
    
    logError("Error resetting flashcard", error, {
      userId: errorUser?.id,
      endpoint: "/api/flashcards",
    })
    
    return NextResponse.json(
      { error: "Failed to reset flashcard" },
      { status: 500 }
    )
  }
}

// Bulk reset recently reviewed flashcards
export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { count } = body as { count?: number }

    // Get total count of reviewed flashcards
    const totalReviewed = await db
      .select({ count: sql<number>`count(*)` })
      .from(flashcards)
      .where(
        and(
          eq(flashcards.userId, user.id),
          isNotNull(flashcards.lastReviewedAt)
        )
      )

    const totalCount = Number(totalReviewed[0]?.count || 0)

    // Smart default: reset 50 words, or all if user has fewer than 50
    // If user has many words, reset up to 50 (good practice session size)
    // If user has fewer than 50, reset all of them
    const resetCount = count ?? Math.min(50, totalCount)

    // Get recently reviewed flashcards (most recently reviewed first)
    const recentlyReviewed = await db
      .select({
        id: flashcards.id,
        vocabularyId: flashcards.vocabularyId,
        lastReviewedAt: flashcards.lastReviewedAt,
      })
      .from(flashcards)
      .where(
        and(
          eq(flashcards.userId, user.id),
          isNotNull(flashcards.lastReviewedAt)
        )
      )
      .orderBy(desc(flashcards.lastReviewedAt))
      .limit(resetCount)

    if (recentlyReviewed.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No recently reviewed flashcards found",
        resetCount: 0,
      })
    }

    // Reset all of them to be due now
    const now = new Date()
    const flashcardIds = recentlyReviewed.map(fc => fc.id)
    
    await db
      .update(flashcards)
      .set({
        dueAt: now,
      })
      .where(
        and(
          eq(flashcards.userId, user.id),
          inArray(flashcards.id, flashcardIds)
        )
      )

    trackMetric("flashcard_bulk_reset", {
      userId: user.id,
      metadata: {
        resetCount: recentlyReviewed.length,
      },
    })

    return NextResponse.json({
      success: true,
      resetCount: recentlyReviewed.length,
      message: `Reset ${recentlyReviewed.length} flashcards to be due now`,
    })
  } catch (error) {
    const errorUser = await currentUser().catch(() => null)
    
    logError("Error bulk resetting flashcards", error, {
      userId: errorUser?.id,
      endpoint: "/api/flashcards",
    })
    
    return NextResponse.json(
      { error: "Failed to reset flashcards" },
      { status: 500 }
    )
  }
}

