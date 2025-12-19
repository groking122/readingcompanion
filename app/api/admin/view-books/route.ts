import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { books } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

// Only allow in development
const isDevelopment = process.env.NODE_ENV === "development"

export async function GET(request: NextRequest) {
  try {
    // Check if in development mode
    if (!isDevelopment) {
      return NextResponse.json(
        { error: "This endpoint is only available in development mode" },
        { status: 403 }
      )
    }

    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId") || "all"

    let allBooks

    if (userId === "all") {
      // Get all books
      allBooks = await db
        .select({
          id: books.id,
          userId: books.userId,
          title: books.title,
          type: books.type,
          category: books.category,
          createdAt: books.createdAt,
          hasEpub: books.epubUrl,
          hasPdf: books.pdfUrl,
          hasContent: books.content,
        })
        .from(books)
        .orderBy(desc(books.createdAt))
    } else {
      // Get books for specific user
      allBooks = await db
        .select({
          id: books.id,
          userId: books.userId,
          title: books.title,
          type: books.type,
          category: books.category,
          createdAt: books.createdAt,
          hasEpub: books.epubUrl,
          hasPdf: books.pdfUrl,
          hasContent: books.content,
        })
        .from(books)
        .where(eq(books.userId, userId))
        .orderBy(desc(books.createdAt))
    }

    // Group by user
    const byUser: Record<string, typeof allBooks> = {}
    for (const book of allBooks) {
      if (!byUser[book.userId]) {
        byUser[book.userId] = []
      }
      byUser[book.userId].push(book)
    }

    // Calculate summary
    const defaultBooks = byUser["system_default"] || []
    const userBooks = allBooks.filter((b) => b.userId !== "system_default")

    return NextResponse.json({
      summary: {
        total: allBooks.length,
        defaultBooks: defaultBooks.length,
        userBooks: userBooks.length,
        uniqueUsers: Object.keys(byUser).filter((u) => u !== "system_default").length,
      },
      books: {
        default: defaultBooks,
        users: Object.fromEntries(
          Object.entries(byUser).filter(([userId]) => userId !== "system_default")
        ),
      },
      all: allBooks,
    })
  } catch (error) {
    console.error("Error fetching books:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch books",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

