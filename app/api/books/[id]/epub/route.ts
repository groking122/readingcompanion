import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { books } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bookId = params.id

    // Get book from database
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

    if (book.type !== "epub" || !book.epubUrl) {
      return NextResponse.json(
        { error: "Book is not an EPUB" },
        { status: 400 }
      )
    }

    try {
      // Extract base64 data
      const base64Data = book.epubUrl.includes(",")
        ? book.epubUrl.split(",")[1]
        : book.epubUrl

      if (!base64Data || base64Data.trim().length === 0) {
        return NextResponse.json(
          { error: "EPUB file data is empty or invalid" },
          { status: 400 }
        )
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, "base64")

      if (buffer.length === 0) {
        return NextResponse.json(
          { error: "Failed to decode EPUB file data" },
          { status: 400 }
        )
      }

      // Return EPUB file with correct headers
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/epub+zip",
          "Content-Disposition": `attachment; filename="${book.title}.epub"`,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      })
    } catch (decodeError: any) {
      console.error("Error decoding EPUB data:", decodeError)
      return NextResponse.json(
        { error: `Failed to decode EPUB file: ${decodeError.message || "Invalid base64 data"}` },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error serving EPUB:", error)
    return NextResponse.json(
      { error: `Failed to serve EPUB: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    )
  }
}


