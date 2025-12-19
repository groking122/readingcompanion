import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { books } from "@/db/schema"
import { eq } from "drizzle-orm"

// Mark route as dynamic to prevent static generation
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const defaultBooks = await db
      .select({
        id: books.id,
        title: books.title,
        type: books.type,
        createdAt: books.createdAt,
      })
      .from(books)
      .where(eq(books.userId, "system_default"))
      .orderBy(books.createdAt)

    return NextResponse.json({
      count: defaultBooks.length,
      books: defaultBooks,
      seeded: defaultBooks.length > 0,
    })
  } catch (error) {
    console.error("Error checking default books:", error)
    return NextResponse.json(
      { 
        error: "Failed to check default books", 
        details: error instanceof Error ? error.message : String(error),
        count: 0,
        seeded: false,
      },
      { status: 500 }
    )
  }
}

