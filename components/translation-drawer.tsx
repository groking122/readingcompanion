"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { TranslationContent } from "./translation-content"

interface TranslationDrawerProps {
  isOpen: boolean
  onClose: () => void
  selectedText: string
  translation: string
  translating: boolean
  alternativeTranslations: string[]
  saving: boolean
  savedWordId: string | null
  isPhrase: boolean
  context?: string
  onSave: () => void
  onUndo: () => void
  onMarkKnown?: () => void
  onTranslationChange?: (newTranslation: string) => void
}

export function TranslationDrawer({
  isOpen,
  onClose,
  selectedText,
  translation,
  translating,
  alternativeTranslations,
  saving,
  savedWordId,
  isPhrase,
  context,
  onSave,
  onUndo,
  onMarkKnown,
  onTranslationChange,
}: TranslationDrawerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  if (!isOpen || !mounted) return null

  const drawerContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[100] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
        style={{ zIndex: 100 }}
      />
      
      {/* Drawer - Bottom sheet for mobile only */}
      <div
        className={cn(
          "theme-surface fixed bg-background shadow-xl transition-transform duration-300 ease-in-out",
          // Mobile: bottom drawer (only visible on mobile)
          "bottom-0 left-0 right-0 max-h-[85vh] rounded-t-lg border-t",
          // Transform states
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ zIndex: 101 }}
      >
        <div className="flex flex-col h-full max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Translation</h2>
              {savedWordId && (
                <span className="text-xs text-green-600 font-medium">Saved ✓</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 min-h-[48px] min-w-[48px]"
              aria-label="Close translation"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Content */}
          <TranslationContent
            selectedText={selectedText}
            translation={translation}
            translating={translating}
            alternativeTranslations={alternativeTranslations}
            saving={saving}
            savedWordId={savedWordId}
            isPhrase={isPhrase}
            context={context}
            onSave={onSave}
            onUndo={onUndo}
            onMarkKnown={onMarkKnown}
            onTranslationChange={onTranslationChange}
            compact={false}
          />
        </div>
      </div>
    </>
  )

  // Render to document body to avoid clipping issues
  return createPortal(drawerContent, document.body)
}

