import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { reviewAttempts, vocabulary, flashcards } from "@/db/schema"
import { eq, and, gte, sql, desc } from "drizzle-orm"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get("days") || "90", 10) // Default to last 90 days
    const since = new Date()
    since.setDate(since.getDate() - days)

    // 1. Word Difficulty Analysis
    // Calculate difficulty based on ease factor trends and success rate
    const wordDifficulty = await db
      .select({
        vocabularyId: reviewAttempts.vocabularyId,
        term: vocabulary.term,
        translation: vocabulary.translation,
        avgQuality: sql<number>`AVG(${reviewAttempts.quality})`,
        attemptCount: sql<number>`COUNT(*)`,
        firstAttemptQuality: sql<number>`MIN(${reviewAttempts.quality})`,
        latestEaseFactor: sql<number>`MAX(${reviewAttempts.newEaseFactor})`,
        qualityTrend: sql<number>`AVG(CASE WHEN ${reviewAttempts.createdAt} >= ${since} THEN ${reviewAttempts.quality} ELSE NULL END) - AVG(CASE WHEN ${reviewAttempts.createdAt} < ${since} THEN ${reviewAttempts.quality} ELSE NULL END)`,
      })
      .from(reviewAttempts)
      .innerJoin(vocabulary, eq(reviewAttempts.vocabularyId, vocabulary.id))
      .where(eq(reviewAttempts.userId, user.id))
      .groupBy(reviewAttempts.vocabularyId, vocabulary.term, vocabulary.translation)
      .having(sql`COUNT(*) >= 2`) // At least 2 attempts
      .orderBy(sql`AVG(${reviewAttempts.quality})`)

    // Calculate difficulty score (0-100, higher = harder)
    const difficultyAnalysis = wordDifficulty.map((word) => {
      const avgQuality = Number(word.avgQuality)
      const attemptCount = Number(word.attemptCount)
      const latestEaseFactor = Number(word.latestEaseFactor) || 2.5
      const qualityTrend = Number(word.qualityTrend) || 0
      
      // Difficulty factors:
      // - Low average quality = harder
      // - Low ease factor = harder
      // - Negative quality trend = getting harder
      // - More attempts with low quality = harder
      const difficultyScore = Math.max(0, Math.min(100,
        (5 - avgQuality) * 15 + // Quality component (0-75)
        (2.5 - latestEaseFactor) * 10 + // Ease factor component (0-12)
        (qualityTrend < 0 ? Math.abs(qualityTrend) * 5 : 0) + // Trend component
        (attemptCount > 5 && avgQuality < 3 ? 10 : 0) // Stuck words bonus
      ))
      
      return {
        vocabularyId: word.vocabularyId,
        term: word.term,
        translation: word.translation,
        difficultyScore: Math.round(difficultyScore),
        avgQuality: Math.round(avgQuality * 10) / 10,
        attemptCount,
        latestEaseFactor: Math.round(latestEaseFactor * 10) / 10,
        qualityTrend: Math.round(qualityTrend * 10) / 10,
        category: difficultyScore >= 70 ? "very_hard" : 
                  difficultyScore >= 50 ? "hard" : 
                  difficultyScore >= 30 ? "medium" : "easy",
      }
    })

    // 2. Learning Curves
    // Track quality progression over time for words with multiple reviews
    const learningCurves = await db
      .select({
        vocabularyId: reviewAttempts.vocabularyId,
        term: vocabulary.term,
        createdAt: sql<string>`DATE(${reviewAttempts.createdAt})`,
        quality: reviewAttempts.quality,
        attemptNumber: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${reviewAttempts.vocabularyId} ORDER BY ${reviewAttempts.createdAt})`,
      })
      .from(reviewAttempts)
      .innerJoin(vocabulary, eq(reviewAttempts.vocabularyId, vocabulary.id))
      .where(
        and(
          eq(reviewAttempts.userId, user.id),
          gte(reviewAttempts.createdAt, since)
        )
      )
      .orderBy(reviewAttempts.vocabularyId, reviewAttempts.createdAt)

    // Group by vocabulary ID and calculate curve
    const curvesByWord = new Map<string, Array<{ attemptNumber: number; quality: number; date: string }>>()
    for (const curve of learningCurves) {
      const vocabId = curve.vocabularyId
      if (!curvesByWord.has(vocabId)) {
        curvesByWord.set(vocabId, [])
      }
      curvesByWord.get(vocabId)!.push({
        attemptNumber: Number(curve.attemptNumber),
        quality: curve.quality,
        date: curve.createdAt,
      })
    }

    // Get vocabulary terms for learning curves
    const vocabIds = Array.from(curvesByWord.keys())
    const vocabTerms = vocabIds.length > 0 ? await db
      .select({
        id: vocabulary.id,
        term: vocabulary.term,
      })
      .from(vocabulary)
      .where(
        and(
          eq(vocabulary.userId, user.id),
          sql`${vocabulary.id} IN (${sql.join(vocabIds.map(id => sql`${id}`), sql`, `)})`
        )
      ) : []
    
    const vocabMap = new Map(vocabTerms.map(v => [v.id, v.term]))

    // Calculate learning curve metrics (slope, improvement rate)
    const learningCurveAnalysis = Array.from(curvesByWord.entries())
      .filter(([_, points]) => points.length >= 3) // Need at least 3 data points
      .map(([vocabId, points]) => {
        // Calculate linear regression slope (improvement rate)
        const n = points.length
        const sumX = points.reduce((sum, p) => sum + p.attemptNumber, 0)
        const sumY = points.reduce((sum, p) => sum + p.quality, 0)
        const sumXY = points.reduce((sum, p) => sum + p.attemptNumber * p.quality, 0)
        const sumX2 = points.reduce((sum, p) => sum + p.attemptNumber * p.attemptNumber, 0)
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
        const avgQuality = sumY / n
        const firstQuality = points[0].quality
        const lastQuality = points[points.length - 1].quality
        const improvement = lastQuality - firstQuality
        
        return {
          vocabularyId: vocabId,
          term: vocabMap.get(vocabId) || "Unknown",
          attempts: points.length,
          slope: Math.round(slope * 100) / 100, // Quality improvement per attempt
          avgQuality: Math.round(avgQuality * 10) / 10,
          firstQuality,
          lastQuality,
          improvement: Math.round(improvement * 10) / 10,
          trend: slope > 0.1 ? "improving" : slope < -0.1 ? "declining" : "stable",
          points: points.slice(0, 10), // Limit to last 10 points
        }
      })
      .sort((a, b) => b.attempts - a.attempts) // Sort by number of attempts
      .slice(0, 20) // Top 20 words with most data

    // 3. Retention Rates
    // Calculate retention rate over different time periods
    const retentionAnalysis = await db
      .select({
        daysSinceReview: sql<number>`EXTRACT(EPOCH FROM (NOW() - ${reviewAttempts.createdAt})) / 86400`,
        quality: reviewAttempts.quality,
        vocabularyId: reviewAttempts.vocabularyId,
      })
      .from(reviewAttempts)
      .where(
        and(
          eq(reviewAttempts.userId, user.id),
          gte(reviewAttempts.createdAt, since)
        )
      )

    // Group by time buckets and calculate retention
    const retentionBuckets = [
      { label: "1 day", maxDays: 1 },
      { label: "3 days", maxDays: 3 },
      { label: "7 days", maxDays: 7 },
      { label: "14 days", maxDays: 14 },
      { label: "30 days", maxDays: 30 },
      { label: "60+ days", maxDays: Infinity },
    ]

    const retentionRates = retentionBuckets.map((bucket) => {
      const bucketAttempts = retentionAnalysis.filter((attempt) => {
        const days = Number(attempt.daysSinceReview)
        return days <= bucket.maxDays && 
               (bucket.maxDays === Infinity || days > (retentionBuckets[retentionBuckets.indexOf(bucket) - 1]?.maxDays || 0))
      })
      
      const total = bucketAttempts.length
      const successful = bucketAttempts.filter(a => a.quality >= 4).length
      const retentionRate = total > 0 ? (successful / total) * 100 : 0
      
      return {
        period: bucket.label,
        totalAttempts: total,
        successfulAttempts: successful,
        retentionRate: Math.round(retentionRate * 10) / 10,
      }
    })

    // 4. Mastery Levels Distribution
    // Categorize words by mastery level based on repetitions and ease factor
    const masteryDistribution = await db
      .select({
        vocabularyId: reviewAttempts.vocabularyId,
        maxRepetitions: sql<number>`MAX(${reviewAttempts.newRepetitions})`,
        latestEaseFactor: sql<number>`MAX(${reviewAttempts.newEaseFactor})`,
        latestQuality: sql<number>`MAX(CASE WHEN ${reviewAttempts.createdAt} = (SELECT MAX(created_at) FROM review_attempts WHERE vocabulary_id = ${reviewAttempts.vocabularyId} AND user_id = ${user.id}) THEN ${reviewAttempts.quality} ELSE NULL END)`,
      })
      .from(reviewAttempts)
      .where(eq(reviewAttempts.userId, user.id))
      .groupBy(reviewAttempts.vocabularyId)

    const masteryLevels = {
      mastered: 0, // repetitions >= 5, easeFactor >= 2.3, recent quality >= 4
      learning: 0, // repetitions 2-4, or easeFactor 1.8-2.3
      new: 0, // repetitions 0-1
      struggling: 0, // repetitions >= 2 but easeFactor < 1.8 or recent quality < 3
    }

    for (const word of masteryDistribution) {
      const reps = Number(word.maxRepetitions) || 0
      const easeFactor = Number(word.latestEaseFactor) || 2.5
      const recentQuality = Number(word.latestQuality) || 0
      
      if (reps >= 5 && easeFactor >= 2.3 && recentQuality >= 4) {
        masteryLevels.mastered++
      } else if (reps >= 2 && easeFactor >= 1.8 && recentQuality >= 3) {
        masteryLevels.learning++
      } else if (reps <= 1) {
        masteryLevels.new++
      } else {
        masteryLevels.struggling++
      }
    }

    return NextResponse.json({
      period: {
        days,
        since: since.toISOString(),
      },
      wordDifficulty: difficultyAnalysis.slice(0, 50), // Top 50 hardest words
      learningCurves: learningCurveAnalysis,
      retentionRates,
      masteryDistribution: masteryLevels,
      summary: {
        totalWordsAnalyzed: difficultyAnalysis.length,
        veryHardWords: difficultyAnalysis.filter(w => w.category === "very_hard").length,
        hardWords: difficultyAnalysis.filter(w => w.category === "hard").length,
        mediumWords: difficultyAnalysis.filter(w => w.category === "medium").length,
        easyWords: difficultyAnalysis.filter(w => w.category === "easy").length,
        wordsWithCurves: learningCurveAnalysis.length,
        avgRetentionRate: retentionRates.reduce((sum, r) => sum + r.retentionRate, 0) / retentionRates.length,
      },
    })
  } catch (error) {
    console.error("Error fetching advanced analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch advanced analytics" },
      { status: 500 }
    )
  }
}

