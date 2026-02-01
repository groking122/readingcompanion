"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

interface ReadingPositionContextValue {
  location: string | number
  currentPage: number | null
  totalPages: number | null
  readingProgress: number
  currentChapter: string
  setLocation: (loc: string | number) => void
  updateLocation: (loc: string | number) => void
  setCurrentPage: (page: number | null) => void
  setTotalPages: (pages: number | null) => void
  setReadingProgress: (progress: number) => void
  setCurrentChapter: (chapter: string) => void
}

const ReadingPositionContext = createContext<ReadingPositionContextValue | undefined>(undefined)

interface ReadingPositionProviderProps {
  children: ReactNode
  initialLocation?: string | number
}

export function ReadingPositionProvider({ children, initialLocation = 0 }: ReadingPositionProviderProps) {
  const [location, setLocation] = useState<string | number>(initialLocation)
  const [currentPage, setCurrentPage] = useState<number | null>(null)
  const [totalPages, setTotalPages] = useState<number | null>(null)
  const [readingProgress, setReadingProgress] = useState(0)
  const [currentChapter, setCurrentChapter] = useState<string>("")

  const updateLocation = (loc: string | number) => {
    setLocation(loc)
  }

  const value: ReadingPositionContextValue = {
    location,
    currentPage,
    totalPages,
    readingProgress,
    currentChapter,
    setLocation: updateLocation,
    updateLocation,
    setCurrentPage,
    setTotalPages,
    setReadingProgress,
    setCurrentChapter,
  }

  return (
    <ReadingPositionContext.Provider value={value}>
      {children}
    </ReadingPositionContext.Provider>
  )
}

export function useReadingPositionContext() {
  const context = useContext(ReadingPositionContext)
  if (context === undefined) {
    throw new Error("useReadingPositionContext must be used within a ReadingPositionProvider")
  }
  return context
}

// Alias for convenience
export const useReadingPosition = useReadingPositionContext
