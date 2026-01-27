import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { vocabulary, flashcards } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: vocabId } = await params

    // Verify the vocabulary item belongs to the user
    const vocabItem = await db
      .select()
      .from(vocabulary)
      .where(and(eq(vocabulary.id, vocabId), eq(vocabulary.userId, user.id)))
      .limit(1)

    if (vocabItem.length === 0) {
      return NextResponse.json({ error: "Vocabulary item not found" }, { status: 404 })
    }

    // Delete associated flashcard first (if exists)
    await db
      .delete(flashcards)
      .where(eq(flashcards.vocabularyId, vocabId))

    // Delete vocabulary item
    await db
      .delete(vocabulary)
      .where(eq(vocabulary.id, vocabId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting vocabulary:", error)
    return NextResponse.json(
      { error: "Failed to delete vocabulary" },
      { status: 500 }
    )
  }
}

