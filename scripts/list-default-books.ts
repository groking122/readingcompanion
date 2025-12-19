// Load environment variables FIRST before importing db
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })

import { db } from "../db"
import { books } from "../db/schema"
import { eq } from "drizzle-orm"

async function listDefaultBooks() {
  try {
    const defaultBooks = await db
      .select({
        title: books.title,
        type: books.type,
      })
      .from(books)
      .where(eq(books.userId, "system_default"))
      .orderBy(books.title)

    console.log(`\nFound ${defaultBooks.length} default books:\n`)
    defaultBooks.forEach((book, index) => {
      console.log(`${index + 1}. ${book.title}`)
    })
    
    // Expected books list
    const expectedBooks = [
      "Deep Work",
      "The Power Of Now",
      "The Memory Bible",
      "The Marshmallow Test: Mastering Self-Control",
      "The Art of Extraordinary Confidence",
      "The Big Leap",
      "The Happiness Purpose",
      "The Kindness Challenge",
      "The MindBody Code",
      "The Brave Athlete: Calm the F*ck Down",
      "The Driving Book",
      "60 Second Solutions: Motivation",
      "8 Keys to Raising the Quirky Child",
    ]
    
    console.log(`\n\nExpected: ${expectedBooks.length} books`)
    console.log(`Found: ${defaultBooks.length} books`)
    
    const foundTitles = defaultBooks.map(b => b.title)
    const missing = expectedBooks.filter(title => !foundTitles.includes(title))
    
    if (missing.length > 0) {
      console.log(`\n❌ Missing books:`)
      missing.forEach(title => console.log(`   - ${title}`))
    } else {
      console.log(`\n✅ All expected books are present!`)
    }
  } catch (error) {
    console.error("❌ Error:", error)
  }
  
  process.exit(0)
}

listDefaultBooks()

