"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Type, ZoomIn, ZoomOut, Settings2, RotateCcw, ChevronDown, ChevronUp, Maximize2, Minimize2, Palette } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

interface ReaderSettingsProps {
  fontSize: number
  fontFamily: string
  lineHeight: number
  maxWidth?: number // in ch units
  paragraphSpacing?: number // in rem
  theme?: "light" | "sepia" | "dark" | "paper"
  distractionFree?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onFontSizeChange: (size: number) => void
  onFontFamilyChange: (family: string) => void
  onLineHeightChange: (height: number) => void
  onMaxWidthChange?: (width: number) => void
  onParagraphSpacingChange?: (spacing: number) => void
  onThemeChange?: (theme: "light" | "sepia" | "dark" | "paper") => void
  onDistractionFreeChange?: (enabled: boolean) => void
  onReset?: () => void
}

const DEFAULT_FONT_SIZE = 16
const DEFAULT_FONT_FAMILY = "Inter"
const DEFAULT_LINE_HEIGHT = 1.6
const DEFAULT_MAX_WIDTH = 66 // ch units
const DEFAULT_PARAGRAPH_SPACING = 1.5 // rem
const DEFAULT_THEME = "light" as const

export function ReaderSettings({
  fontSize,
  fontFamily,
  lineHeight,
  maxWidth = DEFAULT_MAX_WIDTH,
  paragraphSpacing = DEFAULT_PARAGRAPH_SPACING,
  theme = DEFAULT_THEME,
  distractionFree = false,
  isOpen: controlledIsOpen,
  onOpenChange,
  onFontSizeChange,
  onFontFamilyChange,
  onLineHeightChange,
  onMaxWidthChange,
  onParagraphSpacingChange,
  onThemeChange,
  onDistractionFreeChange,
  onReset,
}: ReaderSettingsProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open)
    } else {
      setInternalIsOpen(open)
    }
  }

  const increaseFontSize = () => {
    onFontSizeChange(Math.min(fontSize + 2, 24))
  }

  const decreaseFontSize = () => {
    onFontSizeChange(Math.max(fontSize - 2, 12))
  }

  const handleReset = () => {
    onFontSizeChange(DEFAULT_FONT_SIZE)
    onFontFamilyChange(DEFAULT_FONT_FAMILY)
    onLineHeightChange(DEFAULT_LINE_HEIGHT)
    if (onMaxWidthChange) onMaxWidthChange(DEFAULT_MAX_WIDTH)
    if (onParagraphSpacingChange) onParagraphSpacingChange(DEFAULT_PARAGRAPH_SPACING)
    if (onThemeChange) onThemeChange(DEFAULT_THEME)
    if (onDistractionFreeChange) onDistractionFreeChange(false)
    if (onReset) {
      onReset()
    }
  }

  const isDefault = 
    fontSize === DEFAULT_FONT_SIZE &&
    fontFamily === DEFAULT_FONT_FAMILY &&
    lineHeight === DEFAULT_LINE_HEIGHT &&
    maxWidth === DEFAULT_MAX_WIDTH &&
    paragraphSpacing === DEFAULT_PARAGRAPH_SPACING &&
    theme === DEFAULT_THEME &&
    !distractionFree

  return (
    <div className="mb-4">
      {/* Compact Aa Button */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 h-12 px-4 min-w-[48px]"
          aria-label="Reader settings"
        >
          <Type className="h-5 w-5" />
          <span className="hidden sm:inline text-sm font-medium">Aa</span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        
        {/* Distraction-Free Toggle */}
        {onDistractionFreeChange && (
          <Button
            variant={distractionFree ? "default" : "outline"}
            size="lg"
            onClick={() => onDistractionFreeChange(!distractionFree)}
            className="h-12 px-4 min-w-[48px]"
            aria-label={distractionFree ? "Show UI" : "Hide UI"}
          >
            {distractionFree ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
            <span className="hidden sm:inline ml-2 text-sm">Distraction-Free</span>
          </Button>
        )}
        
        {!isDefault && (
          <Button
            variant="outline"
            size="lg"
            onClick={handleReset}
            className="h-12 px-4 min-w-[48px]"
            aria-label="Reset settings"
          >
            <RotateCcw className="h-5 w-5" />
            <span className="hidden sm:inline ml-2 text-sm">Reset</span>
          </Button>
        )}
      </div>

      {/* Settings Drawer */}
      {isOpen && (
        <div className="mt-4 p-6 bg-card rounded-lg border shadow-lg settings-panel space-y-6">
          {/* Theme Selection */}
          {onThemeChange && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Theme</Label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onThemeChange("light")}
                  className="h-12"
                >
                  Light
                </Button>
                <Button
                  variant={theme === "sepia" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onThemeChange("sepia")}
                  className="h-12"
                >
                  Sepia
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onThemeChange("dark")}
                  className="h-12"
                >
                  Dark
                </Button>
                <Button
                  variant={theme === "paper" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onThemeChange("paper")}
                  className="h-12"
                >
                  Paper
                </Button>
              </div>
            </div>
          )}

          {/* Font Family */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              Font Family
            </Label>
            <Select value={fontFamily} onValueChange={onFontFamilyChange}>
              <SelectTrigger className="w-full h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Courier New">Courier New</SelectItem>
                <SelectItem value="Merriweather">Merriweather</SelectItem>
                <SelectItem value="Lora">Lora</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Font Size: {fontSize}px</Label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={decreaseFontSize}
                disabled={fontSize <= 12}
                className="h-12 w-12 min-w-[48px]"
                aria-label="Decrease font size"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <Slider
                value={[fontSize]}
                onValueChange={([value]) => onFontSizeChange(value)}
                min={12}
                max={24}
                step={1}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="lg"
                onClick={increaseFontSize}
                disabled={fontSize >= 24}
                className="h-12 w-12 min-w-[48px]"
                aria-label="Increase font size"
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Line Height */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Line Height: {lineHeight}</Label>
            <Select value={lineHeight.toString()} onValueChange={(v) => onLineHeightChange(parseFloat(v))}>
              <SelectTrigger className="w-full h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1.2">1.2 - Tight</SelectItem>
                <SelectItem value="1.4">1.4 - Compact</SelectItem>
                <SelectItem value="1.6">1.6 - Comfortable</SelectItem>
                <SelectItem value="1.8">1.8 - Spacious</SelectItem>
                <SelectItem value="2.0">2.0 - Very Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Max Width (Measure) */}
          {onMaxWidthChange && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Line Length: {maxWidth}ch (optimal: 45-75ch)</Label>
              <Slider
                value={[maxWidth]}
                onValueChange={([value]) => onMaxWidthChange(value)}
                min={45}
                max={90}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Shorter lines (45-66ch) improve reading speed and comprehension
              </p>
            </div>
          )}

          {/* Paragraph Spacing */}
          {onParagraphSpacingChange && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Paragraph Spacing: {paragraphSpacing}rem</Label>
              <Slider
                value={[paragraphSpacing]}
                onValueChange={([value]) => onParagraphSpacingChange(value)}
                min={0.5}
                max={3}
                step={0.25}
                className="w-full"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}


