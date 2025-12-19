/**
 * Check if default books are already seeded in the database
 * 
 * Usage: npx tsx scripts/check-default-books.ts
 */

// Load environment variables FIRST before importing db
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })

// Now import db after env vars are loaded
import { db } from "../db"
import { books } from "../db/schema"
import { eq } from "drizzle-orm"

async function checkDefaultBooks() {
  try {
    console.log("Checking for default books in database...\n")
    
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

    if (defaultBooks.length === 0) {
      console.log("❌ No default books found in database.")
      console.log("\n📚 To seed default books, run:")
      console.log("   npx tsx scripts/seed-default-books.ts")
    } else {
      console.log(`✅ Found ${defaultBooks.length} default books in database:\n`)
      defaultBooks.forEach((book, index) => {
        console.log(`${index + 1}. ${book.title} (${book.type})`)
        console.log(`   Created: ${book.createdAt}`)
        console.log(`   ID: ${book.id}\n`)
      })
      console.log("\n✨ Default books are ready! Users can add them instantly.")
    }
  } catch (error) {
    console.error("❌ Error checking database:", error)
    if (error instanceof Error) {
      console.error("Details:", error.message)
    }
  }
  
  process.exit(0)
}

checkDefaultBooks()

