"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Settings2, X, Menu, BookOpen, Keyboard, Bookmark, BookmarkCheck, ChevronDown } from "lucide-react"
import { ReaderSettings } from "@/components/reader-settings"
import { EpubReader } from "@/components/epub-reader"
import { TocDrawer, type TocItem } from "@/components/toc-drawer"
import { TranslationDrawer } from "@/components/translation-drawer"
import { TranslationPopover } from "@/components/translation-popover"
import { BookmarksDrawer, type BookmarkItem } from "@/components/bookmarks-drawer"
import { ReaderTopBar } from "@/components/reader-top-bar"
import { ReadingProgressIndicator } from "@/components/reading-progress-indicator"
import { KeyboardShortcutsOverlay } from "@/components/keyboard-shortcuts-overlay"
import { ReaderErrorBoundary } from "@/components/reader-error-boundary"
import { ReaderThemeSync } from "@/components/reader-theme-sync"
import { toast } from "@/lib/toast"
import { useIsMobile } from "@/lib/hooks/use-media-query"
import { createFingerprint, getCachedLocations, saveCachedLocations, type LayoutFingerprint } from "@/lib/epub-locations-cache"

// Helper function to mark vocabulary words in text
function markUnknownWords(text: string, knownWords: Set<string>, vocabularyWords: Set<string>, hasKnownWords: boolean): React.ReactNode[] {
  if (!text || !hasKnownWords) {
    // Don't mark anything if we haven't loaded vocabulary data yet
    return [text]
  }

  // Split text into words and spaces, preserving punctuation
  const parts = text.split(/(\s+|[^\w\s]+|\w+)/g)
  
  return parts.map((part, index) => {
    // Skip whitespace and punctuation-only parts
    if (!part.trim() || /^[^\w]+$/.test(part)) {
      return <span key={index}>{part}</span>
    }
    
    // Check if word is in vocabulary (normalize: lowercase, trim, remove punctuation)
    const normalized = part.trim().toLowerCase().replace(/[^\w]/g, "")
    
    // Mark as vocabulary word if:
    // - Word has letters/numbers
    // - Word is in vocabulary set (saved but not marked as known)
    // - Word is NOT in the known set
    if (normalized.length > 0 && vocabularyWords.has(normalized) && !knownWords.has(normalized)) {
      // Mark as vocabulary word (saved but not known)
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

// Component to highlight search term in text content
function SearchHighlight({ searchTerm }: { searchTerm: string }) {
  const highlightedRef = useRef(false)
  
  useEffect(() => {
    if (!searchTerm || highlightedRef.current) return
    
    const contentEl = document.getElementById("book-content")
    if (!contentEl) {
      // Retry if element not ready
      const timeout = setTimeout(() => {
        const retryEl = document.getElementById("book-content")
        if (retryEl && !highlightedRef.current) {
          highlightText(retryEl, searchTerm)
          highlightedRef.current = true
        }
      }, 500)
      return () => clearTimeout(timeout)
    }

    highlightText(contentEl, searchTerm)
    highlightedRef.current = true
  }, [searchTerm])
  
  // Reset highlight flag when search term changes
  useEffect(() => {
    highlightedRef.current = false
  }, [searchTerm])

  const highlightText = (element: HTMLElement, term: string) => {
    // Clear previous highlights
    const marks = element.querySelectorAll('mark.search-highlight')
    marks.forEach(mark => {
      const parent = mark.parentNode
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ''), mark)
        parent.normalize()
      }
    })

    // Find and highlight text
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    )
    
    const textNodes: Text[] = []
    let node
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text)
    }

    // Find first occurrence and highlight
    for (const textNode of textNodes) {
      const text = textNode.textContent || ""
      const index = text.toLowerCase().indexOf(term.toLowerCase())
      if (index >= 0) {
        // Split the text node
        const beforeText = text.substring(0, index)
        const matchText = text.substring(index, index + term.length)
        const afterText = text.substring(index + term.length)
        
        // Create new nodes
        const beforeNode = document.createTextNode(beforeText)
        const markNode = document.createElement('mark')
        markNode.className = 'search-highlight'
        markNode.style.backgroundColor = 'yellow'
        markNode.style.opacity = '0.5'
        markNode.textContent = matchText
        const afterNode = document.createTextNode(afterText)
        
        // Replace the text node
        const parent = textNode.parentNode
        if (parent) {
          parent.insertBefore(beforeNode, textNode)
          parent.insertBefore(markNode, textNode)
          parent.insertBefore(afterNode, textNode)
          parent.removeChild(textNode)
          
          // Scroll to highlight
          setTimeout(() => {
            markNode.scrollIntoView({ 
              behavior: "smooth", 
              block: "center",
              inline: "nearest"
            })
          }, 100)
        }
        break
      }
    }
  }

  return null
}

// Helper functions for reader settings
const getBookSettingsKey = (bookId: string) => `reader_settings_${bookId}`

const loadBookSettings = (bookId: string) => {
  try {
    const saved = localStorage.getItem(getBookSettingsKey(bookId))
    if (saved) {
      const settings = JSON.parse(saved)
      return {
        fontSize: settings.fontSize || 16,
        fontFamily: settings.fontFamily || "Inter",
        lineHeight: settings.lineHeight || 1.6,
        readingWidth: settings.readingWidth || "comfort",
        paragraphSpacing: settings.paragraphSpacing || 1.5,
        distractionFree: settings.distractionFree || false,
      }
    }
  } catch (e) {
    console.error("Error loading book settings:", e)
  }
  return {
    fontSize: 16,
    fontFamily: "Inter",
    lineHeight: 1.6,
    readingWidth: "comfort" as const,
    paragraphSpacing: 1.5,
    distractionFree: false,
  }
}

const saveBookSettings = (bookId: string, settings: {
  fontSize: number
  fontFamily: string
  lineHeight: number
  readingWidth: "comfort" | "wide"
  paragraphSpacing: number
  distractionFree: boolean
}) => {
  try {
    localStorage.setItem(getBookSettingsKey(bookId), JSON.stringify(settings))
  } catch (e) {
    console.error("Error saving book settings:", e)
  }
}

interface Book {
  id: string
  title: string
  type: string
  content: string | null
  pdfUrl: string | null
  epubUrl: string | null
}

