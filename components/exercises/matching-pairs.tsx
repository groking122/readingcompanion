"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Exercise } from "@/lib/exercises"

interface ItemQuality {
  flashcardId: string
  quality: number
  responseMs: number
}

interface MatchingPairsProps {
  exercise: Exercise & { pairs: Array<{ term: string; translation: string; id: string }> }
  flashcardIds: string[] // Map vocabulary IDs to flashcard IDs
  onAnswer: (itemQualities: ItemQuality[], totalTimeMs: number) => void
}

export function MatchingPairsExercise({ exercise, flashcardIds, onAnswer }: MatchingPairsProps) {
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null)
  const [selectedTranslation, setSelectedTranslation] = useState<string | null>(null)
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set())
  const [startTime] = useState(Date.now())
  const [completed, setCompleted] = useState(false)
  
  // Track per-item statistics
  const [itemMistakes, setItemMistakes] = useState<Map<string, number>>(new Map()) // vocabulary ID -> mistake count
  const [itemMatchTimes, setItemMatchTimes] = useState<Map<string, number>>(new Map()) // vocabulary ID -> match time
  const [itemFirstAttemptTime, setItemFirstAttemptTime] = useState<Map<string, number>>(new Map()) // vocabulary ID -> first attempt time

  const terms = exercise.metadata?.shuffledTerms || []
  const translations = exercise.metadata?.shuffledTranslations || []

  const handleTermClick = (termId: string) => {
    if (matchedPairs.has(termId) || completed) return
    
    if (selectedTerm === termId) {
      setSelectedTerm(null)
    } else {
      setSelectedTerm(termId)
      // If translation is already selected, try to match
      if (selectedTranslation) {
        tryMatch(termId, selectedTranslation)
      }
    }
  }

  const handleTranslationClick = (translationId: string) => {
    if (matchedPairs.has(translationId) || completed) return
    
    if (selectedTranslation === translationId) {
      setSelectedTranslation(null)
    } else {
      setSelectedTranslation(translationId)
      // If term is already selected, try to match
      if (selectedTerm) {
        tryMatch(selectedTerm, translationId)
      }
    }
  }

  const tryMatch = (termId: string, translationId: string) => {
    const now = Date.now()
    
    // Check if this is a correct match
    // Both shuffledTerms and shuffledTranslations use the same vocabulary IDs
    // A correct match means termId === translationId (they're the same vocabulary item)
    const isCorrect = termId === translationId
    
    if (isCorrect) {
      // Correct match!
      const newMatched = new Set(matchedPairs)
      newMatched.add(termId)
      newMatched.add(translationId)
      setMatchedPairs(newMatched)
      setSelectedTerm(null)
      setSelectedTranslation(null)
      
      // Record match time for this item
      const firstAttemptTime = itemFirstAttemptTime.get(termId) || startTime
      const matchTime = now - firstAttemptTime
      setItemMatchTimes(prev => {
        const next = new Map(prev)
        next.set(termId, matchTime)
        return next
      })
      
      // Check if all pairs are matched
      // Note: termId === translationId (same vocabulary ID), so set size equals pair count
      if (newMatched.size >= exercise.pairs.length) {
        setCompleted(true)
        setTimeout(() => {
          calculateAndSubmitQualities()
        }, 1000)
      }
    } else {
      // Wrong match - increment mistake count for both items
      setItemMistakes(prev => {
        const next = new Map(prev)
        next.set(termId, (next.get(termId) || 0) + 1)
        next.set(translationId, (next.get(translationId) || 0) + 1)
        return next
      })
      
      // Record first attempt time if not already recorded
      setItemFirstAttemptTime(prev => {
        const next = new Map(prev)
        if (!next.has(termId)) next.set(termId, now)
        if (!next.has(translationId)) next.set(translationId, now)
        return next
      })
      
      // Show error briefly
      setTimeout(() => {
        setSelectedTerm(null)
        setSelectedTranslation(null)
      }, 500)
    }
  }
  
  const calculateAndSubmitQualities = () => {
    const totalTimeMs = Date.now() - startTime
    const itemQualities: ItemQuality[] = []
    
    // Determine which pair was matched last (elimination detection)
    const matchedArray = Array.from(matchedPairs)
    const lastMatchedId = matchedArray[matchedArray.length - 1]
    
    // Create vocabulary ID to flashcard ID map
    const vocabToFlashcardMap = new Map<string, string>()
    exercise.pairs.forEach((pair, index) => {
      vocabToFlashcardMap.set(pair.id, flashcardIds[index] || '')
    })
    
    for (const pair of exercise.pairs) {
      const vocabId = pair.id
      const flashcardId = vocabToFlashcardMap.get(vocabId) || ''
      if (!flashcardId) continue
      
      const mistakes = itemMistakes.get(vocabId) || 0
      const matchTime = itemMatchTimes.get(vocabId) || totalTimeMs
      const isLastMatched = vocabId === lastMatchedId
      
      let quality: number
      
      // Calculate quality based on mistakes, time, and elimination
      if (isLastMatched && matchedPairs.size === exercise.pairs.length) {
        // Last pair matched = process of elimination, cap at 3
        quality = Math.min(3, mistakes === 0 ? 3 : (mistakes === 1 ? 2 : 1))
      } else if (mistakes > 0) {
        // Had mistakes before getting it right
        quality = mistakes === 1 ? 1 : 0
      } else {
        // No mistakes - quality based on speed
        const fastThreshold = 2000 // 2 seconds per pair
        const slowThreshold = 5000 // 5 seconds per pair
        if (matchTime < fastThreshold) {
          quality = 5 // Fast and clean
        } else if (matchTime < slowThreshold) {
          quality = 4 // Good speed
        } else {
          quality = 3 // Hesitation but correct
        }
      }
      
      itemQualities.push({
        flashcardId,
        quality,
        responseMs: matchTime,
      })
    }
    
    onAnswer(itemQualities, totalTimeMs)
  }

  const isMatched = (id: string) => matchedPairs.has(id)
  const isSelected = (id: string, type: "term" | "translation") => {
    return type === "term" ? selectedTerm === id : selectedTranslation === id
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">{exercise.question}</CardTitle>
        <CardDescription className="mt-2">
          Tap pairs to match them. Matches: {matchedPairs.size} of {exercise.pairs.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Terms Column */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">Words</h3>
            {terms.map((term: { id: string; text: string }) => {
              const matched = isMatched(term.id)
              const selected = isSelected(term.id, "term")
              
              return (
                <Button
                  key={term.id}
                  onClick={() => handleTermClick(term.id)}
                  disabled={matched || completed}
                  variant={matched ? "default" : selected ? "secondary" : "outline"}
                  className={cn(
                    "w-full h-auto py-3 px-4 text-left justify-start",
                    matched && "bg-green-600 hover:bg-green-600",
                    selected && !matched && "bg-primary/20"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{term.text}</span>
                    {matched && <CheckCircle2 className="h-4 w-4" />}
                  </div>
                </Button>
              )
            })}
          </div>

          {/* Translations Column */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">Translations</h3>
            {translations.map((translation: { id: string; text: string }) => {
              const matched = isMatched(translation.id)
              const selected = isSelected(translation.id, "translation")
              
              return (
                <Button
                  key={translation.id}
                  onClick={() => handleTranslationClick(translation.id)}
                  disabled={matched || completed}
                  variant={matched ? "default" : selected ? "secondary" : "outline"}
                  className={cn(
                    "w-full h-auto py-3 px-4 text-left justify-start",
                    matched && "bg-green-600 hover:bg-green-600",
                    selected && !matched && "bg-primary/20"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{translation.text}</span>
                    {matched && <CheckCircle2 className="h-4 w-4" />}
                  </div>
                </Button>
              )
            })}
          </div>
        </div>

        {completed && (
          <div className="mt-6 text-center">
            <p className="text-green-600 font-medium text-lg">All matched! Great job! ✓</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

