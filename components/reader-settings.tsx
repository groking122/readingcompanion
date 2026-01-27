"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Type, Plus, Minus, Layout, Palette } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useIsMobile } from "@/lib/hooks/use-media-query"
import { cn } from "@/lib/utils"

interface ReaderSettingsProps {
  fontSize: number
  fontFamily: string
  lineHeight: number
  readingWidth?: "comfort" | "wide"
  theme?: "light" | "sepia" | "dark" | "paper"
  onThemeChange?: (theme: "light" | "sepia" | "dark" | "paper") => void
  paragraphSpacing?: number
  onParagraphSpacingChange?: (spacing: number) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onFontSizeChange: (size: number) => void
  onFontFamilyChange: (family: string) => void
  onLineHeightChange: (height: number) => void
  onReadingWidthChange?: (width: "comfort" | "wide") => void
}

const PRESETS = {
  comfort: {
    fontSize: 18,
    fontFamily: "Inter",
    lineHeight: 1.7,
    readingWidth: "comfort" as const,
    theme: "light" as const,
  },
  paper: {
    fontSize: 16,
    fontFamily: "Georgia",
    lineHeight: 1.6,
    readingWidth: "comfort" as const,
    theme: "paper" as const,
  },
  night: {
    fontSize: 16,
    fontFamily: "Inter",
    lineHeight: 1.6,
    readingWidth: "comfort" as const,
    theme: "dark" as const,
  },
  dense: {
    fontSize: 14,
    fontFamily: "Inter",
    lineHeight: 1.4,
    readingWidth: "wide" as const,
    theme: "light" as const,
  },
}

const DEFAULT_FONT_SIZE = 16
const DEFAULT_FONT_FAMILY = "Inter"
const DEFAULT_LINE_HEIGHT = 1.6

export function ReaderSettings({
  fontSize,
  fontFamily,
  lineHeight,
  readingWidth = "comfort",
  theme = "light",
  onThemeChange,
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

  const applyPreset = (presetName: keyof typeof PRESETS) => {
    const preset = PRESETS[presetName]
    onFontSizeChange(preset.fontSize)
    onFontFamilyChange(preset.fontFamily)
    onLineHeightChange(preset.lineHeight)
    onReadingWidthChange?.(preset.readingWidth)
    onThemeChange?.(preset.theme)
  }

  const increaseFontSize = () => {
    onFontSizeChange(Math.min(fontSize + 1, 24))
  }

  const decreaseFontSize = () => {
    onFontSizeChange(Math.max(fontSize - 1, 12))
  }

  // Render settings content (used in both mobile and desktop views)
  const renderSettingsContent = () => (
    <div className="space-y-5">
      {/* Presets */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Presets</div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(PRESETS).map(([name, preset]) => (
            <button
              key={name}
              onClick={() => applyPreset(name as keyof typeof PRESETS)}
              className="p-3 rounded-md border hover:border-primary transition-colors text-left"
            >
              <div className="text-sm font-medium capitalize">{name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {preset.fontSize}px • {preset.fontFamily}
              </div>
            </button>
          ))}
        </div>
      </div>

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
                max={24}
                step={1}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={increaseFontSize}
                disabled={fontSize >= 24}
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

      {/* Theme */}
      {onThemeChange && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
            <Palette className="h-3 w-3" />
            Theme
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["light", "sepia", "dark", "paper"] as const).map((t) => (
              <button
                key={t}
                onClick={() => onThemeChange(t)}
                className={cn(
                  "h-8 rounded-md border text-xs font-medium transition-colors",
                  theme === t ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                )}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {isMobile ? (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-full max-h-[90vh] overflow-y-auto p-0 gap-0 sm:rounded-t-2xl">
            <div className="sticky top-0 bg-background border-b p-4 z-10">
              <h2 className="text-base font-semibold">Settings</h2>
            </div>
            <div className="p-4 pb-6">
              {renderSettingsContent()}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
          <SheetContent side="right" className="w-full sm:w-[360px] overflow-y-auto">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-base">Settings</SheetTitle>
            </SheetHeader>
            {renderSettingsContent()}
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}


