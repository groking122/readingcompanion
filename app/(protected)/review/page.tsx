"use client"

import { useState, useEffect, useCallback, useReducer } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"
import { RotateCcw, Loader2 } from "lucide-react"
import { 
  generateExercise, 
  generateMatchingPairsExercise,
  selectExerciseType,
  type Exercise,
  type VocabularyItem 
} from "@/lib/exercises"
import { trackMetric, logError, logWarning } from "@/lib/metrics"
import { offlineManager } from "@/lib/offline"

// Exercise state machine
type ExerciseState = 
  | { type: 'loading' }
  | { type: 'ready', exercise: Exercise, isMatchingPairs: boolean, flashcardIds: string[] }
  | { type: 'error', error: string, retryable: boolean }

type ExerciseAction =
  | { type: 'GENERATE_START' }
  | { type: 'GENERATE_SUCCESS', exercise: Exercise, isMatchingPairs: boolean, flashcardIds: string[] }
  | { type: 'GENERATE_ERROR', error: string, retryable: boolean }
  | { type: 'RESET' }

function exerciseReducer(state: ExerciseState, action: ExerciseAction): ExerciseState {
  switch (action.type) {
    case 'GENERATE_START':
      return { type: 'loading' }
    case 'GENERATE_SUCCESS':
      return {
        type: 'ready',
        exercise: action.exercise,
        isMatchingPairs: action.isMatchingPairs,
        flashcardIds: action.flashcardIds,
      }
    case 'GENERATE_ERROR':
      return {
        type: 'error',
        error: action.error,
        retryable: action.retryable,
      }
    case 'RESET':
      return { type: 'loading' }
    default:
      return state
  }
}
import { MeaningInContextExercise } from "@/components/exercises/meaning-in-context"
import { ClozeBlankExercise } from "@/components/exercises/cloze-blank"
import { ReverseMcqExercise } from "@/components/exercises/reverse-mcq"
import { MatchingPairsExercise } from "@/components/exercises/matching-pairs"
import { Footer } from "@/components/footer"
import { SwipeDetector } from "@/components/swipe-detector"

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
  const [exerciseState, dispatchExercise] = useReducer(exerciseReducer, { type: 'loading' })
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [consumedFlashcards, setConsumedFlashcards] = useState(0) // Track consumed flashcards for progress
  const [lockedAttemptId, setLockedAttemptId] = useState<string | null>(null) // Prevent double-submit
  const [sessionStartedAt] = useState<string>(new Date().toISOString()) // Track session start for concurrency
  const [lastActivityAt, setLastActivityAt] = useState<Date>(new Date()) // Track last activity for stuck session detection
  const [exerciseAnswered, setExerciseAnswered] = useState(false) // Track if current exercise has been answered
  const [timeLimit, setTimeLimit] = useState<number | null>(null) // Time limit in minutes (null = no limit)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null) // Time remaining in seconds
  const [showTimeLimitSelector, setShowTimeLimitSelector] = useState(false)
  
  // Derived state from exercise state machine
  const currentExercise = exerciseState.type === 'ready' ? exerciseState.exercise : null
  const isMatchingPairs = exerciseState.type === 'ready' ? exerciseState.isMatchingPairs : false
  const matchingPairsFlashcardIds = exerciseState.type === 'ready' ? exerciseState.flashcardIds : []

  useEffect(() => {
    fetchDueFlashcards()
    fetchAllVocab()
  }, [])
  
  // Show time limit selector when flashcards are first loaded
  useEffect(() => {
    if (flashcards.length > 0 && !loading && timeLimit === null && !showTimeLimitSelector) {
      setShowTimeLimitSelector(true)
    }
  }, [flashcards.length, loading, timeLimit])
  
  const handleTimeLimitReached = useCallback(async () => {
    // Save current progress before ending session
    if (updating) return
    
    // Show completion message
    alert(`Time's up! You've completed ${consumedFlashcards} exercises. Great work!`)
    
    // Refresh to get new flashcards
    await fetchDueFlashcards()
    setTimeLimit(null)
    setTimeRemaining(null)
  }, [updating, consumedFlashcards])
  
  // Timer effect for time-limited sessions
  useEffect(() => {
    if (timeLimit === null || timeRemaining === null) return
    
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          // Time's up - end session gracefully
          handleTimeLimitReached()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [timeLimit, timeRemaining, handleTimeLimitReached])
  
  const startSessionWithTimeLimit = (minutes: number) => {
    setTimeLimit(minutes)
    setTimeRemaining(minutes * 60)
    setShowTimeLimitSelector(false)
  }

  const generateCurrentExercise = useCallback(() => {
    if (flashcards.length === 0 || allVocab.length === 0) {
      dispatchExercise({ type: 'GENERATE_START' })
      return
    }

    const current = flashcards[currentIndex]
    if (!current) {
      dispatchExercise({ type: 'GENERATE_ERROR', error: 'No flashcard at current index', retryable: false })
      return
    }

    dispatchExercise({ type: 'GENERATE_START' })

    try {
      // Every 5th exercise (after first block), show matching pairs (if we have enough items)
      // Trigger after first block: (currentIndex + 1) % 5 === 0 means we're at index 4, 9, 14, etc.
      if (currentIndex > 0 && (currentIndex + 1) % 5 === 0 && flashcards.length - currentIndex >= 5) {
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
        
        if (itemsForMatching.length === 5) {
          const matchingExercise = generateMatchingPairsExercise(itemsForMatching)
          // Verify we have exactly 5 pairs (no duplicates filtered out)
          if (matchingExercise && matchingExercise.pairs.length === 5) {
            // Map flashcard IDs to the vocabulary IDs that were actually selected
            // Create a map from vocabulary ID to flashcard ID
            const vocabToFlashcardMap = new Map(
              flashcards
                .slice(currentIndex, currentIndex + 5)
                .map(fc => [fc.vocabulary.id, fc.flashcard.id])
            )
            // Get flashcard IDs for the selected pairs
            const flashcardIds = matchingExercise.pairs
              .map(pair => vocabToFlashcardMap.get(pair.id))
              .filter((id): id is string => id !== undefined)
            
            // Only proceed if we have exactly 5 flashcard IDs
            if (flashcardIds.length === 5) {
              dispatchExercise({
                type: 'GENERATE_SUCCESS',
                exercise: matchingExercise,
                isMatchingPairs: true,
                flashcardIds,
              })
              return
            }
          } else {
            // Matching pairs generation failed
            trackMetric("exercise_generation_fail", {
              userId: undefined,
              sessionId: sessionStartedAt,
              metadata: {
                exerciseType: "matching-pairs",
                reason: matchingExercise ? "insufficient_pairs" : "generation_failed",
                pairsGenerated: matchingExercise?.pairs.length || 0,
              },
            })
          }
        } else {
          // Not enough items for matching pairs
          trackMetric("exercise_generation_fail", {
            userId: undefined,
            sessionId: sessionStartedAt,
            metadata: {
              exerciseType: "matching-pairs",
              reason: "insufficient_items",
              itemsAvailable: itemsForMatching.length,
            },
          })
        }
        // If matching fails or doesn't have exactly 5 pairs, fall through to regular exercise
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
      
      // If exercise generation fails, show error state
      if (exercise) {
        dispatchExercise({
          type: 'GENERATE_SUCCESS',
          exercise,
          isMatchingPairs: false,
          flashcardIds: [],
        })
      } else {
        // Fallback: exercise generation failed, but retryable
        trackMetric("exercise_generation_fail", {
          userId: undefined, // Will be set if available
          sessionId: sessionStartedAt,
          metadata: {
            vocabularyId: vocabItem.id,
            exerciseType: "single",
            reason: "generation_returned_null",
          },
        })
        
        dispatchExercise({
          type: 'GENERATE_ERROR',
          error: 'Failed to generate exercise',
          retryable: true,
        })
      }
    } catch (error) {
      trackMetric("exercise_generation_fail", {
        userId: undefined,
        sessionId: sessionStartedAt,
        metadata: {
          vocabularyId: current.vocabulary.id,
          exerciseType: "single",
          reason: "exception",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      })
      logError("Exercise generation exception", error, {
        sessionId: sessionStartedAt,
        endpoint: "review-page",
        metadata: { vocabularyId: current.vocabulary.id },
      })
      
      dispatchExercise({
        type: 'GENERATE_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      })
    }
  }, [flashcards, allVocab, currentIndex])

  useEffect(() => {
    if (flashcards.length > 0 && allVocab.length > 0) {
      dispatchExercise({ type: 'RESET' })
      generateCurrentExercise()
      setLastActivityAt(new Date()) // Update activity timestamp
      setExerciseAnswered(false) // Reset answered state for new exercise
    }
  }, [flashcards, allVocab, currentIndex, generateCurrentExercise])
  
  // Detect stuck sessions (no activity for 5 minutes)
  useEffect(() => {
    const checkStuckSession = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityAt.getTime()
      const STUCK_THRESHOLD = 5 * 60 * 1000 // 5 minutes
      
      if (timeSinceLastActivity > STUCK_THRESHOLD && flashcards.length > 0) {
        trackMetric("stuck_session", {
          sessionId: sessionStartedAt,
          metadata: {
            timeSinceLastActivity: Math.floor(timeSinceLastActivity / 1000),
            flashcardsRemaining: flashcards.length - consumedFlashcards,
          },
        })
        logWarning("Stuck session detected", {
          sessionId: sessionStartedAt,
          endpoint: "review-page",
          metadata: {
            timeSinceLastActivity: Math.floor(timeSinceLastActivity / 1000),
            flashcardsRemaining: flashcards.length - consumedFlashcards,
          },
        })
      }
    }, 60000) // Check every minute
    
    return () => clearInterval(checkStuckSession)
  }, [lastActivityAt, sessionStartedAt, flashcards.length, consumedFlashcards])

  const fetchDueFlashcards = async () => {
    try {
      const res = await fetch("/api/flashcards?due=true")
      if (!res.ok) throw new Error("Failed to fetch")
      
      const data = await res.json()
      setFlashcards(data)
      setCurrentIndex(0)
      setConsumedFlashcards(0) // Reset consumed count when fetching new flashcards
      
      // Cache flashcards for offline use
      if (offlineManager.isOnline()) {
        await offlineManager.cacheFlashcards(
          data.map((fc: any) => ({
            id: fc.flashcard.id,
            flashcard: fc.flashcard,
            vocabulary: fc.vocabulary,
          }))
        )
      }
    } catch (error) {
      console.error("Error fetching flashcards:", error)
      
      // Try to load from cache if offline
      if (!offlineManager.isOnline()) {
        try {
          const cached = await offlineManager.getCachedFlashcards()
          if (cached.length > 0) {
            setFlashcards(
              cached.map((c) => ({
                flashcard: c.flashcard,
                vocabulary: c.vocabulary,
              }))
            )
            setCurrentIndex(0)
            setConsumedFlashcards(0)
          }
        } catch (cacheError) {
          console.error("Error loading cached flashcards:", cacheError)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchAllVocab = async () => {
    try {
      // First, try distractor pool endpoint (optimized for performance)
      let vocabItems: VocabularyItem[] = []
      let usedDistractorPool = false
      
      try {
        const distractorRes = await fetch("/api/vocabulary/distractors?count=200")
        if (distractorRes.ok) {
          const distractorData = await distractorRes.json()
          // Transform to VocabularyItem format
          vocabItems = distractorData.map((item: any) => ({
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
          
          // Check if we have enough items for good distractor variety
          // If we have fewer than 50 items, fallback to full fetch
          if (vocabItems.length >= 50) {
            usedDistractorPool = true
            setAllVocab(vocabItems)
            return
          } else {
            console.warn(`Distractor pool returned only ${vocabItems.length} items, falling back to full fetch`)
            trackMetric("distractor_pool_fallback", {
              sessionId: sessionStartedAt,
              metadata: { reason: "insufficient_items", count: vocabItems.length },
            })
          }
        } else {
          console.warn("Distractor pool request failed, falling back to full fetch")
          trackMetric("distractor_pool_fallback", {
            sessionId: sessionStartedAt,
            metadata: { reason: "request_failed", status: distractorRes.status },
          })
        }
      } catch (distractorError) {
        console.warn("Error fetching distractor pool, falling back to full fetch:", distractorError)
        trackMetric("distractor_pool_fallback", {
          sessionId: sessionStartedAt,
          metadata: { reason: "exception", error: distractorError instanceof Error ? distractorError.message : String(distractorError) },
        })
      }
      
      // Fallback to full vocabulary fetch
      if (!usedDistractorPool) {
        const res = await fetch("/api/vocabulary")
        const data = await res.json()
        // Transform to VocabularyItem format
        vocabItems = data.map((item: any) => ({
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
      }
    } catch (error) {
      console.error("Error fetching vocabulary:", error)
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

  const handleExerciseAnswer = async (
    isCorrectOrQualities: boolean | Array<{ flashcardId: string; quality: number; responseMs: number }>,
    timeMs?: number
  ) => {
    // Prevent double-submit
    if (exerciseAnswered || updating) {
      return
    }
    setExerciseAnswered(true)
    
    // Generate attempt ID to prevent double-submit
    const attemptId = `${isMatchingPairs ? 'matching' : 'single'}-${currentIndex}-${Date.now()}`
    
    // Check if already processing this attempt
    if (lockedAttemptId === attemptId) {
      return // Already processing, ignore duplicate submission
    }
    
    setLockedAttemptId(attemptId)
    
    // Check if this is per-item quality array (matching pairs) or single answer
    const isPerItemQuality = Array.isArray(isCorrectOrQualities)
    
    if (isMatchingPairs && isPerItemQuality && matchingPairsFlashcardIds.length > 0) {
      // For matching pairs with per-item quality tracking
      const itemQualities = isCorrectOrQualities as Array<{ flashcardId: string; quality: number; responseMs: number }>
      const totalTimeMs = timeMs || 0
      
      setUpdating(true)
      try {
        const sessionId = `session-${sessionStartedAt}`
        const batchAttemptId = `batch-${attemptId}`
        
        const response = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            attemptId: batchAttemptId,
            sessionStartedAt,
            items: itemQualities.map(item => ({
              flashcardId: item.flashcardId,
              quality: item.quality,
              responseMs: item.responseMs,
              exerciseType: "matching-pairs",
            })),
          }),
        })

        if (response.status === 409) {
          // Session out of sync - refresh and show message
          const errorData = await response.json()
          console.warn("Session out of sync:", errorData)
          alert("Your session is out of sync. Refreshing...")
          await fetchDueFlashcards()
          setLockedAttemptId(null)
          setUpdating(false)
          return
        }

        if (!response.ok) {
          // If offline, queue the attempts
          if (!offlineManager.isOnline()) {
            for (const item of itemQualities) {
              await offlineManager.queueReviewAttempt({
                flashcardId: item.flashcardId,
                vocabularyId: flashcards.find(fc => fc.flashcard.id === item.flashcardId)?.vocabulary.id || "",
                quality: item.quality,
                responseMs: item.responseMs,
                exerciseType: "matching-pairs",
              })
            }
            // Continue with local state update
            const consumed = matchingPairsFlashcardIds.length
            setConsumedFlashcards(prev => prev + consumed)
            setLastActivityAt(new Date())
            const nextIndex = currentIndex + consumed
            if (nextIndex >= flashcards.length) {
              await fetchDueFlashcards()
            } else {
              setCurrentIndex(nextIndex)
            }
            setUpdating(false)
            setLockedAttemptId(null)
            return
          }
          throw new Error(`Batch update failed: ${response.statusText}`)
        }

        const result = await response.json()
        
        // Check if all updates succeeded
        const failed = result.results?.filter((r: any) => !r.success) || []
        if (failed.length > 0) {
          console.error("Some flashcards failed to update:", failed)
          // Still proceed, but log the error
        }
        
        // Update consumed count
        const consumed = matchingPairsFlashcardIds.length
        setConsumedFlashcards(prev => prev + consumed)
        setLastActivityAt(new Date()) // Update activity timestamp
        
        // Move forward by the number of flashcards consumed
        const nextIndex = currentIndex + consumed
        if (nextIndex >= flashcards.length) {
          await fetchDueFlashcards()
        } else {
          setCurrentIndex(nextIndex)
        }
      } catch (error) {
        console.error("Error updating flashcards:", error)
        alert("Failed to save progress. Please try again.")
      } finally {
        setUpdating(false)
        setLockedAttemptId(null)
      }
    } else {
      // Single exercise
      const current = flashcards[currentIndex]
      if (!current) {
        setLockedAttemptId(null)
        return
      }

      const isCorrect = isCorrectOrQualities as boolean
      const singleTimeMs = timeMs || 0
      const quality = convertAnswerToQuality(isCorrect, singleTimeMs)
      
      setUpdating(true)
      try {
        // Get exercise type from current exercise if available
        const exerciseType = currentExercise?.type || undefined
        
        const response = await fetch("/api/flashcards", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flashcardId: current.flashcard.id,
            quality,
            sessionStartedAt,
            exerciseType,
            responseMs: singleTimeMs,
          }),
        })

        if (response.status === 409) {
          // Session out of sync - refresh and show message
          const errorData = await response.json()
          console.warn("Session out of sync:", errorData)
          alert("Your session is out of sync. Refreshing...")
          await fetchDueFlashcards()
          setLockedAttemptId(null)
          setUpdating(false)
          return
        }

        if (!response.ok) {
          // If offline, queue the attempt
          if (!offlineManager.isOnline()) {
            await offlineManager.queueReviewAttempt({
              flashcardId: current.flashcard.id,
              vocabularyId: current.vocabulary.id,
              quality,
              responseMs: singleTimeMs,
              exerciseType,
            })
            // Continue with local state update
            setConsumedFlashcards(prev => prev + 1)
            setLastActivityAt(new Date())
            if (currentIndex < flashcards.length - 1) {
              setCurrentIndex(currentIndex + 1)
            } else {
              await fetchDueFlashcards()
            }
            setUpdating(false)
            setLockedAttemptId(null)
            return
          }
          throw new Error(`Update failed: ${response.statusText}`)
        }

        // Update consumed count
        setConsumedFlashcards(prev => prev + 1)
        setLastActivityAt(new Date()) // Update activity timestamp

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
        setLockedAttemptId(null)
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
  
  // Time limit selector (shown before starting review)
  if (showTimeLimitSelector && flashcards.length > 0) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-xl page-transition">
        <div className="min-h-screen flex flex-col items-center justify-center px-4 md:px-6">
          <div className="max-w-md w-full fade-in">
            <Card className="bento-card p-6 md:p-8 shadow-elevated">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5" />
                <h2 className="text-2xl font-bold">Start Review Session</h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Choose a time limit or review without a limit
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => startSessionWithTimeLimit(5)}
                  className="w-full"
                  variant="outline"
                >
                  Quick 5-min Review
                </Button>
                <Button
                  onClick={() => startSessionWithTimeLimit(10)}
                  className="w-full"
                  variant="outline"
                >
                  Standard 10-min Review
                </Button>
                <Button
                  onClick={() => startSessionWithTimeLimit(15)}
                  className="w-full"
                  variant="outline"
                >
                  Extended 15-min Review
                </Button>
                <Button
                  onClick={() => {
                    setTimeLimit(null)
                    setTimeRemaining(null)
                    setShowTimeLimitSelector(false)
                  }}
                  className="w-full"
                >
                  No Time Limit
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Handle exercise state machine states
  if (exerciseState.type === 'loading') {
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

  if (exerciseState.type === 'error') {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-xl page-transition">
        <div className="min-h-screen flex flex-col items-center justify-center px-4 md:px-6">
          <div className="flex flex-col items-center gap-4 max-w-md">
            <p className="text-muted-foreground font-medium text-center">{exerciseState.error}</p>
            {exerciseState.retryable && (
              <Button
                onClick={() => {
                  dispatchExercise({ type: 'RESET' })
                  generateCurrentExercise()
                }}
              >
                Retry
              </Button>
            )}
            {!exerciseState.retryable && (
              <Button onClick={() => setCurrentIndex(prev => prev + 1)}>
                Skip to Next
              </Button>
            )}
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
          flashcardIds={matchingPairsFlashcardIds}
          onAnswer={(itemQualities, totalTimeMs) => handleExerciseAnswer(itemQualities, totalTimeMs)}
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

  // Calculate progress based on consumed flashcards only (not including current exercise)
  // consumedFlashcards tracks completed exercises
  const progressPercentage = flashcards.length > 0 ? (consumedFlashcards / flashcards.length) * 100 : 0
  // Exercise number shows current position (completed + 1 for current)
  const currentExerciseCount = isMatchingPairs ? matchingPairsFlashcardIds.length : 1
  const currentExerciseNumber = consumedFlashcards + 1

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-xl page-transition overflow-y-auto flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 py-8">
        {/* Minimal Header */}
        <div className="w-full max-w-2xl mb-6 fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              Exercise {currentExerciseNumber} of {flashcards.length}
            </div>
            {/* Progress Bar */}
            <div className="flex-1 mx-4 bg-muted/50 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary via-primary/90 to-primary/80 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex items-center gap-3">
              {timeRemaining !== null && (
                <div className="text-sm font-medium text-orange-500">
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {Math.round(progressPercentage)}%
              </div>
            </div>
          </div>
        </div>

        {/* Center Card */}
        <div className="w-full max-w-2xl fade-in-delay">
          <SwipeDetector
            disabled={exerciseAnswered || isMatchingPairs || updating}
            onSwipeLeft={() => {
              // Swipe left = Hard (quality 0)
              if (!exerciseAnswered && !isMatchingPairs) {
                handleExerciseAnswer(false, 0)
              }
            }}
            onSwipeRight={() => {
              // Swipe right = Easy (quality 5, fast response)
              if (!exerciseAnswered && !isMatchingPairs) {
                handleExerciseAnswer(true, 1000) // Fast response = Easy
              }
            }}
            onSwipeUp={() => {
              // Swipe up = Good (quality 4, slower response)
              if (!exerciseAnswered && !isMatchingPairs) {
                handleExerciseAnswer(true, 5000) // Slower response = Good
              }
            }}
            threshold={80}
          >
            <div className="bento-card p-6 md:p-8 shadow-elevated">
              {renderExercise()}
            </div>
          </SwipeDetector>
          
          {/* Swipe hints (mobile only) */}
          {!exerciseAnswered && !isMatchingPairs && (
            <div className="mt-4 text-center text-xs text-muted-foreground md:hidden">
              <div className="flex items-center justify-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="text-red-500">←</span> Hard
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-blue-500">↑</span> Good
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-green-500">→</span> Easy
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  )
}


