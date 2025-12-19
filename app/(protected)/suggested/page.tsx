"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Heart, BookOpen, Sparkles, Check } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SuggestedBook {
  title: string
  author: string
  category: string
  githubUrl?: string
}

export default function SuggestedBooksPage() {
  const [books, setBooks] = useState<SuggestedBook[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [addingToWishlist, setAddingToWishlist] = useState<string | null>(null)
  const [addingToLibrary, setAddingToLibrary] = useState<string | null>(null)

  const categories = ["all", "Productivity", "Self-Improvement", "Psychology", "Communication", "Spirituality", "Health", "Business", "Career", "Relationships", "Philosophy", "Practical", "Motivation", "Parenting", "Education", "Sports Psychology", "Pets"]

  useEffect(() => {
    fetchBooks()
  }, [])

  const fetchBooks = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set("search", searchTerm)
      if (selectedCategory !== "all") params.set("category", selectedCategory)

      const res = await fetch(`/api/suggested-books?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setBooks(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Error fetching suggested books:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchBooks()
    }, 300) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedCategory])

  const handleAddToWishlist = async (book: SuggestedBook) => {
    const bookKey = `${book.title}-${book.author}`
    setAddingToWishlist(bookKey)
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          notes: `Suggested book - ${book.category}`,
          priority: 0,
          status: "want_to_read",
        }),
      })
      if (res.ok) {
        // Show success feedback
        const button = document.querySelector(`[data-book-key="${bookKey}"][data-action="wishlist"]`)
        if (button) {
          const originalHTML = button.innerHTML
          button.innerHTML = '<svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg> Added!'
          button.classList.add("bg-green-500", "hover:bg-green-600")
          setTimeout(() => {
            button.innerHTML = originalHTML
            button.classList.remove("bg-green-500", "hover:bg-green-600")
          }, 2000)
        }
      } else {
        const data = await res.json()
        alert(data.error || "Failed to add to wishlist")
      }
    } catch (error) {
      console.error("Error adding to wishlist:", error)
      alert("Failed to add to wishlist")
    } finally {
      setAddingToWishlist(null)
    }
  }

  const handleAddToLibrary = async (book: SuggestedBook) => {
    if (!book.githubUrl) {
      alert("This book is not available as an EPUB file. It might be a PDF or in a folder structure.")
      return
    }

    const bookKey = `${book.title}-${book.author}`
    setAddingToLibrary(bookKey)
    try {
      // Use the faster default books API instead of downloading from GitHub
      const res = await fetch("/api/books/add-from-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          category: book.category,
        }),
      })
      
      if (res.ok) {
        const data = await res.json()
        // Show success feedback
        const button = document.querySelector(`[data-book-key="${bookKey}"][data-action="library"]`)
        if (button) {
          const originalHTML = button.innerHTML
          button.innerHTML = '<svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg> Added!'
          button.classList.add("bg-green-500", "hover:bg-green-600")
          setTimeout(() => {
            button.innerHTML = originalHTML
            button.classList.remove("bg-green-500", "hover:bg-green-600")
          }, 2000)
        }
      } else {
        const data = await res.json()
        if (res.status === 409) {
          alert("This book is already in your library!")
        } else {
          alert(data.error || "Failed to add book to library. The EPUB file might not be available or the book might be in a folder.")
        }
      }
    } catch (error) {
      console.error("Error adding to library:", error)
      alert("Failed to add book to library")
    } finally {
      setAddingToLibrary(null)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading suggested books...</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6">
      <div className="mb-8 md:mb-12">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Suggested Books</h1>
        </div>
        <p className="text-muted-foreground text-base md:text-lg ml-[3.5rem]">
          Curated collection of books to explore. Add them to your wishlist to read later!
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, author, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat === "all" ? "All Categories" : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Books Grid */}
      {books.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchTerm || selectedCategory !== "all"
                ? "No books match your search. Try different keywords or categories."
                : "No books available."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 text-sm text-muted-foreground">
            Showing {books.length} {books.length === 1 ? "book" : "books"}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book, index) => {
              const bookKey = `${book.title}-${book.author}`
              return (
                <Card
                  key={`${book.title}-${index}`}
                  className="hover:shadow-lg transition-all duration-200 border-l-4"
                  style={{
                    borderLeftColor: getCategoryColor(book.category),
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2 mb-1">
                          {book.title}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          by {book.author}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${getCategoryColor(book.category)}20`,
                          color: getCategoryColor(book.category),
                        }}
                      >
                        {book.category}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {book.githubUrl && book.githubUrl.endsWith('.epub') ? (
                      <Button
                        className="w-full"
                        onClick={() => handleAddToLibrary(book)}
                        disabled={addingToLibrary === bookKey}
                        data-book-key={bookKey}
                        data-action="library"
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        {addingToLibrary === bookKey ? "Adding EPUB..." : "Add EPUB to Library"}
                      </Button>
                    ) : (
                      <div className="text-xs text-muted-foreground text-center py-2">
                        EPUB not directly available
                      </div>
                    )}
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => handleAddToWishlist(book)}
                      disabled={addingToWishlist === bookKey}
                      data-book-key={bookKey}
                      data-action="wishlist"
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      {addingToWishlist === bookKey ? "Adding..." : "Add to Wishlist"}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    Productivity: "rgb(59 130 246)", // blue
    "Self-Improvement": "rgb(168 85 247)", // purple
    Psychology: "rgb(236 72 153)", // pink
    Communication: "rgb(234 179 8)", // yellow
    Spirituality: "rgb(34 197 94)", // green
    Health: "rgb(239 68 68)", // red
    Business: "rgb(249 115 22)", // orange
    Career: "rgb(14 165 233)", // sky blue
    Relationships: "rgb(219 39 119)", // rose
    Philosophy: "rgb(139 92 246)", // violet
    Practical: "rgb(107 114 128)", // gray
    Motivation: "rgb(251 146 60)", // amber
    Parenting: "rgb(20 184 166)", // teal
    Education: "rgb(99 102 241)", // indigo
    "Sports Psychology": "rgb(6 182 212)", // cyan
    Pets: "rgb(147 197 253)", // light blue
  }
  return colorMap[category] || "rgb(59 130 246)"
}

