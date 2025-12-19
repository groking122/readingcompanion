// Load environment variables FIRST before importing db
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })

import { db } from "../db"
import { books } from "../db/schema"
import { eq } from "drizzle-orm"

async function deleteDefaultBooks() {
  try {
    console.log("Deleting existing default books...")
    
    const result = await db
      .delete(books)
      .where(eq(books.userId, "system_default"))
      .returning()
    
    console.log(`✅ Deleted ${result.length} default books`)
    console.log("\nNow you can run: npx tsx scripts/seed-default-books.ts")
  } catch (error) {
    console.error("❌ Error deleting default books:", error)
  }
  
  process.exit(0)
}

deleteDefaultBooks()

