"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RotateCcw, Loader2 } from "lucide-react"
import { 
  generateExercise, 
  generateMatchingPairsExercise,
  selectExerciseType,
  type Exercise,
  type VocabularyItem 
} from "@/lib/exercises"
import { MeaningInContextExercise } from "@/components/exercises/meaning-in-context"
import { ClozeBlankExercise } from "@/components/exercises/cloze-blank"
import { ReverseMcqExercise } from "@/components/exercises/reverse-mcq"
import { MatchingPairsExercise } from "@/components/exercises/matching-pairs"
import { Footer } from "@/components/footer"

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
    termNormalized?: string
    translation: string
    context: string
    kind?: "word" | "phrase"
    bookId: string
  }
}

export default function ReviewPage() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [allVocab, setAllVocab] = useState<VocabularyItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null)
  const [isMatchingPairs, setIsMatchingPairs] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchDueFlashcards()
    fetchAllVocab()
  }, [])

  useEffect(() => {
    if (flashcards.length > 0 && allVocab.length > 0) {
      generateCurrentExercise()
    }
  }, [flashcards, allVocab, currentIndex])

  const fetchDueFlashcards = async () => {
    try {
      const res = await fetch("/api/flashcards?due=true")
      const data = await res.json()
      setFlashcards(data)
      setCurrentIndex(0)
    } catch (error) {
      console.error("Error fetching flashcards:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllVocab = async () => {
    try {
      const res = await fetch("/api/vocabulary")
      const data = await res.json()
      // Transform to VocabularyItem format
      const vocabItems: VocabularyItem[] = data.map((item: any) => ({
        id: item.id,
        term: item.term,
        termNormalized: item.termNormalized,
        translation: item.translation,
        context: item.context,
        kind: item.kind || "word",
        bookId: item.bookId,
        epubLocation: item.epubLocation,
        pageNumber: item.pageNumber,
      }))
      setAllVocab(vocabItems)
    } catch (error) {
      console.error("Error fetching vocabulary:", error)
    }
  }

  const generateCurrentExercise = () => {
    if (flashcards.length === 0 || allVocab.length === 0) return

    const current = flashcards[currentIndex]
    if (!current) return

    // Every 5th exercise, show matching pairs (if we have enough items)
    if (currentIndex % 5 === 0 && flashcards.length >= 5) {
      const itemsForMatching = flashcards
        .slice(currentIndex, currentIndex + 5)
        .map(fc => ({
          id: fc.vocabulary.id,
          term: fc.vocabulary.term,
          termNormalized: fc.vocabulary.termNormalized,
          translation: fc.vocabulary.translation,
          context: fc.vocabulary.context,
          kind: fc.vocabulary.kind || "word" as const,
          bookId: fc.vocabulary.bookId,
        }))
      
      if (itemsForMatching.length >= 5) {
        const matchingExercise = generateMatchingPairsExercise(itemsForMatching)
        if (matchingExercise) {
          setCurrentExercise(matchingExercise)
          setIsMatchingPairs(true)
          return
        }
        // If matching fails, fall through to regular exercise
      }
    }

    // Regular exercise for single vocabulary item
    const vocabItem: VocabularyItem = {
      id: current.vocabulary.id,
      term: current.vocabulary.term,
      termNormalized: current.vocabulary.termNormalized,
      translation: current.vocabulary.translation,
      context: current.vocabulary.context,
      kind: current.vocabulary.kind || "word",
      bookId: current.vocabulary.bookId,
    }

    const exercise = generateExercise(
      vocabItem,
      allVocab,
      undefined,
      current.flashcard.repetitions
    )
    
    // If exercise generation fails, we'll show flashcard fallback
    if (exercise) {
      setCurrentExercise(exercise)
      setIsMatchingPairs(false)
    } else {
      // Fallback: use flashcard mode (will be handled in render)
      setCurrentExercise(null)
      setIsMatchingPairs(false)
    }
  }

  const convertAnswerToQuality = (isCorrect: boolean, timeMs: number): number => {
    if (!isCorrect) return 0 // Again
    
    // Fast = easy, slow = good
    const fastThreshold = 3000 // 3 seconds
    if (timeMs < fastThreshold) {
      return 5 // Easy
    }
    return 4 // Good
  }

  const handleExerciseAnswer = async (isCorrect: boolean, timeMs: number) => {
    if (isMatchingPairs && currentExercise) {
      // For matching pairs, update all 5 flashcards
      const ids = currentExercise.vocabularyId.split(",")
      const quality = convertAnswerToQuality(isCorrect, timeMs)
      
      setUpdating(true)
      try {
        // Update all flashcards in the matching pair
        for (const id of ids) {
          const flashcard = flashcards.find(fc => fc.vocabulary.id === id)
          if (flashcard) {
            await fetch("/api/flashcards", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                flashcardId: flashcard.flashcard.id,
                quality,
              }),
            })
          }
        }
        
        // Move forward by 5 (or remaining)
        const nextIndex = Math.min(currentIndex + 5, flashcards.length)
        if (nextIndex >= flashcards.length) {
          await fetchDueFlashcards()
        } else {
          setCurrentIndex(nextIndex)
        }
      } catch (error) {
        console.error("Error updating flashcards:", error)
      } finally {
        setUpdating(false)
      }
    } else {
      // Single exercise
      const current = flashcards[currentIndex]
      if (!current) return

      const quality = convertAnswerToQuality(isCorrect, timeMs)
      
      setUpdating(true)
      try {
        await fetch("/api/flashcards", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flashcardId: current.flashcard.id,
            quality,
          }),
        })

        // Move to next card or refresh if done
        if (currentIndex < flashcards.length - 1) {
          setCurrentIndex(currentIndex + 1)
        } else {
          await fetchDueFlashcards()
        }
      } catch (error) {
        console.error("Error updating flashcard:", error)
      } finally {
        setUpdating(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-xl page-transition">
        <div className="min-h-screen flex flex-col items-center justify-center px-4 md:px-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
            <p className="text-muted-foreground font-medium">Preparing your review session...</p>
          </div>
        </div>
      </div>
    )
  }

  if (flashcards.length === 0) {
    return (
      <div className="max-w-4xl mx-auto page-transition flex flex-col min-h-[calc(100vh-4rem-8rem)]">
        <div className="text-center py-16 fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--c-light)] mb-5 pulse-subtle">
            <RotateCcw className="h-10 w-10 text-[var(--c-soft)]" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">All caught up!</h2>
          <p className="text-muted-foreground text-lg mb-4 max-w-md mx-auto">
            You've completed all your reviews for now. Keep reading to discover new words and continue your learning journey.
          </p>
          <p className="text-sm text-muted-foreground/70 mb-6 max-w-md mx-auto italic">
            Your reading companion for learning English
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/library">
              <Button size="default" className="font-medium shadow-soft hover:shadow-elevated transition-all">
                Continue Reading
              </Button>
            </a>
            <a href="/vocab">
              <Button variant="outline" size="default" className="font-medium">
                View Vocabulary
              </Button>
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (!currentExercise) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-xl page-transition">
        <div className="min-h-screen flex flex-col items-center justify-center px-4 md:px-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
            <p className="text-muted-foreground font-medium">Preparing your next exercise...</p>
          </div>
        </div>
      </div>
    )
  }

  if (updating) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-xl page-transition">
        <div className="min-h-screen flex flex-col items-center justify-center px-4 md:px-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
            <p className="text-muted-foreground font-medium">Saving your progress...</p>
          </div>
        </div>
      </div>
    )
  }

  const renderExercise = () => {
    if (isMatchingPairs && currentExercise.metadata?.pairs) {
      return (
        <MatchingPairsExercise
          exercise={currentExercise as Exercise & { pairs: Array<{ term: string; translation: string; id: string }> }}
          onAnswer={handleExerciseAnswer}
        />
      )
    }

    switch (currentExercise.type) {
      case "meaning-in-context":
        return (
          <MeaningInContextExercise
            exercise={currentExercise}
            onAnswer={handleExerciseAnswer}
          />
        )
      case "cloze-blank":
        return (
          <ClozeBlankExercise
            exercise={currentExercise}
            onAnswer={handleExerciseAnswer}
          />
        )
      case "reverse-mcq":
        return (
          <ReverseMcqExercise
            exercise={currentExercise}
            onAnswer={handleExerciseAnswer}
          />
        )
      default:
        return (
          <MeaningInContextExercise
            exercise={currentExercise}
            onAnswer={handleExerciseAnswer}
          />
        )
    }
  }

  const progressPercentage = ((currentIndex + 1) / flashcards.length) * 100

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-xl page-transition overflow-y-auto flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 py-8">
        {/* Minimal Header */}
        <div className="w-full max-w-2xl mb-6 fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              Exercise {currentIndex + 1} of {flashcards.length}
            </div>
            {/* Progress Bar */}
            <div className="flex-1 mx-4 bg-muted/50 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary via-primary/90 to-primary/80 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {Math.round(progressPercentage)}%
            </div>
          </div>
        </div>

        {/* Center Card */}
        <div className="w-full max-w-2xl fade-in-delay">
          <div className="bento-card p-6 md:p-8 shadow-elevated">
            {renderExercise()}
          </div>
        </div>
      </div>
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  )
}


