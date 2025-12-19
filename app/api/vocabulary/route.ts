import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { vocabulary, flashcards } from "@/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { createNewCard } from "@/lib/sm2"

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const bookId = searchParams.get("bookId")

    const conditions = bookId
      ? and(eq(vocabulary.userId, user.id), eq(vocabulary.bookId, bookId))
      : eq(vocabulary.userId, user.id)

    // Get vocabulary with flashcard info
    const vocab = await db
      .select({
        id: vocabulary.id,
        term: vocabulary.term,
        translation: vocabulary.translation,
        context: vocabulary.context,
        bookId: vocabulary.bookId,
        pageNumber: vocabulary.pageNumber,
        position: vocabulary.position,
        epubLocation: vocabulary.epubLocation,
        createdAt: vocabulary.createdAt,
        flashcard: flashcards,
      })
      .from(vocabulary)
      .leftJoin(flashcards, eq(vocabulary.id, flashcards.vocabularyId))
      .where(conditions)
      .orderBy(desc(vocabulary.createdAt))
    
    return NextResponse.json(vocab)
  } catch (error) {
    console.error("Error fetching vocabulary:", error)
    return NextResponse.json(
      { error: "Failed to fetch vocabulary" },
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
    const { term, translation, context, bookId, pageNumber, position, epubLocation } = body

    if (!term || !translation || !context || !bookId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Create vocabulary entry
    const [newVocab] = await db
      .insert(vocabulary)
      .values({
        userId: user.id,
        bookId,
        term,
        translation,
        context,
        pageNumber: pageNumber || null,
        position: position || null,
        epubLocation: epubLocation || null,
      })
      .returning()

    // Create flashcard with SM-2 defaults
    const sm2Card = createNewCard()
    await db.insert(flashcards).values({
      vocabularyId: newVocab.id,
      userId: user.id,
      easeFactor: sm2Card.easeFactor,
      interval: sm2Card.interval,
      repetitions: sm2Card.repetitions,
      dueAt: sm2Card.dueAt,
    })

    // Return the created vocabulary (already includes id)
    return NextResponse.json(newVocab)
  } catch (error) {
    console.error("Error saving vocabulary:", error)
    return NextResponse.json(
      { error: "Failed to save vocabulary" },
      { status: 500 }
    )
  }
}

