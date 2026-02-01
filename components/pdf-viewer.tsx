"use client"

import { useState, useEffect, useMemo } from "react"
import { useReader } from "@/contexts/reader-context"
import { useReadingPosition } from "@/contexts/reading-position-context"
import { useTranslation } from "@/contexts/translation-context"
import { cn } from "@/lib/utils"

// Lazy load react-pdf to avoid SSR issues
let Document: any = null
let Page: any = null
let pdfjs: any = null

if (typeof window !== "undefined") {
  import("react-pdf").then((module) => {
    Document = module.Document
    Page = module.Page
    pdfjs = module.pdfjs
  })
}

interface PdfViewerProps {
  url: string
  // Props for when contexts aren't available
  fontSize?: number
  currentPage?: number | null
  onPageChange?: (page: number) => void
  onTotalPagesChange?: (pages: number) => void
  onTextSelection?: () => void
  theme?: "light" | "dark" | "sepia" | "paper"
}

export function PdfViewer({ 
  url,
  // Props fallback
  fontSize: propFontSize,
  currentPage: propCurrentPage,
  onPageChange: propOnPageChange,
  onTotalPagesChange: propOnTotalPagesChange,
  onTextSelection: propOnTextSelection,
  theme: propTheme,
}: PdfViewerProps) {
  // Try to use contexts, fallback to props
  let settings: { fontSize: number }
  let theme: "light" | "dark" | "sepia" | "paper"
  let currentPage: number | null
  let setCurrentPage: (page: number | null) => void
  let setTotalPages: (pages: number | null) => void
  let handleTextSelection: () => void

  try {
    const readerContext = useReader()
    const positionContext = useReadingPosition()
    const translationContext = useTranslation()
    settings = readerContext.settings
    theme = readerContext.theme || "light"
    currentPage = positionContext.currentPage
    setCurrentPage = positionContext.setCurrentPage
    setTotalPages = positionContext.setTotalPages
    handleTextSelection = translationContext.handleTextSelection
  } catch {
    // Fallback to props
    settings = { fontSize: propFontSize || 16 }
    theme = propTheme || "light"
    currentPage = propCurrentPage || null
    setCurrentPage = propOnPageChange ? (page: number | null) => propOnPageChange(page || 1) : () => {}
    setTotalPages = propOnTotalPagesChange ? (pages: number | null) => propOnTotalPagesChange(pages || 0) : () => {}
    handleTextSelection = propOnTextSelection || (() => {})
  }

  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [pdfModule, setPdfModule] = useState<{ Document: any; Page: any; pdfjs: any } | null>(null)

  // Lazy load react-pdf on client side only
  useEffect(() => {
    if (typeof window === "undefined") return
    
    setIsClient(true)
    
    import("react-pdf").then((module) => {
      setPdfModule({
        Document: module.Document,
        Page: module.Page,
        pdfjs: module.pdfjs,
      })
      
      // Setup PDF.js worker
      try {
        module.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${module.pdfjs.version}/build/pdf.worker.min.mjs`
      } catch (error) {
        console.error("Failed to setup PDF.js worker:", error)
      }
    }).catch((error) => {
      console.error("Failed to load react-pdf:", error)
      setPageError("Failed to load PDF library")
    })
  }, [])

  // Map "font size" slider to "zoom level" for PDF
  // 16px (default) -> 1.0 scale. Range 12-32px maps to 0.75-1.5 scale
  const scale = 0.75 + ((settings.fontSize - 12) / 20) * 0.75

  // Don't render until client-side and PDF module is loaded
  if (!isClient || !pdfModule) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading PDF viewer...</div>
      </div>
    )
  }

  const { Document: PdfDocument, Page: PdfPage } = pdfModule

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setTotalPages(numPages)
    if (!currentPage) {
      setCurrentPage(1)
    }
  }

  function onDocumentLoadError(error: Error) {
    console.error("PDF load error:", error)
    setPageError("Failed to load PDF")
  }

  function onPageLoadError(error: Error) {
    console.error("Page load error:", error)
    setPageError("Failed to load page")
  }

  // Detect theme changes
  useEffect(() => {
    const root = document.documentElement
    const canvasColor = getComputedStyle(root).getPropertyValue("--c-canvas").trim()
    // Theme detection logic can be enhanced
  }, [theme])

  return (
    <div 
      className={cn(
        "flex justify-center w-full h-full overflow-y-auto py-8",
        // Transparent container for seamless theme
        "bg-transparent"
      )}
      onMouseUp={() => handleTextSelection()}
      onTouchEnd={() => handleTextSelection()}
    >
      {pageError ? (
        <div className="flex flex-col items-center justify-center p-12">
          <p className="text-red-500 mb-2 font-semibold">Error loading PDF</p>
          <p className="text-sm text-muted-foreground">{pageError}</p>
        </div>
      ) : (
        <div 
          className="relative"
          style={{
            // THE DARK MODE MAGIC:
            // In dark mode, we invert the PDF (white -> black) and rotate hue 180deg to keep colors somewhat correct
            filter: theme === 'dark' ? 'invert(0.9) hue-rotate(180deg) contrast(0.8)' : 'none',
            transition: 'filter 0.3s ease'
          }}
        >
          <PdfDocument
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="h-[800px] w-[600px] bg-muted/10 animate-pulse rounded flex items-center justify-center">
                <p className="text-muted-foreground">Loading PDF...</p>
              </div>
            }
            className="bg-transparent"
          >
            {numPages && (
              <PdfPage 
                pageNumber={currentPage || 1} 
                scale={scale}
                className="bg-transparent"
                renderAnnotationLayer={true}
                renderTextLayer={true}
                onLoadError={onPageLoadError}
                loading={
                  <div className="h-[800px] w-[600px] bg-muted/10 animate-pulse rounded" />
                }
              />
            )}
          </PdfDocument>
        </div>
      )}
    </div>
  )
}
