"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Bookmark, Trash2, Navigation, Edit2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"

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
  onUpdate?: (id: string, title: string) => Promise<void>
}

export function BookmarksDrawer({
  isOpen,
  onClose,
  bookmarks,
  onNavigate,
  onDelete,
  onUpdate,
}: BookmarksDrawerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [saving, setSaving] = useState(false)

  const handleEdit = (bookmark: BookmarkItem) => {
    setEditingId(bookmark.id)
    setEditTitle(bookmark.title || "")
  }

  const handleSaveEdit = async () => {
    if (!editingId || !onUpdate) return
    
    setSaving(true)
    try {
      await onUpdate(editingId, editTitle.trim())
      setEditingId(null)
      setEditTitle("")
      toast.success("Bookmark updated", "Your bookmark has been renamed.")
    } catch (error) {
      console.error("Error updating bookmark:", error)
      toast.error("Failed to update", "Could not rename bookmark. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle("")
  }

  // Filter out the auto-saved "__LAST_READ__" bookmark from display
  const displayBookmarks = bookmarks.filter(b => b.title !== "__LAST_READ__")

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity"
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
            {displayBookmarks.length > 0 && (
              <span className="text-sm text-muted-foreground">({displayBookmarks.length})</span>
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
            {!Array.isArray(displayBookmarks) || displayBookmarks.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No bookmarks yet</p>
                <p className="text-xs mt-2">Use the bookmark button to save your place</p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayBookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="group flex items-start gap-2 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => onNavigate(bookmark)}
                  >
                    <div className="flex-1 min-w-0">
                      {editingId === bookmark.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveEdit()
                              } else if (e.key === "Escape") {
                                handleCancelEdit()
                              }
                            }}
                            className="h-8 text-sm"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSaveEdit()
                            }}
                            disabled={saving}
                            className="h-8 w-8 p-0 min-h-[32px] min-w-[32px]"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancelEdit()
                            }}
                            className="h-8 w-8 p-0 min-h-[32px] min-w-[32px]"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium truncate">
                            {bookmark.title || (bookmark.pageNumber ? `Page ${bookmark.pageNumber}` : "Bookmark")}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {new Date(bookmark.createdAt).toLocaleDateString()}
                            </p>
                            {bookmark.pageNumber && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">Page {bookmark.pageNumber}</span>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    {editingId !== bookmark.id && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(bookmark)
                            }}
                            className="h-8 w-8 p-0 min-h-[32px] min-w-[32px]"
                            title="Edit bookmark name"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onNavigate(bookmark)
                          }}
                          className="h-8 w-8 p-0 min-h-[32px] min-w-[32px]"
                          title="Go to bookmark"
                        >
                          <Navigation className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(bookmark.id)
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive min-h-[32px] min-w-[32px]"
                          title="Delete bookmark"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
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

