import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { bookmarks } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export const dynamic = 'force-dynamic'

/**
 * PUT /api/bookmarks/last-read
 * Upserts (updates or creates) the last read position for a book
 * This is used for auto-saving reading progress
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { bookId, epubLocation, pageNumber, position, progressPercentage } = body

    if (!bookId) {
      return NextResponse.json(
        { error: "Missing required field: bookId" },
        { status: 400 }
      )
    }

    // Check if a "last read" bookmark already exists for this book
    const existingBookmark = await db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, user.id),
          eq(bookmarks.bookId, bookId),
          eq(bookmarks.title, "__LAST_READ__")
        )
      )
      .limit(1)

    const bookmarkValues = {
      userId: user.id,
      bookId,
      title: "__LAST_READ__", // Special marker for auto-saved progress
      epubLocation: (epubLocation && typeof epubLocation === 'string' && epubLocation.trim()) ? epubLocation.trim() : null,
      pageNumber: (pageNumber !== undefined && pageNumber !== null && pageNumber !== '') 
        ? (isNaN(Number(pageNumber)) ? null : Number(pageNumber))
        : null,
      position: (position !== undefined && position !== null && position !== '') 
        ? (isNaN(Number(position)) ? null : Number(position))
        : null,
    }

    let result
    if (existingBookmark.length > 0) {
      // Update existing bookmark
      const [updated] = await db
        .update(bookmarks)
        .set({
          ...bookmarkValues,
          updatedAt: new Date(),
        })
        .where(eq(bookmarks.id, existingBookmark[0].id))
        .returning()
      
      result = updated
    } else {
      // Create new bookmark
      const [newBookmark] = await db
        .insert(bookmarks)
        .values(bookmarkValues)
        .returning()
      
      result = newBookmark
    }

    // Return bookmark with progress percentage if provided
    return NextResponse.json({
      ...result,
      progressPercentage: progressPercentage || null,
    })
  } catch (error: any) {
    console.error("Error saving last read position:", error)
    const errorMessage = error?.message || "Unknown error"
    const errorCode = error?.code || "UNKNOWN"
    
    return NextResponse.json(
      { 
        error: "Failed to save reading progress",
        message: errorMessage,
        code: errorCode
      },
      { status: 500 }
    )
  }
}

