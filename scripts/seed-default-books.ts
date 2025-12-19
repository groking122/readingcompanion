/**
 * Seed script to pre-download and store default books in the database
 * Run this once to populate default books that all users can add
 * 
 * Usage: npx tsx scripts/seed-default-books.ts
 */

// Load environment variables FIRST before importing db
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })

import { db } from "../db"
import { books } from "../db/schema"
import { eq } from "drizzle-orm"

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/eyeke04/Books/master/"

interface DefaultBook {
  title: string
  author: string
  category: string
  githubUrl: string
}

const defaultBooks: DefaultBook[] = [
  { title: "Deep Work", author: "Cal Newport", category: "Productivity", githubUrl: "Deep Work - Cal Newport" }, // Folder - will try to find EPUB inside
  { title: "The Power Of Now", author: "Eckhart Tolle", category: "Spirituality", githubUrl: "The Power Of Now - Eckhart Tolle.epub" },
  { title: "The Memory Bible", author: "Gary Small", category: "Self-Improvement", githubUrl: "The Memory Bible - Gary Small.epub" },
  { title: "The Marshmallow Test: Mastering Self-Control", author: "Walter Mischel", category: "Psychology", githubUrl: "The Marshmallow Test_ Mastering Self-Control.epub" },
  { title: "The Art of Extraordinary Confidence", author: "Dr Aziz", category: "Self-Improvement", githubUrl: "The Art of Extraordinary Confid - Dr Aziz.epub" },
  { title: "The Big Leap", author: "Gay Hendricks", category: "Personal Development", githubUrl: "The Big Leap.epub" },
  { title: "The Happiness Purpose", author: "Edward De Bono", category: "Philosophy", githubUrl: "The Happiness Purpose - Edward De Bono.epub" },
  { title: "The Kindness Challenge", author: "Shaunti Feldhahn", category: "Relationships", githubUrl: "The Kindness Challenge - Feldhahn, Shaunti.epub" },
  { title: "The MindBody Code", author: "Mario Martinez", category: "Health", githubUrl: "The MindBody Code - Mario Martinez.epub" },
  { title: "The Brave Athlete: Calm the F*ck Down", author: "Simon Marshall, PhD", category: "Sports Psychology", githubUrl: "The Brave Athlete_ Calm the F_ck Down and - Simon Marshall, Phd.epub" },
  { title: "The Driving Book", author: "Karen Gravelle", category: "Practical", githubUrl: "The Driving Book - Karen Gravelle.epub" },
  { title: "60 Second Solutions: Motivation", author: "Jeff Davidson", category: "Motivation", githubUrl: "60 Second Solutions_ Motivation - Jeff Davidson.epub" },
  { title: "8 Keys to Raising the Quirky Child", author: "Various", category: "Parenting", githubUrl: "8 Keys to Raising the Quirky _.epub" },
]

async function downloadEpub(githubUrl: string): Promise<string | null> {
  try {
    // If it's a folder (doesn't end with .epub), try common patterns
    if (!githubUrl.endsWith('.epub')) {
      const folderName = githubUrl.split('/').pop() || githubUrl
      const possibleFiles = [
        `${githubUrl}/${folderName}.epub`,
        `${githubUrl}/${folderName.replace(/[^a-zA-Z0-9]/g, ' ').trim()}.epub`,
      ]
      
      for (const possibleFile of possibleFiles) {
        const tryUrl = `${GITHUB_RAW_BASE}${possibleFile.split('/').map(encodeURIComponent).join('/')}`
        console.log(`Trying: ${tryUrl}`)
        const tryResponse = await fetch(tryUrl)
        if (tryResponse.ok) {
          const arrayBuffer = await tryResponse.arrayBuffer()
          const base64 = Buffer.from(arrayBuffer).toString('base64')
          return `data:application/epub+zip;base64,${base64}`
        }
      }
      
      console.error(`Failed to find EPUB in folder: ${githubUrl}`)
      return null
    }
    
    // Direct EPUB file - handle URL encoding properly for paths with slashes
    const encodedUrl = githubUrl.split('/').map(encodeURIComponent).join('/')
    const fullUrl = `${GITHUB_RAW_BASE}${encodedUrl}`
    console.log(`Downloading: ${fullUrl}`)
    
    const response = await fetch(fullUrl)
    
    if (!response.ok) {
      console.error(`Failed to download ${githubUrl}: ${response.statusText}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    return `data:application/epub+zip;base64,${base64}`
  } catch (error) {
    console.error(`Error downloading ${githubUrl}:`, error)
    return null
  }
}

async function seedDefaultBooks() {
  console.log("Starting to seed default books...")
  
  // Check if default books already exist
  const existingBooks = await db.select().from(books).where(eq(books.userId, "system_default"))
  
  if (existingBooks.length > 0) {
    console.log(`Found ${existingBooks.length} existing default books. Skipping seed.`)
    console.log("To re-seed, delete existing default books first.")
    return
  }

  let successCount = 0
  let failCount = 0

  for (const book of defaultBooks) {
    console.log(`\nProcessing: ${book.title}`)
    
    const epubData = await downloadEpub(book.githubUrl)
    
    if (!epubData) {
      console.log(`❌ Failed to download: ${book.title}`)
      failCount++
      continue
    }

    try {
      await db.insert(books).values({
        userId: "system_default", // Special user ID for default books
        title: book.title,
        type: "epub",
        category: "book",
        epubUrl: epubData,
      })
      
      console.log(`✅ Added: ${book.title}`)
      successCount++
    } catch (error) {
      console.error(`❌ Error adding ${book.title}:`, error)
      failCount++
    }
  }

  console.log(`\n✅ Seed complete!`)
  console.log(`Success: ${successCount}, Failed: ${failCount}`)
}

// Run the seed
seedDefaultBooks()
  .then(() => {
    console.log("\nDone!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })

