"use client"

import { useState, useEffect, useRef } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Type, Plus, Minus, Layout, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useIsMobile } from "@/lib/hooks/use-media-query"
import { cn } from "@/lib/utils"

interface ReaderSettingsProps {
  fontSize: number
  fontFamily: string
  lineHeight: number
  readingWidth?: "comfort" | "wide"
  paragraphSpacing?: number
  onParagraphSpacingChange?: (spacing: number) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onFontSizeChange: (size: number) => void
  onFontFamilyChange: (family: string) => void
  onLineHeightChange: (height: number) => void
  onReadingWidthChange?: (width: "comfort" | "wide") => void
}

export function ReaderSettings({
  fontSize,
  fontFamily,
  lineHeight,
  readingWidth = "comfort",
  paragraphSpacing = 1.5,
  onParagraphSpacingChange,
  isOpen,
  onOpenChange,
  onFontSizeChange,
  onFontFamilyChange,
  onLineHeightChange,
  onReadingWidthChange,
}: ReaderSettingsProps) {
  const isMobile = useIsMobile()
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-hide logic for desktop
  useEffect(() => {
    if (isMobile || !isOpen) return

    const handleMouseEnter = () => {
      setIsVisible(true)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }

    const handleMouseLeave = () => {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false)
      }, 3000) // Hide after 3 seconds of inactivity
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener("mouseenter", handleMouseEnter)
      container.addEventListener("mouseleave", handleMouseLeave)
      // Show initially when opened
      setIsVisible(true)
    }

    return () => {
      if (container) {
        container.removeEventListener("mouseenter", handleMouseEnter)
        container.removeEventListener("mouseleave", handleMouseLeave)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isMobile, isOpen])

  // Show settings when opened
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    }
  }, [isOpen])

  const increaseFontSize = () => {
    onFontSizeChange(Math.min(fontSize + 1, 32))
  }

  const decreaseFontSize = () => {
    onFontSizeChange(Math.max(fontSize - 1, 12))
  }

  if (!isOpen) return null

  // Mobile: Bottom sheet (max 50% height, doesn't cover full screen)
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-end pointer-events-none">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={() => onOpenChange(false)}
        />
        {/* Settings Panel */}
        <div
          className={cn(
            "relative w-full bg-background border-t rounded-t-2xl shadow-lg pointer-events-auto",
            "max-h-[50vh] overflow-y-auto transition-transform duration-300 ease-out",
            isOpen ? "translate-y-0" : "translate-y-full"
          )}
        >
          <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between z-10">
            <h2 className="text-base font-semibold">Settings</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
              aria-label="Close settings"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 pb-6 space-y-5">
            {/* Typography */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
                <Type className="h-3 w-3" />
                Typography
              </div>
              <div className="space-y-4">
                {/* Font Family */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Font</Label>
                  <Select value={fontFamily} onValueChange={onFontFamilyChange}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Georgia" className="font-serif">Georgia</SelectItem>
                      <SelectItem value="Times New Roman" className="font-serif">Times</SelectItem>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Courier New" className="font-mono">Courier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Font Size */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Size</Label>
                    <span className="text-xs font-medium">{fontSize}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={decreaseFontSize}
                      disabled={fontSize <= 12}
                      className="h-8 w-8 p-0"
                      aria-label="Decrease font size"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Slider
                      value={[fontSize]}
                      onValueChange={([value]) => onFontSizeChange(value)}
                      min={12}
                      max={32}
                      step={1}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={increaseFontSize}
                      disabled={fontSize >= 32}
                      className="h-8 w-8 p-0"
                      aria-label="Increase font size"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Line Height */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Line Height</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={lineHeight === 1.4 ? "default" : "outline"}
                      size="sm"
                      onClick={() => onLineHeightChange(1.4)}
                      className="h-8 text-xs"
                    >
                      1.4
                    </Button>
                    <Button
                      variant={lineHeight === 1.6 ? "default" : "outline"}
                      size="sm"
                      onClick={() => onLineHeightChange(1.6)}
                      className="h-8 text-xs"
                    >
                      1.6
                    </Button>
                    <Button
                      variant={lineHeight === 1.8 ? "default" : "outline"}
                      size="sm"
                      onClick={() => onLineHeightChange(1.8)}
                      className="h-8 text-xs"
                    >
                      1.8
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Layout */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
                <Layout className="h-3 w-3" />
                Layout
              </div>
              <div className="space-y-4">
                {/* Reading Width */}
                {onReadingWidthChange && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Width</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={readingWidth === "comfort" ? "default" : "outline"}
                        size="sm"
                        onClick={() => onReadingWidthChange("comfort")}
                        className="h-8 text-xs"
                      >
                        Comfort
                      </Button>
                      <Button
                        variant={readingWidth === "wide" ? "default" : "outline"}
                        size="sm"
                        onClick={() => onReadingWidthChange("wide")}
                        className="h-8 text-xs"
                      >
                        Wide
                      </Button>
                    </div>
                  </div>
                )}

                {/* Paragraph Spacing */}
                {onParagraphSpacingChange && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Paragraph Spacing</Label>
                      <span className="text-xs font-medium">{paragraphSpacing.toFixed(1)}rem</span>
                    </div>
                    <Slider
                      value={[paragraphSpacing]}
                      onValueChange={([value]) => onParagraphSpacingChange(value)}
                      min={0.5}
                      max={3}
                      step={0.1}
                      className="flex-1"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Desktop: Fixed bottom control bar with auto-hide
  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t shadow-lg",
        "transition-all duration-300 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      )}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0 shrink-0"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Font Family */}
          <div className="flex items-center gap-2 shrink-0">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Font:</Label>
            <Select value={fontFamily} onValueChange={onFontFamilyChange}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Georgia" className="font-serif">Georgia</SelectItem>
                <SelectItem value="Times New Roman" className="font-serif">Times</SelectItem>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Courier New" className="font-mono">Courier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Size:</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={decreaseFontSize}
              disabled={fontSize <= 12}
              className="h-8 w-8 p-0 shrink-0"
              aria-label="Decrease font size"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Slider
              value={[fontSize]}
              onValueChange={([value]) => onFontSizeChange(value)}
              min={12}
              max={32}
              step={1}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={increaseFontSize}
              disabled={fontSize >= 32}
              className="h-8 w-8 p-0 shrink-0"
              aria-label="Increase font size"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-medium w-10 text-right shrink-0">{fontSize}px</span>
          </div>

          {/* Line Height */}
          <div className="flex items-center gap-2 shrink-0">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Line:</Label>
            <div className="flex gap-1">
              <Button
                variant={lineHeight === 1.4 ? "default" : "outline"}
                size="sm"
                onClick={() => onLineHeightChange(1.4)}
                className="h-8 px-2 text-xs"
              >
                1.4
              </Button>
              <Button
                variant={lineHeight === 1.6 ? "default" : "outline"}
                size="sm"
                onClick={() => onLineHeightChange(1.6)}
                className="h-8 px-2 text-xs"
              >
                1.6
              </Button>
              <Button
                variant={lineHeight === 1.8 ? "default" : "outline"}
                size="sm"
                onClick={() => onLineHeightChange(1.8)}
                className="h-8 px-2 text-xs"
              >
                1.8
              </Button>
            </div>
          </div>

          {/* Reading Width */}
          {onReadingWidthChange && (
            <div className="flex items-center gap-2 shrink-0">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Width:</Label>
              <div className="flex gap-1">
                <Button
                  variant={readingWidth === "comfort" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onReadingWidthChange("comfort")}
                  className="h-8 px-3 text-xs"
                >
                  Comfort
                </Button>
                <Button
                  variant={readingWidth === "wide" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onReadingWidthChange("wide")}
                  className="h-8 px-3 text-xs"
                >
                  Wide
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
