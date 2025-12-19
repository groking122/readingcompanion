import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { books } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, author, category } = body

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    // Find the default book
    const [defaultBook] = await db
      .select()
      .from(books)
      .where(
        and(
          eq(books.userId, "system_default"),
          eq(books.title, title)
        )
      )
      .limit(1)

    if (!defaultBook || !defaultBook.epubUrl) {
      return NextResponse.json(
        { error: "Default book not found" },
        { status: 404 }
      )
    }

    // Check if user already has this book
    const existingBooks = await db
      .select()
      .from(books)
      .where(eq(books.userId, user.id))
      .limit(100)

    const existing = existingBooks.find(
      (b) => b.title.toLowerCase() === title.toLowerCase()
    )

    if (existing) {
      return NextResponse.json(
        { error: "This book is already in your library", existingBook: existing },
        { status: 409 }
      )
    }

    // Copy the default book to user's library
    const [newBook] = await db
      .insert(books)
      .values({
        userId: user.id,
        title: defaultBook.title,
        type: defaultBook.type,
        category: category || defaultBook.category || "book",
        epubUrl: defaultBook.epubUrl, // Copy the EPUB data
      })
      .returning()

    return NextResponse.json(newBook)
  } catch (error) {
    console.error("Error adding book from defaults:", error)
    return NextResponse.json(
      { error: "Failed to add book from defaults", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

