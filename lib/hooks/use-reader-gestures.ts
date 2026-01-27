"use client"

import { useCallback, useRef } from "react"

interface UseReaderGesturesReturn {
  handleSwipe: (direction: "left" | "right") => void
  handleTap: (x: number, y: number) => void
  handleLongPress: (element: HTMLElement) => void
}

interface SwipeState {
  startX: number
  startY: number
  startTime: number
}

/**
 * Hook to handle reader gestures (swipe navigation, tap detection coordination)
 */
export function useReaderGestures(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void
): UseReaderGesturesReturn {
  const swipeStateRef = useRef<SwipeState | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      if (direction === "left" && onSwipeRight) {
        // Swipe left = next page
        onSwipeRight()
      } else if (direction === "right" && onSwipeLeft) {
        // Swipe right = previous page
        onSwipeLeft()
      }
    },
    [onSwipeLeft, onSwipeRight]
  )

  const handleTap = useCallback((x: number, y: number) => {
    // Tap detection is coordinated but actual handling is done in EPUB iframe
    // This is mainly for coordination purposes
    console.debug("Tap detected at:", x, y)
  }, [])

  const handleLongPress = useCallback((element: HTMLElement) => {
    // Long press + drag for text selection - don't fight OS
    // This is mainly a placeholder - actual selection is handled by browser
    console.debug("Long press detected on:", element)
  }, [])

  return {
    handleSwipe,
    handleTap,
    handleLongPress,
  }
}
