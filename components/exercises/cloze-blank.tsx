"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Exercise } from "@/lib/exercises"

interface ClozeBlankProps {
  exercise: Exercise
  onAnswer: (isCorrect: boolean, timeMs: number) => void
}

export function ClozeBlankExercise({ exercise, onAnswer }: ClozeBlankProps) {
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
    
    // Show filled sentence
    setTimeout(() => {
      const timeMs = Date.now() - startTime
      onAnswer(correct, timeMs)
    }, 2000)
  }

  // Render context with blank filled in
  const renderFilledContext = () => {
    if (!exercise.context) return null
    return exercise.context.replace("_____", selectedAnswer || "_____")
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">{exercise.question}</CardTitle>
        {exercise.context && (
          <CardDescription className="text-base mt-4 leading-relaxed font-medium">
            {answered ? (
              <span className={cn(
                "inline-block px-2 py-1 rounded",
                isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              )}>
                {renderFilledContext()}
              </span>
            ) : (
              exercise.context
            )}
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
                Incorrect. The correct word is: <span className="font-bold">{exercise.correctAnswer}</span>
              </p>
            )}
            {exercise.metadata?.translation && (
              <p className="text-sm text-muted-foreground mt-2">
                Translation: {exercise.metadata.translation}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

