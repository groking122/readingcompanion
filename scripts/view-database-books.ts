// Load environment variables FIRST before importing db
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })

import { db } from "../db"
import { books } from "../db/schema"
import { eq, desc } from "drizzle-orm"

async function viewDatabaseBooks() {
  try {
    console.log("\n📚 Books in Database\n")
    console.log("=" .repeat(80))
    
    // Get all books grouped by user
    const allBooks = await db
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

    // Group by user
    const byUser: Record<string, typeof allBooks> = {}
    for (const book of allBooks) {
      if (!byUser[book.userId]) {
        byUser[book.userId] = []
      }
      byUser[book.userId].push(book)
    }

    // Display default books
    if (byUser["system_default"]) {
      console.log("\n🔵 DEFAULT BOOKS (Suggested Books - Available to All Users)")
      console.log("-".repeat(80))
      console.log(`Total: ${byUser["system_default"].length} books\n`)
      
      byUser["system_default"].forEach((book, index) => {
        console.log(`${index + 1}. ${book.title}`)
        console.log(`   Type: ${book.type} | Category: ${book.category || "book"}`)
        console.log(`   Created: ${book.createdAt}`)
        console.log(`   Has EPUB: ${book.hasEpub ? "✅ Yes" : "❌ No"}`)
        console.log(`   ID: ${book.id}`)
        console.log()
      })
    }

    // Display user books
    const userBooks = Object.entries(byUser).filter(([userId]) => userId !== "system_default")
    if (userBooks.length > 0) {
      console.log("\n👤 USER BOOKS")
      console.log("-".repeat(80))
      
      for (const [userId, books] of userBooks) {
        console.log(`\nUser ID: ${userId}`)
        console.log(`Total: ${books.length} books\n`)
        
        books.forEach((book, index) => {
          console.log(`  ${index + 1}. ${book.title}`)
          console.log(`     Type: ${book.type} | Category: ${book.category || "book"}`)
          console.log(`     Created: ${book.createdAt}`)
          const hasFile = book.hasEpub || book.hasPdf || book.hasContent
          console.log(`     Has Content: ${hasFile ? "✅ Yes" : "❌ No"}`)
        })
      }
    }

    // Summary
    console.log("\n" + "=".repeat(80))
    console.log("\n📊 SUMMARY")
    console.log(`Total Books: ${allBooks.length}`)
    console.log(`Default Books: ${byUser["system_default"]?.length || 0}`)
    console.log(`User Books: ${allBooks.length - (byUser["system_default"]?.length || 0)}`)
    console.log(`Unique Users: ${Object.keys(byUser).filter(u => u !== "system_default").length}`)
    
  } catch (error) {
    console.error("❌ Error:", error)
    if (error instanceof Error) {
      console.error("Details:", error.message)
    }
  }
  
  process.exit(0)
}

viewDatabaseBooks()

