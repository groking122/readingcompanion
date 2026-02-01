"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

interface TranslationContextValue {
  selectedText: string
  translation: string
  alternativeTranslations: string[]
  translating: boolean
  saving: boolean
  savedWordId: string | null
  selectedContext: string
  popoverOpen: boolean
  popoverPosition: { x: number; y: number; width: number; height: number } | undefined
  selectText: (text: string, context?: string) => void
  handleTextSelection: () => void
  setTranslation: (translation: string) => void
  setAlternativeTranslations: (alternatives: string[]) => void
  setTranslating: (translating: boolean) => void
  setSaving: (saving: boolean) => void
  setSavedWordId: (id: string | null) => void
  setSelectedContext: (context: string) => void
  setPopoverOpen: (open: boolean) => void
  setPopoverPosition: (position: { x: number; y: number; width: number; height: number } | undefined) => void
  clearSelection: () => void
}

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined)

interface TranslationProviderProps {
  children: ReactNode
}

export function TranslationProvider({ children }: TranslationProviderProps) {
  const [selectedText, setSelectedText] = useState("")
  const [translation, setTranslation] = useState("")
  const [alternativeTranslations, setAlternativeTranslations] = useState<string[]>([])
  const [translating, setTranslating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedWordId, setSavedWordId] = useState<string | null>(null)
  const [selectedContext, setSelectedContext] = useState<string>("")
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>(undefined)

  const selectText = (text: string, context?: string) => {
    setSelectedText(text)
    setSelectedContext(context || text)
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString().trim()
      if (text.length > 0 && text.length <= 100) {
        selectText(text)
      }
    }
  }

  const clearSelection = () => {
    setSelectedText("")
    setTranslation("")
    setAlternativeTranslations([])
    setSelectedContext("")
    setPopoverOpen(false)
    setPopoverPosition(undefined)
    setSavedWordId(null)
    setTranslating(false)
    setSaving(false)
  }

  const value: TranslationContextValue = {
    selectedText,
    translation,
    alternativeTranslations,
    translating,
    saving,
    savedWordId,
    selectedContext,
    popoverOpen,
    popoverPosition,
    selectText,
    handleTextSelection,
    setTranslation,
    setAlternativeTranslations,
    setTranslating,
    setSaving,
    setSavedWordId,
    setSelectedContext,
    setPopoverOpen,
    setPopoverPosition,
    clearSelection,
  }

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslationContext() {
  const context = useContext(TranslationContext)
  if (context === undefined) {
    throw new Error("useTranslationContext must be used within a TranslationProvider")
  }
  return context
}

// Alias for convenience
export const useTranslation = useTranslationContext
