import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { reviewAttempts, vocabulary, flashcards } from "@/db/schema"
import { eq, and, gte, sql, desc, count } from "drizzle-orm"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get("days") || "30", 10) // Default to last 30 days
    const since = new Date()
    since.setDate(since.getDate() - days)

    // Get total review attempts
    const totalAttempts = await db
      .select({ count: sql<number>`count(*)` })
      .from(reviewAttempts)
      .where(
        and(
          eq(reviewAttempts.userId, user.id),
          gte(reviewAttempts.createdAt, since)
        )
      )

    // Get success rate (quality >= 4)
    const successfulAttempts = await db
      .select({ count: sql<number>`count(*)` })
      .from(reviewAttempts)
      .where(
        and(
          eq(reviewAttempts.userId, user.id),
          gte(reviewAttempts.createdAt, since),
          sql`${reviewAttempts.quality} >= 4`
        )
      )

    // Get hardest words (lowest average quality)
    const hardestWords = await db
      .select({
        vocabularyId: reviewAttempts.vocabularyId,
        term: vocabulary.term,
        translation: vocabulary.translation,
        avgQuality: sql<number>`AVG(${reviewAttempts.quality})`,
        attemptCount: sql<number>`COUNT(*)`,
      })
      .from(reviewAttempts)
      .innerJoin(vocabulary, eq(reviewAttempts.vocabularyId, vocabulary.id))
      .where(
        and(
          eq(reviewAttempts.userId, user.id),
          gte(reviewAttempts.createdAt, since)
        )
      )
      .groupBy(reviewAttempts.vocabularyId, vocabulary.term, vocabulary.translation)
      .having(sql`COUNT(*) >= 3`) // At least 3 attempts
      .orderBy(sql`AVG(${reviewAttempts.quality})`)
      .limit(10)

    // Get review activity by day (last 30 days)
    const activityByDay = await db
      .select({
        date: sql<string>`DATE(${reviewAttempts.createdAt})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(reviewAttempts)
      .where(
        and(
          eq(reviewAttempts.userId, user.id),
          gte(reviewAttempts.createdAt, since)
        )
      )
      .groupBy(sql`DATE(${reviewAttempts.createdAt})`)
      .orderBy(sql`DATE(${reviewAttempts.createdAt})`)

    // Get exercise type distribution
    const exerciseTypeStats = await db
      .select({
        exerciseType: reviewAttempts.exerciseType,
        count: sql<number>`COUNT(*)`,
        avgQuality: sql<number>`AVG(${reviewAttempts.quality})`,
      })
      .from(reviewAttempts)
      .where(
        and(
          eq(reviewAttempts.userId, user.id),
          gte(reviewAttempts.createdAt, since),
          sql`${reviewAttempts.exerciseType} IS NOT NULL`
        )
      )
      .groupBy(reviewAttempts.exerciseType)

    // Get current streak (consecutive days with reviews)
    const allActivityDates = await db
      .select({
        date: sql<string>`DISTINCT DATE(${reviewAttempts.createdAt})`,
      })
      .from(reviewAttempts)
      .where(eq(reviewAttempts.userId, user.id))
      .orderBy(desc(sql`DATE(${reviewAttempts.createdAt})`))

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < allActivityDates.length; i++) {
      const activityDate = new Date(allActivityDates[i].date)
      activityDate.setHours(0, 0, 0, 0)
      const expectedDate = new Date(today)
      expectedDate.setDate(expectedDate.getDate() - i)
      
      if (activityDate.getTime() === expectedDate.getTime()) {
        streak++
      } else {
        break
      }
    }

    // Get average response time
    const avgResponseTime = await db
      .select({
        avgMs: sql<number>`AVG(${reviewAttempts.responseMs})`,
      })
      .from(reviewAttempts)
      .where(
        and(
          eq(reviewAttempts.userId, user.id),
          gte(reviewAttempts.createdAt, since),
          sql`${reviewAttempts.responseMs} IS NOT NULL`
        )
      )

    const totalCount = Number(totalAttempts[0]?.count || 0)
    const successCount = Number(successfulAttempts[0]?.count || 0)
    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0

    return NextResponse.json({
      period: {
        days,
        since: since.toISOString(),
      },
      summary: {
        totalAttempts: totalCount,
        successRate: Math.round(successRate * 10) / 10,
        successCount,
        currentStreak: streak,
        avgResponseTimeMs: avgResponseTime[0]?.avgMs ? Math.round(Number(avgResponseTime[0].avgMs)) : null,
      },
      hardestWords: hardestWords.map(w => ({
        vocabularyId: w.vocabularyId,
        term: w.term,
        translation: w.translation,
        avgQuality: Math.round(Number(w.avgQuality) * 10) / 10,
        attemptCount: Number(w.attemptCount),
      })),
      activityByDay: activityByDay.map(a => ({
        date: a.date,
        count: Number(a.count),
      })),
      exerciseTypes: exerciseTypeStats.map(e => ({
        type: e.exerciseType,
        count: Number(e.count),
        avgQuality: Math.round(Number(e.avgQuality) * 10) / 10,
      })),
    })
  } catch (error) {
    console.error("Error fetching review statistics:", error)
    return NextResponse.json(
      { error: "Failed to fetch review statistics" },
      { status: 500 }
    )
  }
}

