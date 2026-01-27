"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Settings2, Menu, Bookmark, BookmarkCheck, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/lib/hooks/use-media-query"

interface ReaderChromeProps {
  bookTitle: string
  bookType: "epub" | "pdf" | "text"
  progress: number
  currentChapter?: string
  timeRemaining?: string | null
  headerVisible: boolean
  headerMinimized: boolean
  onToggleMinimize: () => void
  onSettingsClick: () => void
  onTocClick?: () => void
  onBookmarksClick: () => void
  onAddBookmark: () => void
  bookmarksCount: number
  reducedMotion?: boolean
}

export function ReaderChrome({
  bookTitle,
  bookType,
  progress,
  currentChapter,
  timeRemaining,
  headerVisible,
  headerMinimized,
  onToggleMinimize,
  onSettingsClick,
  onTocClick,
  onBookmarksClick,
  onAddBookmark,
  bookmarksCount,
  reducedMotion: propReducedMotion,
}: ReaderChromeProps) {
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  const reducedMotion = propReducedMotion !== undefined ? propReducedMotion : prefersReducedMotion
  return (
    <div
      className={cn(
        "theme-surface mb-6 container mx-auto px-4 transition-[margin-bottom] duration-200 ease-out",
        headerMinimized ? "mb-2" : "",
        !headerVisible && !reducedMotion ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
      style={{
        transition: reducedMotion ? "none" : "margin-bottom 200ms ease-out, opacity 200ms ease-out",
      }}
    >
      {/* Progress Bar - Always visible at top */}
      {progress > 0 && (
        <div className="mb-2 px-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{currentChapter || "Reading..."}</span>
            <div className="flex items-center gap-2">
              {timeRemaining && <span>{timeRemaining}</span>}
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{
                width: `${progress}%`,
                transition: reducedMotion ? "none" : "width 300ms ease-out",
              }}
            />
          </div>
        </div>
      )}

      {/* Collapsible Header */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 transition-[margin-bottom,opacity] duration-200 ease-out",
          headerMinimized ? "mb-0" : "mb-4"
        )}
        style={{
          transition: reducedMotion ? "none" : "margin-bottom 200ms ease-out, opacity 200ms ease-out",
        }}
      >
        {/* Title - hidden when minimized */}
        <h1
          className={cn(
            "text-2xl font-bold flex-1 truncate transition-[opacity,max-width] duration-200 ease-out",
            headerMinimized ? "opacity-0 max-w-0 overflow-hidden" : "opacity-100 max-w-full"
          )}
          style={{
            transition: reducedMotion ? "none" : "opacity 200ms ease-out, max-width 200ms ease-out",
          }}
        >
          {bookTitle}
        </h1>

        {/* Grouped Action Buttons */}
        <div className="theme-surface flex items-center gap-2 bg-background border border-border rounded-lg p-1.5 shadow-sm">
          {/* Minimize/Expand Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMinimize}
            className="h-8 w-8 p-0 min-h-[48px] min-w-[48px]"
            aria-label={headerMinimized ? "Expand header" : "Minimize header"}
            title={headerMinimized ? "Show title and settings" : "Hide title"}
          >
            {headerMinimized ? (
              <ChevronDown className="h-4 w-4 rotate-180" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {/* Settings Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSettingsClick}
            className="h-8 w-8 p-0 min-h-[48px] min-w-[48px]"
            aria-label="Settings"
            title="Reader settings"
          >
            <Settings2 className="h-4 w-4" />
          </Button>

          {/* Table of Contents (EPUB only) */}
          {bookType === "epub" && onTocClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onTocClick}
              className="h-8 w-8 p-0 min-h-[48px] min-w-[48px]"
              aria-label="Table of contents"
              title="Table of contents"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}

          {/* Bookmarks List Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBookmarksClick}
            className="h-8 w-8 p-0 relative min-h-[48px] min-w-[48px]"
            aria-label="Bookmarks"
            title="View bookmarks"
          >
            <Bookmark className="h-4 w-4" />
            {bookmarksCount > 0 && (
              <span className="absolute -top-1 -right-1 text-[10px] bg-primary text-primary-foreground rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
                {bookmarksCount}
              </span>
            )}
          </Button>

          {/* Add Bookmark Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddBookmark}
            className="h-8 w-8 p-0 min-h-[48px] min-w-[48px]"
            aria-label="Add bookmark"
            title="Bookmark current location"
          >
            <BookmarkCheck className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

