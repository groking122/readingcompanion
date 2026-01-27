"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Keyboard } from "lucide-react"

interface KeyboardShortcutsOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export function KeyboardShortcutsOverlay({
  isOpen,
  onClose,
}: KeyboardShortcutsOverlayProps) {
  const shortcuts = [
    { key: "Esc", description: "Close popover / dialog" },
    { key: "S", description: "Save selected word" },
    { key: "K", description: "Mark known / Dismiss" },
    { key: "A", description: "Open settings" },
    { key: "C", description: "Open Contents (TOC)" },
    { key: "B", description: "Bookmark current location" },
    { key: "R", description: "Go to Review" },
    { key: "?", description: "Show shortcuts" },
    { key: "← / →", description: "Previous / Next page" },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent data-shortcuts-dialog className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your reading workflow with these shortcuts
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Reading</h3>
            <div className="space-y-1.5 text-sm">
              {shortcuts.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border min-w-[60px] text-center">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-2 border-t text-xs text-muted-foreground">
            <p>Shortcuts only work when not typing in input fields.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

