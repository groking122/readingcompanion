"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { BookOpen, Bookmark, Clock, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

interface SessionSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  pagesRead: number
  wordsFound: number
  wordsSaved: number
  readingTimeMinutes?: number
  onReviewClick?: () => void
}

export function SessionSummaryModal({
  isOpen,
  onClose,
  pagesRead,
  wordsFound,
  wordsSaved,
  readingTimeMinutes,
  onReviewClick,
}: SessionSummaryModalProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleReview = () => {
    onReviewClick?.()
    router.push("/review")
    onClose()
  }

  const handleLater = () => {
    onClose()
  }

  if (!mounted) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Great Session!
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            You made excellent progress today
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
              <BookOpen className="h-6 w-6 mb-2 text-primary" />
              <div className="text-2xl font-bold">{pagesRead}</div>
              <div className="text-xs text-muted-foreground text-center">
                {pagesRead === 1 ? "Page" : "Pages"}
              </div>
            </div>

            <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
              <Bookmark className="h-6 w-6 mb-2 text-primary" />
              <div className="text-2xl font-bold">{wordsFound}</div>
              <div className="text-xs text-muted-foreground text-center">
                {wordsFound === 1 ? "Word Found" : "Words Found"}
              </div>
            </div>

            <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
              <Bookmark className="h-6 w-6 mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-600">{wordsSaved}</div>
              <div className="text-xs text-muted-foreground text-center">
                {wordsSaved === 1 ? "Word Saved" : "Words Saved"}
              </div>
            </div>
          </div>

          {/* Reading Time */}
          {readingTimeMinutes !== undefined && readingTimeMinutes > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {readingTimeMinutes < 60
                  ? `~${readingTimeMinutes} min`
                  : `${Math.floor(readingTimeMinutes / 60)}h ${readingTimeMinutes % 60}m`}
              </span>
            </div>
          )}

          {/* Review Prompt */}
          {wordsSaved > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm text-center text-muted-foreground mb-4">
                Review {wordsSaved} {wordsSaved === 1 ? "word" : "words"} now?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleLater}
                  className="flex-1"
                >
                  Later
                </Button>
                <Button
                  onClick={handleReview}
                  className="flex-1"
                >
                  Review
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* No words saved - just close */}
          {wordsSaved === 0 && (
            <Button onClick={handleLater} className="w-full">
              Continue Reading
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
