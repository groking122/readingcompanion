"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Loader2 } from "lucide-react"
import { ReaderSettings } from "@/components/reader-settings"
import { EpubReader } from "@/components/epub-reader"

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
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 })
  const [saving, setSaving] = useState(false)
  const [fontSize, setFontSize] = useState(16)
  const [fontFamily, setFontFamily] = useState("Inter")
  const [lineHeight, setLineHeight] = useState(1.6)
  const [location, setLocation] = useState<string | number>(0)
  const [epubUrl, setEpubUrl] = useState<string | null>(null)
  const [epubError, setEpubError] = useState<string | null>(null)
  const renditionRef = useRef<any>(null)
  const bookRef = useRef<any>(null)
  const [currentLocation, setCurrentLocation] = useState<string | number>(0)
  const [currentPage, setCurrentPage] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

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
    
    if (!selectedText && book?.type !== "epub") {
      const selection = window.getSelection()
      if (!selection || selection.toString().trim().length === 0) {
        return
      }
      selectedText = selection.toString().trim()
      
      // Get context from selection
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
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
    }

    if (!selectedText || selectedText.length === 0 || selectedText.length > 100) {
      return
    }

    // Store current location for EPUB
    if (book?.type === "epub" && location) {
      setCurrentLocation(location)
    }

    setSelectedText(selectedText)
    setSelectedContext(contextText || selectedText)
    setTranslating(true)

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
    if (!selectedText || !translation || !book) return

    setSaving(true)
    try {
      // Use the context we already captured, or try to get it again
      let context = selectedContext || selectedText
      
      // For non-EPUB, try to get better context if we don't have it
      if (book.type !== "epub" && !selectedContext) {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const container = range.commonAncestorContainer
          if (container.parentElement) {
            context = container.parentElement.textContent?.substring(
              Math.max(0, range.startOffset - 100),
              Math.min(container.parentElement.textContent.length, range.endOffset + 100)
            ) || selectedText
          }
        }
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

      await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: selectedText,
          translation,
          context,
          bookId: book.id,
          position,
          epubLocation,
          pageNumber,
        }),
      })

      setPopoverOpen(false)
      setSelectedText("")
      setTranslation("")
      setAlternativeTranslations([])
      setSelectedContext("")
    } catch (error) {
      console.error("Error saving word:", error)
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
        setPopoverPosition({ x: newX, y: newY })
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!book) {
    return <div className="text-center py-12">Book not found</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">{book.title}</h1>
        <ReaderSettings
          fontSize={fontSize}
          fontFamily={fontFamily}
          lineHeight={lineHeight}
          onFontSizeChange={setFontSize}
          onFontFamilyChange={setFontFamily}
          onLineHeightChange={setLineHeight}
        />
      </div>

      <div className="px-8 md:px-16 lg:px-24 xl:px-32">
        <div
          className="border rounded-lg bg-background min-h-[800px] max-h-[90vh] overflow-auto shadow-sm"
          onMouseUp={() => {
            // Only handle mouseup for non-EPUB content
            // EPUB content handles selection via iframe events
            if (book.type !== "epub") {
              handleTextSelection("")
            }
          }}
          style={book.type === "epub" ? {
            "--RS__fontFamily": fontFamily,
            "--RS__fontSize": `${fontSize}px`,
            "--RS__lineHeight": lineHeight.toString(),
          } as React.CSSProperties : undefined}
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
              <EpubReader
                url={epubUrl}
                location={location}
                onLocationChange={(loc) => {
                  // Only update if location actually changed to prevent infinite loops
                  if (loc !== location) {
                    setLocation(loc)
                    setCurrentLocation(loc)
                  }
                  // Calculate page number from location
                  if (bookRef.current && renditionRef.current) {
                    try {
                      const locations = bookRef.current.locations
                      if (locations && typeof loc === 'string') {
                        const cfi = loc
                        const percentage = locations.percentageFromCfi(cfi)
                        if (percentage !== null && locations.total !== null) {
                          const page = Math.ceil((percentage / 100) * locations.total)
                          setCurrentPage(page)
                        }
                      } else if (typeof loc === 'number') {
                        // If location is a number (percentage), calculate page directly
                        const total = bookRef.current.locations?.total
                        if (total) {
                          const page = Math.ceil((loc / 100) * total)
                          setCurrentPage(page)
                        }
                      }
                    } catch (e) {
                      // If page calculation fails, try to get from rendition
                      try {
                        const currentLoc = renditionRef.current.currentLocation()
                        if (currentLoc && currentLoc.start && bookRef.current.locations) {
                          const percentage = bookRef.current.locations.percentageFromCfi(currentLoc.start.cfi)
                          if (percentage !== null && bookRef.current.locations.total) {
                            const page = Math.ceil((percentage / 100) * bookRef.current.locations.total)
                            setCurrentPage(page)
                          }
                        }
                      } catch (err) {
                        console.error("Error calculating page:", err)
                      }
                    }
                  }
                }}
                onRenditionReady={(rend, book) => {
                  renditionRef.current = rend
                  if (book) {
                    bookRef.current = book
                  } else if (rend.book) {
                    bookRef.current = rend.book
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
                  
                  // Search will be handled by the separate useEffect hook
                  
                  // Calculate initial page
                  try {
                    const bookObj = book || rend.book
                    const currentLoc = rend.currentLocation()
                    if (currentLoc && currentLoc.start && bookObj?.locations) {
                      const percentage = bookObj.locations.percentageFromCfi(currentLoc.start.cfi)
                      if (percentage !== null && bookObj.locations.total) {
                        const page = Math.ceil((percentage / 100) * bookObj.locations.total)
                        setCurrentPage(page)
                      }
                    }
                  } catch (e) {
                    console.error("Error getting initial page:", e)
                  }
                }}
                onTextSelected={handleTextSelection}
                fontSize={fontSize}
                fontFamily={fontFamily}
                lineHeight={lineHeight}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )
        ) : book.content ? (
          <>
            <div
              id="book-content"
              className="p-8"
              style={{
                fontFamily: fontFamily,
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
              }}
            >
              <div className="max-w-4xl mx-auto">
                <div
                  className="text-justify leading-relaxed select-text"
                  style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {book.content.split("\n\n").map((paragraph, index) => (
                    <p key={index} className="mb-4">
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            {searchTerm && <SearchHighlight searchTerm={searchTerm} />}
          </>
        ) : (
          <div className="text-center text-muted-foreground p-12">
            No content available
          </div>
        )}
        </div>

        {popoverOpen && (
          <div className="mt-6">
            <div className="w-full max-w-2xl mx-auto border rounded-lg bg-background shadow-sm p-0 select-none">
            <div className="flex items-center justify-between p-3 border-b bg-muted/50">
              <span className="text-xs font-medium text-muted-foreground">Translation</span>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="text-sm font-medium mb-1">Term:</p>
                <p className="text-sm break-words">{selectedText}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Translation (Greek):</p>
                {translating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm break-words font-medium">{translation}</p>
                    {alternativeTranslations.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2 font-medium">
                          Alternative translations ({Math.min(alternativeTranslations.length, 3)} shown):
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {alternativeTranslations.slice(0, 3).map((alt, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2.5 py-1.5 rounded-md bg-muted/80 text-foreground border border-border hover:bg-muted transition-colors text-center"
                            >
                              {alt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleSaveWord}
                  disabled={saving || !translation}
                  className="flex-1"
                >
                  {saving ? "Saving..." : "Save Word"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPopoverOpen(false)
                    setSelectedText("")
                    setTranslation("")
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  )
}
