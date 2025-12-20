import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { bookmarks } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const bookId = searchParams.get("bookId")

    const conditions = bookId
      ? and(eq(bookmarks.userId, user.id), eq(bookmarks.bookId, bookId))
      : eq(bookmarks.userId, user.id)

    const result = await db
      .select()
      .from(bookmarks)
      .where(conditions)
      .orderBy(bookmarks.createdAt)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching bookmarks:", error)
    return NextResponse.json(
      { error: "Failed to fetch bookmarks" },
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
    const { bookId, title, epubLocation, pageNumber, position } = body

    if (!bookId) {
      return NextResponse.json(
        { error: "Missing required field: bookId" },
        { status: 400 }
      )
    }

    const [newBookmark] = await db
      .insert(bookmarks)
      .values({
        userId: user.id,
        bookId,
        title: title || null,
        epubLocation: epubLocation || null,
        pageNumber: pageNumber || null,
        position: position || null,
      })
      .returning()

    return NextResponse.json(newBookmark)
  } catch (error) {
    console.error("Error creating bookmark:", error)
    return NextResponse.json(
      { error: "Failed to create bookmark" },
      { status: 500 }
    )
  }
}

