"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RotateCcw, X, Check } from "lucide-react"

interface Flashcard {
  flashcard: {
    id: string
    easeFactor: number
    interval: number
    repetitions: number
    dueAt: string
  }
  vocabulary: {
    id: string
    term: string
    translation: string
    context: string
  }
}

export default function ReviewPage() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchDueFlashcards()
  }, [])

  const fetchDueFlashcards = async () => {
    try {
      const res = await fetch("/api/flashcards?due=true")
      const data = await res.json()
      setFlashcards(data)
      setCurrentIndex(0)
      setShowAnswer(false)
    } catch (error) {
      console.error("Error fetching flashcards:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuality = async (quality: number) => {
    if (!flashcards[currentIndex]) return

    setUpdating(true)
    try {
      await fetch("/api/flashcards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flashcardId: flashcards[currentIndex].flashcard.id,
          quality,
        }),
      })

      // Move to next card or refresh if done
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setShowAnswer(false)
      } else {
        await fetchDueFlashcards()
      }
    } catch (error) {
      console.error("Error updating flashcard:", error)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading flashcards...</div>
  }

  if (flashcards.length === 0) {
    return (
      <div className="text-center py-12">
        <RotateCcw className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-bold mb-2">All caught up!</h2>
        <p className="text-muted-foreground">
          You have no flashcards due for review.
        </p>
      </div>
    )
  }

  const current = flashcards[currentIndex]
  if (!current) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6">
      <div className="mb-8 md:mb-12 text-center">
        <h1 className="text-3xl font-bold mb-3 tracking-tight md:text-4xl">Review</h1>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>Card {currentIndex + 1} of {flashcards.length}</span>
          <span>•</span>
          <span>{flashcards.length} {flashcards.length === 1 ? "card" : "cards"} due</span>
        </div>
      </div>

      <Card className="min-h-[500px] flex flex-col shadow-lg">
        <CardContent className="flex-1 flex flex-col items-center justify-center p-8 md:p-12">
          {!showAnswer ? (
            <div className="text-center space-y-6 w-full">
              <div className="text-4xl font-bold mb-8">
                {current.vocabulary.term}
              </div>
              <Button
                onClick={() => setShowAnswer(true)}
                size="lg"
                className="w-full max-w-xs"
              >
                Show Answer
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-6 w-full">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Term:</p>
                  <p className="text-2xl font-bold">{current.vocabulary.term}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Translation (Greek):
                  </p>
                  <p className="text-xl">{current.vocabulary.translation}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Context:</p>
                  <p className="text-sm italic text-muted-foreground">
                    "{current.vocabulary.context}"
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full max-w-md mx-auto mt-8">
                <p className="text-sm font-medium mb-1 text-center">How well did you know this?</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="destructive"
                    onClick={() => handleQuality(0)}
                    disabled={updating}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Again (0)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleQuality(2)}
                    disabled={updating}
                  >
                    Hard (2)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleQuality(4)}
                    disabled={updating}
                    className="flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Good (4)
                  </Button>
                  <Button
                    onClick={() => handleQuality(5)}
                    disabled={updating}
                    className="flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Easy (5)
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

