"use client"

import { X, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export interface TocItem {
  href: string
  label: string
  level?: number
}

interface TocDrawerProps {
  toc: TocItem[]
  isOpen: boolean
  onClose: () => void
  onNavigate: (href: string) => void
  currentLocation?: string
}

export function TocDrawer({ toc, isOpen, onClose, onNavigate, currentLocation }: TocDrawerProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div
        className={cn(
          "theme-surface fixed left-0 top-0 bottom-0 w-80 bg-background border-r z-50 shadow-xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Table of Contents</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            aria-label="Close table of contents"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <nav className="p-4">
            {toc.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">No table of contents available</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {toc.map((item, index) => {
                  const level = item.level || 1
                  const isActive = currentLocation && item.href && currentLocation.includes(item.href)
                  
                  return (
                    <li key={index}>
                      <button
                        onClick={() => {
                          onNavigate(item.href)
                          onClose()
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          isActive && "bg-primary/10 text-primary font-medium",
                          level > 1 && "pl-6"
                        )}
                        style={{
                          paddingLeft: `${0.75 + (level - 1) * 1.5}rem`,
                        }}
                      >
                        {item.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </nav>
        </ScrollArea>
      </div>
    </>
  )
}

