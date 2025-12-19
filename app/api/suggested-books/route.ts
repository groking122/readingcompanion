import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { books } from "@/db/schema"
import { eq } from "drizzle-orm"

// Curated list of books from the GitHub repository
// Add books here to show them in the Suggested Books page
const staticSuggestedBooks: Array<{ title: string; author: string; category: string; githubUrl?: string }> = [
  // Example format:
  // { title: "Book Title", author: "Author Name", category: "Category", githubUrl: "path/to/file.epub" },
  // { title: "Another Book", author: "Another Author", category: "Self-Improvement" }, // No githubUrl = can't download EPUB
]

// Mark route as dynamic to prevent static generation
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Fetch uploaded books from database (default books)
    const uploadedBooks = await db
      .select({
        title: books.title,
        type: books.type,
        category: books.category,
      })
      .from(books)
      .where(eq(books.userId, "system_default"))

    // Convert database books to suggested books format
    const dbSuggestedBooks = uploadedBooks.map((book) => ({
      title: book.title,
      author: "Unknown", // Database doesn't store author for default books
      category: book.category || "book",
      githubUrl: book.type === "epub" ? `${book.title}.epub` : undefined, // Mark as available EPUB
      isUploaded: true, // Flag to indicate it's from database
    }))

    // Combine static and uploaded books
    const suggestedBooks = [
      ...staticSuggestedBooks,
      ...dbSuggestedBooks,
    ]

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const category = searchParams.get("category")

    let filteredBooks = suggestedBooks

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase()
      filteredBooks = filteredBooks.filter(
        (book) =>
          book.title.toLowerCase().includes(searchLower) ||
          book.author.toLowerCase().includes(searchLower) ||
          book.category.toLowerCase().includes(searchLower)
      )
    }

    // Filter by category
    if (category && category !== "all") {
      filteredBooks = filteredBooks.filter(
        (book) => book.category.toLowerCase() === category.toLowerCase()
      )
    }

    return NextResponse.json(filteredBooks)
  } catch (error) {
    console.error("Error fetching suggested books:", error)
    return NextResponse.json(
      { error: "Failed to fetch suggested books" },
      { status: 500 }
    )
  }
}

