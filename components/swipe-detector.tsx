"use client"

import { useState, useRef, useEffect, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SwipeDetectorProps {
  children: ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  disabled?: boolean
  threshold?: number // Minimum distance in pixels to trigger swipe
}

export function SwipeDetector({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  disabled = false,
  threshold = 50,
}: SwipeDetectorProps) {
  const [swipeState, setSwipeState] = useState<{
    isSwiping: boolean
    startX: number
    startY: number
    currentX: number
    currentY: number
    direction: "left" | "right" | "up" | "down" | null
  }>({
    isSwiping: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    direction: null,
  })

  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled) return
    const touch = e.touches[0]
    setSwipeState({
      isSwiping: true,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      direction: null,
    })
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!swipeState.isSwiping || disabled) return
    const touch = e.touches[0]
    const deltaX = touch.clientX - swipeState.startX
    const deltaY = touch.clientY - swipeState.startY

    // Determine primary direction
    let direction: "left" | "right" | "up" | "down" | null = null
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? "right" : "left"
    } else {
      direction = deltaY > 0 ? "down" : "up"
    }

    setSwipeState((prev) => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
      direction,
    }))
  }

  const handleTouchEnd = () => {
    if (!swipeState.isSwiping || disabled) return

    const deltaX = swipeState.currentX - swipeState.startX
    const deltaY = swipeState.currentY - swipeState.startY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Check if swipe distance meets threshold
    if (distance >= threshold) {
      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      // Determine primary direction
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight()
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft()
        }
      } else {
        // Vertical swipe
        if (deltaY < 0 && onSwipeUp) {
          onSwipeUp()
        } else if (deltaY > 0 && onSwipeDown) {
          onSwipeDown()
        }
      }
    }

    // Reset swipe state
    setSwipeState({
      isSwiping: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      direction: null,
    })
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container || disabled) return

    container.addEventListener("touchstart", handleTouchStart, { passive: true })
    container.addEventListener("touchmove", handleTouchMove, { passive: true })
    container.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener("touchstart", handleTouchStart)
      container.removeEventListener("touchmove", handleTouchMove)
      container.removeEventListener("touchend", handleTouchEnd)
    }
  }, [swipeState.isSwiping, disabled])

  // Calculate transform for visual feedback
  const deltaX = swipeState.currentX - swipeState.startX
  const deltaY = swipeState.currentY - swipeState.startY
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  const opacity = swipeState.isSwiping ? Math.min(distance / threshold, 1) : 0

  // Determine swipe hint color based on direction
  const getSwipeHintColor = () => {
    if (!swipeState.direction) return ""
    switch (swipeState.direction) {
      case "left":
        return "bg-red-500/20 border-red-500"
      case "right":
        return "bg-green-500/20 border-green-500"
      case "up":
        return "bg-blue-500/20 border-blue-500"
      default:
        return ""
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative touch-none"
      style={{ touchAction: "pan-y" }}
    >
      {children}
      
      {/* Swipe hint overlay (only on mobile) */}
      {swipeState.isSwiping && (
        <div
          className={cn(
            "absolute inset-0 pointer-events-none transition-opacity duration-200 rounded-lg border-2 flex items-center justify-center",
            getSwipeHintColor(),
            opacity > 0.3 ? "opacity-100" : "opacity-0"
          )}
          style={{
            transform: `translate(${deltaX * 0.3}px, ${deltaY * 0.3}px)`,
            opacity,
          }}
        >
          {swipeState.direction === "left" && (
            <div className="text-red-500 font-bold text-lg">Hard</div>
          )}
          {swipeState.direction === "right" && (
            <div className="text-green-500 font-bold text-lg">Easy</div>
          )}
          {swipeState.direction === "up" && (
            <div className="text-blue-500 font-bold text-lg">Good</div>
          )}
        </div>
      )}
    </div>
  )
}

