import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { bookmarks } from "@/db/schema"
import { eq, and, desc } from "drizzle-orm"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const bookId = searchParams.get("bookId")

    // Build conditions properly
    let conditions
    if (bookId) {
      conditions = and(
        eq(bookmarks.userId, user.id),
        eq(bookmarks.bookId, bookId)
      )
    } else {
      conditions = eq(bookmarks.userId, user.id)
    }

    const result = await db
      .select()
      .from(bookmarks)
      .where(conditions)
      .orderBy(desc(bookmarks.createdAt))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error fetching bookmarks:", error)
    const errorMessage = error?.message || "Unknown error"
    const errorCode = error?.code || "UNKNOWN"
    console.error("Bookmark fetch error details:", { errorMessage, errorCode, error })
    return NextResponse.json(
      { 
        error: "Failed to fetch bookmarks",
        message: errorMessage,
        code: errorCode
      },
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

    // Prepare values - explicitly set all optional fields to null if empty/undefined
    // This ensures Drizzle inserts NULL instead of empty strings
    // Only include fields that have valid values to avoid sending undefined
    const bookmarkValues: any = {
      userId: user.id,
      bookId,
    }
    
    // Only add optional fields if they have valid values
    if (title && typeof title === 'string' && title.trim()) {
      bookmarkValues.title = title.trim()
    }
    
    if (epubLocation && typeof epubLocation === 'string' && epubLocation.trim()) {
      bookmarkValues.epubLocation = epubLocation.trim()
    }
    
    if (pageNumber !== undefined && pageNumber !== null && pageNumber !== '' && !isNaN(Number(pageNumber))) {
      const pageNum = Number(pageNumber)
      if (pageNum > 0) {
        bookmarkValues.pageNumber = pageNum
      }
    }
    
    if (position !== undefined && position !== null && position !== '' && !isNaN(Number(position))) {
      const pos = Number(position)
      if (pos > 0) {
        bookmarkValues.position = pos
      }
    }
    
    // Ensure we have at least one location identifier
    if (!bookmarkValues.epubLocation && !bookmarkValues.pageNumber && !bookmarkValues.position) {
      return NextResponse.json(
        { error: "Missing location data", message: "At least one location identifier (epubLocation, pageNumber, or position) is required" },
        { status: 400 }
      )
    }

    const [newBookmark] = await db
      .insert(bookmarks)
      .values(bookmarkValues)
      .returning()

    return NextResponse.json(newBookmark)
  } catch (error: any) {
    console.error("Error creating bookmark:", error)
    const errorMessage = error?.message || "Unknown error"
    const errorCode = error?.code || "UNKNOWN"
    
    // Check for foreign key constraint (book doesn't exist)
    if (errorCode === "23503" || errorMessage.includes("foreign key")) {
      return NextResponse.json(
        { error: "Book not found", message: "The book may have been deleted" },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        error: "Failed to create bookmark",
        message: errorMessage,
        code: errorCode
      },
      { status: 500 }
    )
  }
}

