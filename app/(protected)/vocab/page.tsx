"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "@/lib/toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, BookOpen, BookMarked, Calendar, FileText, RotateCcw, ExternalLink, Download, Upload, List, Grid, CheckSquare, Square, Trash2 } from "lucide-react"
import { formatTitleCase } from "@/lib/utils"
import { Footer } from "@/components/footer"

interface Flashcard {
  id: string
  easeFactor: number
  interval: number
  repetitions: number
  dueAt: string
  lastReviewedAt: string | null
}

interface Vocabulary {
  id: string
  term: string
  translation: string
  context: string
  bookId: string
  pageNumber: number | null
  position: number | null
  epubLocation: string | null
  createdAt: string
  flashcard: Flashcard | null
}

interface Book {
  id: string
  title: string
}

export default function VocabPage() {
  const router = useRouter()
  const [vocab, setVocab] = useState<Vocabulary[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBookId, setSelectedBookId] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const navigateToWord = (item: Vocabulary) => {
    // Navigate to reader with location/page and search term
    const url = `/reader/${item.bookId}`
    const params = new URLSearchParams()
    
    if (item.epubLocation) {
      // For EPUB, use CFI location
      params.set("location", item.epubLocation)
    } else if (item.pageNumber) {
      // For PDF/text, use page number
      params.set("page", item.pageNumber.toString())
    }
    
    // Add search term (the word itself - use first word if multiple)
    if (item.term) {
      // Extract first word for better search results
      const searchWord = item.term.split(/\s+/)[0].trim()
      params.set("search", searchWord)
    }
    
    // Open in new tab
    const fullUrl = `${url}?${params.toString()}`
    console.log("Navigating to:", fullUrl)
    window.open(fullUrl, "_blank")
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [vocabRes, booksRes] = await Promise.all([
        fetch("/api/vocabulary"),
        fetch("/api/books"),
      ])
      
      // Check if responses are ok
      if (!vocabRes.ok) {
        const errorData = await vocabRes.json().catch(() => ({}))
        console.error("Error fetching vocabulary:", errorData.error || vocabRes.statusText)
        setVocab([])
      } else {
        const vocabData = await vocabRes.json()
        // Ensure vocabData is an array
        setVocab(Array.isArray(vocabData) ? vocabData : [])
      }
      
      if (!booksRes.ok) {
        const errorData = await booksRes.json().catch(() => ({}))
        console.error("Error fetching books:", errorData.error || booksRes.statusText)
        setBooks([])
      } else {
        const booksData = await booksRes.json()
        // Ensure booksData is an array
        setBooks(Array.isArray(booksData) ? booksData : [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setVocab([])
      setBooks([])
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const exportData = filteredVocab.map(item => ({
      term: item.term,
      translation: item.translation,
      context: item.context,
      bookTitle: books.find(b => b.id === item.bookId)?.title || "Unknown",
      pageNumber: item.pageNumber,
      createdAt: item.createdAt,
    }))
    
    const jsonStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vocabulary-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Export complete!", `Exported ${exportData.length} words to JSON file.`)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      let importData: any[]
      
      if (file.name.endsWith('.json')) {
        importData = JSON.parse(text)
      } else if (file.name.endsWith('.csv')) {
        // Simple CSV parser
        const lines = text.split('\n')
        const headers = lines[0].split(',').map(h => h.trim())
        importData = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.trim())
            const obj: any = {}
            headers.forEach((header, i) => {
              obj[header] = values[i] || ''
            })
            return obj
          })
      } else {
        toast.error("Unsupported file format", "Please use JSON or CSV files.")
        return
      }

      // Find or create a book for imported words
      let importBookId = selectedBookId !== "all" ? selectedBookId : null
      
      if (!importBookId && importData.length > 0) {
        // Create a book for imported words
        const bookTitle = `Imported Vocabulary - ${new Date().toLocaleDateString()}`
        const createBookRes = await fetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: bookTitle,
            type: "text",
            content: "",
          }),
        })
        
        if (createBookRes.ok) {
          const newBook = await createBookRes.json()
          importBookId = newBook.id
        } else {
          toast.error("Failed to create book", "Could not create a book for imported words.")
          return
        }
      }

      if (!importBookId) {
        toast.error("No book selected", "Please select a book or create one first.")
        return
      }

      // Import words
      let imported = 0
      let failed = 0
      
      for (const item of importData) {
        try {
          const res = await fetch("/api/vocabulary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              term: item.term || item.word || item.original,
              translation: item.translation || item.meaning || item.greek,
              context: item.context || item.term || item.word || "",
              bookId: importBookId,
              pageNumber: item.pageNumber ? parseInt(item.pageNumber) : null,
            }),
          })
          
          if (res.ok) {
            imported++
          } else {
            failed++
          }
        } catch (error) {
          failed++
        }
      }

      if (imported > 0) {
        toast.success(
          `Imported ${imported} words`,
          failed > 0 ? `${failed} words failed to import.` : undefined
        )
      } else {
        toast.error("Import failed", "No words were imported. Please check your file format.")
      }
      await fetchData()
      
      // Reset file input
      e.target.value = ''
    } catch (error) {
      console.error("Import error:", error)
      toast.error("Import failed", "Failed to import file. Please check the format.")
    }
  }

  // Helper function to normalize terms for deduplication
  const normalizeTerm = (term: string): string => {
    return term.toLowerCase().trim().replace(/[^\w]/g, "")
  }

  // Deduplicate vocabulary by normalized term (keep the most recent one)
  const deduplicatedVocab = Array.isArray(vocab) ? vocab.reduce((acc: Vocabulary[], item) => {
    const normalized = normalizeTerm(item.term)
    const existingIndex = acc.findIndex(existing => normalizeTerm(existing.term) === normalized)
    
    if (existingIndex === -1) {
      // New word, add it
      acc.push(item)
    } else {
      // Duplicate found - keep the most recent one (based on createdAt)
      const existing = acc[existingIndex]
      const existingDate = new Date(existing.createdAt).getTime()
      const newDate = new Date(item.createdAt).getTime()
      
      if (newDate > existingDate) {
        // Replace with newer entry
        acc[existingIndex] = item
      }
    }
    
    return acc
  }, []) : []

  const filteredVocab = deduplicatedVocab.filter((item) => {
    const matchesSearch =
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.translation.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBook = selectedBookId === "all" || item.bookId === selectedBookId
    return matchesSearch && matchesBook
  })

  const getBookTitle = (bookId: string) => {
    return books.find((b) => b.id === bookId)?.title || "Unknown Book"
  }

  const formatEpubLocation = (cfi: string): string => {
    if (!cfi) return ""
    
    // Extract meaningful parts from CFI
    // CFI format: epubcfi(/6/8!/4/106/...)
    // Try to extract chapter/section numbers
    const match = cfi.match(/epubcfi\((\/[\d!]+)+\)/)
    if (match) {
      const parts = match[1].split('/').filter(p => p && !p.includes('!'))
      if (parts.length > 0) {
        // Use first few numbers as chapter/section indicator
        const chapterNum = parseInt(parts[0]) || 0
        if (chapterNum > 0) {
          return `Ch. ${chapterNum}`
        }
      }
    }
    
    // Fallback: show shortened CFI
    if (cfi.length > 30) {
      return `CFI: ${cfi.substring(0, 30)}...`
    }
    return `CFI: ${cfi}`
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto page-transition flex flex-col min-h-[calc(100vh-4rem-8rem)]">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground font-medium">Loading your vocabulary...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto page-transition flex flex-col min-h-[calc(100vh-4rem-8rem)]">
      <div className="mb-8 fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="inline-block mb-3">
              <span className="text-sm font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 backdrop-blur-sm">
                Your Words
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight font-serif">My Vocabulary</h1>
            <p className="text-muted-foreground text-lg mb-1">
              {deduplicatedVocab.length === 0 ? (
                "Start building your vocabulary"
              ) : (
                <>
                  {deduplicatedVocab.length} {deduplicatedVocab.length === 1 ? "word" : "words"} saved
                  {filteredVocab.length !== deduplicatedVocab.length && (
                    <span className="ml-2 text-sm">
                      ({filteredVocab.length} {filteredVocab.length === 1 ? "shown" : "shown"})
                    </span>
                  )}
                </>
              )}
            </p>
            <p className="text-sm text-muted-foreground/70 italic">
              Your reading companion for learning English
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={vocab.length === 0}
              className="transition-all hover:bg-accent/50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('import-file')?.click()}
              className="transition-all hover:bg-accent/50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <input
              id="import-file"
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search terms or translations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 text-base rounded-2xl border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:shadow-glow transition-all"
            />
          </div>
        </div>
        <Select value={selectedBookId} onValueChange={setSelectedBookId}>
          <SelectTrigger className="w-[200px] h-14 rounded-2xl">
            <SelectValue placeholder="Filter by book" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Books</SelectItem>
            {books.map((book) => (
              <SelectItem key={book.id} value={book.id}>
                {book.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredVocab.length === 0 ? (
        <Card className="border border-border/50">
          <CardContent className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 mb-5 pulse-subtle">
              <BookMarked className="h-10 w-10 text-purple-600/60 dark:text-purple-400/60" />
            </div>
            <h3 className="text-xl font-semibold mb-2 font-serif">
              {vocab.length === 0
                ? "Your vocabulary collection is empty"
                : "No words match your search"}
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {vocab.length === 0
                ? "As you read, save words that catch your attention. Each one is a step toward fluency."
                : "Try adjusting your search terms or filters to find what you're looking for."}
            </p>
            {vocab.length === 0 && (
              <p className="text-sm text-muted-foreground/70 mb-6 max-w-md mx-auto italic">
                Your reading companion for learning English
              </p>
            )}
            {vocab.length === 0 ? (
              <Link href="/library">
                <Button size="default" className="font-medium shadow-soft hover:shadow-elevated transition-all bg-white text-black hover:bg-white/90">
                  Start Reading
                </Button>
              </Link>
            ) : (
              <Button 
                variant="outline" 
                size="default" 
                className="font-medium"
                onClick={() => {
                  setSearchTerm("")
                  setSelectedBookId("all")
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 fade-in-delay">
          {filteredVocab.map((item, index) => {
            const book = books.find((b) => b.id === item.bookId)
            const savedDate = new Date(item.createdAt)
            const daysSinceSaved = Math.floor((Date.now() - savedDate.getTime()) / (1000 * 60 * 60 * 24))
            const nextReview = item.flashcard?.dueAt ? new Date(item.flashcard.dueAt) : null
            const isDue = nextReview && nextReview <= new Date()
            
            return (
              <Card 
                key={item.id} 
                className="group hover:shadow-elevated transition-[transform,box-shadow] duration-300 border-border/50 hover:border-border interactive-scale hover-lift-smooth bento-card"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-1.5 break-words group-hover:text-primary transition-colors duration-300 font-semibold">
                        {formatTitleCase(item.term)}
                      </CardTitle>
                      <CardDescription className="text-base font-medium text-foreground/90 mt-1.5">
                        {item.translation}
                      </CardDescription>
                    </div>
                    {isDue && (
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-[var(--c-spark)]/50 bg-[var(--c-spark)]/10 text-[var(--c-spark)] animate-pulse">
                          Due
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {item.context && item.context !== item.term && (
                    <div className="text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span className="text-xs font-medium">Context</span>
                        </div>
                        {(item.pageNumber || item.epubLocation) && (
                          <button
                            onClick={() => navigateToWord(item)}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                          >
                            {item.pageNumber ? (
                              <>
                                <span>Page {item.pageNumber}</span>
                                <ExternalLink className="h-3 w-3" />
                              </>
                            ) : (
                              <>
                                <span>Go to location</span>
                                <ExternalLink className="h-3 w-3" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-muted-foreground italic line-clamp-1">
                        "{formatTitleCase(item.context)}"
                      </p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    {book && (
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">{formatTitleCase(book.title)}</span>
                      </div>
                    )}
                    {item.pageNumber && (
                      <span>• Page {item.pageNumber}</span>
                    )}
                    <span>• {daysSinceSaved === 0 ? "Today" : daysSinceSaved === 1 ? "1 day ago" : `${daysSinceSaved} days ago`}</span>
                    {item.flashcard && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <RotateCcw className="h-3 w-3" />
                          <span>{item.flashcard.repetitions} {item.flashcard.repetitions === 1 ? 'review' : 'reviews'}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {item.flashcard && isDue && (
                    <div className="pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => window.location.href = '/review'}
                      >
                        Review Now
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  )
}

