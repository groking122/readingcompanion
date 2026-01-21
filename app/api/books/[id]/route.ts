import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { books, vocabulary, flashcards } from "@/db/schema"
import { eq, inArray } from "drizzle-orm"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bookId = params.id

    if (!bookId) {
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      )
    }

    // Verify the book belongs to the user
    const [book] = await db
      .select()
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1)

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    if (book.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete associated flashcards first (they reference vocabulary)
    const vocabItems = await db
      .select({ id: vocabulary.id })
      .from(vocabulary)
      .where(eq(vocabulary.bookId, bookId))

    const vocabIds = vocabItems.map((v) => v.id)
    if (vocabIds.length > 0) {
      await db.delete(flashcards).where(inArray(flashcards.vocabularyId, vocabIds))
    }

    // Delete associated vocabulary
    await db.delete(vocabulary).where(eq(vocabulary.bookId, bookId))

    // Delete the book
    await db.delete(books).where(eq(books.id, bookId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting book:", error)
    return NextResponse.json(
      { error: "Failed to delete book" },
      { status: 500 }
    )
  }
}






