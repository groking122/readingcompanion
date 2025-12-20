"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface TranslationContentProps {
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
  compact?: boolean // For popover vs drawer
}

export function TranslationContent({
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
  compact = false,
}: TranslationContentProps) {
  const [showContext, setShowContext] = useState(false)
  const [showMoreMeanings, setShowMoreMeanings] = useState(false)

  return (
    <div className={cn("flex flex-col", compact ? "w-full" : "w-full")}>
      {/* Content */}
      <ScrollArea className={cn("flex-1", compact ? "max-h-[60vh]" : "max-h-[85vh] md:max-h-full")}>
        <div className={cn("space-y-4", compact ? "p-3" : "p-4")}>
          {/* Translation - BIG and FIRST (Duolingo/Kobo style) */}
          <div>
            {translating ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Translating...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Main translation - prominent */}
                <div>
                  <p className={cn(
                    "break-words font-medium",
                    compact ? "text-lg" : "text-xl"
                  )}>
                    {translation}
                  </p>
                </div>

                {/* Term - smaller, secondary */}
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {isPhrase ? "Phrase" : "Word"}
                  </p>
                  <p className="text-sm break-words text-muted-foreground">{selectedText}</p>
                </div>

                {/* Context - collapsible */}
                {context && context !== selectedText && (
                  <div className="pt-2 border-t">
                    <button
                      onClick={() => setShowContext(!showContext)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                    >
                      {showContext ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          <span>Hide sentence</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          <span>Show sentence</span>
                        </>
                      )}
                    </button>
                    {showContext && (
                      <p className="text-xs text-muted-foreground mt-2 italic leading-relaxed">
                        {context}
                      </p>
                    )}
                  </div>
                )}

                {/* Alternative translations - collapsible */}
                {alternativeTranslations.length > 0 && (
                  <div className="pt-2 border-t">
                    <button
                      onClick={() => setShowMoreMeanings(!showMoreMeanings)}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left mb-2"
                    >
                      {showMoreMeanings ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          <span>Hide other meanings ({alternativeTranslations.length})</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          <span>Show other meanings ({alternativeTranslations.length})</span>
                        </>
                      )}
                    </button>
                    {showMoreMeanings && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {alternativeTranslations.slice(0, 6).map((alt, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2.5 py-1.5 rounded-md bg-muted/80 text-foreground border border-border text-center"
                          >
                            {alt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className={cn("border-t space-y-2 shrink-0", compact ? "p-3" : "p-4")}>
        <div className="flex gap-2">
          <Button
            size={compact ? "default" : "lg"}
            onClick={onSave}
            disabled={saving || !translation || !!savedWordId}
            className={cn(
              "flex-1",
              compact ? "h-10 min-h-[40px]" : "h-12 min-h-[48px]"
            )}
          >
            {savedWordId ? "Saved ✓" : saving ? "Saving..." : isPhrase ? "Save Phrase" : "Save"}
          </Button>
          {onMarkKnown && !savedWordId && (
            <Button
              size={compact ? "default" : "lg"}
              variant="outline"
              onClick={onMarkKnown}
              disabled={saving}
              className={cn(
                compact ? "h-10 min-w-[40px] px-3" : "h-12 min-w-[48px] px-4"
              )}
              title="Mark as known - won't show in future lookups"
            >
              Known
            </Button>
          )}
        </div>
        {savedWordId && (
          <Button
            size={compact ? "default" : "lg"}
            variant="outline"
            onClick={onUndo}
            className={cn(
              "w-full",
              compact ? "h-10 min-h-[40px]" : "h-12 min-h-[48px]"
            )}
          >
            Undo
          </Button>
        )}
      </div>
    </div>
  )
}

