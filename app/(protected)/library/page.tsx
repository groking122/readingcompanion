"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, BookOpen, Trash2, Heart, MoreVertical } from "lucide-react"
import Link from "next/link"
import { toast } from "@/lib/toast"
import { formatTitleCase } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Footer } from "@/components/footer"

interface Book {
  id: string
  title: string
  createdAt: string
  type: string
  category?: string
  pdfUrl: string | null
  epubUrl: string | null
  content: string | null
}

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<"all" | "book" | "note">("all")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [addingToWishlist, setAddingToWishlist] = useState<string | null>(null)

  useEffect(() => {
    fetchBooks()
  }, [])

  const fetchBooks = async () => {
    try {
      const res = await fetch("/api/books")
      const data = await res.json()
      setBooks(data)
    } catch (error) {
      console.error("Error fetching books:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    try {
      const category = selectedCategory === "note" ? "note" : "book"
      
      if (file) {
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64 = reader.result as string
          const fileExtension = file.name.split(".").pop()?.toLowerCase()
          
          try {
            if (fileExtension === "epub") {
              // Store EPUB file
              const res = await fetch("/api/books", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: title || file.name.replace(/\.epub$/i, ""),
                  type: "epub",
                  category: category,
                  epubUrl: base64,
                }),
              })
              
              if (res.ok) {
                await fetchBooks()
                setShowForm(false)
                setTitle("")
                setFile(null)
                toast.success("Book added!", "Your EPUB has been added to your library.")
              } else {
                toast.error("Failed to add book", "Please try again.")
              }
            } else if (fileExtension === "pdf") {
              // Extract text from PDF and store as text content
              const extractRes = await fetch("/api/books/extract-pdf-text", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pdfData: base64 }),
              })
              
              if (extractRes.ok) {
                const { text } = await extractRes.json()
                
                // Store as text content
                const res = await fetch("/api/books", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: title || file.name.replace(/\.pdf$/i, ""),
                    type: "text",
                    category: category,
                    content: text,
                  }),
                })
                
                if (res.ok) {
                  await fetchBooks()
                  setShowForm(false)
                  setTitle("")
                  setFile(null)
                  toast.success("Book added!", "Your PDF has been converted and added to your library.")
                } else {
                  toast.error("Failed to add book", "Please try again.")
                }
              } else {
                const errorData = await extractRes.json().catch(() => ({}))
                if (errorData.error === "SCANNED_PDF") {
                  toast.error(
                    "Scanned PDF detected",
                    "This PDF appears to be image-based. Please upload a PDF with selectable text, or use an EPUB file instead.",
                    8000
                  )
                } else {
                  toast.error("Failed to extract text", errorData.message || "Please try again.")
                }
              }
            } else {
              toast.error("Unsupported file type", "Please upload EPUB or PDF.")
            }
          } catch (error) {
            console.error("Error processing file:", error)
            alert("Failed to process file. Please try again.")
          }
        }
        reader.readAsDataURL(file)
      } else if (content) {
        const res = await fetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                  title, 
                  content,
                  type: "text",
                  category: category,
                }),
        })
        if (res.ok) {
          await fetchBooks()
          setShowForm(false)
          setTitle("")
          setContent("")
          toast.success("Book created!", "Your book has been added to your library.")
        } else {
          toast.error("Failed to create book", "Please try again.")
        }
      }
    } catch (error) {
      console.error("Error creating book:", error)
    } finally {
      setUploading(false)
    }
  }

  const handleAddToWishlist = async (book: Book) => {
    setAddingToWishlist(book.id)
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: book.title,
          author: null,
          notes: `Added from library`,
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

  const handleDelete = async (bookId: string) => {
    if (!confirm("Are you sure you want to delete this book? This will also delete all associated vocabulary.")) {
      return
    }

    setDeleting(bookId)
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        await fetchBooks()
        toast.success("Book deleted", "The book and its associated vocabulary have been removed.")
      } else {
        const data = await res.json()
        toast.error("Failed to delete book", data.error || "Please try again.")
      }
    } catch (error) {
      console.error("Error deleting book:", error)
      toast.error("Failed to delete book", "An error occurred. Please try again.")
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto page-transition">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground font-medium">Loading your library...</p>
        </div>
      </div>
    )
  }

  const filteredBooks = selectedCategory === "all" 
    ? books 
    : books.filter(book => book.category === selectedCategory)

  return (
    <div className="max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-4rem-8rem)]">
      {/* Header */}
      <div className="mb-10 lg:mb-12 fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="inline-block mb-4">
              <span className="text-sm font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 backdrop-blur-sm">
                Your Collection
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight font-serif">My Library</h1>
            <p className="text-lg text-muted-foreground mb-1">
              {filteredBooks.length === 0 ? (
                "Start building your collection"
              ) : (
                <>
                  {filteredBooks.length} {filteredBooks.length === 1 ? "treasure" : "treasures"} waiting to be explored
                </>
              )}
            </p>
            <p className="text-sm text-muted-foreground/70 italic">
              Your reading companion for learning English
            </p>
          </div>
          <Button 
            onClick={() => setShowForm(!showForm)} 
            size="lg" 
            className="shadow-soft font-semibold hover:shadow-elevated transition-all interactive-scale"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {selectedCategory === "note" ? "Note" : "Book"}
          </Button>
        </div>
      </div>

      {/* Sidebar + Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-8 space-y-4">
            <div className="bento-card p-4">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Filters</h3>
              <div className="space-y-2">
                <Button
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("all")}
                  className={`w-full justify-start ${selectedCategory === "all" ? "shadow-soft font-semibold" : "font-medium"}`}
                >
                  All ({books.length})
                </Button>
                <Button
                  variant={selectedCategory === "book" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("book")}
                  className={`w-full justify-start ${selectedCategory === "book" ? "shadow-soft font-semibold" : "font-medium"}`}
                >
                  Books ({books.filter(b => b.category === "book" || !b.category).length})
                </Button>
                <Button
                  variant={selectedCategory === "note" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("note")}
                  className={`w-full justify-start ${selectedCategory === "note" ? "shadow-soft font-semibold" : "font-medium"}`}
                >
                  Notes ({books.filter(b => b.category === "note").length})
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="lg:col-span-3">

      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add New {selectedCategory === "note" ? "Note" : "Book"}</CardTitle>
            <CardDescription>
              {selectedCategory === "note" 
                ? "Create a note or important information" 
                : "Upload a PDF or paste text content"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={selectedCategory === "book" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("book")}
                >
                  Book
                </Button>
                <Button
                  type="button"
                  variant={selectedCategory === "note" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("note")}
                >
                  Note
                </Button>
              </div>
              <Input
                placeholder={selectedCategory === "note" ? "Note title" : "Book title"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              {selectedCategory === "book" ? (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Upload EPUB or PDF
                    </label>
                    <Input
                      type="file"
                      accept=".epub,.pdf"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0]
                        if (selectedFile) {
                          setFile(selectedFile)
                          setContent("")
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      EPUB recommended for best reading experience. PDF will be converted to text.
                    </p>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">OR</div>
                </>
              ) : null}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {selectedCategory === "note" ? "Note Content" : "Paste Text Content"}
                </label>
                <textarea
                  className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value)
                    setFile(null)
                  }}
                  placeholder={selectedCategory === "note" 
                    ? "Write your note or important information here..." 
                    : "Paste your book content here..."}
                  required={selectedCategory === "note"}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={uploading}>
                  {uploading ? "Creating..." : "Create Book"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setTitle("")
                    setContent("")
                    setFile(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {filteredBooks.length === 0 ? (
        <Card className="border border-border/50">
          <CardContent className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--c-light)] mb-5 pulse-subtle">
              <BookOpen className="h-10 w-10 text-[var(--c-soft)]" />
            </div>
            <h3 className="text-xl font-semibold mb-2 font-serif">
              {books.length === 0 
                ? `Your ${selectedCategory === "note" ? "notes" : "library"} is empty`
                : `No ${selectedCategory === "note" ? "notes" : "books"} in this category`}
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {books.length === 0 
                ? `Every great reading journey begins with a single ${selectedCategory === "note" ? "note" : "book"}. Add your first one to start learning.`
                : `Try switching to a different category or add a new ${selectedCategory === "note" ? "note" : "book"}.`}
            </p>
            {books.length === 0 && (
              <p className="text-sm text-muted-foreground/70 mb-6 max-w-md mx-auto italic">
                Your reading companion for learning English
              </p>
            )}
            <Button 
              onClick={() => setShowForm(true)} 
              size="default" 
              className="font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First {selectedCategory === "note" ? "Note" : "Book"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 fade-in-delay">
          {filteredBooks.map((book, index) => (
            <Card 
              key={book.id} 
              className="group hover:shadow-elevated transition-[transform,box-shadow] duration-300 border-border/50 hover:border-border interactive-scale hover-lift-smooth bento-card flex flex-col"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader className="pb-4 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-md bg-[var(--c-light)] flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-[var(--c-soft)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="line-clamp-2 text-base font-semibold group-hover:text-primary transition-colors duration-300 mb-1">
                        {formatTitleCase(book.title)}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {book.category === "note" ? "Note" : "Book"}
                      </p>
                    </div>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="p-1.5 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-1" align="end">
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(book.id)
                        }}
                      >
                        Remove
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 pb-5 flex-1 flex flex-col justify-end">
                <Link href={`/reader/${book.id}`}>
                  <Button className="w-full font-medium">
                    Open {book.category === "note" ? "Note" : "Book"}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddToWishlist(book)}
                  disabled={addingToWishlist === book.id}
                  data-book-id={book.id}
                  className="w-full transition-all hover:bg-accent/50"
                >
                  <Heart className="h-3.5 w-3.5 mr-1.5" />
                  {addingToWishlist === book.id ? "Adding..." : "Wishlist"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </div>
      </div>
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  )
}

