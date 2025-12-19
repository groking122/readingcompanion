import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { books } from "@/db/schema"
import { eq } from "drizzle-orm"

// Only allow in development
const isDevelopment = process.env.NODE_ENV === "development"

export async function POST(request: NextRequest) {
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

    const formData = await request.formData()
    const file = formData.get("file") as File
    const title = formData.get("title") as string
    const author = formData.get("author") as string
    const category = formData.get("category") as string || "book"

    if (!file || !title) {
      return NextResponse.json(
        { error: "File and title are required" },
        { status: 400 }
      )
    }

    // Check if it's an EPUB file
    if (!file.name.toLowerCase().endsWith(".epub")) {
      return NextResponse.json(
        { error: "Only EPUB files are supported" },
        { status: 400 }
      )
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const dataUrl = `data:application/epub+zip;base64,${base64}`

    // Check if book already exists
    const existingBooks = await db
      .select()
      .from(books)
      .where(eq(books.userId, "system_default"))
      .limit(100)

    const existing = existingBooks.find(
      (b) => b.title.toLowerCase() === title.toLowerCase()
    )

    if (existing) {
      return NextResponse.json(
        { error: "A book with this title already exists", existingBook: existing },
        { status: 409 }
      )
    }

    // Store as default book
    const [newBook] = await db
      .insert(books)
      .values({
        userId: "system_default",
        title: title.trim(),
        type: "epub",
        category: category || "book",
        epubUrl: dataUrl,
      })
      .returning()

    return NextResponse.json({
      success: true,
      book: {
        id: newBook.id,
        title: newBook.title,
        type: newBook.type,
      },
      message: "Book uploaded successfully and added to suggested books",
    })
  } catch (error) {
    console.error("Error uploading suggested book:", error)
    return NextResponse.json(
      {
        error: "Failed to upload book",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

