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
  theme?: "light" | "sepia" | "dark" | "paper"
  knownWords?: Set<string> // Set of normalized known words (lowercase, trimmed)
  vocabularyWords?: Set<string> // Set of normalized vocabulary words (saved but not known)
  hasKnownWordsData?: boolean // Whether vocabulary data has been loaded
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
  theme = "light",
  knownWords = new Set(),
  vocabularyWords = new Set(),
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

  // Throttled theme update ref
  const throttledThemeUpdateRef = useRef<NodeJS.Timeout | null>(null)

  // Register EPUB themes and apply when they change using CSS variables
  useEffect(() => {
    if (!rendition) return

    const injectThemeStyles = () => {
      const iframe = viewerRef.current?.querySelector("iframe")
      if (!iframe?.contentDocument) return

      const doc = iframe.contentDocument
      const oldStyle = doc.getElementById("epub-theme-override")
      if (oldStyle) oldStyle.remove()

      const style = doc.createElement("style")
      style.id = "epub-theme-override"
      
      // Get CSS variables from parent document
      const root = document.documentElement
      const bg = getComputedStyle(root).getPropertyValue("--reader-paper").trim() || "#ffffff"
      const fg = getComputedStyle(root).getPropertyValue("--reader-fg").trim() || "#111"
      
      style.textContent = `
        html, body {
          background: var(--reader-paper, ${bg}) !important;
          color: var(--reader-fg, ${fg}) !important;
        }
        body * {
          color: var(--reader-fg, ${fg}) !important;
        }
        ::selection {
          background: color-mix(in srgb, var(--reader-fg, ${fg}) 20%, transparent) !important;
        }
        div, section, article, p {
          background: var(--reader-paper, ${bg}) !important;
        }
      `
      doc.head.appendChild(style)

      // Also set inline styles as fallback
      if (doc.body) {
        doc.body.style.backgroundColor = bg
        doc.body.style.color = fg
      }
    }

    // Register epubjs themes using CSS variables
    rendition.themes.register("light", {
      body: {
        "font-family": `"${fontFamily}", serif !important`,
        "font-size": `${fontSize}px !important`,
        "line-height": `${lineHeight} !important`,
        "background-color": "var(--reader-paper) !important",
        "color": "var(--reader-fg) !important",
      },
      "*": {
        "font-family": `"${fontFamily}", serif !important`,
      },
    })
    
    rendition.themes.register("sepia", {
      body: {
        "font-family": `"${fontFamily}", serif !important`,
        "font-size": `${fontSize}px !important`,
        "line-height": `${lineHeight} !important`,
        "background-color": "var(--reader-paper) !important",
        "color": "var(--reader-fg) !important",
      },
      "*": {
        "font-family": `"${fontFamily}", serif !important`,
      },
    })
    
    rendition.themes.register("dark", {
      body: {
        "font-family": `"${fontFamily}", serif !important`,
        "font-size": `${fontSize}px !important`,
        "line-height": `${lineHeight} !important`,
        "background-color": "var(--reader-paper) !important",
        "color": "var(--reader-fg) !important",
      },
      "*": {
        "font-family": `"${fontFamily}", serif !important`,
      },
    })

    // Select the appropriate theme (map paper to light)
    const themeToSelect = theme === "paper" ? "light" : theme
    rendition.themes.select(themeToSelect)

    injectThemeStyles()
    setTimeout(injectThemeStyles, 100)
    
    // Re-inject on relocation
    const handleRelocated = () => {
      setTimeout(injectThemeStyles, 50)
    }
    rendition.on("relocated", handleRelocated)

    return () => {
      rendition.off("relocated", handleRelocated)
    }
  }, [rendition, theme])

  // Throttled settings application (font size, family, line height)
  useEffect(() => {
    if (!rendition) return

    // Clear pending update
    if (throttledThemeUpdateRef.current) {
      clearTimeout(throttledThemeUpdateRef.current)
    }

    // Update UI immediately (for instant feedback)
    // But throttle actual rendition update
    throttledThemeUpdateRef.current = setTimeout(() => {
      // Apply theme override (not full remount)
      rendition.themes.override({
        body: {
          "font-family": `"${fontFamily}", serif !important`,
          "font-size": `${fontSize}px !important`,
          "line-height": `${lineHeight} !important`,
        },
      })

      // Re-inject CSS variables
      const injectThemeStyles = () => {
        const iframe = viewerRef.current?.querySelector("iframe")
        if (!iframe?.contentDocument) return

        const doc = iframe.contentDocument
        const oldStyle = doc.getElementById("epub-theme-override")
        if (oldStyle) oldStyle.remove()

        const style = doc.createElement("style")
        style.id = "epub-theme-override"
        
        const root = document.documentElement
        const bg = getComputedStyle(root).getPropertyValue("--reader-paper").trim() || "#ffffff"
        const fg = getComputedStyle(root).getPropertyValue("--reader-fg").trim() || "#111"
        
        style.textContent = `
          html, body {
            background: var(--reader-paper, ${bg}) !important;
            color: var(--reader-fg, ${fg}) !important;
          }
          body * {
            color: var(--reader-fg, ${fg}) !important;
          }
          ::selection {
            background: color-mix(in srgb, var(--reader-fg, ${fg}) 20%, transparent) !important;
          }
          div, section, article, p {
            background: var(--reader-paper, ${bg}) !important;
          }
        `
        doc.head.appendChild(style)

        if (doc.body) {
          doc.body.style.backgroundColor = bg
          doc.body.style.color = fg
        }
      }

      injectThemeStyles()
    }, 100) // 100ms throttle

    return () => {
      if (throttledThemeUpdateRef.current) {
        clearTimeout(throttledThemeUpdateRef.current)
      }
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
          const wordLower = word.toLowerCase()
          const isKnown = word.length > 0 && knownWords.has(wordLower)
          const isInVocabulary = word.length > 0 && vocabularyWords.has(wordLower)
          
          if (isKnown) {
            // Known words should not be highlighted
            span.classList.remove("unknown-word")
            span.removeAttribute("data-unknown")
          } else if (isInVocabulary) {
            // Words in vocabulary (but not known) should be highlighted
            span.classList.add("unknown-word")
            span.setAttribute("data-unknown", "true")
          } else {
            // Words not in vocabulary should not be highlighted
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
  }, [knownWords, vocabularyWords, hasKnownWordsData, rendition])

  // Set up word-level hover and click handlers for EPUB iframe
  useEffect(() => {
    if (!onTextSelected || !viewerRef.current || !rendition) return

    const setupWordInteractions = () => {
      try {
        const iframe = viewerRef.current?.querySelector("iframe")
        if (!iframe || !iframe.contentWindow || !iframe.contentDocument) return

        const doc = iframe.contentDocument
        const win = iframe.contentWindow
        
        // Get CSS variables from parent document
        const root = document.documentElement
        const bg = getComputedStyle(root).getPropertyValue("--reader-paper").trim() || "#ffffff"
        const fg = getComputedStyle(root).getPropertyValue("--reader-fg").trim() || "#111"

        // Inject CSS for word highlighting - use CSS variables
        const styleId = "epub-word-interactions"
        // Remove old style if exists (to update theme)
        const oldStyle = doc.getElementById(styleId)
        if (oldStyle) oldStyle.remove()
        
        const style = doc.createElement("style")
        style.id = styleId
        style.textContent = `
          /* Force theme colors - no inheritance issues */
          html, body {
            background-color: var(--reader-paper, ${bg}) !important;
            color: var(--reader-fg, ${fg}) !important;
          }
            
            .epub-word {
              /* No visual indicators by default - invisible until interaction */
              transition: background-color 0.2s ease;
              border-radius: 2px;
              padding: 0 1px;
            }
            /* Only show cursor and hover on desktop (not touch devices) */
            @media (hover: hover) and (pointer: fine) {
              .epub-word {
                cursor: pointer;
              }
              .epub-word:hover {
                background-color: rgba(59, 130, 246, 0.2) !important;
              }
            }
            .epub-word.selected {
              background-color: rgba(59, 130, 246, 0.4) !important;
            }
            /* Mark saved vocabulary words subtly (only after being saved) */
            .epub-word.unknown-word {
              /* Very subtle highlight - only visible on close inspection */
              background-color: rgba(147, 51, 234, 0.12) !important;
              border-bottom: 1px solid rgba(147, 51, 234, 0.25) !important;
              padding-bottom: 1px;
            }
            @media (hover: hover) and (pointer: fine) {
              .epub-word.unknown-word:hover {
                background-color: rgba(147, 51, 234, 0.2) !important;
              }
            }
          `
        doc.head.appendChild(style)

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
                
                // Mark as vocabulary word if:
                // 1. We have loaded vocabulary data
                // 2. Word has content (letters/numbers)
                // 3. Word is in vocabulary set (saved but not known)
                // 4. Word is NOT in the known set
                const shouldMarkUnknown = hasKnownWordsData && 
                                         cleanWord.length > 0 && 
                                         vocabularyWords.has(cleanWord) && 
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

        // Function to get word at point using caret APIs (for mobile taps)
        const getWordAtPoint = (x: number, y: number): { word: string; element: HTMLElement | null } => {
          try {
            // Try caretRangeFromPoint (most browsers)
            let range: Range | null = null
            if (doc.caretRangeFromPoint) {
              range = doc.caretRangeFromPoint(x, y)
            } else if ((win as any).caretPositionFromPoint) {
              // Safari fallback
              const pos = (win as any).caretPositionFromPoint(x, y)
              if (pos) {
                range = doc.createRange()
                range.setStart(pos.offsetNode, pos.offset)
                range.setEnd(pos.offsetNode, pos.offset)
              }
            }

            if (range) {
              // Expand range to word boundaries
              const expandToWordBoundaries = (r: Range) => {
                const startNode = r.startContainer
                const endNode = r.endContainer
                
                // Only expand if both containers are text nodes and the same node
                if (startNode.nodeType !== Node.TEXT_NODE || 
                    endNode.nodeType !== Node.TEXT_NODE || 
                    startNode !== endNode) {
                  return
                }
                
                const text = startNode.textContent || ""
                let startOffset = r.startOffset
                let endOffset = r.endOffset
                
                // Expand backwards to find word start (word characters and apostrophes)
                while (startOffset > 0) {
                  const char = text[startOffset - 1]
                  // Stop at whitespace or non-word characters (except apostrophes)
                  if (/\s/.test(char) || (!/\w/.test(char) && char !== "'")) {
                    break
                  }
                  startOffset--
                }
                
                // Expand forwards to find word end (word characters and apostrophes)
                while (endOffset < text.length) {
                  const char = text[endOffset]
                  // Stop at whitespace or non-word characters (except apostrophes)
                  if (/\s/.test(char) || (!/\w/.test(char) && char !== "'")) {
                    break
                  }
                  endOffset++
                }
                
                r.setStart(startNode, startOffset)
                r.setEnd(endNode, endOffset)
              }
              
              expandToWordBoundaries(range)
              const word = range.toString().trim()
              const container = range.commonAncestorContainer
              const element = container.nodeType === Node.TEXT_NODE
                ? container.parentElement
                : container as HTMLElement

              // Check if we hit an epub-word span
              if (element && element.classList.contains("epub-word")) {
                return { word: element.getAttribute("data-word") || word, element }
              }

              // Otherwise, try to find the word span
              if (element) {
                const wordSpan = element.closest(".epub-word") as HTMLElement
                if (wordSpan) {
                  return { word: wordSpan.getAttribute("data-word") || word, element: wordSpan }
                }
              }

              return { word, element: element as HTMLElement }
            }
          } catch (e) {
            console.debug("Error getting word at point:", e)
          }
          return { word: "", element: null }
        }

        // Function to handle word click/tap
        const handleWordInteraction = (e: MouseEvent | TouchEvent | PointerEvent) => {
          let target: HTMLElement | null = null
          let clientX = 0
          let clientY = 0

          // Handle different event types
          if (e.type === "touchstart" || e.type === "touchend") {
            const touchEvent = e as TouchEvent
            if (touchEvent.touches.length > 0 || touchEvent.changedTouches.length > 0) {
              const touch = touchEvent.touches[0] || touchEvent.changedTouches[0]
              clientX = touch.clientX
              clientY = touch.clientY
              target = doc.elementFromPoint(clientX, clientY) as HTMLElement
            }
          } else if (e.type === "pointerup" || e.type === "click") {
            const mouseEvent = e as MouseEvent
            clientX = mouseEvent.clientX
            clientY = mouseEvent.clientY
            target = mouseEvent.target as HTMLElement
          }

          // Check if target is an epub-word
          if (target && target.classList.contains("epub-word")) {
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
          } else if (target && (e.type === "pointerup" || e.type === "touchend")) {
            // For mobile taps, try to get word at tap point
            const { word, element } = getWordAtPoint(clientX, clientY)
            if (word && element && element.classList.contains("epub-word")) {
              e.preventDefault()
              e.stopPropagation()

              // Remove previous selection
              doc.querySelectorAll(".epub-word.selected").forEach((el) => {
                el.classList.remove("selected")
              })

              // Highlight tapped word
              element.classList.add("selected")

              // Get context around the word
              const context = getContextAroundWord(element)

              // Call the text selection handler
              onTextSelected(word.trim(), "", context)
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

        // Attach event listeners - prioritize pointerup for better mobile support
        // Pointer events work for both mouse and touch and are preferred
        doc.addEventListener("pointerup", handleWordInteraction, { capture: true, passive: false })
        // Fallback for browsers without pointer events
        doc.addEventListener("touchend", handleWordInteraction, { capture: true, passive: false })
        doc.addEventListener("click", handleWordInteraction, { capture: true, passive: false })
        doc.addEventListener("mouseover", handleWordHover, { capture: true })

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
          doc.removeEventListener("pointerup", handleWordInteraction, true)
          doc.removeEventListener("click", handleWordInteraction, true)
          doc.removeEventListener("touchend", handleWordInteraction, true)
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
      
      // Re-inject theme styles on relocation using CSS variables
      const injectThemeOnRelocate = () => {
        const iframe = viewerRef.current?.querySelector("iframe")
        if (!iframe?.contentDocument) return

        const doc = iframe.contentDocument
        const oldStyle = doc.getElementById("epub-theme-override")
        if (oldStyle) oldStyle.remove()

        const style = doc.createElement("style")
        style.id = "epub-theme-override"
        
        // Get CSS variables from parent document
        const root = document.documentElement
        const bg = getComputedStyle(root).getPropertyValue("--reader-paper").trim() || "#ffffff"
        const fg = getComputedStyle(root).getPropertyValue("--reader-fg").trim() || "#111"
        
        style.textContent = `
          html, body {
            background: var(--reader-paper, ${bg}) !important;
            color: var(--reader-fg, ${fg}) !important;
          }
          body * {
            color: var(--reader-fg, ${fg}) !important;
          }
          ::selection {
            background: color-mix(in srgb, var(--reader-fg, ${fg}) 20%, transparent) !important;
          }
          div, section, article, p {
            background: var(--reader-paper, ${bg}) !important;
          }
        `
        doc.head.appendChild(style)

        // Also set inline styles as fallback
        if (doc.body) {
          doc.body.style.backgroundColor = bg
          doc.body.style.color = fg
        }
      }
      
      injectThemeOnRelocate()
      setTimeout(injectThemeOnRelocate, 100)
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
  }, [onTextSelected, rendition, viewerRef, theme])

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

  // Get CSS variables for background
  const root = typeof document !== 'undefined' ? document.documentElement : null
  const bg = root ? getComputedStyle(root).getPropertyValue("--reader-paper").trim() || "#ffffff" : "#ffffff"
  const fg = root ? getComputedStyle(root).getPropertyValue("--reader-fg").trim() || "#111" : "#111"
  
  return (
    <div 
      ref={viewerRef} 
      className="w-full h-full" 
      style={{ 
        position: "relative",
        backgroundColor: `var(--reader-paper, ${bg})`,
        color: `var(--reader-fg, ${fg})`,
      }}
    >
      {loading && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm z-10"
          style={{
            backgroundColor: `${bg}CC`, // 80% opacity
          }}
        >
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
          
          // Register all EPUB themes using CSS variables
          rend.themes.register("light", {
            body: {
              "font-family": `"${fontFamily}", serif !important`,
              "font-size": `${fontSize}px !important`,
              "line-height": `${lineHeight} !important`,
              "background-color": "var(--reader-paper) !important",
              "color": "var(--reader-fg) !important",
            },
            "*": {
              "font-family": `"${fontFamily}", serif !important`,
            },
          })
          
          rend.themes.register("sepia", {
            body: {
              "font-family": `"${fontFamily}", serif !important`,
              "font-size": `${fontSize}px !important`,
              "line-height": `${lineHeight} !important`,
              "background-color": "var(--reader-paper) !important",
              "color": "var(--reader-fg) !important",
            },
            "*": {
              "font-family": `"${fontFamily}", serif !important`,
            },
          })
          
          rend.themes.register("dark", {
            body: {
              "font-family": `"${fontFamily}", serif !important`,
              "font-size": `${fontSize}px !important`,
              "line-height": `${lineHeight} !important`,
              "background-color": "var(--reader-paper) !important",
              "color": "var(--reader-fg) !important",
            },
            "*": {
              "font-family": `"${fontFamily}", serif !important`,
            },
          })
          
          // Select the appropriate theme (map paper to light)
          const themeToSelect = theme === "paper" ? "light" : theme
          rend.themes.select(themeToSelect)
          
          // Inject theme styles using CSS variables
          const injectTheme = () => {
            const iframe = viewerRef.current?.querySelector("iframe")
            if (!iframe?.contentDocument) return

            const doc = iframe.contentDocument
            const oldStyle = doc.getElementById("epub-theme-override")
            if (oldStyle) oldStyle.remove()

            const style = doc.createElement("style")
            style.id = "epub-theme-override"
            
            // Get CSS variables from parent document
            const root = document.documentElement
            const bg = getComputedStyle(root).getPropertyValue("--reader-paper").trim() || "#ffffff"
            const fg = getComputedStyle(root).getPropertyValue("--reader-fg").trim() || "#111"
            
            style.textContent = `
              html, body {
                background: var(--reader-paper, ${bg}) !important;
                color: var(--reader-fg, ${fg}) !important;
              }
              body * {
                color: var(--reader-fg, ${fg}) !important;
              }
              ::selection {
                background: color-mix(in srgb, var(--reader-fg, ${fg}) 20%, transparent) !important;
              }
              div, section, article, p {
                background: var(--reader-paper, ${bg}) !important;
              }
            `
            doc.head.appendChild(style)

            // Also set inline styles as fallback
            if (doc.body) {
              doc.body.style.backgroundColor = bg
              doc.body.style.color = fg
            }
          }
          
          // Inject immediately
          injectTheme()
          // Also inject after a delay to catch late-rendered content
          setTimeout(injectTheme, 100)
          setTimeout(injectTheme, 500)
          
          // Configure single page view (no spread)
          rend.display().then(() => {
            try {
              // Set spread to 'none' for single page view
              if (rend.spread) {
                rend.spread('none')
              }
              // Force single page by setting view width to 100%
              const views = rend.views()
              if (views && views.length > 0) {
                views.forEach((view: any) => {
                  if (view.manager) {
                    view.manager.setViewportSize(window.innerWidth, window.innerHeight)
                  }
                })
              }
            } catch (e) {
              console.debug("Error setting single page view:", e)
            }
          })
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

