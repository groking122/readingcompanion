"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Exercise } from "@/lib/exercises"

interface MeaningInContextProps {
  exercise: Exercise
  onAnswer: (isCorrect: boolean, timeMs: number) => void
}

export function MeaningInContextExercise({ exercise, onAnswer }: MeaningInContextProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [startTime] = useState(Date.now())
  const [answered, setAnswered] = useState(false)

  const handleSelect = (option: string) => {
    if (answered) return
    
    setSelectedAnswer(option)
    const correct = option === exercise.correctAnswer
    setIsCorrect(correct)
    setAnswered(true)
    
    // Auto-advance after showing result
    setTimeout(() => {
      const timeMs = Date.now() - startTime
      onAnswer(correct, timeMs)
    }, 1500)
  }

  // Render context with highlighted term (simple markdown-style)
  const renderContext = (context: string) => {
    const parts = context.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const term = part.slice(2, -2)
        return (
          <span key={idx} className="font-bold text-primary bg-primary/10 px-1 rounded">
            {term}
          </span>
        )
      }
      return <span key={idx}>{part}</span>
    })
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">{exercise.question}</CardTitle>
        {exercise.context && (
          <CardDescription className="text-base mt-4 leading-relaxed">
            {renderContext(exercise.context)}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {exercise.options.map((option, idx) => {
            const isSelected = selectedAnswer === option
            const isRightAnswer = option === exercise.correctAnswer
            const showResult = answered && (isSelected || isRightAnswer)
            
            return (
              <Button
                key={idx}
                onClick={() => handleSelect(option)}
                disabled={answered}
                variant={showResult ? (isRightAnswer ? "default" : "destructive") : "outline"}
                className={cn(
                  "w-full h-auto py-4 px-4 text-left justify-start text-base",
                  !answered && "hover:bg-accent cursor-pointer",
                  showResult && isRightAnswer && "bg-green-600 hover:bg-green-600",
                  showResult && isSelected && !isRightAnswer && "bg-red-600 hover:bg-red-600"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="flex-1">{option}</span>
                  {showResult && (
                    <>
                      {isRightAnswer ? (
                        <CheckCircle2 className="h-5 w-5 ml-2" />
                      ) : isSelected ? (
                        <XCircle className="h-5 w-5 ml-2" />
                      ) : null}
                    </>
                  )}
                </div>
              </Button>
            )
          })}
        </div>
        
        {answered && (
          <div className="mt-4 text-center">
            {isCorrect ? (
              <p className="text-green-600 font-medium">Correct! ✓</p>
            ) : (
              <p className="text-red-600 font-medium">
                Incorrect. The answer is: <span className="font-bold">{exercise.correctAnswer}</span>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

