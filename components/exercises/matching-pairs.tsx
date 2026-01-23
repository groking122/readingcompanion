"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Exercise } from "@/lib/exercises"

interface MatchingPairsProps {
  exercise: Exercise & { pairs: Array<{ term: string; translation: string; id: string }> }
  onAnswer: (isCorrect: boolean, timeMs: number) => void
}

export function MatchingPairsExercise({ exercise, onAnswer }: MatchingPairsProps) {
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null)
  const [selectedTranslation, setSelectedTranslation] = useState<string | null>(null)
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set())
  const [startTime] = useState(Date.now())
  const [completed, setCompleted] = useState(false)

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
    // Check if this is a correct match
    const pair = exercise.pairs.find(p => p.id === termId)
    const isCorrect = pair?.id === translationId
    
    if (isCorrect) {
      // Correct match!
      const newMatched = new Set(matchedPairs)
      newMatched.add(termId)
      newMatched.add(translationId)
      setMatchedPairs(newMatched)
      setSelectedTerm(null)
      setSelectedTranslation(null)
      
      // Check if all pairs are matched
      if (newMatched.size >= exercise.pairs.length * 2) {
        setCompleted(true)
        setTimeout(() => {
          const timeMs = Date.now() - startTime
          onAnswer(true, timeMs)
        }, 1000)
      }
    } else {
      // Wrong match - show error briefly
      setTimeout(() => {
        setSelectedTerm(null)
        setSelectedTranslation(null)
      }, 500)
    }
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
          Tap pairs to match them. Matches: {matchedPairs.size / 2} of {exercise.pairs.length}
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

