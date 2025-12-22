"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, BookOpen, Trash2, Star, Edit2, Check, X, BookMarked } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/lib/toast"

interface WishlistItem {
  id: string
  title: string
  author: string | null
  notes: string | null
  priority: number
  status: string
  createdAt: string
  updatedAt: string
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  
  // Form state
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [notes, setNotes] = useState("")
  const [priority, setPriority] = useState<number>(0)
  const [status, setStatus] = useState<string>("want_to_read")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchWishlist()
  }, [])

  const fetchWishlist = async () => {
    try {
      const res = await fetch("/api/wishlist")
      if (res.ok) {
        const data = await res.json()
        setItems(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    try {
      if (editingId) {
        // Update existing item
        const res = await fetch(`/api/wishlist/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            author: author.trim() || null,
            notes: notes.trim() || null,
            priority,
            status,
          }),
        })
        if (res.ok) {
          await fetchWishlist()
          resetForm()
          toast.success("Wishlist updated!", `${title.trim()} has been updated.`)
        } else {
          toast.error("Failed to update", "Please try again.")
        }
      } else {
        // Create new item
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            author: author.trim() || null,
            notes: notes.trim() || null,
            priority,
            status,
          }),
        })
        if (res.ok) {
          await fetchWishlist()
          resetForm()
          toast.success("Added to wishlist!", `${title.trim()} has been added to your wishlist.`)
        } else {
          toast.error("Failed to add", "Please try again.")
        }
      }
    } catch (error) {
      console.error("Error saving wishlist item:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const item = items.find(i => i.id === id)
    if (!confirm("Are you sure you want to remove this from your wishlist?")) {
      return
    }

    try {
      const res = await fetch(`/api/wishlist/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        await fetchWishlist()
        toast.success("Removed from wishlist", item ? `${item.title} has been removed.` : undefined)
      } else {
        toast.error("Failed to remove", "Please try again.")
      }
    } catch (error) {
      console.error("Error deleting wishlist item:", error)
      toast.error("Failed to remove", "An error occurred. Please try again.")
    }
  }

  const handleEdit = (item: WishlistItem) => {
    setEditingId(item.id)
    setTitle(item.title)
    setAuthor(item.author || "")
    setNotes(item.notes || "")
    setPriority(item.priority)
    setStatus(item.status)
    setShowForm(true)
  }

  const resetForm = () => {
    setTitle("")
    setAuthor("")
    setNotes("")
    setPriority(0)
    setStatus("want_to_read")
    setEditingId(null)
    setShowForm(false)
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.author && item.author.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = filterStatus === "all" || item.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getPriorityColor = (priority: number) => {
    if (priority > 0) return "text-yellow-500"
    if (priority < 0) return "text-muted-foreground"
    return "text-foreground"
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      want_to_read: { label: "Want to Read", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
      reading: { label: "Reading", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
      completed: { label: "Completed", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    }
    const statusInfo = statusMap[status] || statusMap.want_to_read
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto page-transition">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground font-medium">Loading your wishlist...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 page-transition">
      <div className="mb-10 lg:mb-12 fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="inline-block mb-3">
              <span className="text-sm font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 backdrop-blur-sm">
                Your Reading Goals
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">My Wishlist</h1>
            <p className="text-muted-foreground text-lg">
              {items.length === 0 ? (
                "Start building your reading wishlist"
              ) : (
                <>
                  {items.length} {items.length === 1 ? "treasure" : "treasures"} waiting to be explored
                </>
              )}
            </p>
          </div>
          <Button 
            onClick={() => setShowForm(!showForm)} 
            size="lg" 
            className="shrink-0 shadow-soft font-semibold hover:shadow-elevated transition-all interactive-scale"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Book
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search by title or author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="want_to_read">Want to Read</SelectItem>
            <SelectItem value="reading">Reading</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{editingId ? "Edit Book" : "Add to Wishlist"}</CardTitle>
            <CardDescription>
              {editingId ? "Update book details" : "Add a book you want to read"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Title *</label>
                  <Input
                    placeholder="Book title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Author</label>
                  <Input
                    placeholder="Author name"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Notes</label>
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Why do you want to read this? What interests you about it?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <Select
                    value={priority.toString()}
                    onValueChange={(val) => setPriority(parseInt(val))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">Low</SelectItem>
                      <SelectItem value="0">Normal</SelectItem>
                      <SelectItem value="1">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="want_to_read">Want to Read</SelectItem>
                      <SelectItem value="reading">Reading</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving || !title.trim()}>
                  {saving ? "Saving..." : editingId ? "Update" : "Add to Wishlist"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Wishlist Items */}
      {filteredItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500/10 to-pink-500/5 mb-5 pulse-subtle">
              <BookMarked className="h-10 w-10 text-pink-600/60 dark:text-pink-400/60" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {items.length === 0
                ? "Your wishlist is empty"
                : "No books match your search"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {items.length === 0
                ? "Start building your reading wishlist. Add books that spark your curiosity and inspire your learning journey."
                : "Try adjusting your search terms or filters to find what you're looking for."}
            </p>
            {items.length === 0 && (
              <Button 
                onClick={() => setShowForm(true)} 
                size="default" 
                className="font-medium shadow-soft hover:shadow-elevated transition-all"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Book
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 fade-in-delay">
          {filteredItems.map((item, index) => (
            <Card
              key={item.id}
              className="group hover:shadow-elevated transition-[transform,box-shadow] duration-300 border-l-4 interactive-scale hover-lift-smooth"
              style={{
                borderLeftColor:
                  item.priority > 0
                    ? "rgb(234 179 8)"
                    : item.priority < 0
                    ? "rgb(156 163 175)"
                    : "rgb(59 130 246)",
                animationDelay: `${index * 30}ms`,
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2 mb-1">
                      {item.title}
                    </CardTitle>
                    {item.author && (
                      <CardDescription className="text-sm">
                        by {item.author}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {item.priority > 0 && (
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusBadge(item.status)}
                </div>
              </CardHeader>
              {item.notes && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {item.notes}
                  </p>
                </CardContent>
              )}
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(item)}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

