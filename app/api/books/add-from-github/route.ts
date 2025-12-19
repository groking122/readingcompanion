import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { books } from "@/db/schema"
import { eq } from "drizzle-orm"

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/eyeke04/Books/master/"

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, author, githubUrl, category } = body

    if (!title || !githubUrl) {
      return NextResponse.json(
        { error: "Title and GitHub URL are required" },
        { status: 400 }
      )
    }

    // Construct the full GitHub raw URL
    const fullUrl = `${GITHUB_RAW_BASE}${encodeURIComponent(githubUrl)}`
    
    // Fetch the EPUB file from GitHub
    const response = await fetch(fullUrl)
    
    if (!response.ok) {
      // If direct file doesn't work, try common EPUB filenames in folder
      if (response.status === 404 && !githubUrl.endsWith('.epub')) {
        // Try to find EPUB in folder - common patterns
        const folderName = githubUrl.split('/').pop() || githubUrl
        const possibleFiles = [
          `${githubUrl}/${folderName}.epub`,
          `${githubUrl}/${folderName.replace(/[^a-zA-Z0-9]/g, ' ').trim()}.epub`,
        ]
        
        let epubFound = false
        for (const possibleFile of possibleFiles) {
          const tryUrl = `${GITHUB_RAW_BASE}${encodeURIComponent(possibleFile)}`
          const tryResponse = await fetch(tryUrl)
          if (tryResponse.ok) {
            const arrayBuffer = await tryResponse.arrayBuffer()
            const base64 = Buffer.from(arrayBuffer).toString('base64')
            const dataUrl = `data:application/epub+zip;base64,${base64}`
            
            // Create book in database
            const [newBook] = await db
              .insert(books)
              .values({
                userId: user.id,
                title,
                type: "epub",
                category: category || "book",
                epubUrl: dataUrl,
              })
              .returning()
            
            epubFound = true
            return NextResponse.json(newBook)
          }
        }
        
        if (!epubFound) {
          return NextResponse.json(
            { error: `EPUB file not found. The book might be in a folder or have a different format. URL tried: ${fullUrl}` },
            { status: 404 }
          )
        }
      } else {
        return NextResponse.json(
          { error: `Failed to fetch EPUB from GitHub: ${response.statusText}` },
          { status: response.status }
        )
      }
    }

    // Check if it's actually an EPUB file
    const contentType = response.headers.get("content-type")
    const isEpub = githubUrl.toLowerCase().endsWith('.epub') || 
                   contentType?.includes('epub') ||
                   contentType?.includes('application/zip') ||
                   contentType?.includes('application/x-zip-compressed')

    if (!isEpub && !githubUrl.toLowerCase().endsWith('.epub')) {
      return NextResponse.json(
        { error: "The file is not an EPUB. Some books in the repository are PDFs or in folders." },
        { status: 400 }
      )
    }

    // Convert to base64
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const dataUrl = `data:application/epub+zip;base64,${base64}`

    // Check if book already exists
    const existingBooks = await db
      .select()
      .from(books)
      .where(eq(books.userId, user.id))
      .limit(100) // Reasonable limit

    const existing = existingBooks.find(
      (b) => b.title.toLowerCase() === title.toLowerCase()
    )

    if (existing) {
      return NextResponse.json(
        { error: "This book is already in your library", existingBook: existing },
        { status: 409 }
      )
    }

    // Create book in database
    const [newBook] = await db
      .insert(books)
      .values({
        userId: user.id,
        title,
        type: "epub",
        category: category || "book",
        epubUrl: dataUrl,
      })
      .returning()

    return NextResponse.json(newBook)
  } catch (error) {
    console.error("Error adding book from GitHub:", error)
    return NextResponse.json(
      { error: "Failed to add book from GitHub", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

