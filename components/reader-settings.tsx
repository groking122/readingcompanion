"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Type, ZoomIn, ZoomOut, Settings2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react"

interface ReaderSettingsProps {
  fontSize: number
  fontFamily: string
  lineHeight: number
  onFontSizeChange: (size: number) => void
  onFontFamilyChange: (family: string) => void
  onLineHeightChange: (height: number) => void
  onReset?: () => void
}

const DEFAULT_FONT_SIZE = 16
const DEFAULT_FONT_FAMILY = "Inter"
const DEFAULT_LINE_HEIGHT = 1.6

export function ReaderSettings({
  fontSize,
  fontFamily,
  lineHeight,
  onFontSizeChange,
  onFontFamilyChange,
  onLineHeightChange,
  onReset,
}: ReaderSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)

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
    if (onReset) {
      onReset()
    }
  }

  const isDefault = 
    fontSize === DEFAULT_FONT_SIZE &&
    fontFamily === DEFAULT_FONT_FAMILY &&
    lineHeight === DEFAULT_LINE_HEIGHT

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <Settings2 className="h-4 w-4" />
          <span className="text-sm font-medium">Reader Settings</span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        {!isDefault && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="text-sm">Reset</span>
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="mt-2 p-4 bg-muted/30 rounded-lg border border-border/50 settings-panel">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Font:</span>
              <Select value={fontFamily} onValueChange={onFontFamilyChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Size:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={decreaseFontSize}
                disabled={fontSize <= 12}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm w-8 text-center">{fontSize}px</span>
              <Button
                variant="outline"
                size="sm"
                onClick={increaseFontSize}
                disabled={fontSize >= 24}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Line Height:</span>
              <Select value={lineHeight.toString()} onValueChange={(v) => onLineHeightChange(parseFloat(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.2">1.2</SelectItem>
                  <SelectItem value="1.4">1.4</SelectItem>
                  <SelectItem value="1.6">1.6</SelectItem>
                  <SelectItem value="1.8">1.8</SelectItem>
                  <SelectItem value="2.0">2.0</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


