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

    // Verify book exists and belongs to user before attempting insert
    // This provides better error messages than foreign key constraint violations
    try {
      const existingBook = await db
        .select({ id: books.id })
        .from(books)
        .where(and(eq(books.id, bookId), eq(books.userId, user.id)))
        .limit(1)
      
      if (existingBook.length === 0) {
        console.error("Book not found:", { bookId, userId: user.id })
        return NextResponse.json(
          { 
            error: "Book not found",
            message: `The book with ID ${bookId} does not exist or you don't have permission to access it`,
            code: "BOOK_NOT_FOUND"
          },
          { status: 404 }
        )
      }
      console.log("Book verified:", existingBook[0].id)
    } catch (bookCheckError: any) {
      console.error("Error checking book:", bookCheckError)
      // If book check fails, still try the insert - let database handle it
      console.warn("Continuing with insert despite book check error")
    }

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
      // Validate and sanitize all values before insert
      // IMPORTANT: termNormalized column doesn't exist in DB, so we MUST NOT include it
      // Also, kind and isKnown might not exist - we'll try without them first
      const insertValues: any = {
        userId: user.id,
        bookId: String(bookId).trim(),
        term: String(term).trim(),
        translation: String(translation).trim(),
        context: String(finalContext).trim(),
        pageNumber: pageNumber ? Number(pageNumber) : null,
        position: position ? Number(position) : null,
        epubLocation: epubLocation ? String(epubLocation).trim() : null,
      }
      
      // Try to add kind - if column doesn't exist, error handler will catch it
      // But for now, let's try without it to be safe
      // insertValues.kind = String(vocabKind).trim() // Commented out - column might not exist
      
      // DO NOT include termNormalized - column doesn't exist in current DB schema
      
      // Final validation
      if (!insertValues.term || insertValues.term.length === 0) {
        throw new Error("Term cannot be empty")
      }
      if (!insertValues.translation || insertValues.translation.length === 0) {
        throw new Error("Translation cannot be empty")
      }
      if (!insertValues.context || insertValues.context.length === 0) {
        insertValues.context = insertValues.term // Fallback to term if context is still empty
      }
      
      console.log("Inserting vocabulary with values:", {
        ...insertValues,
        context: insertValues.context.substring(0, 100) + (insertValues.context.length > 100 ? "..." : ""), // Truncate for logging
        contextLength: insertValues.context.length
      })
      
      // Use explicit field selection to avoid Drizzle trying to insert schema fields that don't exist in DB
      // This ensures we only insert fields that are actually in the database
      const result = await db
        .insert(vocabulary)
        .values(insertValues as any) // Cast to any to bypass type checking for missing columns
        .returning()
      
      if (!result || result.length === 0) {
        throw new Error("Failed to create vocabulary entry - no data returned from database")
      }
      
      newVocab = result[0]
      console.log("Vocabulary entry created successfully:", newVocab.id)
    } catch (dbError: any) {
      console.error("=== DATABASE INSERT ERROR ===")
      console.error("Error object:", dbError)
      console.error("Error type:", typeof dbError)
      console.error("Error constructor:", dbError?.constructor?.name)
      
      // Postgres-js errors have a specific structure
      // The actual PostgreSQL error might be nested
      let pgError = dbError
      let errorCode: string | undefined
      let errorMessage = dbError?.message || String(dbError)
      let errorDetail: string | undefined
      let errorConstraint: string | undefined
      
      // Check if error has a cause (postgres-js wraps errors)
      if (dbError?.cause) {
        pgError = dbError.cause
        errorCode = pgError?.code
        errorMessage = pgError?.message || errorMessage
        errorDetail = pgError?.detail
        errorConstraint = pgError?.constraint
      }
      
      // Also check direct properties
      if (!errorCode) {
        errorCode = dbError?.code || pgError?.code
      }
      if (!errorDetail) {
        errorDetail = dbError?.detail || pgError?.detail
      }
      if (!errorConstraint) {
        errorConstraint = dbError?.constraint || pgError?.constraint
      }
      
      // Check error message for patterns (postgres-js might not expose code directly)
      if (errorMessage.includes("violates foreign key constraint") || 
          errorMessage.includes("foreign key") ||
          errorMessage.includes("book_id")) {
        errorCode = "23503"
      } else if (errorMessage.includes("violates unique constraint") ||
                 errorMessage.includes("duplicate key")) {
        errorCode = "23505"
      } else if (errorMessage.includes("violates not-null constraint") ||
                 errorMessage.includes("null value")) {
        errorCode = "23502"
      }
      
      console.error("Extracted error info:", {
        code: errorCode,
        message: errorMessage,
        detail: errorDetail,
        constraint: errorConstraint
      })
      
      // Check for specific database errors
      if (errorCode === "23503" || errorMessage.includes("foreign key") || errorMessage.includes("book_id")) {
        // Foreign key constraint violation - book doesn't exist
        console.error("Foreign key violation - book may not exist:", bookId)
        return NextResponse.json(
          { 
            error: "Invalid book reference - the book may have been deleted or doesn't exist",
            message: errorMessage || "Foreign key constraint violation",
            details: errorDetail || `Book ID ${bookId} not found in database. Please refresh the page and try again.`,
            code: "23503"
          },
          { status: 400 }
        )
      }
      if (errorCode === "23505" || errorMessage.includes("unique constraint") || errorMessage.includes("duplicate")) {
        // Unique constraint violation - word already exists
        return NextResponse.json(
          { 
            error: "This word already exists in your vocabulary",
            message: errorMessage || "Unique constraint violation",
            details: errorDetail,
            code: "23505"
          },
          { status: 409 }
        )
      }
      if (errorCode === "23502" || errorMessage.includes("null value") || errorMessage.includes("not-null")) {
        // NOT NULL constraint violation
        return NextResponse.json(
          { 
            error: "Missing required field",
            message: errorMessage || "NOT NULL constraint violation",
            details: errorDetail,
            code: "23502"
          },
          { status: 400 }
        )
      }
      
      // Handle column doesn't exist error (42703)
      if (errorCode === "42703" || errorMessage.includes("does not exist") || errorMessage.includes("column")) {
        // Column doesn't exist - try insert with minimal required fields only
        console.error("Column doesn't exist error - retrying with minimal fields only")
        
        // Build minimal insert with only required fields that definitely exist
        const retryValues: any = {
          userId: user.id,
          bookId: String(bookId).trim(),
          term: String(term).trim(),
          translation: String(translation).trim(),
          context: String(finalContext).trim(),
        }
        
        // Only add optional fields if they might exist
        // Try to add kind if it exists (it was added later)
        try {
          retryValues.kind = String(vocabKind).trim()
        } catch (e) {
          // Ignore if kind doesn't exist
        }
        
        // Add nullable fields
        if (pageNumber) retryValues.pageNumber = Number(pageNumber)
        if (position) retryValues.position = Number(position)
        if (epubLocation) retryValues.epubLocation = String(epubLocation).trim()
        
        try {
          console.log("Retrying insert with minimal fields...")
          const result = await db
            .insert(vocabulary)
            .values(retryValues)
            .returning()
          
          if (result && result.length > 0) {
            newVocab = result[0]
            console.log("Vocabulary entry created successfully (with minimal fields):", newVocab.id)
            // Continue to flashcard creation below
          } else {
            throw new Error("Failed to create vocabulary entry - no data returned")
          }
        } catch (retryError: any) {
          // If retry also fails, return helpful error
          console.error("Retry also failed:", retryError)
          const missingColumn = errorDetail?.match(/column "([^"]+)"/)?.[1] || "unknown column"
          return NextResponse.json(
            { 
              error: "Database schema mismatch",
              message: `The database is missing the column: ${missingColumn}`,
              details: `Please run database migrations to add the missing column. Missing: ${missingColumn}`,
              code: "42703",
              missingColumn: missingColumn
            },
            { status: 500 }
          )
        }
      } else {
        // Re-throw with more context for other errors
        console.error("Unhandled database error - rethrowing")
        throw new Error(`Database error: ${errorMessage} (code: ${errorCode || 'unknown'}, constraint: ${errorConstraint || 'N/A'})`)
      }
    }
    
    // If we got here from the retry, newVocab should be set
    if (!newVocab) {
      throw new Error("Failed to create vocabulary entry")
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

