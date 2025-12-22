"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
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
import { toast } from "@/lib/toast"

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
  const [isMobile, setIsMobile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fontSize, setFontSize] = useState(16)
  const [fontFamily, setFontFamily] = useState("Inter")
  const [lineHeight, setLineHeight] = useState(1.6)
  const [maxWidth, setMaxWidth] = useState(66) // ch units - optimal reading width
  const [paragraphSpacing, setParagraphSpacing] = useState(1.5) // rem
  const [theme, setTheme] = useState<"light" | "sepia" | "dark" | "paper">("light")
  const [distractionFree, setDistractionFree] = useState(false)
  const [location, setLocation] = useState<string | number>(0)
  const [epubUrl, setEpubUrl] = useState<string | null>(null)
  const [epubError, setEpubError] = useState<string | null>(null)
  const renditionRef = useRef<any>(null)
  const bookRef = useRef<any>(null)
  const [currentLocation, setCurrentLocation] = useState<string | number>(0)
  const [currentPage, setCurrentPage] = useState<number | null>(null)
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
  const [headerMinimized, setHeaderMinimized] = useState(false)
  const router = useRouter()

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

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

      // Esc: Close popover or shortcuts dialog
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
  }, [popoverOpen, selectedText, translation, saving, savedWordId, distractionFree, book?.type, tocOpen, settingsOpen, shortcutsOpen, router])

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

  const handleSaveWord = async () => {
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
    return <div className="text-center py-12">Book not found</div>
  }

  // Theme background colors - apply to both container and content
  const themeStyles = {
    light: "bg-white",
    sepia: "bg-[#f4ecd8]",
    dark: "bg-[#1a1a1a] text-[#e0e0e0]",
    paper: "bg-[#faf8f3]",
  }

  const themeClass = themeStyles[theme]
  const textColorClass = theme === "dark" ? "text-[#e0e0e0]" : "text-foreground"

  return (
    <div className={`min-h-screen transition-colors duration-200 ${distractionFree ? themeClass : "bg-background"}`}>
      {!distractionFree && (
        <div className={`mb-6 container mx-auto px-4 transition-all duration-300 ${headerMinimized ? 'mb-2' : ''}`}>
          {/* Collapsible Header */}
          <div className={`flex items-center justify-between gap-2 transition-all duration-300 ${
            headerMinimized ? 'mb-0' : 'mb-4'
          }`}>
            {/* Title - hidden when minimized */}
            <h1 className={`text-2xl font-bold flex-1 truncate transition-all duration-300 ${
              headerMinimized ? 'opacity-0 max-w-0 overflow-hidden' : 'opacity-100 max-w-full'
            }`}>
              {book.title}
            </h1>
            
            {/* Grouped Action Buttons */}
            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border rounded-lg p-1.5 shadow-sm">
              {/* Minimize/Expand Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHeaderMinimized(!headerMinimized)}
                className="h-8 w-8 p-0"
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
                onClick={() => setSettingsOpen(true)}
                className="h-8 w-8 p-0"
                aria-label="Settings"
                title="Reader settings"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
              
              {/* Table of Contents (EPUB only) */}
              {book.type === "epub" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTocOpen(true)}
                  className="h-8 w-8 p-0"
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
                onClick={() => setBookmarksOpen(true)}
                className="h-8 w-8 p-0 relative"
                aria-label="Bookmarks"
                title="View bookmarks"
              >
                <Bookmark className="h-4 w-4" />
                {bookmarks.length > 0 && (
                  <span className="absolute -top-1 -right-1 text-[10px] bg-primary text-primary-foreground rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
                    {bookmarks.length}
                  </span>
                )}
              </Button>
              
              {/* Add Bookmark Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    const bookmarkData: any = { bookId: book.id }
                    if (book.type === "epub" && currentLocation) {
                      bookmarkData.epubLocation = typeof currentLocation === "string" ? currentLocation : String(currentLocation)
                      bookmarkData.pageNumber = currentPage
                    } else if (book.content) {
                      bookmarkData.pageNumber = currentPage
                    }
                    
                    const res = await fetch("/api/bookmarks", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(bookmarkData),
                    })
                    
                    if (res.ok) {
                      const newBookmark = await res.json()
                      setBookmarks([...bookmarks, newBookmark])
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
                }}
                className="h-8 w-8 p-0"
                aria-label="Add bookmark"
                title="Bookmark current location"
              >
                <BookmarkCheck className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Settings Panel - shown when not minimized */}
          {!headerMinimized && (
            <div className="transition-all duration-300">
              <ReaderSettings
                fontSize={fontSize}
                fontFamily={fontFamily}
                lineHeight={lineHeight}
                maxWidth={maxWidth}
                paragraphSpacing={paragraphSpacing}
                theme={theme}
                distractionFree={distractionFree}
                isOpen={settingsOpen}
                onOpenChange={setSettingsOpen}
                onFontSizeChange={setFontSize}
                onFontFamilyChange={setFontFamily}
                onLineHeightChange={setLineHeight}
                onMaxWidthChange={setMaxWidth}
                onParagraphSpacingChange={setParagraphSpacing}
                onThemeChange={setTheme}
                onDistractionFreeChange={setDistractionFree}
              />
            </div>
          )}
        </div>
      )}

      {distractionFree && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setDistractionFree(false)}
            className="h-12 w-12 min-w-[48px] shadow-lg bg-background/90 backdrop-blur-sm"
            aria-label="Show settings"
          >
            <Settings2 className="h-5 w-5" />
          </Button>
        </div>
      )}

      <div className={`${distractionFree ? "" : "container mx-auto px-4 md:px-8 lg:px-12"}`}>
        <div
          className={`${distractionFree ? "min-h-screen" : "border rounded-lg min-h-[800px] max-h-[90vh]"} ${themeClass} ${textColorClass} overflow-auto transition-colors duration-200 ${distractionFree ? "" : "shadow-sm"}`}
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
            backgroundColor: theme === "dark" ? "#1a1a1a" : theme === "sepia" ? "#f4ecd8" : theme === "paper" ? "#faf8f3" : "white",
            color: theme === "dark" ? "#e0e0e0" : "inherit",
            transition: "background-color 0.2s ease, color 0.2s ease",
          } as React.CSSProperties}
        >
        {book.type === "epub" ? (
          epubError ? (
            <div className="text-center text-muted-foreground p-12">
              <p className="text-red-500 mb-2 font-semibold">Error loading book</p>
              <p className="text-sm mb-4">{epubError}</p>
              <Button
                onClick={() => {
                  setEpubError(null)
                  fetchBook()
                }}
                variant="outline"
              >
                Retry
              </Button>
            </div>
          ) : epubUrl ? (
            <div style={{ height: "700px", position: "relative" }}>
              {/* Progress Bar */}
              {readingProgress > 0 && (
                <div className="mb-2 px-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>{currentChapter || "Reading..."}</span>
                    <span>{Math.round(readingProgress)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${readingProgress}%` }}
                    />
                  </div>
                </div>
              )}
              
              <EpubReader
                url={epubUrl}
                location={location}
                onLocationChange={(loc) => {
                  // Only update if location actually changed to prevent infinite loops
                  if (loc !== location) {
                    setLocation(loc)
                    setCurrentLocation(loc)
                  }
                  
                  // Calculate progress and chapter
                  if (bookRef.current && renditionRef.current) {
                    try {
                      const locations = bookRef.current.locations
                      let percentage = 0
                      
                      if (locations && typeof loc === 'string') {
                        const cfi = loc
                        percentage = locations.percentageFromCfi(cfi) || 0
                        if (locations.total !== null) {
                          const page = Math.ceil((percentage / 100) * locations.total)
                          setCurrentPage(page)
                        }
                      } else if (typeof loc === 'number') {
                        percentage = loc
                        const total = bookRef.current.locations?.total
                        if (total) {
                          const page = Math.ceil((loc / 100) * total)
                          setCurrentPage(page)
                        }
                      }
                      
                      setReadingProgress(percentage)
                      
                      // Find current chapter from TOC
                      if (toc.length > 0 && typeof loc === 'string') {
                        // Try to find which chapter we're in based on location
                        const currentLoc = renditionRef.current?.currentLocation()
                        if (currentLoc?.start?.cfi) {
                          // Find the chapter that contains this location
                          for (let i = toc.length - 1; i >= 0; i--) {
                            const tocItem = toc[i]
                            if (tocItem.href) {
                              try {
                                // Check if current location is after this TOC item
                                const tocCfi = bookRef.current?.spine?.get(tocItem.href)?.cfi
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
                      }
                    } catch (e) {
                      // If page calculation fails, try to get from rendition
                      try {
                        const currentLoc = renditionRef.current.currentLocation()
                        if (currentLoc && currentLoc.start && bookRef.current.locations) {
                          const percentage = bookRef.current.locations.percentageFromCfi(currentLoc.start.cfi) || 0
                          setReadingProgress(percentage)
                          if (percentage !== null && bookRef.current.locations.total) {
                            const page = Math.ceil((percentage / 100) * bookRef.current.locations.total)
                            setCurrentPage(page)
                          }
                        }
                      } catch (err) {
                        console.error("Error calculating progress:", err)
                      }
                    }
                  }
                }}
                onRenditionReady={async (rend, book) => {
                  renditionRef.current = rend
                  if (book) {
                    bookRef.current = book
                  } else if (rend.book) {
                    bookRef.current = rend.book
                  }
                  
                  // Generate locations if not already generated
                  try {
                    const bookObj = book || rend.book
                    if (bookObj && bookObj.locations) {
                      // Check if locations are already generated
                      const locationsKey = `epub_locations_${bookId}`
                      const cachedLocations = localStorage.getItem(locationsKey)
                      
                      if (!cachedLocations && bookObj.locations.length() === 0) {
                        // Generate locations (600-1600 is a good range)
                        console.log("Generating locations...")
                        await bookObj.locations.generate(1000)
                        // Cache the fact that locations are generated
                        localStorage.setItem(locationsKey, "true")
                        console.log("Locations generated:", bookObj.locations.length())
                      }
                    }
                  } catch (e) {
                    console.error("Error generating locations:", e)
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
                      setReadingProgress(percentage)
                      if (percentage !== null && bookObj.locations.total) {
                        const page = Math.ceil((percentage / 100) * bookObj.locations.total)
                        setCurrentPage(page)
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
                      setBookmarksOpen(false)
                    } catch (e) {
                      console.error("Error navigating to bookmark:", e)
                    }
                  } else if (bookmark.pageNumber) {
                    setCurrentPage(bookmark.pageNumber)
                    setBookmarksOpen(false)
                  }
                }}
                onDelete={async (id) => {
                  try {
                    await fetch(`/api/bookmarks/${id}`, { method: "DELETE" })
                    setBookmarks(bookmarks.filter(b => b.id !== id))
                  } catch (error) {
                    console.error("Error deleting bookmark:", error)
                  }
                }}
              />

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading EPUB...</p>
            </div>
          )
        ) : book.content ? (
          <>
            <div
              id="book-content"
              className={`reader-content-wrapper ${distractionFree ? "py-8 px-3 md:py-12 md:px-8 lg:px-16" : "p-3 sm:p-6 md:p-8"}`}
              style={{
                fontFamily: fontFamily,
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                maxWidth: `${maxWidth}ch`,
                marginLeft: "auto",
                marginRight: "auto",
                ["--para-gap" as any]: `${paragraphSpacing}rem`,
              } as React.CSSProperties}
            >
              {/* Reading Mode Layout - Centered, optimal line length */}
              <article className="text-justify leading-relaxed select-text whitespace-pre-wrap break-words">
                {book.content.split(/\n\s*\n/).map((paragraph, index) => (
                  <p 
                    key={index} 
                    style={{
                      marginBottom: `var(--para-gap)`,
                    }}
                  >
                    {paragraph.trim()}
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
        <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
          <DialogContent data-shortcuts-dialog className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                Keyboard Shortcuts
              </DialogTitle>
              <DialogDescription>
                Speed up your reading workflow with these shortcuts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Reading</h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Save selection</span>
                    <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border">S</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mark known / Dismiss</span>
                    <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border">K</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Open settings</span>
                    <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border">A</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Open Contents (TOC)</span>
                    <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border">C</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Go to Review</span>
                    <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border">R</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Close popover / dialog</span>
                    <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border">Esc</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Show shortcuts</span>
                    <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border">?</kbd>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t text-xs text-muted-foreground">
                <p>Shortcuts only work when not typing in input fields.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
            onMarkKnown={async () => {
              try {
                // Mark as known without saving to vocabulary
                const normalized = selectedText.trim().toLowerCase().replace(/\s+/g, " ")
                await fetch("/api/vocabulary", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    term: selectedText,
                    termNormalized: normalized,
                    isKnown: true,
                  }),
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
            onMarkKnown={async () => {
              try {
                // Mark as known without saving to vocabulary
                const normalized = selectedText.trim().toLowerCase().replace(/\s+/g, " ")
                await fetch("/api/vocabulary", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    term: selectedText,
                    termNormalized: normalized,
                    isKnown: true,
                  }),
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
      </div>
    </div>
  )
}
