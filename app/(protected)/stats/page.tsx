"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Target, Clock, Flame, BarChart3, Loader2 } from "lucide-react"
import { Footer } from "@/components/footer"
import { ReviewReminderSettings } from "@/components/review-reminder-settings"

interface ReviewStats {
  period: {
    days: number
    since: string
  }
  summary: {
    totalAttempts: number
    successRate: number
    successCount: number
    currentStreak: number
    avgResponseTimeMs: number | null
  }
  hardestWords: Array<{
    vocabularyId: string
    term: string
    translation: string
    avgQuality: number
    attemptCount: number
  }>
  activityByDay: Array<{
    date: string
    count: number
  }>
  exerciseTypes: Array<{
    type: string
    count: number
    avgQuality: number
  }>
}

export default function StatsPage() {
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetchStats()
  }, [days])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/reviews/stats?days=${days}`)
      if (!res.ok) throw new Error("Failed to fetch stats")
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No statistics available yet.</p>
          <a href="/review">
            <Button>Start Reviewing</Button>
          </a>
        </div>
      </div>
    )
  }

  const maxActivity = Math.max(...stats.activityByDay.map(d => d.count), 1)

  return (
    <div className="min-h-screen flex flex-col page-transition">
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-8 fade-in">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Review Statistics</h1>
          <p className="text-muted-foreground">
            Track your learning progress and identify areas for improvement
          </p>
        </div>

        {/* Period Selector */}
        <div className="mb-6 flex gap-2 fade-in-delay">
          {[7, 30, 90, 365].map((d) => (
            <Button
              key={d}
              variant={days === d ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(d)}
            >
              {d === 7 ? "7 days" : d === 30 ? "30 days" : d === 90 ? "90 days" : "1 year"}
            </Button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bento-card fade-in-delay">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">Total Reviews</div>
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold">{stats.summary.totalAttempts}</div>
            </CardContent>
          </Card>

          <Card className="bento-card fade-in-delay">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">Success Rate</div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold">{stats.summary.successRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.summary.successCount} successful
              </div>
            </CardContent>
          </Card>

          <Card className="bento-card fade-in-delay">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">Current Streak</div>
                <Flame className="h-4 w-4 text-orange-500" />
              </div>
              <div className="text-3xl font-bold">{stats.summary.currentStreak}</div>
              <div className="text-xs text-muted-foreground mt-1">days in a row</div>
            </CardContent>
          </Card>

          <Card className="bento-card fade-in-delay">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">Avg Response Time</div>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold">
                {stats.summary.avgResponseTimeMs
                  ? `${(stats.summary.avgResponseTimeMs / 1000).toFixed(1)}s`
                  : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Chart and Hardest Words */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Activity Chart */}
          <Card className="bento-card fade-in-delay">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Review Activity
              </h2>
              {stats.activityByDay.length > 0 ? (
                <div className="space-y-2">
                  {stats.activityByDay.slice(-14).map((day) => (
                    <div key={day.date} className="flex items-center gap-3">
                      <div className="text-xs text-muted-foreground w-20">
                        {new Date(day.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all"
                          style={{ width: `${(day.count / maxActivity) * 100}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                          {day.count}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No activity data available</p>
              )}
            </CardContent>
          </Card>

          {/* Hardest Words */}
          <Card className="bento-card fade-in-delay">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-500" />
                Hardest Words
              </h2>
              {stats.hardestWords.length > 0 ? (
                <div className="space-y-3">
                  {stats.hardestWords.map((word, index) => (
                    <div
                      key={word.vocabularyId}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{word.term}</div>
                        <div className="text-sm text-muted-foreground">{word.translation}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {word.attemptCount} attempts
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-orange-500">
                          {word.avgQuality.toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">avg quality</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Not enough data yet. Keep reviewing to see your hardest words!
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Exercise Type Distribution */}
        {stats.exerciseTypes.length > 0 && (
          <Card className="bento-card fade-in-delay mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Exercise Type Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.exerciseTypes.map((type) => (
                  <div
                    key={type.type}
                    className="p-4 bg-muted/50 rounded-lg text-center"
                  >
                    <div className="text-sm text-muted-foreground mb-1">
                      {type.type.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </div>
                    <div className="text-2xl font-bold mb-1">{type.count}</div>
                    <div className="text-xs text-muted-foreground">
                      Avg: {type.avgQuality.toFixed(1)}/5
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review Reminder Settings */}
        <div className="mb-8 fade-in-delay">
          <ReviewReminderSettings />
        </div>

        {/* Call to Action */}
        <div className="text-center fade-in-delay">
          <a href="/review">
            <Button size="lg" className="font-medium">
              Continue Reviewing
            </Button>
          </a>
        </div>
      </div>
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  )
}

