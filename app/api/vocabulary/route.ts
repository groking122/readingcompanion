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
        termNormalized: vocabulary.termNormalized,
        translation: vocabulary.translation,
        context: vocabulary.context,
        kind: vocabulary.kind,
        isKnown: vocabulary.isKnown,
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
    const { term, translation, context, bookId, pageNumber, position, epubLocation, kind } = body

    // Validate required fields
    if (!term || !translation || !bookId) {
      return NextResponse.json(
        { error: "Missing required fields: term, translation, or bookId" },
        { status: 400 }
      )
    }

    // Use term as context fallback if context is missing
    const finalContext = (context && context.trim().length > 0) ? context.trim() : term.trim()

    // Normalize term for caching (lowercase, trim, collapse whitespace)
    const termNormalized = term.trim().toLowerCase().replace(/\s+/g, " ")
    
    // Determine kind if not provided (phrase = 2-6 words)
    const wordCount = termNormalized.split(/\s+/).filter((w: string) => w.length > 0).length
    const vocabKind = kind || (wordCount >= 2 && wordCount <= 6 ? "phrase" : "word")

    // Create vocabulary entry
    const [newVocab] = await db
      .insert(vocabulary)
      .values({
        userId: user.id,
        bookId,
        term: term.trim(),
        termNormalized,
        translation: translation.trim(),
        context: finalContext,
        kind: vocabKind,
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

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, term, termNormalized, isKnown } = body

    // If term is provided, mark it as known (for "mark as known" without saving)
    if (term && termNormalized && typeof isKnown === "boolean") {
      // Check if vocabulary entry exists with this normalized term
      const existing = await db
        .select()
        .from(vocabulary)
        .where(and(
          eq(vocabulary.termNormalized, termNormalized),
          eq(vocabulary.userId, user.id)
        ))
        .limit(1)

      if (existing.length > 0) {
        // Update existing entry
        const [updated] = await db
          .update(vocabulary)
          .set({ isKnown })
          .where(and(
            eq(vocabulary.id, existing[0].id),
            eq(vocabulary.userId, user.id)
          ))
          .returning()
        return NextResponse.json(updated)
      } else {
        // Just return success - we'll filter by known list in translation
        return NextResponse.json({ success: true, markedAsKnown: true })
      }
    }

    // Otherwise, update by ID
    if (!id || typeof isKnown !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields: id and isKnown, or term/termNormalized and isKnown" },
        { status: 400 }
      )
    }

    // Update vocabulary entry by ID
    const [updatedVocab] = await db
      .update(vocabulary)
      .set({ isKnown })
      .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, user.id)))
      .returning()

    if (!updatedVocab) {
      return NextResponse.json(
        { error: "Vocabulary not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(updatedVocab)
  } catch (error) {
    console.error("Error updating vocabulary:", error)
    return NextResponse.json(
      { error: "Failed to update vocabulary" },
      { status: 500 }
    )
  }
}

