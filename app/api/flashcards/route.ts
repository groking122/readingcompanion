import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { flashcards, vocabulary } from "@/db/schema"
import { eq, and, lte, desc } from "drizzle-orm"
import { updateCard } from "@/lib/sm2"

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
      .orderBy(desc(flashcards.dueAt))
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
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { flashcardId, quality } = body

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

    return NextResponse.json(updatedFlashcard)
  } catch (error) {
    console.error("Error updating flashcard:", error)
    return NextResponse.json(
      { error: "Failed to update flashcard" },
      { status: 500 }
    )
  }
}

