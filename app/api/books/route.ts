import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { books } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userBooks = await db
      .select()
      .from(books)
      .where(eq(books.userId, user.id))
      .orderBy(books.createdAt)

    return NextResponse.json(userBooks)
  } catch (error) {
    console.error("Error fetching books:", error)
    return NextResponse.json(
      { error: "Failed to fetch books" },
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
    const { title, content, pdfUrl, epubUrl, type, category } = body

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    const [newBook] = await db
      .insert(books)
      .values({
        userId: user.id,
        title,
        type: type || "text",
        category: category || "book",
        content: content || null,
        pdfUrl: pdfUrl || null,
        epubUrl: epubUrl || null,
      })
      .returning()

    return NextResponse.json(newBook)
  } catch (error) {
    console.error("Error creating book:", error)
    return NextResponse.json(
      { error: "Failed to create book" },
      { status: 500 }
    )
  }
}

