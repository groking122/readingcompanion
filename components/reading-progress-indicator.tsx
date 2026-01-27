"use client"

import React, { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/lib/hooks/use-media-query"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"

interface ReadingProgressIndicatorProps {
  progress: number
  currentPage?: number | null
  totalPages?: number | null
  currentChapter?: string
  className?: string
  onTocClick?: () => void
  toc?: any[]
  bookType?: "epub" | "pdf" | "text"
}

export function ReadingProgressIndicator({
  progress,
  currentPage,
  totalPages,
  currentChapter,
  className,
  onTocClick,
  bookType,
}: ReadingProgressIndicatorProps) {
  const [progressSheetOpen, setProgressSheetOpen] = useState(false)
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")

  if (progress <= 0 && !currentChapter) {
    return null
  }

  // Format: "Chapter • 34%" or "Page X of Y • 34%" or just "34%"
  // Show page numbers for all book types (user wants to see them)
  // Don't show time - user doesn't want it
  let progressText = ""
  if (currentChapter) {
    progressText = `${currentChapter} • ${Math.round(progress)}%`
  } else if (currentPage !== null && totalPages != null && totalPages > 0) {
    progressText = `Page ${currentPage} of ${totalPages} • ${Math.round(progress)}%`
  } else if (currentPage !== null) {
    progressText = `Page ${currentPage} • ${Math.round(progress)}%`
  } else {
    progressText = `${Math.round(progress)}%`
  }

  return (
    <>
      <button
        onClick={() => setProgressSheetOpen(true)}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`Reading progress: ${progressText}`}
        className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 z-40 cursor-pointer",
          className
        )}
      >
        <div 
          className="backdrop-blur-sm border rounded-full px-5 py-2 shadow-lg hover:shadow-xl transition-shadow"
          style={{
            backgroundColor: "hsl(var(--background) / 0.95)",
            borderColor: "hsl(var(--border) / 0.5)",
          }}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="whitespace-nowrap">
              {progressText}
            </span>
          </div>
        </div>
      </button>

      {/* Progress & Navigation Sheet */}
      <Sheet open={progressSheetOpen} onOpenChange={setProgressSheetOpen}>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader>
            <SheetTitle>Progress & Navigation</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {/* Progress slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Reading Progress</span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Slider
                value={[progress]}
                onValueChange={([value]) => {
                  // TODO: Navigate to location based on progress
                  console.log("Navigate to:", value)
                }}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Current location */}
            {currentChapter && (
              <div className="text-sm">
                <span className="text-muted-foreground">Current chapter:</span>{" "}
                <span className="font-medium">{currentChapter}</span>
              </div>
            )}

            {/* Optional: TOC button */}
            {onTocClick && (
              <Button onClick={() => { onTocClick(); setProgressSheetOpen(false); }} variant="outline" className="w-full">
                Table of Contents
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