export default function ReaderPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const bookId = params.id as string
  
  // Extract search params directly - don't memoize as searchParams changes on every render
  const initialLocation = searchParams.get("location")
  const initialPage = searchParams.get("page")
  const searchTerm = searchParams.get("search")
  
  const [book, setBook] = useState<Book | null>(null)
  
  // Store book type in a ref to prevent re-renders
  const bookTypeRef = useRef<string | undefined>(undefined)
  if (book?.type !== bookTypeRef.current) {
    bookTypeRef.current = book?.type
  }
  const bookType = bookTypeRef.current
  const [loading, setLoading] = useState(true)
  const [selectedText, setSelectedText] = useState("")
  const [translation, setTranslation] = useState("")
  const [alternativeTranslations, setAlternativeTranslations] = useState<string[]>([])
  const [translating, setTranslating] = useState(false)
  const [selectedContext, setSelectedContext] = useState<string>("")
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>(undefined)
  // Mobile detection using media queries (pointer:coarse + max-width)
  const isMobile = useIsMobile()
  const [saving, setSaving] = useState(false)

  const [fontSize, setFontSize] = useState(16)
  const [fontFamily, setFontFamily] = useState("Inter")
  const [lineHeight, setLineHeight] = useState(1.6)
  const [readingWidth, setReadingWidth] = useState<"comfort" | "wide">("comfort") // Reading width preset
  const [paragraphSpacing, setParagraphSpacing] = useState(1.5) // rem
  const [distractionFree, setDistractionFree] = useState(false)
  const [location, setLocation] = useState<string | number>(0)
  const [epubUrl, setEpubUrl] = useState<string | null>(null)
  const [epubError, setEpubError] = useState<string | null>(null)
  const renditionRef = useRef<any>(null)
  const bookRef = useRef<any>(null)
  const [currentLocation, setCurrentLocation] = useState<string | number>(0)
  const [currentPage, setCurrentPage] = useState<number | null>(null)
  const [totalPages, setTotalPages] = useState<number | null>(null) // For text books
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [savedWordId, setSavedWordId] = useState<string | null>(null)
  const lastFocusRef = useRef<HTMLElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const [toc, setToc] = useState<TocItem[]>([])
  const [tocOpen, setTocOpen] = useState(false)
  const [readingProgress, setReadingProgress] = useState(0)
  const [currentChapter, setCurrentChapter] = useState<string>("")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [bookmarksOpen, setBookmarksOpen] = useState(false)
  const [knownWords, setKnownWords] = useState<Set<string>>(new Set())
  const [vocabularyWords, setVocabularyWords] = useState<Set<string>>(new Set()) // Words saved to vocabulary (not marked as known)
  const [hasKnownWordsData, setHasKnownWordsData] = useState(false)
  const bookContentRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const epubContainerRef = useRef<HTMLDivElement | null>(null) // Container for EPUB reader
  const lastLocRef = useRef<string | number | null>(null) // Track last location for EPUB
  const locationsReadyRef = useRef(false) // Track if EPUB locations are ready
  const router = useRouter()
  
  // Track container dimensions for layout fingerprint
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // Normalize percentage: handles both 0..1 and 0..100 formats
  const normalizeToFraction = useCallback((value: number) => {
    // If it's already 0..1 keep it, if it's 0..100 convert to 0..1
    if (value > 1) return Math.min(1, Math.max(0, value / 100))
    return Math.min(1, Math.max(0, value))
  }, [])

  // Update EPUB pages from location
  const updateEpubPagesFromLoc = useCallback((loc: string | number, bookObj: any) => {
    try {
      const locations = bookObj?.locations
      if (!locations || !locations.total || Number(locations.total) === 0) {
        return
      }

      const total = Number(locations.total)
      
      // Get percentage from CFI
      let percentage = 0
      if (typeof loc === "string") {
        try {
          const p = locations.percentageFromCfi(loc)
          percentage = normalizeToFraction(Number(p) || 0)
        } catch (e) {
          console.debug("Error getting percentage from CFI:", e)
          return
        }
      } else {
        percentage = normalizeToFraction(loc)
      }

      // Calculate page: location index (0-based) + 1
      // Use locationFromCfi if available, otherwise estimate from percentage
      let locationIndex = 0
      if (typeof loc === "string") {
        try {
          // Try to get location index directly from CFI
          if (typeof locations.locationFromCfi === 'function') {
            locationIndex = locations.locationFromCfi(loc) || 0
          } else {
            // Fallback: estimate from percentage
            locationIndex = Math.floor(percentage * total)
          }
        } catch (e) {
          // Fallback: estimate from percentage
          locationIndex = Math.floor(percentage * total)
        }
      } else {
        locationIndex = Math.floor(percentage * total)
      }

      const calculatedPage = Math.max(1, Math.min(total, locationIndex + 1))
      const calculatedProgress = percentage * 100

      setTotalPages(total)
      setCurrentPage(calculatedPage)
      setReadingProgress(Math.max(0, Math.min(100, calculatedProgress)))
    } catch (e) {
      console.debug("Error in updateEpubPagesFromLoc:", e)
    }
  }, [normalizeToFraction])

  // Ensure EPUB locations are generated
  const ensureEpubLocations = useCallback(async (bookObj: any, layoutFingerprint?: LayoutFingerprint) => {
    if (!bookObj?.locations) return

    // Create fingerprint from current layout if provided
    let fingerprint: string | null = null
    if (layoutFingerprint) {
      fingerprint = createFingerprint(layoutFingerprint)
      
      // Check cache first
      const cached = await getCachedLocations(bookId, fingerprint)
      if (cached && cached.total > 0) {
        setTotalPages(cached.total)
        locationsReadyRef.current = true
        // Re-apply last known location
        if (lastLocRef.current != null) {
          updateEpubPagesFromLoc(lastLocRef.current, bookObj)
        }
        return
      }
    }

    // Wait until the book is actually ready/opened
    if (bookObj.ready && typeof bookObj.ready === 'function') {
      try {
        await bookObj.ready()
      } catch (e) {
        console.debug("Book ready promise failed:", e)
      }
    }

    const locations = bookObj.locations
    const hasTotal = locations?.total != null && Number(locations.total) > 0
    const hasLen = typeof locations?.length === "function" && locations.length() > 0

    if (!hasTotal || !hasLen) {
      try {
        // Generate locations - use epubjs default granularity
        // Don't pass target count - let epubjs calculate optimal granularity
        await locations.generate()
        
        // Cache the result if we have a fingerprint
        if (fingerprint && locations.total) {
          await saveCachedLocations(bookId, fingerprint, Number(locations.total))
        }
        
        console.log("EPUB locations generated:", locations.total)
      } catch (e) {
        console.debug("Error generating locations:", e)
        return
      }
    }

    locationsReadyRef.current = true
    const total = Number(locations.total) || 0
    if (total > 0) {
      setTotalPages(total)
    }

    // Re-apply last known location so currentPage stops being null
    if (lastLocRef.current != null) {
      updateEpubPagesFromLoc(lastLocRef.current, bookObj)
    }
  }, [bookId, updateEpubPagesFromLoc])
  
  // Auto-save progress refs
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedLocationRef = useRef<string | number | null>(null)

  // Auto-save reading progress function
  const autoSaveProgress = useCallback(async (loc: string | number, progress: number) => {
    // Don't save if location hasn't changed significantly
    if (lastSavedLocationRef.current === loc) {
      return
    }

    // Safety checks
    if (!book?.id || !loc) return
    if (progress <= 0 || progress > 100) return // Invalid progress

    try {
      const bookmarkData: any = {
        bookId: book.id,
        progressPercentage: Math.round(progress), // Round to integer
      }

      if (book.type === "epub" && typeof loc === "string" && loc.length > 0) {
        bookmarkData.epubLocation = loc
        if (currentPage !== null && currentPage > 0) {
          bookmarkData.pageNumber = currentPage
        }
      } else if (book.type === "pdf" && currentPage && currentPage > 0) {
        bookmarkData.pageNumber = currentPage
      } else if (book.type === "text" && typeof loc === "number" && loc > 0) {
        bookmarkData.position = loc
      }

      // Only save if we have at least one location identifier
      if (!bookmarkData.epubLocation && !bookmarkData.pageNumber && !bookmarkData.position) {
        return
      }

      const res = await fetch("/api/bookmarks/last-read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookmarkData),
      })

      if (res.ok) {
        lastSavedLocationRef.current = loc
        // Silently save - no toast notification for auto-save
      }
    } catch (error) {
      // Silently fail - don't interrupt reading experience
      console.debug("Auto-save progress error:", error)
    }
  }, [book, currentPage])

  // Handle initial page navigation from URL for text books
  useEffect(() => {
    if (book?.type === "text" && initialPage && scrollContainerRef.current && bookContentRef.current) {
      const pageNum = parseInt(initialPage)
      if (!isNaN(pageNum) && pageNum > 0) {
        // Wait for content to render, then scroll
        setTimeout(() => {
          const container = scrollContainerRef.current
          if (container && bookContentRef.current) {
            const containerHeight = container.clientHeight
            const scrollPosition = (pageNum - 1) * containerHeight
            container.scrollTo({
              top: scrollPosition,
              behavior: 'auto'
            })
            setCurrentPage(pageNum)
          }
        }, 500)
      }
    }
  }, [book?.type, initialPage])

  // Calculate page numbers for text books based on scroll position
  // Uses ResizeObserver to handle font size changes, dynamic content, etc.
  const calculatePages = useCallback(() => {
    const contentEl = bookContentRef.current
    const container = scrollContainerRef.current
    if (!contentEl || !container) return

    const containerHeight = container.clientHeight
    const contentHeight = contentEl.scrollHeight
    const scrollTop = container.scrollTop

    // Guard against invalid measurements
    if (containerHeight <= 0 || contentHeight <= 0) return

    // Estimate pages based on content height vs container height
    // Each "page" is roughly one viewport height
    const estimatedTotalPages = Math.max(1, Math.ceil(contentHeight / containerHeight))
    setTotalPages(estimatedTotalPages)

    // Calculate current page based on scroll position
    const currentPageNum = Math.max(
      1,
      Math.min(estimatedTotalPages, Math.floor(scrollTop / containerHeight) + 1)
    )
    setCurrentPage(currentPageNum)

    // Calculate reading progress (avoid division by zero)
    const denom = Math.max(1, contentHeight - containerHeight)
    const progress = Math.min(100, Math.max(0, (scrollTop / denom) * 100))
    setReadingProgress(progress)
  }, [])

  // Use useLayoutEffect to run immediately after layout, and ResizeObserver for changes
  useEffect(() => {
    if (book?.type !== "text" || !book.content) return

    const contentEl = bookContentRef.current
    const container = scrollContainerRef.current
    if (!contentEl || !container) return

    // Run once right after layout using requestAnimationFrame
    const raf = requestAnimationFrame(() => {
      calculatePages()
    })

    // Use ResizeObserver to detect content/viewport changes (font size, dynamic content, etc.)
    const resizeObserver = new ResizeObserver(() => {
      calculatePages()
    })
    resizeObserver.observe(container)
    resizeObserver.observe(contentEl)

    // Also listen to scroll events
    container.addEventListener('scroll', calculatePages, { passive: true })
    window.addEventListener('resize', calculatePages, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      container.removeEventListener('scroll', calculatePages)
      window.removeEventListener('resize', calculatePages)
    }
  }, [book?.type, book?.content, fontSize, lineHeight, readingWidth, calculatePages])

  // Auto-save for PDF and text books when page changes
  useEffect(() => {
    if (book && (book.type === "pdf" || book.type === "text") && currentPage !== null) {
      // Clear any pending auto-save
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      
      // For text books, use actual progress; for PDF, estimate
      const progress = book.type === "text" && readingProgress > 0 
        ? readingProgress 
        : (currentPage > 50 ? Math.min(80, (currentPage / 100) * 100) : Math.max(5, currentPage * 2))
      
      // Debounce auto-save
      autoSaveTimerRef.current = setTimeout(() => {
        autoSaveProgress(currentPage, progress)
      }, 3000)
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [book, currentPage, readingProgress])

  // Save progress on unmount
  useEffect(() => {
    return () => {
      // Clear any pending auto-save
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      
      // Save current progress on unmount
      if (book && currentLocation !== null && readingProgress > 0) {
        autoSaveProgress(currentLocation, readingProgress)
      } else if (book && (book.type === "pdf" || book.type === "text") && currentPage !== null) {
        const estimatedProgress = currentPage > 50 ? Math.min(80, (currentPage / 100) * 100) : Math.max(5, currentPage * 2)
        autoSaveProgress(currentPage, estimatedProgress)
      }
    }
  }, [book, currentLocation, readingProgress, currentPage])

  // Mobile detection is now handled by useIsMobile hook

  // Helper function to normalize text (trim, collapse whitespace)
  const normalizeText = (text: string): string => {
    return text.trim().replace(/\s+/g, " ")
  }

  // Helper function to count words
  const countWords = (text: string): number => {
    const normalized = normalizeText(text)
    if (!normalized) return 0
    return normalized.split(/\s+/).filter(word => word.length > 0).length
  }

  // Helper function to check if selection is a phrase (2-6 words)
  const isPhrase = (text: string): boolean => {
    const wordCount = countWords(text)
    return wordCount >= 2 && wordCount <= 6
  }

  const handleSaveWord = useCallback(async () => {
    console.log("handleSaveWord called", { selectedText, translation, book: book?.id })
    
    if (!selectedText || !translation || !book) {
      console.error("Missing required fields:", { selectedText: !!selectedText, translation: !!translation, book: !!book })
      toast.error("Missing information", "Please select a word and wait for translation.")
      return
    }

    setSaving(true)
    try {
      console.log("Starting save process...")
      // Ensure we always have a context - use selectedText as fallback
      let context = selectedContext?.trim() || selectedText.trim()
      
      // For non-EPUB, try to get better context if we don't have it
      if (book.type !== "epub" && (!selectedContext || selectedContext === selectedText)) {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const container = range.commonAncestorContainer
          if (container.parentElement) {
            const parentText = container.parentElement.textContent || ""
            const startOffset = Math.max(0, range.startOffset - 100)
            const endOffset = Math.min(parentText.length, range.endOffset + 100)
            const extractedContext = parentText.substring(startOffset, endOffset).trim()
            if (extractedContext && extractedContext.length > selectedText.length) {
              context = extractedContext
            }
          }
        }
      }

      // Ensure context is not empty - fallback to selectedText
      if (!context || context.trim().length === 0) {
        context = selectedText.trim()
      }

      // For EPUB, store location and page; for others, calculate position
      let position: number | null = null
      let epubLocation: string | null = null
      let pageNumber: number | null = null
      
      if (book.type === "epub") {
        // Store EPUB location (CFI format)
        epubLocation = typeof currentLocation === "string" ? currentLocation : String(currentLocation)
        // Use current page if available
        pageNumber = currentPage
      } else {
        // For text content, calculate character position
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const container = range.commonAncestorContainer
          if (container.parentElement) {
            position = range.startOffset
          }
        }
      }

      const payload = {
        term: selectedText.trim(),
        translation: translation.trim(),
        context: context.trim(),
        bookId: book.id,
        position,
        epubLocation,
        pageNumber,
      }
      
      console.log("Sending save request:", payload)
      
      const response = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      
      console.log("Response status:", response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        setSavedWordId(data.id)
        
        // Add word to vocabulary words set so it gets highlighted immediately
        const normalized = selectedText.trim().toLowerCase().replace(/[^\w]/g, "")
        if (normalized.length > 0) {
          setVocabularyWords(prev => {
            const newSet = new Set(prev)
            newSet.add(normalized)
            return newSet
          })
        }
        
        // Show toast notification
        const isPhrase = selectedText.split(/\s+/).length > 1
        toast.success(
          isPhrase ? "Phrase saved!" : "Word saved!",
          `${selectedText} has been added to your vocabulary.`
        )
        
        // Close popover immediately for better UX and performance
        requestAnimationFrame(() => {
          setPopoverOpen(false)
          setSelectedText("")
          setTranslation("")
          setAlternativeTranslations([])
          setSelectedContext("")
          setSavedWordId(null)
          setPopoverPosition(undefined)
          
          // Clear selection to prevent re-triggering
          window.getSelection()?.removeAllRanges()
        })
      } else {
        // Get actual error message from API
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
        
        // Log error data in multiple ways for debugging
        console.error("=== SAVE ERROR RESPONSE ===")
        console.error("Status:", response.status)
        console.error("Status Text:", response.statusText)
        console.error("Error Data Object:", errorData)
        console.error("Error Data JSON:", JSON.stringify(errorData, null, 2))
        
        // Log each property separately for easier debugging
        if (errorData) {
          console.error("--- Error Properties ---")
          console.error("error:", errorData.error)
          console.error("message:", errorData.message)
          console.error("code:", errorData.code)
          console.error("constraint:", errorData.constraint)
          console.error("detail:", errorData.detail)
          console.error("details:", errorData.details)
          console.error("stack:", errorData.stack)
        }
        
        // Build user-friendly error message
        let errorMessage = errorData.error || errorData.message || `Failed to save word (${response.status})`
        
        // Add details if available
        if (errorData.details) {
          errorMessage += `: ${errorData.details}`
        } else if (errorData.message && errorData.message !== errorMessage) {
          errorMessage += `: ${errorData.message}`
        }
        
        // Add constraint info if available
        if (errorData.constraint) {
          errorMessage += ` (constraint: ${errorData.constraint})`
        }
        
        // Add code if available
        if (errorData.code) {
          errorMessage += ` (code: ${errorData.code})`
        }
        
        console.error("Final error message:", errorMessage)
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error("Error saving word:", error)
      let errorMessage = "An error occurred while saving. Please try again."
      
      if (error instanceof Error) {
        errorMessage = error.message
        // If it's a detailed error from API, show the details
        if (error.message.includes(":")) {
          errorMessage = error.message
        }
      }
      
      toast.error("Failed to save", errorMessage)
      // Don't reset saving state immediately - let user see the error
      setTimeout(() => setSaving(false), 2000)
      return
    } finally {
      setSaving(false)
    }
  }, [selectedText, translation, book, selectedContext, currentLocation, currentPage])

  // Keyboard shortcuts handler
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("[contenteditable]")
      ) {
        return
      }

      // Don't intercept if a dialog/modal is open (except shortcuts dialog)
      if (target.closest('[role="dialog"]') && !target.closest('[data-shortcuts-dialog]')) {
        return
      }

      // Esc: Close overlays (popover, shortcuts, drawers)
      if (e.key === "Escape") {
        if (shortcutsOpen) {
          e.preventDefault()
          setShortcutsOpen(false)
          return
        }
        if (popoverOpen) {
          e.preventDefault()
          e.stopPropagation()
          setPopoverOpen(false)
          setSelectedText("")
          setTranslation("")
          setAlternativeTranslations([])
          setSavedWordId(null)
          return
        }
        if (bookmarksOpen) {
          e.preventDefault()
          setBookmarksOpen(false)
          return
        }
        if (tocOpen) {
          e.preventDefault()
          setTocOpen(false)
          return
        }
        if (settingsOpen) {
          e.preventDefault()
          setSettingsOpen(false)
          return
        }
        return
      }

      // Only handle shortcuts when popover is open (S, K) or when not in distraction-free mode
      if (popoverOpen) {
        // S: Save selection
        if (e.key === "s" || e.key === "S") {
          if (selectedText && translation && !saving && !savedWordId) {
            e.preventDefault()
            handleSaveWord()
            return
          }
        }

        // K: Mark known / dismiss without saving
        if (e.key === "k" || e.key === "K") {
          e.preventDefault()
          setPopoverOpen(false)
          setSelectedText("")
          setTranslation("")
          setAlternativeTranslations([])
          setSavedWordId(null)
          return
        }
      }

      // Shortcuts when not in distraction-free mode
      if (!distractionFree) {
        // A: Open settings drawer
        if (e.key === "a" || e.key === "A") {
          e.preventDefault()
          setSettingsOpen(true)
          return
        }

        // B: Bookmark current location
        if (e.key === "b" || e.key === "B") {
          e.preventDefault()
          if (book) {
            const bookmarkData: any = { bookId: book.id }
            if (book.type === "epub" && currentLocation) {
              bookmarkData.epubLocation = typeof currentLocation === "string" ? currentLocation : String(currentLocation)
              if (currentPage !== null && currentPage > 0) {
                bookmarkData.pageNumber = currentPage
              }
            } else if (book.type === "text" && currentPage !== null && currentPage > 0) {
              bookmarkData.pageNumber = currentPage
            } else if (book.content && currentPage !== null && currentPage > 0) {
              bookmarkData.pageNumber = currentPage
            }
            
            // Ensure we have at least one location identifier
            if (!bookmarkData.epubLocation && !bookmarkData.pageNumber && !bookmarkData.position) {
              toast.error("Cannot create bookmark", "No valid location found.")
              return
            }
            
            // Clean up: remove any undefined values before sending
            const cleanBookmarkData = Object.fromEntries(
              Object.entries(bookmarkData).filter(([_, v]) => v !== undefined)
            )
            
            fetch("/api/bookmarks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(cleanBookmarkData),
            })
              .then(res => {
                if (res.ok) {
                  return res.json()
                }
                throw new Error("Failed to create bookmark")
              })
              .then(newBookmark => {
                setBookmarks([...bookmarks, newBookmark])
                toast.success("Bookmark added!", "You can return to this location anytime.")
                fetch(`/api/bookmarks?bookId=${book.id}`)
                  .then(res => res.json())
                  .then(data => {
                    if (Array.isArray(data)) {
                      setBookmarks(data)
                    }
                  })
                  .catch(() => {})
              })
              .catch(() => {
                toast.error("Failed to add bookmark", "Please try again.")
              })
          }
          return
        }

        // C: Open Contents (TOC)
        if (e.key === "c" || e.key === "C") {
          if (book?.type === "epub") {
            e.preventDefault()
            setTocOpen(true)
            return
          }
        }

        // R: Go to Review
        if (e.key === "r" || e.key === "R") {
          e.preventDefault()
          router.push("/review")
          return
        }

        // Arrow keys for navigation (EPUB)
        if (book?.type === "epub" && renditionRef.current) {
          if (e.key === "ArrowLeft") {
            e.preventDefault()
            try {
              renditionRef.current.prev()
            } catch (err) {
              console.debug("Error navigating previous:", err)
            }
            return
          }
          if (e.key === "ArrowRight") {
            e.preventDefault()
            try {
              renditionRef.current.next()
            } catch (err) {
              console.debug("Error navigating next:", err)
            }
            return
          }
        }

        // ?: Open shortcuts help
        if (e.key === "?") {
          e.preventDefault()
          setShortcutsOpen(true)
          return
        }
      }
    }

    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [popoverOpen, selectedText, translation, saving, savedWordId, distractionFree, book?.type, tocOpen, settingsOpen, shortcutsOpen, bookmarksOpen, router, handleSaveWord])

  // Keyboard focus management
  useEffect(() => {
    if (popoverOpen) {
      // Store last focused element
      lastFocusRef.current = document.activeElement as HTMLElement | null
      // Focus close button when popover opens
      requestAnimationFrame(() => {
        closeBtnRef.current?.focus()
      })
    } else {
      // Restore focus when popover closes
      requestAnimationFrame(() => {
        lastFocusRef.current?.focus?.()
      })
    }
  }, [popoverOpen])

  useEffect(() => {
    fetchBook()
    
    // Cleanup blob URL on unmount
    return () => {
      if (epubUrl && epubUrl.startsWith("blob:")) {
        URL.revokeObjectURL(epubUrl)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId])

  // Load book settings when book changes
  useEffect(() => {
    if (book?.id) {
      const settings = loadBookSettings(book.id)
      setFontSize(settings.fontSize)
      setFontFamily(settings.fontFamily)
      setLineHeight(settings.lineHeight)
      setReadingWidth(settings.readingWidth)
      setParagraphSpacing(settings.paragraphSpacing)
      setDistractionFree(settings.distractionFree)
    }
  }, [book?.id])

  // Save book settings when they change
  useEffect(() => {
    if (book?.id) {
      saveBookSettings(book.id, {
        fontSize,
        fontFamily,
        lineHeight,
        readingWidth,
        paragraphSpacing,
        distractionFree,
      })
    }
  }, [book?.id, fontSize, fontFamily, lineHeight, readingWidth, paragraphSpacing, distractionFree])

  // Measure container dimensions for layout fingerprint
  useEffect(() => {
    const container = epubContainerRef.current || scrollContainerRef.current
    if (!container) return

    const updateSize = () => {
      setContainerSize({
        width: container.clientWidth,
        height: container.clientHeight,
      })
    }

    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(container)

    // Also listen to window resize
    window.addEventListener('resize', updateSize)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [book?.type])

  // Regenerate locations when layout fingerprint changes
  useEffect(() => {
    if (book?.type !== "epub" || !bookRef.current) return
    
    const fingerprint: LayoutFingerprint = {
      fontSize,
      fontFamily,
      lineHeight,
      readingWidth,
      containerWidth: containerSize.width || window.innerWidth,
      containerHeight: containerSize.height || window.innerHeight,
    }

    // Debounce regeneration (600ms)
    const timer = setTimeout(() => {
      if (bookRef.current) {
        locationsReadyRef.current = false
        ensureEpubLocations(bookRef.current, fingerprint)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [fontSize, fontFamily, lineHeight, readingWidth, containerSize, book?.type, ensureEpubLocations])

  // Fetch bookmarks for this book
  useEffect(() => {
    if (book?.id) {
      fetch(`/api/bookmarks?bookId=${book.id}`)
        .then(res => {
          if (!res.ok) {
            console.error("Bookmarks fetch failed:", res.status, res.statusText)
            return []
          }
          return res.json()
        })
        .then(data => {
          // Ensure data is an array
          if (Array.isArray(data)) {
            setBookmarks(data)
          } else {
            console.error("Bookmarks data is not an array:", data)
            setBookmarks([])
          }
        })
        .catch(err => {
          console.error("Error fetching bookmarks:", err)
          setBookmarks([])
        })
    }
  }, [book?.id])

  // Fetch vocabulary words for this book
  useEffect(() => {
    if (book?.id) {
      setHasKnownWordsData(false) // Reset flag while fetching
      fetch(`/api/vocabulary?bookId=${book.id}`)
        .then(res => {
          if (!res.ok) {
            console.error("Vocabulary fetch failed:", res.status, res.statusText)
            return []
          }
          return res.json()
        })
        .then(data => {
          if (Array.isArray(data)) {
            // Create Sets of normalized words
            const knownSet = new Set<string>()
            const vocabSet = new Set<string>() // Words saved to vocabulary but NOT marked as known
            
            data.forEach((item: any) => {
              // Normalize the word - prefer termNormalized if available, otherwise use term
              let normalized: string | null = null
              
              if (item.termNormalized) {
                normalized = item.termNormalized.toLowerCase().trim().replace(/[^\w]/g, "")
              } else if (item.term) {
                normalized = item.term.toLowerCase().trim().replace(/[^\w]/g, "")
              }
              
              if (normalized && normalized.length > 0) {
                if (item.isKnown) {
                  // Add to known words set
                  knownSet.add(normalized)
                } else {
                  // Add to vocabulary words set (saved but not known)
                  vocabSet.add(normalized)
                }
              }
            })
            
            console.log("Loaded known words:", knownSet.size, Array.from(knownSet).slice(0, 10))
            console.log("Loaded vocabulary words (not known):", vocabSet.size, Array.from(vocabSet).slice(0, 10))
            console.log("Total vocabulary items:", data.length, "Known:", knownSet.size, "Not known:", vocabSet.size)
            
            setKnownWords(knownSet)
            setVocabularyWords(vocabSet)
            setHasKnownWordsData(true) // Mark that we have data (even if empty)
          } else {
            setKnownWords(new Set())
            setVocabularyWords(new Set())
            setHasKnownWordsData(true)
          }
        })
        .catch(err => {
          console.error("Error fetching vocabulary:", err)
          setKnownWords(new Set())
          setVocabularyWords(new Set())
          setHasKnownWordsData(true) // Still mark as loaded to avoid marking all words
        })
    } else {
      setHasKnownWordsData(false)
      setKnownWords(new Set())
      setVocabularyWords(new Set())
    }
  }, [book?.id])

  // Separate effect to handle search after rendition is ready
  // Use a ref to track if search has been performed to prevent infinite loops
  const searchPerformedRef = useRef(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    // Reset search flag when searchTerm changes
    searchPerformedRef.current = false
    // Clear any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = null
    }
  }, [searchTerm])
  
  useEffect(() => {
    // Only run for EPUB books with search term
    if (!searchTerm || bookType !== "epub" || searchPerformedRef.current) return
    
    const performEpubSearch = async () => {
      try {
        // Wait for page to render
        await new Promise(resolve => setTimeout(resolve, 2500))

        console.log("Performing EPUB search for:", searchTerm)
        
        // Direct iframe search
        const viewer = document.querySelector('#react-reader')
        const iframe = viewer?.querySelector('iframe')
        if (!iframe || !iframe.contentWindow || !iframe.contentDocument) {
          console.log("Iframe not ready")
          searchPerformedRef.current = false
          return
        }
        
        const iframeDoc = iframe.contentDocument
        const iframeWin = iframe.contentWindow
        
        // Manual search and highlight - more reliable than window.find
        const body = iframeDoc.body
        if (!body) {
          console.log("Iframe body not ready")
          searchPerformedRef.current = false
          return
        }
        
        // First, try window.find as a fallback
        const winFind = (iframeWin as any).find
        if (winFind && typeof winFind === 'function') {
          try {
            const found = winFind(searchTerm, false, false, true)
            if (found) {
              console.log("Found using window.find")
              return
            }
          } catch (e) {
            console.log("window.find failed, using manual highlight")
          }
        }
        
        // Manual highlight: Find all text nodes and highlight matches
        const walker = iframeDoc.createTreeWalker(
          body,
          NodeFilter.SHOW_TEXT,
          null
        )
        
        const textNodes: Text[] = []
        let node
        while ((node = walker.nextNode())) {
          textNodes.push(node as Text)
        }
        
        // Find and highlight first occurrence with visual highlight
        let foundMatch = false
        for (const textNode of textNodes) {
          const text = textNode.textContent || ""
          const searchLower = searchTerm.toLowerCase()
          const textLower = text.toLowerCase()
          const index = textLower.indexOf(searchLower)
          
          if (index >= 0) {
            foundMatch = true
            
            // Split the text node to insert highlight
            const beforeText = text.substring(0, index)
            const matchText = text.substring(index, index + searchTerm.length)
            const afterText = text.substring(index + searchTerm.length)
            
            // Create new nodes
            const beforeNode = iframeDoc.createTextNode(beforeText)
            const markNode = iframeDoc.createElement('mark')
            markNode.style.backgroundColor = 'yellow'
            markNode.style.opacity = '0.6'
            markNode.style.padding = '2px 0'
            markNode.style.color = 'inherit'
            markNode.style.borderRadius = '2px'
            markNode.textContent = matchText
            const afterNode = iframeDoc.createTextNode(afterText)
            
            // Replace the text node
            const parent = textNode.parentNode
            if (parent) {
              parent.insertBefore(beforeNode, textNode)
              parent.insertBefore(markNode, textNode)
              parent.insertBefore(afterNode, textNode)
              parent.removeChild(textNode)
              
              // Scroll to highlight
              setTimeout(() => {
                markNode.scrollIntoView({ 
                  behavior: "smooth", 
                  block: "center",
                  inline: "nearest"
                })
              }, 100)
              
              console.log("Found and highlighted:", searchTerm)
              break
            }
          }
        }
        
        if (!foundMatch) {
          console.log("Text not found:", searchTerm)
        }
      } catch (error) {
        console.error("EPUB search error:", error)
        searchPerformedRef.current = false
      }
    }
    
    // Check if rendition is ready
    if (!renditionRef.current) {
      // Wait and retry
      searchTimeoutRef.current = setTimeout(() => {
        if (renditionRef.current && !searchPerformedRef.current) {
          searchPerformedRef.current = true
          performEpubSearch()
        }
      }, 1000)
      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
        }
      }
    }
    
    // Mark as performed and execute
    searchPerformedRef.current = true
    performEpubSearch()
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm, bookType])

  const fetchBook = async () => {
    try {
      setLoading(true)
      setEpubError(null)
      
      const res = await fetch("/api/books")
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch books: ${res.status} ${res.statusText}`)
      }
      
      const data = await res.json()
      const foundBook = data.find((b: Book) => b.id === bookId)
      
      if (!foundBook) {
        setEpubError("Book not found")
        setLoading(false)
        return
      }
      
      setBook(foundBook)
      
      // Load last read position
      try {
        const bookmarksRes = await fetch(`/api/bookmarks?bookId=${bookId}`)
        if (bookmarksRes.ok) {
          const bookmarks: any[] = await bookmarksRes.json()
          const lastReadBookmark = bookmarks.find(b => b.title === "__LAST_READ__")
          if (lastReadBookmark) {
            // Restore location based on book type
            if (foundBook.type === "epub" && lastReadBookmark.epubLocation) {
              setLocation(lastReadBookmark.epubLocation)
              setCurrentLocation(lastReadBookmark.epubLocation)
            } else if (foundBook.type === "pdf" && lastReadBookmark.pageNumber) {
              setCurrentPage(lastReadBookmark.pageNumber)
            } else if (foundBook.type === "text") {
              if (lastReadBookmark.position) {
                setLocation(lastReadBookmark.position)
              }
              // Restore page number if available
              if (lastReadBookmark.pageNumber) {
                setCurrentPage(lastReadBookmark.pageNumber)
                // Scroll to that page after a short delay to ensure content is rendered
                setTimeout(() => {
                  const container = scrollContainerRef.current
                  if (container && bookContentRef.current) {
                    const containerHeight = container.clientHeight
                    const scrollPosition = (lastReadBookmark.pageNumber - 1) * containerHeight
                    container.scrollTo({
                      top: scrollPosition,
                      behavior: 'auto'
                    })
                  }
                }, 500)
              }
            }
            // Restore progress if available
            if (lastReadBookmark.progressPercentage) {
              setReadingProgress(lastReadBookmark.progressPercentage)
            }
          }
        }
      } catch (error) {
        console.error("Error loading last read position:", error)
        // Continue without restoring position
      }
      
      // Prepare EPUB URL if it's an EPUB book
      // Use API endpoint so epubjs can fetch individual files
      if (foundBook.type === "epub") {
        if (!foundBook.epubUrl) {
          setEpubError("EPUB file not found for this book")
        } else {
          // Use the API endpoint that serves the EPUB
          // This allows epubjs to fetch individual files via our catch-all route
          setEpubUrl(`/api/books/${bookId}/epub`)
          setEpubError(null)
        }
      }
    } catch (error: any) {
      console.error("Error fetching book:", error)
      const errorMessage = error?.message || "Failed to load book. Please try again."
      setEpubError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleTextSelection = async (text: string, cfiRange?: string, context?: string) => {
    // For EPUB, text is passed directly from the rendition
    // For non-EPUB, use window selection
    let selectedText = text
    let contextText = context || ""
    let selectionRect: DOMRect | null = null
    
    if (!selectedText && book?.type !== "epub") {
      const selection = window.getSelection()
      if (!selection || selection.toString().trim().length === 0) {
        return
      }
      selectedText = selection.toString().trim()
      
      // Get selection bounding box for positioning
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        selectionRect = range.getBoundingClientRect()
        
        // Get context from selection
        const container = range.commonAncestorContainer
        if (container.parentElement) {
          contextText = container.parentElement.textContent?.substring(
            Math.max(0, range.startOffset - 100),
            Math.min(container.parentElement.textContent.length, range.endOffset + 100)
          ) || selectedText
        }
      }
    } else if (book?.type === "epub" && context) {
      // Use provided context from EPUB
      contextText = context
      
      // For EPUB, try to get selection position from iframe
      try {
        const iframe = document.querySelector("iframe")
        if (iframe?.contentWindow) {
          const iframeSelection = iframe.contentWindow.getSelection()
          if (iframeSelection && iframeSelection.rangeCount > 0) {
            const range = iframeSelection.getRangeAt(0)
            const rect = range.getBoundingClientRect()
            const iframeRect = iframe.getBoundingClientRect()
            // Convert iframe coordinates to page coordinates
            selectionRect = new DOMRect(
              rect.left + iframeRect.left,
              rect.top + iframeRect.top,
              rect.width,
              rect.height
            )
          }
        }
      } catch (e) {
        // Iframe access might fail, use center of viewport as fallback
        selectionRect = new DOMRect(
          window.innerWidth / 2,
          window.innerHeight / 2,
          0,
          0
        )
      }
    }

    // Validate phrase length (2-6 words)
    const wordCount = countWords(selectedText)
    if (wordCount > 6) {
      // Show error message for too long selection
      alert("Please select a shorter phrase (2-6 words)")
      return
    }

    if (!selectedText || selectedText.length === 0 || selectedText.length > 100) {
      return
    }

    // Store current location for EPUB
    if (book?.type === "epub" && location) {
      setCurrentLocation(location)
    }

    // Store last focused element before opening popover
    lastFocusRef.current = document.activeElement as HTMLElement | null
    
    setSelectedText(selectedText)
    setSelectedContext(contextText || selectedText)
    setTranslating(true)
    setSavedWordId(null) // Reset saved state

    // Capture selection position for desktop popover
    if (selectionRect) {
      setPopoverPosition({
        x: selectionRect.left,
        y: selectionRect.top,
        width: selectionRect.width,
        height: selectionRect.height,
      })
    } else {
      // Fallback: center of viewport
      setPopoverPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        width: 0,
        height: 0,
      })
    }

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText }),
      })
      const data = await res.json()
      setTranslation(data.translatedText)
      setAlternativeTranslations(data.alternativeTranslations || [])
      setPopoverOpen(true)
    } catch (error) {
      console.error("Translation error:", error)
      setTranslation("Translation failed")
    } finally {
      setTranslating(false)
    }
  }

  const handlePopoverMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-drag-handle]') || target.closest('[data-drag-handle]')?.contains(target)) {
      e.preventDefault()
      setIsDragging(true)
      const popover = (e.currentTarget as HTMLElement).closest('[role="dialog"]') as HTMLElement
      if (popover) {
        const rect = popover.getBoundingClientRect()
        setDragOffset({
          x: e.clientX - (rect.left + rect.width / 2),
          y: e.clientY - (rect.top + rect.height / 2),
        })
      }
    }
  }

  useEffect(() => {
    let handleMouseMove: ((e: MouseEvent) => void) | null = null
    let handleMouseUp: (() => void) | null = null

    if (isDragging && popoverOpen) {
      handleMouseMove = (e: MouseEvent) => {
        const newX = Math.max(160, Math.min(window.innerWidth - 160, e.clientX - dragOffset.x))
        const newY = Math.max(100, Math.min(window.innerHeight - 200, e.clientY - dragOffset.y))
        // Preserve width and height when updating position
        setPopoverPosition((prev) => ({
          x: newX,
          y: newY,
          width: prev?.width || 0,
          height: prev?.height || 0,
        }))
      }

      handleMouseUp = () => {
        setIsDragging(false)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "grabbing"
      document.body.style.userSelect = "none"
    } else {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    return () => {
      if (handleMouseMove) {
        document.removeEventListener("mousemove", handleMouseMove)
      }
      if (handleMouseUp) {
        document.removeEventListener("mouseup", handleMouseUp)
      }
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [isDragging, dragOffset, popoverOpen])

  // Helper function to add bookmark
  const handleAddBookmark = useCallback(async () => {
    if (!book) return
    try {
      const bookmarkData: any = { bookId: book.id }
      if (book.type === "epub" && currentLocation) {
        bookmarkData.epubLocation = typeof currentLocation === "string" ? currentLocation : String(currentLocation)
        if (currentPage !== null && currentPage > 0) {
          bookmarkData.pageNumber = currentPage
        }
      } else if (book.type === "text" && currentPage !== null && currentPage > 0) {
        bookmarkData.pageNumber = currentPage
      } else if (book.content && currentPage !== null && currentPage > 0) {
        bookmarkData.pageNumber = currentPage
      }
      
      // Ensure we have at least one location identifier
      if (!bookmarkData.epubLocation && !bookmarkData.pageNumber && !bookmarkData.position) {
        toast.error("Cannot create bookmark", "No valid location found.")
        return
      }
      
      // Clean up: remove any undefined values before sending
      const cleanBookmarkData = Object.fromEntries(
        Object.entries(bookmarkData).filter(([_, v]) => v !== undefined)
      )
      
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanBookmarkData),
      })
      
      if (res.ok) {
        const newBookmark = await res.json()
        setBookmarks((prev) => [...prev, newBookmark])
        toast.success("Bookmark added!", "You can return to this location anytime.")
      } else {
        const errorData = await res.json().catch(() => ({}))
        const errorMsg = errorData.message || errorData.error || "Please try again."
        console.error("Bookmark error:", errorData)
        toast.error("Failed to add bookmark", errorMsg)
      }
    } catch (error) {
      console.error("Error creating bookmark:", error)
      toast.error("Failed to add bookmark", "An error occurred. Please try again.")
    }
  }, [book, currentLocation, currentPage])

  // Theme background colors - unified across entire page
  // Reading width - increased significantly for better readability
  // Use percentage-based max-width for better responsiveness
  const readingWidthStyle = readingWidth === "comfort" 
    ? { maxWidth: "85ch", width: "100%" }
    : { maxWidth: "100ch", width: "100%" }

  // Use general site theme colors via CSS variables
  const themeBgColor = "var(--c-canvas)"
  const themeTextColor = "var(--c-ink)"

  // Early returns

  // Early returns
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading book...</p>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="text-center py-12">Book not found</div>
    )
  }

  return (
    <div 
      className="reader-root theme-surface min-h-screen"
      style={{
        backgroundColor: themeBgColor,
        color: themeTextColor,
        transition: "background-color 0.2s ease, color 0.2s ease",
      }}
    >
      {/* Sync reader theme to global theme */}
      <ReaderThemeSync />
      
      {/* Minimal top bar with auto-hide */}
      {!distractionFree && (
        <ReaderTopBar
          bookTitle={book.title}
          bookType={book.type as "epub" | "pdf" | "text"}
          distractionFree={distractionFree}
          bookmarksCount={bookmarks.filter(b => b.title !== "__LAST_READ__").length}
          currentChapter={currentChapter}
          readingProgress={readingProgress}
          currentPage={currentPage}
          totalPages={totalPages}
          onSettingsClick={() => setSettingsOpen(true)}
          onTocClick={book.type === "epub" ? () => setTocOpen(true) : undefined}
          onBookmarksClick={() => setBookmarksOpen(true)}
          onAddBookmark={handleAddBookmark}
          onDistractionFreeChange={setDistractionFree}
        />
      )}

      {/* Settings Drawer */}
      <ReaderSettings
        fontSize={fontSize}
        fontFamily={fontFamily}
        lineHeight={lineHeight}
        readingWidth={readingWidth}
        paragraphSpacing={paragraphSpacing}
        onParagraphSpacingChange={setParagraphSpacing}
        isOpen={settingsOpen}
        onOpenChange={setSettingsOpen}
        onFontSizeChange={setFontSize}
        onFontFamilyChange={setFontFamily}
        onLineHeightChange={setLineHeight}
        onReadingWidthChange={setReadingWidth}
      />

      {/* Distraction-free mode exit button - minimal */}
      {distractionFree && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDistractionFree(false)}
            className="h-8 w-8 p-0 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Exit focus mode"
            title="Exit focus mode"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Two-layer background: App chrome + Reading surface - unified theme, no borders */}
      <div 
        className={`theme-surface ${distractionFree ? "" : "container mx-auto px-4 md:px-8 lg:px-12 py-8"}`}
        style={{
          backgroundColor: themeBgColor,
          color: themeTextColor,
          transition: "background-color 0.2s ease, color 0.2s ease",
        }}
      >
        {/* Centered reading surface - unified theme, no white borders */}
        <div
          ref={scrollContainerRef}
          className={`theme-surface ${distractionFree ? "min-h-screen" : "min-h-[800px]"} overflow-auto`}
          onMouseUp={() => {
            // Only handle mouseup for non-EPUB content
            // EPUB content handles selection via iframe events
            if (book.type !== "epub") {
              handleTextSelection("")
            }
          }}
          style={{
            "--RS__fontFamily": book.type === "epub" ? fontFamily : undefined,
            "--RS__fontSize": book.type === "epub" ? `${fontSize}px` : undefined,
            "--RS__lineHeight": book.type === "epub" ? lineHeight.toString() : undefined,
            ...readingWidthStyle,
            marginLeft: "auto",
            marginRight: "auto",
            paddingLeft: distractionFree ? "1rem" : "clamp(2rem, 5vw, 4rem)",
            paddingRight: distractionFree ? "1rem" : "clamp(2rem, 5vw, 4rem)",
            paddingTop: distractionFree ? "2rem" : "3rem",
            paddingBottom: distractionFree ? "2rem" : "3rem",
            backgroundColor: themeBgColor,
            color: themeTextColor,
            transition: "background-color 0.2s ease, color 0.2s ease",
          } as React.CSSProperties}
        >
        {book.type === "epub" ? (
          <ReaderErrorBoundary>
            {epubError ? (
            <div className="text-center text-muted-foreground p-12">
              <p className="text-red-500 mb-2 font-semibold">Error loading book</p>
              <p className="text-sm mb-4">{epubError}</p>
              <Button
                onClick={() => {
                  setEpubError(null)
                  fetchBook()
                }}
                variant="outline"
                  className="min-h-[48px]"
              >
                Retry
              </Button>
            </div>
          ) : epubUrl ? (
            <div 
              className="reader-paper-surface"
              style={{
                backgroundColor: "var(--c-canvas, var(--background))",
                maxWidth: readingWidth === "comfort" ? "85ch" : "100ch",
                margin: "0 auto",
              }}
            >
              <div 
                ref={epubContainerRef}
                style={{ 
                  height: "calc(100vh - 8rem)", 
                  minHeight: "800px", 
                  position: "relative", 
                  width: "100%",
                  backgroundColor: "var(--c-canvas, var(--background))",
                }}
              >
                <EpubReader
                key={bookId} // Only remount when book changes, not settings
                url={epubUrl}
                location={location}
                knownWords={knownWords}
                vocabularyWords={vocabularyWords}
                hasKnownWordsData={hasKnownWordsData}
                onLocationChange={(loc) => {
                  // Store last location for replay when locations are ready
                  lastLocRef.current = loc
                  
                  // Always update location state
                  setLocation(loc)
                  setCurrentLocation(loc)
                  
                  // Calculate progress and chapter
                  const bookObj = bookRef.current
                  if (!bookObj) return

                  // If locations aren't ready yet, try to ensure they are
                  if (!locationsReadyRef.current) {
                    const fingerprint: LayoutFingerprint = {
                      fontSize,
                      fontFamily,
                      lineHeight,
                      readingWidth,
                      containerWidth: containerSize.width || window.innerWidth,
                      containerHeight: containerSize.height || window.innerHeight,
                    }
                    ensureEpubLocations(bookObj, fingerprint).then(() => {
                      // Retry page update after locations are ready
                      if (lastLocRef.current) {
                        updateEpubPagesFromLoc(lastLocRef.current, bookObj)
                      }
                    })
                    setCurrentPage(1)
                    return
                  }

                  // Update pages from location - always call this to ensure updates
                  // Use requestAnimationFrame to ensure DOM is ready
                  requestAnimationFrame(() => {
                    try {
                      updateEpubPagesFromLoc(loc, bookObj)
                    } catch (e) {
                      console.debug("Error updating pages from location:", e)
                      // Retry once after a short delay
                      setTimeout(() => {
                        try {
                          updateEpubPagesFromLoc(loc, bookObj)
                        } catch (retryError) {
                          console.debug("Retry failed:", retryError)
                        }
                      }, 100)
                    }
                  })
                  
                  // Calculate percentage for auto-save
                  let percentage = 0
                  try {
                    const locations = bookObj.locations
                    if (locations) {
                      if (typeof loc === 'string') {
                        const p = locations.percentageFromCfi(loc)
                        percentage = normalizeToFraction(Number(p) || 0) * 100
                      } else {
                        percentage = normalizeToFraction(loc) * 100
                      }
                    }
                  } catch (e) {
                    console.debug("Error calculating percentage:", e)
                  }
                  
                  // Auto-save progress (debounced - every 3 seconds)
                  if (percentage > 0) {
                    if (autoSaveTimerRef.current) {
                      clearTimeout(autoSaveTimerRef.current)
                    }
                    
                    autoSaveTimerRef.current = setTimeout(() => {
                      if (book && percentage > 0) {
                        autoSaveProgress(loc, percentage)
                      }
                    }, 3000) // Save every 3 seconds after user stops reading
                  }
                  
                  // Find current chapter from TOC
                  if (toc.length > 0 && typeof loc === 'string' && renditionRef.current) {
                    try {
                      const currentLoc = renditionRef.current.currentLocation()
                      if (currentLoc?.start?.cfi) {
                        // Find the chapter that contains this location
                        for (let i = toc.length - 1; i >= 0; i--) {
                          const tocItem = toc[i]
                          if (tocItem.href) {
                            try {
                              const tocCfi = bookObj?.spine?.get(tocItem.href)?.cfi
                              if (tocCfi && currentLoc.start.cfi >= tocCfi) {
                                setCurrentChapter(tocItem.label)
                                break
                              }
                            } catch (e) {
                              // Ignore errors in chapter detection
                            }
                          }
                        }
                      }
                    } catch (e) {
                      console.debug("Error finding chapter:", e)
                    }
                  }
                }}
                onRenditionReady={async (rend, book) => {
                  renditionRef.current = rend
                  const bookObj = book || rend.book
                  if (bookObj) {
                    bookRef.current = bookObj
                  }
                  
                  // Create layout fingerprint for initial load
                  const fingerprint: LayoutFingerprint = {
                    fontSize,
                    fontFamily,
                    lineHeight,
                    readingWidth,
                    containerWidth: containerSize.width || window.innerWidth,
                    containerHeight: containerSize.height || window.innerHeight,
                  }
                  
                  // Ensure locations are generated and ready
                  await ensureEpubLocations(bookObj, fingerprint)
                  
                  // Force an initial page update even before navigation
                  try {
                    const cfi = rend?.currentLocation?.()?.start?.cfi
                    if (cfi) {
                      lastLocRef.current = cfi
                      updateEpubPagesFromLoc(cfi, bookObj)
                    }
                  } catch (e) {
                    console.debug("Error getting initial location:", e)
                  }
                  
                  // Navigate to initial location if provided
                  if (initialLocation && rend) {
                    try {
                      rend.display(initialLocation)
                      setLocation(initialLocation)
                      
                      // Search will be handled by the separate useEffect hook
                    } catch (e) {
                      console.error("Error navigating to location:", e)
                    }
                  } else if (initialPage && bookRef.current) {
                    // Convert page number to CFI location
                    try {
                      const locations = bookRef.current.locations
                      if (locations && locations.total) {
                        const pageNum = parseInt(initialPage)
                        const percentage = (pageNum / locations.total) * 100
                        const cfi = locations.cfiFromPercentage(percentage / 100)
                        if (cfi && rend) {
                          rend.display(cfi)
                          setLocation(cfi)
                          
                          // Search will be handled by the separate useEffect hook
                        }
                      }
                    } catch (e) {
                      console.error("Error navigating to page:", e)
                    }
                  }
                  
                  // Calculate initial page and progress
                  try {
                    if (!rend) {
                      console.warn("Rendition is not available")
                      return
                    }
                    
                    const bookObj = book || rend.book
                    if (!bookObj) {
                      console.warn("Book object is not available")
                      return
                    }
                    
                    // Wait a bit for rendition to be fully ready
                    await new Promise(resolve => setTimeout(resolve, 100))
                    
                        const currentLoc = rend.currentLocation?.()
                        if (currentLoc && currentLoc.start && bookObj?.locations) {
                          const percentage = bookObj.locations.percentageFromCfi(currentLoc.start.cfi) || 0
                          // percentageFromCfi returns 0-1, convert to 0-100
                          const progressPercent = normalizeToFraction(percentage) * 100
                          setReadingProgress(progressPercent)
                          if (bookObj.locations.total) {
                            const total = Number(bookObj.locations.total)
                            if (total > 0) {
                              setTotalPages(total)
                              // Calculate page number (1-indexed)
                              const page = Math.max(1, Math.min(total, Math.ceil(progressPercent / 100 * total) || 1))
                              setCurrentPage(page)
                            }
                          }
                          
                          // Set current location
                          if (currentLoc.start.cfi) {
                            setCurrentLocation(currentLoc.start.cfi)
                          }
                        }
                  } catch (e) {
                    console.error("Error getting initial page:", e)
                    // Don't throw - this is not critical
                  }
                }}
                onTocChanged={(tocItems) => {
                  setToc(tocItems)
                }}
                onTextSelected={handleTextSelection}
                fontSize={fontSize}
                fontFamily={fontFamily}
                lineHeight={lineHeight}
              />
              </div>
              
              {/* TOC Drawer */}
              <TocDrawer
                toc={toc}
                isOpen={tocOpen}
                onClose={() => setTocOpen(false)}
                onNavigate={(href) => {
                  if (renditionRef.current) {
                    try {
                      renditionRef.current.display(href)
                    } catch (e) {
                      console.error("Error navigating to TOC item:", e)
                    }
                  }
                }}
                currentLocation={typeof currentLocation === 'string' ? currentLocation : undefined}
              />

              {/* Bookmarks Drawer */}
              <BookmarksDrawer
                isOpen={bookmarksOpen}
                onClose={() => setBookmarksOpen(false)}
                bookmarks={bookmarks}
                onNavigate={(bookmark) => {
                  if (book.type === "epub" && bookmark.epubLocation && renditionRef.current) {
                    try {
                      renditionRef.current.display(bookmark.epubLocation)
                      setLocation(bookmark.epubLocation)
                      setCurrentLocation(bookmark.epubLocation)
                      setBookmarksOpen(false)
                      toast.success("Navigated to bookmark", "You're now at your saved location.")
                    } catch (e) {
                      console.error("Error navigating to bookmark:", e)
                      toast.error("Navigation failed", "Could not navigate to bookmark location.")
                    }
                  } else if (book.type === "text" && bookmark.pageNumber) {
                    // Scroll to the page for text books
                    const container = scrollContainerRef.current
                    if (container && bookContentRef.current) {
                      const containerHeight = container.clientHeight
                      const scrollPosition = (bookmark.pageNumber - 1) * containerHeight
                      container.scrollTo({
                        top: scrollPosition,
                        behavior: 'smooth'
                      })
                      setCurrentPage(bookmark.pageNumber)
                      setBookmarksOpen(false)
                      toast.success("Navigated to bookmark", "You're now at your saved location.")
                    } else {
                      setCurrentPage(bookmark.pageNumber)
                      setBookmarksOpen(false)
                      toast.success("Navigated to bookmark", "You're now at your saved location.")
                    }
                  } else if (bookmark.pageNumber) {
                    setCurrentPage(bookmark.pageNumber)
                    setBookmarksOpen(false)
                    toast.success("Navigated to bookmark", "You're now at your saved location.")
                  }
                }}
                onDelete={async (id) => {
                  try {
                    const res = await fetch(`/api/bookmarks/${id}`, { method: "DELETE" })
                    if (res.ok) {
                    setBookmarks(bookmarks.filter(b => b.id !== id))
                      toast.success("Bookmark deleted", "The bookmark has been removed.")
                    } else {
                      throw new Error("Failed to delete bookmark")
                    }
                  } catch (error) {
                    console.error("Error deleting bookmark:", error)
                    toast.error("Failed to delete", "Could not remove bookmark. Please try again.")
                  }
                }}
                onUpdate={async (id, title) => {
                  const res = await fetch(`/api/bookmarks/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title }),
                  })
                  if (!res.ok) {
                    throw new Error("Failed to update bookmark")
                  }
                  const updated = await res.json()
                  setBookmarks(bookmarks.map(b => b.id === id ? updated : b))
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading EPUB...</p>
            </div>
          )}
          </ReaderErrorBoundary>
        ) : book.content ? (
          <>
            <div
              ref={bookContentRef}
              id="book-content"
              className={`reader-content-wrapper ${distractionFree ? "py-8 px-3 md:py-12 md:px-8 lg:px-16" : "p-3 sm:p-6 md:p-8"}`}
              style={{
                fontFamily: fontFamily.includes(" ") ? `"${fontFamily}"` : fontFamily,
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                maxWidth: "100%", // Already constrained by parent
                ["--para-gap" as any]: `${paragraphSpacing}rem`,
              } as React.CSSProperties}
            >
              {/* Reading Mode Layout - Centered, optimal line length */}
              <article 
                className="text-justify select-text whitespace-pre-wrap break-words"
                style={{
                  fontFamily: fontFamily.includes(" ") ? `"${fontFamily}"` : fontFamily,
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight,
                }}
              >
                {book.content.split(/\n\s*\n/).map((paragraph, index) => (
                  <p 
                    key={index} 
                    style={{
                      marginBottom: `var(--para-gap)`,
                    }}
                  >
                    {markUnknownWords(paragraph.trim(), knownWords, vocabularyWords, hasKnownWordsData)}
                  </p>
                ))}
              </article>
            </div>
            {searchTerm && <SearchHighlight searchTerm={searchTerm} />}
          </>
        ) : (
          <div className="text-center text-muted-foreground p-12">
            <p className="mb-2">No content available</p>
            <p className="text-sm">If this is a scanned PDF, it may not have selectable text.</p>
          </div>
        )}
        </div>



        {/* Keyboard Shortcuts Help Dialog */}
        <KeyboardShortcutsOverlay
          isOpen={shortcutsOpen}
          onClose={() => setShortcutsOpen(false)}
        />

        {/* Translation UI - Adaptive: Popover on desktop, Drawer on mobile */}
        {isMobile ? (
          <TranslationDrawer
            isOpen={popoverOpen}
            onClose={() => {
              setPopoverOpen(false)
              setSelectedText("")
              setTranslation("")
              setAlternativeTranslations([])
              setSavedWordId(null)
              setPopoverPosition(undefined)
            }}
            selectedText={selectedText}
            translation={translation}
            translating={translating}
            alternativeTranslations={alternativeTranslations}
            saving={saving}
            savedWordId={savedWordId}
            isPhrase={isPhrase(selectedText)}
            context={selectedContext}
            onSave={handleSaveWord}
            onTranslationChange={(newTranslation) => {
              setTranslation(newTranslation)
            }}
            onMarkKnown={async () => {
              try {
                // Mark as known without saving to vocabulary
                // Normalize the same way as in the reader (remove all non-word chars)
                const normalized = selectedText.trim().toLowerCase().replace(/[^\w]/g, "")
                await fetch("/api/vocabulary", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    term: selectedText,
                    termNormalized: normalized,
                    isKnown: true,
                  }),
                })
                // Update known words set with normalized version
                setKnownWords(prev => {
                  const newSet = new Set(prev)
                  if (normalized.length > 0) {
                    newSet.add(normalized)
                  }
                  return newSet
                })
                // Remove from vocabulary words set (since it's now known)
                setVocabularyWords(prev => {
                  const newSet = new Set(prev)
                  newSet.delete(normalized)
                  return newSet
                })
                setPopoverOpen(false)
                setSelectedText("")
                setTranslation("")
                setAlternativeTranslations([])
                setSavedWordId(null)
                setPopoverPosition(undefined)
                toast.success("Marked as known", `${selectedText} won't show in future lookups.`)
              } catch (error) {
                console.error("Failed to mark as known:", error)
                toast.error("Failed to mark as known", "Please try again.")
              }
            }}
            onUndo={async () => {
              if (savedWordId) {
                try {
                  await fetch(`/api/vocabulary/${savedWordId}`, {
                    method: "DELETE",
                  })
                  setPopoverOpen(false)
                  setSelectedText("")
                  setTranslation("")
                  setAlternativeTranslations([])
                  setSavedWordId(null)
                  setPopoverPosition(undefined)
                  toast.success("Undone", "Word has been removed from your vocabulary.")
                } catch (error) {
                  console.error("Failed to undo save:", error)
                  toast.error("Failed to undo", "Could not remove the word. Please try again.")
                }
              }
            }}
          />
        ) : (
          <TranslationPopover
            isOpen={popoverOpen}
            onClose={() => {
              setPopoverOpen(false)
              setSelectedText("")
              setTranslation("")
              setAlternativeTranslations([])
              setSavedWordId(null)
              setPopoverPosition(undefined)
              // Return focus to last focused element
              if (lastFocusRef.current) {
                lastFocusRef.current.focus()
              }
            }}
            selectedText={selectedText}
            translation={translation}
            translating={translating}
            alternativeTranslations={alternativeTranslations}
            saving={saving}
            savedWordId={savedWordId}
            isPhrase={isPhrase(selectedText)}
            context={selectedContext}
            selectionPosition={popoverPosition}
            onSave={handleSaveWord}
            onTranslationChange={(newTranslation) => {
              setTranslation(newTranslation)
            }}
            onMarkKnown={async () => {
              try {
                // Mark as known without saving to vocabulary
                // Normalize the same way as in the reader (remove all non-word chars)
                const normalized = selectedText.trim().toLowerCase().replace(/[^\w]/g, "")
                await fetch("/api/vocabulary", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    term: selectedText,
                    termNormalized: normalized,
                    isKnown: true,
                  }),
                })
                // Update known words set with normalized version
                setKnownWords(prev => {
                  const newSet = new Set(prev)
                  if (normalized.length > 0) {
                    newSet.add(normalized)
                  }
                  return newSet
                })
                // Remove from vocabulary words set (since it's now known)
                setVocabularyWords(prev => {
                  const newSet = new Set(prev)
                  newSet.delete(normalized)
                  return newSet
                })
                setPopoverOpen(false)
                setSelectedText("")
                setTranslation("")
                setAlternativeTranslations([])
                setSavedWordId(null)
                setPopoverPosition(undefined)
                if (lastFocusRef.current) {
                  lastFocusRef.current.focus()
                }
                toast.success("Marked as known", `${selectedText} won't show in future lookups.`)
              } catch (error) {
                console.error("Failed to mark as known:", error)
                toast.error("Failed to mark as known", "Please try again.")
              }
            }}
            onUndo={async () => {
              if (savedWordId) {
                try {
                  await fetch(`/api/vocabulary/${savedWordId}`, {
                    method: "DELETE",
                  })
                  setPopoverOpen(false)
                  setSelectedText("")
                  setTranslation("")
                  setAlternativeTranslations([])
                  setSavedWordId(null)
                  setPopoverPosition(undefined)
                  if (lastFocusRef.current) {
                    lastFocusRef.current.focus()
                  }
                  toast.success("Undone", "Word has been removed from your vocabulary.")
                } catch (error) {
                  console.error("Failed to undo save:", error)
                  toast.error("Failed to undo", "Could not remove the word. Please try again.")
                }
              }
            }}
          />
        )}

        {/* Bottom Status Pill - Calm progress indicator */}
        {!distractionFree && (
          <ReadingProgressIndicator
            progress={readingProgress}
            currentPage={currentPage}
            totalPages={totalPages}
            currentChapter={currentChapter}
            bookType={book.type as "epub" | "pdf" | "text"}
            onTocClick={book.type === "epub" ? () => setTocOpen(true) : undefined}
          />
        )}
      </div>
    </div>
  )
}
