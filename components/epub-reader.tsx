"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { ReactReader } from "react-reader"

interface TocItem {
  href: string
  label: string
  level?: number
}

interface EpubReaderProps {
  url: string
  location: string | number
  onLocationChange: (location: string | number) => void
  onRenditionReady?: (rendition: any, book: any) => void
  onTextSelected?: (text: string, cfiRange: string, context?: string) => void
  onTocChanged?: (toc: TocItem[]) => void
  fontSize?: number
  fontFamily?: string
  lineHeight?: number
  knownWords?: Set<string> // Set of normalized known words (lowercase, trimmed)
  hasKnownWordsData?: boolean // Whether known words data has been loaded
}

export function EpubReader({
  url,
  location,
  onLocationChange,
  onRenditionReady,
  onTextSelected,
  onTocChanged,
  fontSize = 16,
  fontFamily = "Inter",
  lineHeight = 1.6,
  knownWords = new Set(),
  hasKnownWordsData = false,
}: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<any>(null)
  const renditionRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [rendition, setRendition] = useState<any>(null)
  const [book, setBook] = useState<any>(null)

  // Use ref to track if callback has been called to prevent infinite loops
  const callbackCalledRef = useRef(false)
  
  useEffect(() => {
    if (rendition && book && onRenditionReady && !callbackCalledRef.current) {
      callbackCalledRef.current = true
      onRenditionReady(rendition, book)
    }
    // Reset when rendition or book changes
    if (!rendition || !book) {
      callbackCalledRef.current = false
    }
  }, [rendition, book]) // Don't include onRenditionReady in deps

  // Update styles when they change
  useEffect(() => {
    if (rendition) {
      // Register and apply theme updates
      rendition.themes.register("custom", {
        body: {
          "font-family": `"${fontFamily}", serif !important`,
          "font-size": `${fontSize}px !important`,
          "line-height": `${lineHeight} !important`,
          "background-color": "transparent !important", // Let parent theme control background
          "color": "inherit !important", // Inherit text color from parent
        },
        "*": {
          "font-family": `"${fontFamily}", serif !important`,
        },
      })
      rendition.themes.select("custom")
      // Force a re-render to apply the changes
      rendition.views().forEach((view: any) => {
        if (view.pkg) {
          view.render()
        }
      })
    }
  }, [rendition, fontSize, fontFamily, lineHeight])

  // Re-mark unknown words when knownWords changes
  useEffect(() => {
    if (!viewerRef.current || !rendition || !hasKnownWordsData) return

    const updateWordMarking = () => {
      try {
        const iframe = viewerRef.current?.querySelector("iframe")
        if (!iframe || !iframe.contentDocument) return

        const doc = iframe.contentDocument
        const wordSpans = doc.querySelectorAll(".epub-word")
        
        wordSpans.forEach((span) => {
          const word = span.getAttribute("data-word") || ""
          const isKnown = word.length > 0 && knownWords.has(word.toLowerCase())
          
          if (isKnown) {
            span.classList.remove("unknown-word")
            span.removeAttribute("data-unknown")
          } else if (word.length > 0 && knownWords.size > 0) {
            // Only mark as unknown if we have known words data and word is not known
            span.classList.add("unknown-word")
            span.setAttribute("data-unknown", "true")
          } else {
            // Remove unknown marking if we don't have data yet
            span.classList.remove("unknown-word")
            span.removeAttribute("data-unknown")
          }
        })
      } catch (error) {
        console.error("Error updating word marking:", error)
      }
    }

    // Small delay to ensure DOM is ready
    const timeout = setTimeout(updateWordMarking, 100)
    return () => clearTimeout(timeout)
  }, [knownWords, hasKnownWordsData, rendition])

  // Set up word-level hover and click handlers for EPUB iframe
  useEffect(() => {
    if (!onTextSelected || !viewerRef.current || !rendition) return

    const setupWordInteractions = () => {
      try {
        const iframe = viewerRef.current?.querySelector("iframe")
        if (!iframe || !iframe.contentWindow || !iframe.contentDocument) return

        const doc = iframe.contentDocument
        const win = iframe.contentWindow

        // Inject CSS for word highlighting
        const styleId = "epub-word-interactions"
        if (!doc.getElementById(styleId)) {
          const style = doc.createElement("style")
          style.id = styleId
          style.textContent = `
            /* Inherit theme colors from parent */
            body {
              background-color: inherit !important;
              color: inherit !important;
            }
            
            .epub-word {
              cursor: pointer;
              transition: background-color 0.2s ease;
              border-radius: 2px;
              padding: 0 1px;
            }
            .epub-word:hover {
              background-color: rgba(59, 130, 246, 0.3) !important;
            }
            .epub-word.selected {
              background-color: rgba(59, 130, 246, 0.5) !important;
            }
            /* Mark unknown words with yellow highlight */
            .epub-word.unknown-word {
              background-color: rgba(234, 179, 8, 0.25) !important;
              border-bottom: 2px solid rgba(234, 179, 8, 0.6) !important;
              padding-bottom: 1px;
            }
            .epub-word.unknown-word:hover {
              background-color: rgba(234, 179, 8, 0.4) !important;
            }
          `
          doc.head.appendChild(style)
        }

        // Function to wrap words in spans
        const wrapWords = (element: Element) => {
          // Skip if already processed
          if (element.hasAttribute("data-words-wrapped")) return
          element.setAttribute("data-words-wrapped", "true")

          const walker = doc.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: (node) => {
                // Skip if parent is already a word span
                if (node.parentElement?.classList.contains("epub-word")) {
                  return NodeFilter.FILTER_REJECT
                }
                return NodeFilter.FILTER_ACCEPT
              }
            }
          )

          const textNodes: Text[] = []
          let node
          while ((node = walker.nextNode())) {
            if (node.nodeValue && node.nodeValue.trim().length > 0) {
              textNodes.push(node as Text)
            }
          }

          textNodes.forEach((textNode) => {
            const parent = textNode.parentNode
            if (!parent || parent.nodeName === "SCRIPT" || parent.nodeName === "STYLE") return

            const text = textNode.nodeValue || ""
            // Split by word boundaries - keep words and punctuation together when appropriate
            const words = text.split(/(\s+)/)

            if (words.length <= 1) return

            const fragment = doc.createDocumentFragment()
            words.forEach((word) => {
              if (word.trim().length === 0) {
                // Preserve whitespace
                fragment.appendChild(doc.createTextNode(word))
              } else {
                // Wrap word in span
                const span = doc.createElement("span")
                const cleanWord = word.trim().replace(/[^\w]/g, "").toLowerCase()
                
                // Only mark as unknown if we have loaded known words data AND word is not known
                // If we haven't loaded data yet (hasKnownWordsData is false), don't mark anything
                const shouldMarkUnknown = hasKnownWordsData && 
                                         cleanWord.length > 0 && 
                                         knownWords.size > 0 && 
                                         !knownWords.has(cleanWord)
                
                span.className = shouldMarkUnknown ? "epub-word unknown-word" : "epub-word"
                span.textContent = word
                span.setAttribute("data-word", cleanWord)
                if (shouldMarkUnknown) {
                  span.setAttribute("data-unknown", "true")
                }
                fragment.appendChild(span)
              }
            })

            parent.replaceChild(fragment, textNode)
          })
        }

        // Function to get context around a word
        const getContextAroundWord = (wordElement: HTMLElement): string => {
          try {
            // Try to get parent paragraph or container
            let container = wordElement.parentElement
            while (container && !container.tagName.match(/^(P|DIV|SECTION|ARTICLE)$/i)) {
              container = container.parentElement
            }
            
            if (container) {
              const text = container.textContent || ""
              const wordText = wordElement.textContent || ""
              const wordIndex = text.indexOf(wordText)
              
              if (wordIndex >= 0) {
                // Get 100 characters before and after
                const start = Math.max(0, wordIndex - 100)
                const end = Math.min(text.length, wordIndex + wordText.length + 100)
                return text.substring(start, end).trim()
              }
            }
            
            // Fallback: get surrounding text from parent
            return wordElement.parentElement?.textContent?.trim() || wordElement.textContent || ""
          } catch (e) {
            return wordElement.textContent || ""
          }
        }

        // Function to handle word click
        const handleWordClick = (e: MouseEvent) => {
          const target = e.target as HTMLElement
          if (target.classList.contains("epub-word")) {
            e.preventDefault()
            e.stopPropagation()
            
            const word = target.getAttribute("data-word") || target.textContent || ""
            const cleanWord = word.trim()
            
            if (cleanWord.length > 0 && cleanWord.length <= 100) {
              // Remove previous selection
              doc.querySelectorAll(".epub-word.selected").forEach((el) => {
                el.classList.remove("selected")
              })
              
              // Highlight clicked word
              target.classList.add("selected")
              
              // Get context around the word
              const context = getContextAroundWord(target)
              
              // Call the text selection handler with context
              onTextSelected(cleanWord, "", context)
            }
          }
        }

        // Function to handle word hover
        const handleWordHover = (e: MouseEvent) => {
          const target = e.target as HTMLElement
          if (target.classList.contains("epub-word")) {
            // Hover effect is handled by CSS
          }
        }

        // Wrap words in all content areas - be more selective to avoid breaking EPUB structure
        const contentAreas = doc.querySelectorAll("body p, body div, body span, [role='doc-chapter'] p, section p, article p")
        contentAreas.forEach((area) => {
          // Only wrap if it contains text and isn't already wrapped
          if (area.textContent && area.textContent.trim().length > 0) {
            wrapWords(area)
          }
        })

        // Attach event listeners
        doc.addEventListener("click", handleWordClick, true)
        doc.addEventListener("mouseover", handleWordHover, true)

        // Also handle regular text selection as fallback
        const handleSelection = () => {
          setTimeout(() => {
            try {
              const selection = win.getSelection()
              if (selection && selection.toString().trim().length > 0) {
                const text = selection.toString().trim()
                if (text.length > 0 && text.length <= 100) {
                  // Clear word selections
                  doc.querySelectorAll(".epub-word.selected").forEach((el) => {
                    el.classList.remove("selected")
                  })
                  
                  // Get context from selection
                  let context = text
                  if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0)
                    const container = range.commonAncestorContainer
                    let contextElement = container.nodeType === Node.TEXT_NODE 
                      ? container.parentElement 
                      : container as Element
                    
                    // Try to find paragraph or container
                    while (contextElement && !contextElement.tagName.match(/^(P|DIV|SECTION|ARTICLE)$/i)) {
                      contextElement = contextElement.parentElement
                    }
                    
                    if (contextElement) {
                      const containerText = contextElement.textContent || ""
                      const textIndex = containerText.indexOf(text)
                      if (textIndex >= 0) {
                        const start = Math.max(0, textIndex - 100)
                        const end = Math.min(containerText.length, textIndex + text.length + 100)
                        context = containerText.substring(start, end).trim()
                      }
                    }
                  }
                  
                  onTextSelected(text, "", context)
                }
              }
            } catch (e) {
              // Ignore errors
            }
          }, 100)
        }

        doc.addEventListener("mouseup", handleSelection)

        // Cleanup function
        return () => {
          doc.removeEventListener("click", handleWordClick, true)
          doc.removeEventListener("mouseover", handleWordHover, true)
          doc.removeEventListener("mouseup", handleSelection)
        }
      } catch (e) {
        console.error("Error setting up word interactions:", e)
        return () => {}
      }
    }

    // Wait for rendition to be ready and iframe to load
    let cleanupFn: (() => void) | undefined
    
    const timeout = setTimeout(() => {
      cleanupFn = setupWordInteractions()
    }, 500)

    // Also try when rendition relocates (page changes)
    const handleRelocated = () => {
      // Clean up previous setup
      if (cleanupFn) {
        cleanupFn()
      }
      // Setup again after a short delay
      setTimeout(() => {
        cleanupFn = setupWordInteractions()
      }, 300)
    }
    
    if (rendition) {
      rendition.on("relocated", handleRelocated)
    }

    return () => {
      clearTimeout(timeout)
      if (cleanupFn) {
        cleanupFn()
      }
      if (rendition) {
        rendition.off("relocated", handleRelocated)
      }
    }
  }, [onTextSelected, rendition, viewerRef])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <p className="text-red-500 text-lg font-semibold mb-2">Error loading book</p>
        <p className="text-muted-foreground text-sm text-center">{error}</p>
      </div>
    )
  }

  // Extract bookId from URL if it's an API endpoint
  const bookIdMatch = url.match(/\/api\/books\/([^\/]+)\/epub/)
  const bookId = bookIdMatch ? bookIdMatch[1] : null

  // Create a custom request method for API endpoint
  // This intercepts all epubjs file requests and routes them to our API
  const requestMethod = bookId
    ? (requestUrl: string, options: any) => {
        console.log("epubjs requesting:", requestUrl)
        
        // Handle different URL formats
        let finalUrl = requestUrl
        
        // Check if this is the main EPUB file request (the .epub file itself)
        if (requestUrl === url || requestUrl.endsWith(".epub")) {
          finalUrl = url
        }
        // Check if it's already a correctly formatted API path with /epub/
        else if (requestUrl.startsWith(`/api/books/${bookId}/epub/`)) {
          // Already correctly formatted
          finalUrl = requestUrl
        }
        // CRITICAL FIX: Check if it's an API path but missing /epub 
        // (e.g., /api/books/{id}/META-INF/container.xml)
        else if (requestUrl.startsWith(`/api/books/${bookId}/`) && !requestUrl.startsWith(`/api/books/${bookId}/epub`)) {
          // Extract the path after the book ID and insert /epub
          const pathAfterId = requestUrl.replace(`/api/books/${bookId}/`, "")
          finalUrl = `/api/books/${bookId}/epub/${pathAfterId}`
        }
        // If it's a relative path (like META-INF/container.xml), route to our API
        else if (!requestUrl.startsWith("http") && !requestUrl.startsWith("/")) {
          // Relative path - route to our API endpoint
          finalUrl = `/api/books/${bookId}/epub/${requestUrl}`
        }
        // If it's an absolute path starting with / but not /api
        else if (requestUrl.startsWith("/") && !requestUrl.startsWith("/api")) {
          // Absolute path but not API - route to our API endpoint
          // Remove leading slash and route to API
          const pathWithoutSlash = requestUrl.substring(1)
          finalUrl = `/api/books/${bookId}/epub/${pathWithoutSlash}`
        }
        // If it's a full URL (http/https), check if it matches our pattern
        else if (requestUrl.startsWith("http")) {
          try {
            const urlObj = new URL(requestUrl)
            const pathname = urlObj.pathname
            // Check if pathname matches /api/books/{id}/... but not /api/books/{id}/epub/...
            if (pathname.startsWith(`/api/books/${bookId}/`) && !pathname.startsWith(`/api/books/${bookId}/epub/`)) {
              const pathAfterId = pathname.replace(`/api/books/${bookId}/`, "")
              finalUrl = `/api/books/${bookId}/epub/${pathAfterId}`
            } else {
              finalUrl = requestUrl
            }
          } catch {
            finalUrl = requestUrl
          }
        }
        
        console.log("Routing to:", finalUrl)
        
        return fetch(finalUrl, options)
          .then(async (response) => {
            if (!response.ok) {
              let errorDetails = `${response.status} ${response.statusText}`
              try {
                const errorData = await response.json()
                if (errorData.error) {
                  errorDetails = errorData.error
                }
              } catch {
                // Ignore JSON parse errors
              }
              
              const errorMsg = `Failed to load EPUB file (${errorDetails})`
              console.error(`Failed to fetch ${finalUrl}:`, errorMsg)
              setError(errorMsg)
              throw new Error(errorMsg)
            }
            return response.arrayBuffer()
          })
          .catch((err) => {
            // Only set error if it's not already set (avoid overwriting more specific errors)
            if (!error) {
              const errorMsg = err.message || `Failed to load EPUB file. Please check if the file is valid.`
              console.error("EPUB fetch error:", err)
              setError(errorMsg)
            }
            throw err
          })
      }
    : undefined

  // Add timeout to detect if book fails to load
  useEffect(() => {
    if (!url) return
    
    const timeout = setTimeout(() => {
      if (loading && !rendition) {
        setError("Book is taking too long to load. Please check your connection and try again.")
        setLoading(false)
      }
    }, 30000) // 30 second timeout

    return () => clearTimeout(timeout)
  }, [url, loading, rendition])

  return (
    <div ref={viewerRef} className="w-full h-full" style={{ position: "relative" }}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading EPUB...</p>
        </div>
      )}
      <ReactReader
        url={url}
        location={location}
        locationChanged={(loc: string | number) => {
          onLocationChange(loc)
          setLoading(false)
        }}
        tocChanged={(toc: TocItem[]) => {
          if (onTocChanged) {
            onTocChanged(toc)
          }
        }}
        getRendition={(rend) => {
          setRendition(rend)
          renditionRef.current = rend
          // Get book from rendition
          if (rend.book) {
            setBook(rend.book)
            bookRef.current = rend.book
          }
          setLoading(false)
          setError(null) // Clear any previous errors
          // Apply initial styles
          rend.themes.register("custom", {
            body: {
              "font-family": `"${fontFamily}", serif !important`,
              "font-size": `${fontSize}px !important`,
              "line-height": `${lineHeight} !important`,
            },
            "*": {
              "font-family": `"${fontFamily}", serif !important`,
            },
          })
          rend.themes.select("custom")
        }}
        epubOptions={{
          openAs: "epub" as any,
          requestMethod: requestMethod,
        } as any}
        loadingView={
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading EPUB...</p>
          </div>
        }
      />
    </div>
  )
}

