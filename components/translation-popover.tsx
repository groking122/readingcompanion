"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { TranslationContent } from "./translation-content"

interface TranslationPopoverProps {
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
  selectionPosition?: { x: number; y: number; width: number; height: number }
}

export function TranslationPopover({
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
  selectionPosition,
}: TranslationPopoverProps) {
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate position based on selection
  useEffect(() => {
    if (!isOpen || !mounted || !selectionPosition) return

    const updatePosition = () => {
      if (!popoverRef.current) return

      const popover = popoverRef.current
      const popoverWidth = 320 // Fixed width for popover
      const popoverHeight = popover.offsetHeight || 400 // Estimate if not rendered
      const padding = 12 // Offset from selection

      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const scrollY = window.scrollY

      // Start with position above selection (default)
      let top = selectionPosition.y - popoverHeight - padding
      let left = selectionPosition.x + selectionPosition.width / 2 - popoverWidth / 2

      // If not enough space above, place below
      if (top < scrollY + 20) {
        top = selectionPosition.y + selectionPosition.height + padding
      }

      // Keep within viewport horizontally
      if (left < 20) {
        left = 20
      } else if (left + popoverWidth > viewportWidth - 20) {
        left = viewportWidth - popoverWidth - 20
      }

      // Keep within viewport vertically
      const maxTop = scrollY + viewportHeight - popoverHeight - 20
      if (top > maxTop) {
        top = Math.max(scrollY + 20, maxTop)
      }

      setPosition({ top, left })
    }

    updatePosition()
    
    // Update on scroll/resize
    const handleUpdate = () => updatePosition()
    window.addEventListener("scroll", handleUpdate, true)
    window.addEventListener("resize", handleUpdate)

    return () => {
      window.removeEventListener("scroll", handleUpdate, true)
      window.removeEventListener("resize", handleUpdate)
    }
  }, [isOpen, mounted, selectionPosition, translation])

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

  const popoverContent = (
    <>
      {/* Backdrop - subtle, clickable */}
      <div
        className="fixed inset-0 bg-black/20 z-[100] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
        style={{ zIndex: 100 }}
      />
      
      {/* Popover */}
      <div
        ref={popoverRef}
        className={cn(
          "theme-surface fixed bg-background shadow-2xl rounded-lg border z-[101] transition-opacity duration-200",
          "w-80 max-h-[70vh] flex flex-col"
        )}
        style={{
          zIndex: 101,
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Translation</h3>
            {savedWordId && (
              <span className="text-xs text-green-600 font-medium">Saved ✓</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 p-0"
            aria-label="Close translation"
          >
            <X className="h-3.5 w-3.5" />
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
          compact={true}
        />
      </div>
    </>
  )

  return createPortal(popoverContent, document.body)
}


