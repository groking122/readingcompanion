"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, BookOpen, Trash2, Heart } from "lucide-react"
import Link from "next/link"

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
                }
              } else {
                const errorData = await extractRes.json().catch(() => ({}))
                if (errorData.error === "SCANNED_PDF") {
                  alert(
                    "This PDF appears to be scanned (image-based) and doesn't contain selectable text.\n\n" +
                    "OCR (Optical Character Recognition) would be needed to extract text from it.\n\n" +
                    "Please upload a PDF with selectable text, or use an EPUB file instead."
                  )
                } else {
                  alert(errorData.message || "Failed to extract text from PDF. Please try again.")
                }
              }
            } else {
              alert("Unsupported file type. Please upload EPUB or PDF.")
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
        // Show success feedback
        const button = document.querySelector(`[data-book-id="${book.id}"]`)
        if (button) {
          const originalText = button.textContent
          button.textContent = "Added!"
          setTimeout(() => {
            button.textContent = originalText
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
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete book")
      }
    } catch (error) {
      console.error("Error deleting book:", error)
      alert("Failed to delete book")
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  const filteredBooks = selectedCategory === "all" 
    ? books 
    : books.filter(book => book.category === selectedCategory)

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10 lg:mb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="inline-block mb-3">
              <span className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                Your Collection
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight">My Library</h1>
            <p className="text-lg text-muted-foreground">
              {filteredBooks.length} {filteredBooks.length === 1 ? "item" : "items"} in your collection
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="lg" className="shadow-soft font-semibold">
            <Plus className="h-4 w-4 mr-2" />
            Add {selectedCategory === "note" ? "Note" : "Book"}
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          size="default"
          onClick={() => setSelectedCategory("all")}
          className={selectedCategory === "all" ? "shadow-soft font-semibold" : "font-medium"}
        >
          All ({books.length})
        </Button>
        <Button
          variant={selectedCategory === "book" ? "default" : "outline"}
          size="default"
          onClick={() => setSelectedCategory("book")}
          className={selectedCategory === "book" ? "shadow-soft font-semibold" : "font-medium"}
        >
          Books ({books.filter(b => b.category === "book" || !b.category).length})
        </Button>
        <Button
          variant={selectedCategory === "note" ? "default" : "outline"}
          size="default"
          onClick={() => setSelectedCategory("note")}
          className={selectedCategory === "note" ? "shadow-soft font-semibold" : "font-medium"}
        >
          Notes ({books.filter(b => b.category === "note").length})
        </Button>
      </div>

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
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {books.length === 0 
                ? `No ${selectedCategory === "note" ? "notes" : "books"} yet. Add your first ${selectedCategory === "note" ? "note" : "book"} to get started!`
                : `No ${selectedCategory === "note" ? "notes" : "books"} in this category.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBooks.map((book) => (
            <Card key={book.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="line-clamp-2">{book.title}</CardTitle>
                <CardDescription>
                  {new Date(book.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/reader/${book.id}`}>
                  <Button className="w-full">Open Book</Button>
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddToWishlist(book)}
                    disabled={addingToWishlist === book.id}
                    data-book-id={book.id}
                  >
                    <Heart className="h-3 w-3 mr-1" />
                    {addingToWishlist === book.id ? "Adding..." : "Wishlist"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(book.id)}
                    disabled={deleting === book.id}
                  >
                    <Trash2 className="h-3 w-3" />
                    {deleting === book.id ? "..." : ""}
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

