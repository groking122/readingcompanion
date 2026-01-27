"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface UseReadingProgressOptions {
  bookId?: string
  bookType?: "epub" | "pdf" | "text"
  debounceMs?: number
  onSave?: (location: string | number, progress: number) => Promise<void>
}

interface UseReadingProgressReturn {
  progress: number
  timeRemaining: string | null
  saveProgress: (location: string | number, progress: number) => void
  setProgress: (progress: number) => void
}

/**
 * Hook to manage reading progress with debounced saves and time estimates
 */
export function useReadingProgress({
  bookId,
  bookType,
  debounceMs = 3000,
  onSave,
}: UseReadingProgressOptions = {}): UseReadingProgressReturn {
  const [progress, setProgress] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)
  const [wordsPerMinute, setWordsPerMinute] = useState(200) // Default reading speed
  
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedLocationRef = useRef<string | number | null>(null)
  const readingStartTimeRef = useRef<number | null>(null)
  const wordsReadRef = useRef<number>(0)

  // Calculate time remaining based on progress
  useEffect(() => {
    if (progress > 0 && progress < 100) {
      const remainingProgress = 100 - progress
      // Estimate: assume average reading speed
      // Rough calculation: if we're at X% and it took Y minutes, remaining is roughly (100-X)/X * Y
      // For now, use a simple estimate based on progress
      const estimatedMinutes = Math.ceil((remainingProgress / progress) * 10) // Rough estimate
      
      if (estimatedMinutes > 0 && estimatedMinutes < 1000) {
        if (estimatedMinutes < 60) {
          setTimeRemaining(`~${estimatedMinutes} min left`)
        } else {
          const hours = Math.floor(estimatedMinutes / 60)
          const minutes = estimatedMinutes % 60
          setTimeRemaining(`~${hours}h ${minutes}m left`)
        }
      } else {
        setTimeRemaining(null)
      }
    } else {
      setTimeRemaining(null)
    }
  }, [progress])

  // Debounced save function
  const saveProgress = useCallback(
    (location: string | number, progressValue: number) => {
      // Don't save if location hasn't changed significantly
      if (lastSavedLocationRef.current === location) {
        return
      }

      // Safety checks
      if (!bookId || !location) return
      if (progressValue <= 0 || progressValue > 100) return

      // Clear any pending save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }

      // Debounce the save
      saveTimerRef.current = setTimeout(async () => {
        try {
          if (onSave) {
            await onSave(location, progressValue)
          } else {
            // Default save implementation
            const bookmarkData: any = {
              bookId,
              progressPercentage: Math.round(progressValue),
            }

            if (bookType === "epub" && typeof location === "string") {
              bookmarkData.epubLocation = location
            } else if (bookType === "pdf" && typeof location === "number") {
              bookmarkData.pageNumber = location
            } else if (bookType === "text" && typeof location === "number") {
              bookmarkData.position = location
            }

            await fetch("/api/bookmarks/last-read", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(bookmarkData),
            })
          }

          lastSavedLocationRef.current = location
        } catch (error) {
          // Silently fail - don't interrupt reading experience
          console.debug("Auto-save progress error:", error)
        }
      }, debounceMs)
    },
    [bookId, bookType, debounceMs, onSave]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  return {
    progress,
    timeRemaining,
    saveProgress,
    setProgress,
  }
}
