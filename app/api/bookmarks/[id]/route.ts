import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { bookmarks } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bookmarkId = params.id

    const [deleted] = await db
      .delete(bookmarks)
      .where(and(
        eq(bookmarks.id, bookmarkId),
        eq(bookmarks.userId, user.id)
      ))
      .returning()

    if (!deleted) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting bookmark:", error)
    return NextResponse.json(
      { error: "Failed to delete bookmark" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bookmarkId = params.id
    const body = await request.json()
    const { title } = body

    const [updated] = await db
      .update(bookmarks)
      .set({ title: title || null })
      .where(and(
        eq(bookmarks.id, bookmarkId),
        eq(bookmarks.userId, user.id)
      ))
      .returning()

    if (!updated) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating bookmark:", error)
    return NextResponse.json(
      { error: "Failed to update bookmark" },
      { status: 500 }
    )
  }
}

