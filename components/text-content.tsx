"use client"

import { useEffect, useRef, useState } from "react"
import { useReader } from "@/contexts/reader-context"
import { useReadingPosition } from "@/contexts/reading-position-context"
import { useTranslation } from "@/contexts/translation-context"
import { cn } from "@/lib/utils"

interface TextContentProps {
  content: string
  knownWords?: Set<string>
  vocabularyWords?: Set<string>
  hasKnownWordsData?: boolean
  // Props for when contexts aren't available
  fontSize?: number
  fontFamily?: string
  lineHeight?: number
  readingWidth?: "comfort" | "wide"
  paragraphSpacing?: number
  onTextSelection?: () => void
  onLocationChange?: (location: number) => void
  onPageChange?: (page: number) => void
  onTotalPagesChange?: (pages: number) => void
}

// Helper function to mark vocabulary words in text
function markUnknownWords(text: string, knownWords: Set<string>, vocabularyWords: Set<string>, hasKnownWords: boolean): React.ReactNode[] {
  if (!text || !hasKnownWords) {
    return [text]
  }

  const parts = text.split(/(\s+|[^\w\s]+|\w+)/g)
  
  return parts.map((part, index) => {
    if (!part.trim() || /^[^\w]+$/.test(part)) {
      return <span key={index}>{part}</span>
    }
    
    const normalized = part.trim().toLowerCase().replace(/[^\w]/g, "")
    
    if (normalized.length > 0 && vocabularyWords.has(normalized) && !knownWords.has(normalized)) {
      return (
        <span key={index} className="unknown-word-text" title="Saved to vocabulary">
          {part}
        </span>
      )
    } else {
      return <span key={index}>{part}</span>
    }
  })
}

export function TextContent({ 
  content, 
  knownWords = new Set(),
  vocabularyWords = new Set(),
  hasKnownWordsData = false,
  // Props fallback
  fontSize: propFontSize,
  fontFamily: propFontFamily,
  lineHeight: propLineHeight,
  readingWidth: propReadingWidth,
  paragraphSpacing: propParagraphSpacing,
  onTextSelection: propOnTextSelection,
  onLocationChange: propOnLocationChange,
  onPageChange: propOnPageChange,
  onTotalPagesChange: propOnTotalPagesChange,
}: TextContentProps) {
  // Try to use contexts, fallback to props
  let settings: {
    fontSize: number
    fontFamily: string
    lineHeight: number
    readingWidth: "comfort" | "wide"
    paragraphSpacing: number
  }
  let setLocation: (loc: number) => void
  let setCurrentPage: (page: number | null) => void
  let setTotalPages: (pages: number | null) => void
  let handleTextSelection: () => void

  try {
    const readerContext = useReader()
    const positionContext = useReadingPosition()
    const translationContext = useTranslation()
    settings = readerContext.settings
    setLocation = (loc: number) => positionContext.setLocation(loc)
    setCurrentPage = positionContext.setCurrentPage
    setTotalPages = positionContext.setTotalPages
    handleTextSelection = translationContext.handleTextSelection
  } catch {
    // Fallback to props
    settings = {
      fontSize: propFontSize || 16,
      fontFamily: propFontFamily || "Inter",
      lineHeight: propLineHeight || 1.6,
      readingWidth: propReadingWidth || "comfort",
      paragraphSpacing: propParagraphSpacing || 1.5,
    }
    setLocation = propOnLocationChange || (() => {})
    setCurrentPage = propOnPageChange ? (page: number | null) => propOnPageChange(page || 1) : () => {}
    setTotalPages = propOnTotalPagesChange ? (pages: number | null) => propOnTotalPagesChange(pages || 0) : () => {}
    handleTextSelection = propOnTextSelection || (() => {})
  }

  const containerRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<string[]>([])
  
  // Calculate pages (simple split for text)
  useEffect(() => {
    // Basic pagination logic for text (splitting by ~2500 chars for performance)
    const charLimit = 2500
    const chunks = []
    for (let i = 0; i < content.length; i += charLimit) {
      chunks.push(content.slice(i, i + charLimit))
    }
    setPages(chunks)
    setTotalPages(chunks.length)
  }, [content, setTotalPages])

  // Handle scroll / location updates
  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    if (scrollHeight <= clientHeight) return
    
    const progress = scrollTop / (scrollHeight - clientHeight)
    
    // Estimate page number based on scroll
    const pageIndex = Math.floor(progress * pages.length)
    setCurrentPage(Math.max(1, pageIndex + 1))
    
    // Save location (character offset)
    const charOffset = Math.floor(progress * content.length)
    setLocation(charOffset)
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className={cn(
        "h-full w-full overflow-y-auto overflow-x-hidden",
        "selection:bg-primary/20 selection:text-foreground",
        // Seamless mode: transparent background
        "bg-transparent" 
      )}
      style={{
        // Apply global variables for seamless integration
        color: "var(--c-ink)",
        fontFamily: settings.fontFamily.includes(" ") ? `"${settings.fontFamily}"` : settings.fontFamily,
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight,
      }}
      onMouseUp={() => handleTextSelection()}
      onTouchEnd={() => handleTextSelection()}
    >
      <div 
        className={cn(
          "mx-auto min-h-screen py-12 transition-all duration-300 ease-out",
          // Apply reading width settings
          settings.readingWidth === "wide" ? "max-w-[100ch]" : "max-w-[65ch]",
          // Remove the "white box" effect -> no background, no shadow
          "px-4 md:px-8"
        )}
        style={{
          // Ensure color inheritance from parent
          color: "inherit",
        }}
      >
        {/* Render text with paragraph breaks */}
        {content.split(/\n\s*\n/).map((paragraph, i) => (
          <p 
            key={i} 
            className="mb-6 empty:hidden"
            style={{ 
              marginBottom: `${settings.paragraphSpacing}rem`,
              // Explicitly set color using CSS variable to ensure visibility
              color: "var(--c-ink, var(--foreground))",
            }}
          >
            {markUnknownWords(paragraph.trim(), knownWords, vocabularyWords, hasKnownWordsData)}
          </p>
        ))}
      </div>
    </div>
  )
}
