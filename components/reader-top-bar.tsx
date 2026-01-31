"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Settings2, Menu, Bookmark, BookmarkCheck, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMediaQuery } from "@/lib/hooks/use-media-query"

interface ReaderTopBarProps {
  bookTitle: string
  bookType: "epub" | "pdf" | "text"
  distractionFree: boolean
  bookmarksCount: number
  currentChapter?: string
  readingProgress?: number
  currentPage?: number | null
  totalPages?: number | null
  onSettingsClick: () => void
  onTocClick?: () => void
  onBookmarksClick: () => void
  onAddBookmark: () => void
  onDistractionFreeChange: (enabled: boolean) => void
  onBack?: () => void
}

export function ReaderTopBar({
  bookTitle,
  bookType,
  distractionFree,
  bookmarksCount,
  currentChapter,
  readingProgress,
  currentPage,
  totalPages,
  onSettingsClick,
  onTocClick,
  onBookmarksClick,
  onAddBookmark,
  onDistractionFreeChange,
  onBack,
}: ReaderTopBarProps) {
  const router = useRouter()
  
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Auto-hide on desktop after inactivity, show/hide on scroll for mobile
  useEffect(() => {
    if (distractionFree) return

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (isMobile) {
        // Mobile: show on scroll up, hide on scroll down
        if (currentScrollY < lastScrollY) {
          setIsVisible(true)
        } else if (currentScrollY > lastScrollY + 50) {
          setIsVisible(false)
        }
      } else {
        // Desktop: show on any scroll, auto-hide after inactivity
        setIsVisible(true)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => {
          setIsVisible(false)
        }, 3000) // Hide after 3 seconds of inactivity
      }
      
      setLastScrollY(currentScrollY)
    }

    // Show on mouse move (desktop)
    const handleMouseMove = () => {
      if (!isMobile) {
        setIsVisible(true)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => {
          setIsVisible(false)
        }, 3000)
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    if (!isMobile) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true })
    }

    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (!isMobile) {
        window.removeEventListener("mousemove", handleMouseMove)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [distractionFree, isMobile, lastScrollY])

  if (distractionFree) {
    return null
  }

  // Get theme from parent (passed via props or use global theme)
  // For now, we'll use backdrop-blur with theme-aware background
  return (
    <nav
      role="navigation"
      aria-label="Reading controls"
      className="fixed top-16 left-0 right-0 z-40 backdrop-blur-sm border-b transition-opacity duration-300"
      style={{
        top: "4rem",
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? "auto" : "none",
        transition: reducedMotion ? "none" : "opacity 300ms ease-out",
        backgroundColor: "hsl(var(--background) / 0.95)",
        borderColor: "hsl(var(--border) / 0.2)",
      }}
    >
      <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-2">
        {/* Left: Back + Title + Page Info */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-8 w-8 p-0 shrink-0"
            aria-label="Back"
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-sm font-medium truncate">
            {bookTitle}
          </h1>
          {/* Page numbers - always visible */}
          {(currentPage !== null || currentChapter) && (
            <div className="text-xs text-muted-foreground font-medium shrink-0 hidden sm:block">
              {currentChapter ? (
                <span>{currentChapter}</span>
              ) : currentPage !== null && totalPages != null && totalPages > 0 ? (
                <span>Page {currentPage} of {totalPages}</span>
              ) : currentPage !== null ? (
                <span>Page {currentPage}</span>
              ) : null}
              {readingProgress !== undefined && readingProgress > 0 && (
                <span className="ml-1">• {Math.round(readingProgress)}%</span>
              )}
            </div>
          )}
        </div>

        {/* Right: Minimal controls */}
        <div className="flex items-center gap-1">
          {/* Bookmark button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddBookmark}
            className="h-8 w-8 p-0"
            aria-label="Add bookmark"
            title="Bookmark"
          >
            <BookmarkCheck className="h-4 w-4" />
          </Button>

          {/* Settings (Aa) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSettingsClick}
            className="h-8 w-8 p-0"
            aria-label="Settings"
            title="Reader settings"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  )
}
