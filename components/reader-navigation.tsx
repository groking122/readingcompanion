"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useIsMobile } from "@/lib/hooks/use-media-query"
import { cn } from "@/lib/utils"

interface ReaderNavigationProps {
  rendition: any // EPUB rendition object
  currentPage: number | null
  totalPages: number | null
  progress: number // 0-100
  onPageChange?: (page: number) => void
  disabled?: boolean
}

export function ReaderNavigation({
  rendition,
  currentPage,
  totalPages,
  progress,
  onPageChange,
  disabled = false,
}: ReaderNavigationProps) {
  const isMobile = useIsMobile()
  const [leftHovered, setLeftHovered] = useState(false)
  const [rightHovered, setRightHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const progressBarRef = useRef<HTMLDivElement>(null)

  const handlePrevious = () => {
    if (disabled || !rendition) return
    try {
      rendition.prev()
    } catch (err) {
      console.debug("Error navigating previous:", err)
    }
  }

  const handleNext = () => {
    if (disabled || !rendition) return
    try {
      rendition.next()
    } catch (err) {
      console.debug("Error navigating next:", err)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !totalPages || totalPages === 0) return

    const rect = progressBarRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, clickX / rect.width))
    const targetPage = Math.max(1, Math.min(totalPages, Math.round(percentage * totalPages)))

    if (onPageChange && rendition) {
      try {
        // Try to navigate using CFI if available
        const book = rendition.book
        if (book?.locations) {
          const cfi = book.locations.cfiFromPercentage(percentage)
          if (cfi) {
            rendition.display(cfi)
            onPageChange(targetPage)
            return
          }
        }
        // Fallback: navigate by page
        onPageChange(targetPage)
      } catch (err) {
        console.debug("Error navigating to page:", err)
      }
    }
  }

  const handleProgressDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !progressBarRef.current || !totalPages || totalPages === 0) return

    const rect = progressBarRef.current.getBoundingClientRect()
    const dragX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, dragX / rect.width))
    const targetPage = Math.max(1, Math.min(totalPages, Math.round(percentage * totalPages)))

    if (onPageChange && rendition) {
      try {
        const book = rendition.book
        if (book?.locations) {
          const cfi = book.locations.cfiFromPercentage(percentage)
          if (cfi) {
            rendition.display(cfi)
            onPageChange(targetPage)
          }
        }
      } catch (err) {
        console.debug("Error dragging to page:", err)
      }
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (progressBarRef.current && totalPages && totalPages > 0) {
        const rect = progressBarRef.current.getBoundingClientRect()
        const dragX = e.clientX - rect.left
        const percentage = Math.max(0, Math.min(1, dragX / rect.width))
        const targetPage = Math.max(1, Math.min(totalPages, Math.round(percentage * totalPages)))

        if (onPageChange && rendition) {
          try {
            const book = rendition.book
            if (book?.locations) {
              const cfi = book.locations.cfiFromPercentage(percentage)
              if (cfi) {
                rendition.display(cfi)
                onPageChange(targetPage)
              }
            }
          } catch (err) {
            console.debug("Error dragging to page:", err)
          }
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, totalPages, rendition, onPageChange])

  const canGoPrevious = currentPage !== null && currentPage > 1
  const canGoNext = currentPage !== null && totalPages !== null && currentPage < totalPages

  return (
    <>
      {/* Desktop: Click zones with floating arrows */}
      {!isMobile && (
        <>
          {/* Left click zone */}
          <div
            className={cn(
              "fixed left-0 top-0 bottom-0 z-30 cursor-pointer",
              "transition-opacity duration-200",
              disabled || !canGoPrevious ? "opacity-0 pointer-events-none" : "opacity-100",
              "w-[20%]"
            )}
            onMouseEnter={() => setLeftHovered(true)}
            onMouseLeave={() => setLeftHovered(false)}
            onClick={handlePrevious}
            aria-label="Previous page"
          >
            {/* Floating arrow indicator */}
            <div
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2",
                "w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm border border-border",
                "flex items-center justify-center shadow-lg",
                "transition-all duration-200",
                leftHovered ? "opacity-100 scale-100" : "opacity-0 scale-90"
              )}
            >
              <ChevronLeft className="h-6 w-6 text-foreground" />
            </div>
          </div>

          {/* Right click zone */}
          <div
            className={cn(
              "fixed right-0 top-0 bottom-0 z-30 cursor-pointer",
              "transition-opacity duration-200",
              disabled || !canGoNext ? "opacity-0 pointer-events-none" : "opacity-100",
              "w-[20%]"
            )}
            onMouseEnter={() => setRightHovered(true)}
            onMouseLeave={() => setRightHovered(false)}
            onClick={handleNext}
            aria-label="Next page"
          >
            {/* Floating arrow indicator */}
            <div
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2",
                "w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm border border-border",
                "flex items-center justify-center shadow-lg",
                "transition-all duration-200",
                rightHovered ? "opacity-100 scale-100" : "opacity-0 scale-90"
              )}
            >
              <ChevronRight className="h-6 w-6 text-foreground" />
            </div>
          </div>
        </>
      )}

      {/* Mobile: Tap zones */}
      {isMobile && (
        <>
          {/* Left tap zone */}
          <div
            className={cn(
              "fixed left-0 top-0 bottom-0 z-30",
              "transition-opacity duration-200",
              disabled || !canGoPrevious ? "opacity-0 pointer-events-none" : "opacity-100",
              "w-[30%]"
            )}
            onClick={handlePrevious}
            aria-label="Previous page"
          />

          {/* Right tap zone */}
          <div
            className={cn(
              "fixed right-0 top-0 bottom-0 z-30",
              "transition-opacity duration-200",
              disabled || !canGoNext ? "opacity-0 pointer-events-none" : "opacity-100",
              "w-[30%]"
            )}
            onClick={handleNext}
            aria-label="Next page"
          />
        </>
      )}

      {/* Progress bar scrubber - Bottom of screen, above settings bar */}
      <div
        ref={progressBarRef}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[35] h-1 bg-muted/30 cursor-pointer group",
          "transition-opacity duration-200 hover:h-2",
          disabled ? "opacity-50 pointer-events-none" : "opacity-100"
        )}
        onClick={handleProgressClick}
        onMouseDown={(e) => {
          setIsDragging(true)
          handleProgressDrag(e)
        }}
        aria-label="Reading progress"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Progress indicator */}
        <div
          className="h-full bg-primary transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
        {/* Scrubber handle - only visible on hover */}
        {!disabled && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background shadow-md transition-all duration-200 opacity-0 hover:opacity-100 group-hover:opacity-100"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        )}
      </div>
    </>
  )
}
