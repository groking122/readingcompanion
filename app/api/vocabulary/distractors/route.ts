import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { vocabulary, flashcards } from "@/db/schema"
import { eq, and, desc, sql } from "drizzle-orm"

/**
 * GET /api/vocabulary/distractors
 * Returns a smaller pool of vocabulary items suitable for distractor generation
 * This reduces payload size compared to fetching all vocabulary
 * 
 * Query params:
 * - bookId (optional): Filter by book
 * - count (optional, default 50): Number of items to return
 * - kind (optional): Filter by kind (word/phrase)
 */
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const bookId = searchParams.get("bookId")
    const countParam = searchParams.get("count")
    const kind = searchParams.get("kind") as "word" | "phrase" | null
    const count = countParam ? Math.min(parseInt(countParam, 10), 200) : 50 // Cap at 200

    // Build conditions
    const conditions: any[] = [eq(vocabulary.userId, user.id)]
    if (bookId) {
      conditions.push(eq(vocabulary.bookId, bookId))
    }
    if (kind) {
      conditions.push(eq(vocabulary.kind, kind))
    }

    // Get recently reviewed vocabulary (more likely to be good distractors)
    // Prioritize items that have been reviewed recently (have flashcards with recent lastReviewedAt)
    const vocabWithFlashcards = await db
      .select({
        id: vocabulary.id,
        term: vocabulary.term,
        termNormalized: vocabulary.termNormalized,
        translation: vocabulary.translation,
        context: vocabulary.context,
        kind: vocabulary.kind,
        bookId: vocabulary.bookId,
        pageNumber: vocabulary.pageNumber,
        position: vocabulary.position,
        epubLocation: vocabulary.epubLocation,
        lastReviewedAt: flashcards.lastReviewedAt,
      })
      .from(vocabulary)
      .leftJoin(flashcards, eq(vocabulary.id, flashcards.vocabularyId))
      .where(and(...conditions))
      .orderBy(desc(flashcards.lastReviewedAt), desc(vocabulary.createdAt))
      .limit(count * 2) // Get more than needed, then shuffle

    // Also get some recently created vocabulary (for variety)
    const recentVocab = await db
      .select({
        id: vocabulary.id,
        term: vocabulary.term,
        termNormalized: vocabulary.termNormalized,
        translation: vocabulary.translation,
        context: vocabulary.context,
        kind: vocabulary.kind,
        bookId: vocabulary.bookId,
        pageNumber: vocabulary.pageNumber,
        position: vocabulary.position,
        epubLocation: vocabulary.epubLocation,
        lastReviewedAt: sql<Date | null>`NULL`.as('lastReviewedAt'),
      })
      .from(vocabulary)
      .where(and(...conditions))
      .orderBy(desc(vocabulary.createdAt))
      .limit(Math.floor(count / 2))

    // Combine and deduplicate by ID
    const allItems = [...vocabWithFlashcards, ...recentVocab]
    const uniqueItems = new Map<string, typeof allItems[0]>()
    for (const item of allItems) {
      if (!uniqueItems.has(item.id)) {
        uniqueItems.set(item.id, item)
      }
    }

    // Shuffle and take requested count
    const shuffled = Array.from(uniqueItems.values())
      .sort(() => Math.random() - 0.5)
      .slice(0, count)

    // Transform to match VocabularyItem format
    const result = shuffled.map(item => ({
      id: item.id,
      term: item.term,
      termNormalized: item.termNormalized,
      translation: item.translation,
      context: item.context,
      kind: item.kind || "word",
      bookId: item.bookId,
      pageNumber: item.pageNumber,
      position: item.position,
      epubLocation: item.epubLocation,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching distractor pool:", error)
    return NextResponse.json(
      { error: "Failed to fetch distractor pool" },
      { status: 500 }
    )
  }
}

