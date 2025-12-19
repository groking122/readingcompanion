"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

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
  onSave: () => void
  onUndo: () => void
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
  onSave,
  onUndo,
}: TranslationDrawerProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer - Bottom on mobile, Right on desktop */}
      <div
        className={cn(
          "fixed z-50 bg-background border-t md:border-t-0 md:border-r shadow-xl transition-transform duration-300 ease-in-out",
          // Mobile: bottom drawer
          "bottom-0 left-0 right-0 max-h-[80vh] md:hidden",
          // Desktop: right drawer
          "md:top-0 md:right-0 md:bottom-0 md:w-96 md:max-h-none",
          isOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
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
              className="h-8 w-8 p-0"
              aria-label="Close translation"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Selected Text */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Term:</p>
                <p className="text-sm break-words font-medium">{selectedText}</p>
              </div>

              {/* Translation */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Translation (Greek):</p>
                {translating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Translating...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm break-words font-medium">{translation}</p>
                    {alternativeTranslations.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2 font-medium">
                          Alternative translations ({Math.min(alternativeTranslations.length, 6)} shown):
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {alternativeTranslations.slice(0, 6).map((alt, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2.5 py-1.5 rounded-md bg-muted/80 text-foreground border border-border text-center"
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
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="p-4 border-t space-y-2 shrink-0">
            <Button
              size="lg"
              onClick={onSave}
              disabled={saving || !translation || !!savedWordId}
              className="w-full h-12 min-h-[48px]"
            >
              {savedWordId ? "Saved ✓" : saving ? "Saving..." : isPhrase ? "Save Phrase" : "Save Word"}
            </Button>
            {savedWordId && (
              <Button
                size="lg"
                variant="outline"
                onClick={onUndo}
                className="w-full h-12 min-h-[48px]"
              >
                Undo
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

