"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { TranslationContent } from "./translation-content"
import { useMediaQuery } from "@/lib/hooks/use-media-query"

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
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate position based on selection - ensures popover never covers selected word
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

      // Selection bounds (absolute coordinates)
      const selectionTop = selectionPosition.y
      const selectionBottom = selectionPosition.y + selectionPosition.height
      const selectionLeft = selectionPosition.x
      const selectionRight = selectionPosition.x + selectionPosition.width

      // Calculate popover bounds for different positions
      const checkOverlap = (popoverTop: number, popoverLeft: number) => {
        const popoverBottom = popoverTop + popoverHeight
        const popoverRight = popoverLeft + popoverWidth
        
        // Check if popover overlaps with selection
        const overlapsVertically = !(popoverBottom < selectionTop || popoverTop > selectionBottom)
        const overlapsHorizontally = !(popoverRight < selectionLeft || popoverLeft > selectionRight)
        
        return overlapsVertically && overlapsHorizontally
      }

      // Try positions: above, below, then side positions if needed
      let top: number
      let left: number
      let positionFound = false

      // Position 1: Above selection (centered)
      top = selectionTop - popoverHeight - padding
      left = selectionLeft + selectionPosition.width / 2 - popoverWidth / 2
      
      // Check if this position overlaps with selection
      if (!checkOverlap(top, left) && top >= scrollY + 20) {
        positionFound = true
      }

      // Position 2: Below selection (centered)
      if (!positionFound) {
        top = selectionBottom + padding
        left = selectionLeft + selectionPosition.width / 2 - popoverWidth / 2
        
        if (!checkOverlap(top, left)) {
          positionFound = true
        }
      }

      // Position 3: To the right of selection (if above/below would overlap)
      if (!positionFound) {
        top = selectionTop + selectionPosition.height / 2 - popoverHeight / 2
        left = selectionRight + padding
        
        // Check if fits in viewport
        if (left + popoverWidth <= viewportWidth - 20 && !checkOverlap(top, left)) {
          positionFound = true
        }
      }

      // Position 4: To the left of selection
      if (!positionFound) {
        top = selectionTop + selectionPosition.height / 2 - popoverHeight / 2
        left = selectionLeft - popoverWidth - padding
        
        // Check if fits in viewport
        if (left >= 20 && !checkOverlap(top, left)) {
          positionFound = true
        }
      }

      // Position 5: Above, offset horizontally if needed
      if (!positionFound) {
        top = selectionTop - popoverHeight - padding
        
        // Try offsetting to the right
        left = selectionRight + padding
        if (left + popoverWidth <= viewportWidth - 20 && !checkOverlap(top, left)) {
          positionFound = true
        } else {
          // Try offsetting to the left
          left = selectionLeft - popoverWidth - padding
          if (left >= 20 && !checkOverlap(top, left)) {
            positionFound = true
          }
        }
      }

      // Position 6: Below, offset horizontally if needed
      if (!positionFound) {
        top = selectionBottom + padding
        
        // Try offsetting to the right
        left = selectionRight + padding
        if (left + popoverWidth <= viewportWidth - 20 && !checkOverlap(top, left)) {
          positionFound = true
        } else {
          // Try offsetting to the left
          left = selectionLeft - popoverWidth - padding
          if (left >= 20 && !checkOverlap(top, left)) {
            positionFound = true
          }
        }
      }

      // Fallback: Default to below, even if it might overlap slightly (better than nothing)
      if (!positionFound) {
        top = selectionBottom + padding
        left = selectionLeft + selectionPosition.width / 2 - popoverWidth / 2
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
      
      // Final check: if after viewport constraints it would overlap, try to offset horizontally
      if (checkOverlap(top, left)) {
        // Try moving to the right
        const rightOffset = selectionRight + padding
        if (rightOffset + popoverWidth <= viewportWidth - 20 && !checkOverlap(top, rightOffset)) {
          left = rightOffset
        } else {
          // Try moving to the left
          const leftOffset = selectionLeft - popoverWidth - padding
          if (leftOffset >= 20 && !checkOverlap(top, leftOffset)) {
            left = leftOffset
          }
        }
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
        className="fixed inset-0 bg-background/20 backdrop-blur-sm z-[100] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
        style={{ zIndex: 100 }}
      />
      
      {/* Popover */}
      <div
        ref={popoverRef}
        className={cn(
          "theme-surface fixed bg-background shadow-2xl rounded-lg border z-[101]",
          "w-80 max-h-[70vh] flex flex-col",
          reducedMotion ? "" : "transition-opacity duration-200"
        )}
        style={{
          zIndex: 101,
          top: `${position.top}px`,
          left: `${position.left}px`,
          transition: reducedMotion ? "none" : "opacity 200ms ease-out",
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


