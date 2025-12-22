import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { vocabulary, flashcards, books } from "@/db/schema"
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
    console.log("POST /api/vocabulary - Request body:", JSON.stringify(body, null, 2))
    
    const { term, translation, context, bookId, pageNumber, position, epubLocation, kind } = body

    // Validate required fields
    if (!term || !translation || !bookId) {
      console.error("Missing required fields:", { term: !!term, translation: !!translation, bookId: !!bookId })
      return NextResponse.json(
        { error: "Missing required fields: term, translation, or bookId" },
        { status: 400 }
      )
    }

    // Validate bookId format (should be UUID) - but don't fail if it's not, just log
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(bookId)) {
      console.warn("BookId doesn't match UUID format, but continuing:", bookId)
      // Don't fail - some IDs might be in different format
    }

    // Skip book existence check - let database foreign key constraint handle it
    // This avoids potential connection/query errors that could mask the real issue

    // Use term as context fallback if context is missing
    const finalContext = (context && context.trim().length > 0) ? context.trim() : term.trim()

    // Normalize term for caching (lowercase, trim, collapse whitespace)
    const termNormalized = term.trim().toLowerCase().replace(/\s+/g, " ")
    
    // Determine kind if not provided (phrase = 2-6 words)
    const wordCount = termNormalized.split(/\s+/).filter((w: string) => w.length > 0).length
    const vocabKind = kind || (wordCount >= 2 && wordCount <= 6 ? "phrase" : "word")

    console.log("Creating vocabulary entry:", {
      userId: user.id,
      bookId,
      term: term.trim(),
      translation: translation.trim(),
      kind: vocabKind
    })

    // Create vocabulary entry
    let newVocab
    try {
      const insertValues = {
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
      }
      
      console.log("Inserting vocabulary with values:", JSON.stringify(insertValues, null, 2))
      
      const result = await db
        .insert(vocabulary)
        .values(insertValues)
        .returning()
      
      if (!result || result.length === 0) {
        throw new Error("Failed to create vocabulary entry - no data returned from database")
      }
      
      newVocab = result[0]
      console.log("Vocabulary entry created successfully:", newVocab.id)
    } catch (dbError: any) {
      console.error("Database error creating vocabulary:", dbError)
      console.error("Error code:", dbError?.code)
      console.error("Error constraint:", dbError?.constraint)
      console.error("Error detail:", dbError?.detail)
      console.error("Error message:", dbError?.message)
      
      // Check for specific database errors
      if (dbError?.code === "23503") {
        return NextResponse.json(
          { 
            error: "Invalid book reference - book may not exist",
            message: dbError?.message || "Foreign key constraint violation",
            details: dbError?.detail
          },
          { status: 400 }
        )
      }
      if (dbError?.code === "23505") {
        return NextResponse.json(
          { 
            error: "This word already exists in your vocabulary",
            message: dbError?.message || "Unique constraint violation",
            details: dbError?.detail
          },
          { status: 409 }
        )
      }
      // Re-throw with more context
      throw new Error(`Database error: ${dbError?.message || String(dbError)} (code: ${dbError?.code || 'unknown'})`)
    }

    // Create flashcard with SM-2 defaults
    try {
      const sm2Card = createNewCard()
      await db.insert(flashcards).values({
        vocabularyId: newVocab.id,
        userId: user.id,
        easeFactor: sm2Card.easeFactor,
        interval: sm2Card.interval,
        repetitions: sm2Card.repetitions,
        dueAt: sm2Card.dueAt,
      })
      console.log("Flashcard created for vocabulary:", newVocab.id)
    } catch (flashcardError: any) {
      console.error("Error creating flashcard:", flashcardError)
      // Don't fail the whole request if flashcard creation fails
      // The vocabulary is already saved
    }

    // Return the created vocabulary (already includes id)
    return NextResponse.json(newVocab)
  } catch (error: any) {
    console.error("=== ERROR SAVING VOCABULARY ===")
    console.error("Error type:", typeof error)
    console.error("Error constructor:", error?.constructor?.name)
    console.error("Error message:", error?.message)
    console.error("Error code:", error?.code)
    console.error("Error constraint:", error?.constraint)
    console.error("Error detail:", error?.detail)
    console.error("Error stack:", error?.stack)
    
    // Try to extract more details
    const errorMessage = error?.message || String(error) || "Unknown error"
    const errorCode = error?.code || error?.errno || "UNKNOWN"
    const errorConstraint = error?.constraint || "N/A"
    const errorDetail = error?.detail || error?.hint || "No additional details"
    
    // Log full error object
    try {
      console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    } catch (e) {
      console.error("Could not stringify error:", e)
    }
    
    // Return detailed error - always include message for debugging
    const responseBody = {
      error: "Failed to save vocabulary",
      message: errorMessage,
      code: errorCode,
      constraint: errorConstraint,
      detail: errorDetail,
      // Include stack in development
      ...(process.env.NODE_ENV === "development" && { stack: error?.stack })
    }
    
    console.error("Returning error response:", JSON.stringify(responseBody, null, 2))
    
    return NextResponse.json(responseBody, { status: 500 })
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

