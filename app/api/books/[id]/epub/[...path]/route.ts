import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { books } from "@/db/schema"
import { eq } from "drizzle-orm"
import JSZip from "jszip"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: bookId, path } = await params
    const filePath = path.join("/")

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

      // Load EPUB as ZIP
      const zip = await JSZip.loadAsync(buffer)

    // Get file from ZIP
    const file = zip.file(filePath)
    if (!file) {
      return NextResponse.json(
        { error: "File not found in EPUB" },
        { status: 404 }
      )
    }

    // Get file content
    const content = await file.async("nodebuffer")

    // Determine content type
    let contentType = "application/octet-stream"
    if (filePath.endsWith(".xml")) {
      contentType = "application/xml"
    } else if (filePath.endsWith(".html") || filePath.endsWith(".xhtml")) {
      contentType = "text/html"
    } else if (filePath.endsWith(".css")) {
      contentType = "text/css"
    } else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
      contentType = "image/jpeg"
    } else if (filePath.endsWith(".png")) {
      contentType = "image/png"
    }

      return new NextResponse(content as any, {
        headers: {
          "Content-Type": contentType,
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
    console.error("Error serving EPUB file:", error)
    return NextResponse.json(
      { error: `Failed to serve EPUB file: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    )
  }
}


