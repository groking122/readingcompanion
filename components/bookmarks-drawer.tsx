"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Bookmark, Trash2, Navigation } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BookmarkItem {
  id: string
  title?: string
  epubLocation?: string
  pageNumber?: number
  position?: number
  createdAt: string
}

interface BookmarksDrawerProps {
  isOpen: boolean
  onClose: () => void
  bookmarks: BookmarkItem[]
  onNavigate: (bookmark: BookmarkItem) => void
  onDelete: (id: string) => void
}

export function BookmarksDrawer({
  isOpen,
  onClose,
  bookmarks,
  onNavigate,
  onDelete,
}: BookmarksDrawerProps) {
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
            <Bookmark className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Bookmarks</h2>
            {bookmarks.length > 0 && (
              <span className="text-sm text-muted-foreground">({bookmarks.length})</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            aria-label="Close bookmarks"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="p-4">
            {!Array.isArray(bookmarks) || bookmarks.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No bookmarks yet</p>
                <p className="text-xs mt-2">Use the bookmark button to save your place</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="group flex items-start gap-2 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {bookmark.title || `Page ${bookmark.pageNumber || "?"}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(bookmark.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigate(bookmark)}
                        className="h-8 w-8 p-0"
                        title="Go to bookmark"
                      >
                        <Navigation className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(bookmark.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Delete bookmark"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  )
}

