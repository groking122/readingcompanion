"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"

interface Book {
  id: string
  title: string
  type: string
  content: string | null
  pdfUrl: string | null
  epubUrl: string | null
}

interface ReaderContextValue {
  book: Book | null
  bookId: string | null
  fontSize: number
  fontFamily: string
  lineHeight: number
  readingWidth: "comfort" | "wide"
  paragraphSpacing: number
  distractionFree: boolean
  theme?: "light" | "dark" | "sepia" | "paper"
  settings: {
    fontSize: number
    fontFamily: string
    lineHeight: number
    readingWidth: "comfort" | "wide"
    paragraphSpacing: number
  }
  setFontSize: (size: number) => void
  setFontFamily: (family: string) => void
  setLineHeight: (height: number) => void
  setReadingWidth: (width: "comfort" | "wide") => void
  setParagraphSpacing: (spacing: number) => void
  setDistractionFree: (enabled: boolean) => void
  setBook: (book: Book | null) => void
}

const ReaderContext = createContext<ReaderContextValue | undefined>(undefined)

// Helper functions for book settings persistence
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
        distractionFree: settings.distractionFree !== undefined ? settings.distractionFree : true, // Default to true
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

interface ReaderProviderProps {
  children: ReactNode
  initialBookId?: string | null
}

export function ReaderProvider({ children, initialBookId }: ReaderProviderProps) {
  const [book, setBook] = useState<Book | null>(null)
  const [bookId, setBookId] = useState<string | null>(initialBookId || null)
  const [fontSize, setFontSize] = useState(16)
  const [fontFamily, setFontFamily] = useState("Inter")
  const [lineHeight, setLineHeight] = useState(1.6)
  const [readingWidth, setReadingWidth] = useState<"comfort" | "wide">("comfort")
  const [paragraphSpacing, setParagraphSpacing] = useState(1.5)
  const [distractionFree, setDistractionFree] = useState(false)

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
      setBookId(book.id)
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

  // Get current theme from document
  const [theme, setTheme] = useState<"light" | "dark" | "sepia" | "paper">("light")
  
  useEffect(() => {
    // Detect theme from document
    const detectTheme = () => {
      if (typeof window === "undefined") return "light"
      const root = document.documentElement
      const canvasColor = getComputedStyle(root).getPropertyValue("--c-canvas").trim()
      // Check if it's a dark color (simple heuristic)
      if (canvasColor.includes("#")) {
        const hex = canvasColor.replace("#", "")
        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)
        const brightness = (r * 299 + g * 587 + b * 114) / 1000
        return brightness < 128 ? "dark" : "light"
      }
      return root.classList.contains("dark") ? "dark" : "light"
    }
    setTheme(detectTheme())
  }, [])

  const value: ReaderContextValue = {
    book,
    bookId,
    fontSize,
    fontFamily,
    lineHeight,
    readingWidth,
    paragraphSpacing,
    distractionFree,
    theme,
    settings: {
      fontSize,
      fontFamily,
      lineHeight,
      readingWidth,
      paragraphSpacing,
    },
    setFontSize,
    setFontFamily,
    setLineHeight,
    setReadingWidth,
    setParagraphSpacing,
    setDistractionFree,
    setBook,
  }

  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>
}

export function useReaderContext() {
  const context = useContext(ReaderContext)
  if (context === undefined) {
    throw new Error("useReaderContext must be used within a ReaderProvider")
  }
  return context
}

// Alias for convenience
export const useReader = useReaderContext
