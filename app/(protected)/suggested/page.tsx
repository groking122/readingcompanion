"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Heart, BookOpen, Sparkles, Check } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/lib/toast"

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
        toast.success("Added to wishlist!", `${book.title} has been added to your wishlist.`)
      } else {
        const data = await res.json()
        toast.error("Failed to add to wishlist", data.error || "Please try again.")
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
      toast.warning("EPUB not available", "This book is not available as an EPUB file. It might be a PDF or in a folder structure.")
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
        toast.success("Book added!", `${book.title} has been added to your library.`)
      } else {
        const data = await res.json()
        if (res.status === 409) {
          toast.info("Already in library", "This book is already in your library!")
        } else {
          toast.error("Failed to add book", data.error || "The EPUB file might not be available.")
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
    return (
      <div className="max-w-7xl mx-auto page-transition">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground font-medium">Discovering great books for you...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 page-transition">
      <div className="mb-10 lg:mb-12 fade-in">
        <div className="inline-block mb-4">
          <span className="text-sm font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 backdrop-blur-sm">
            Discover
          </span>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-3 shadow-soft">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Suggested Books</h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Curated collection of books to explore. Each one is a gateway to new knowledge and insights. Add them to your wishlist to read later!
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
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 mb-5 pulse-subtle">
              <BookOpen className="h-10 w-10 text-blue-600/60 dark:text-blue-400/60" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm || selectedCategory !== "all"
                ? "No books match your search"
                : "No books available"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchTerm || selectedCategory !== "all"
                ? "Try adjusting your search terms or filters to discover new books."
                : "Check back soon for new book recommendations."}
            </p>
            {(searchTerm || selectedCategory !== "all") && (
              <Button 
                variant="outline" 
                size="default" 
                className="font-medium"
                onClick={() => {
                  setSearchTerm("")
                  setSelectedCategory("all")
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6 text-sm text-muted-foreground fade-in-delay">
            Showing {books.length} {books.length === 1 ? "treasure" : "treasures"} waiting to be discovered
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 fade-in-delay">
            {books.map((book, index) => {
              const bookKey = `${book.title}-${book.author}`
              return (
                <Card
                  key={`${book.title}-${index}`}
                  className="group hover:shadow-elevated transition-all duration-300 border-l-4 interactive-scale hover-lift-smooth"
                  style={{
                    borderLeftColor: getCategoryColor(book.category),
                    animationDelay: `${index * 30}ms`,
                  }}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-2 mb-1.5 group-hover:text-primary transition-colors font-semibold">
                          {book.title}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          by {book.author}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="mt-3">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium inline-block"
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
                        className="w-full font-medium shadow-soft hover:shadow-elevated transition-all"
                        onClick={() => handleAddToLibrary(book)}
                        disabled={addingToLibrary === bookKey}
                        data-book-key={bookKey}
                        data-action="library"
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        {addingToLibrary === bookKey ? "Adding EPUB..." : "Add EPUB to Library"}
                      </Button>
                    ) : (
                      <div className="text-xs text-muted-foreground text-center py-2 px-3 rounded-md bg-muted/30">
                        EPUB not directly available
                      </div>
                    )}
                    <Button
                      className="w-full font-medium transition-all hover:bg-accent/50"
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

