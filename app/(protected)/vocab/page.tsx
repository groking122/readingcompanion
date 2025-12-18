"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, BookOpen, BookMarked, Calendar, FileText, RotateCcw, ExternalLink, Download, Upload } from "lucide-react"

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
        alert('Unsupported file format. Please use JSON or CSV.')
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
          alert("Failed to create book for imported words")
          return
        }
      }

      if (!importBookId) {
        alert("Please select a book or create one first")
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

      alert(`Imported ${imported} words${failed > 0 ? `, ${failed} failed` : ''}`)
      await fetchData()
      
      // Reset file input
      e.target.value = ''
    } catch (error) {
      console.error("Import error:", error)
      alert("Failed to import file. Please check the format.")
    }
  }

  const filteredVocab = Array.isArray(vocab) ? vocab.filter((item) => {
    const matchesSearch =
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.translation.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBook = selectedBookId === "all" || item.bookId === selectedBookId
    return matchesSearch && matchesBook
  }) : []

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
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Vocabulary</h1>
          <p className="text-muted-foreground">
            {vocab.length} {vocab.length === 1 ? "word" : "words"} saved
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={vocab.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('import-file')?.click()}
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

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search terms or translations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedBookId} onValueChange={setSelectedBookId}>
          <SelectTrigger className="w-[200px]">
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
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {vocab.length === 0
                ? "No vocabulary saved yet. Start reading and save words!"
                : "No words match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVocab.map((item) => {
            const book = books.find((b) => b.id === item.bookId)
            const savedDate = new Date(item.createdAt)
            const daysSinceSaved = Math.floor((Date.now() - savedDate.getTime()) / (1000 * 60 * 60 * 24))
            const nextReview = item.flashcard?.dueAt ? new Date(item.flashcard.dueAt) : null
            const isDue = nextReview && nextReview <= new Date()
            
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-1 break-words">{item.term}</CardTitle>
                      <CardDescription className="text-base font-medium text-foreground mt-1">
                        {item.translation}
                      </CardDescription>
                    </div>
                    {isDue && (
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
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
                        {item.pageNumber && (
                          <button
                            onClick={() => navigateToWord(item)}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                          >
                            <span>Page {item.pageNumber}</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                        {item.epubLocation && !item.pageNumber && (
                          <button
                            onClick={() => navigateToWord(item)}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                          >
                            <span>Go to location</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-muted-foreground italic line-clamp-2">
                        "{item.context}"
                      </p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                    {book && (
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">{book.title}</span>
                      </div>
                    )}
                    {item.pageNumber && (
                      <div className="flex items-center gap-1">
                        <span>Page {item.pageNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{daysSinceSaved === 0 ? "Today" : daysSinceSaved === 1 ? "1 day ago" : `${daysSinceSaved} days ago`}</span>
                    </div>
                  </div>

                  {item.flashcard && (
                    <div className="pt-2 border-t space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <RotateCcw className="h-3 w-3" />
                          <span>{item.flashcard.repetitions} {item.flashcard.repetitions === 1 ? 'review' : 'reviews'}</span>
                        </div>
                        {nextReview && (
                          <div className={`flex items-center gap-1 ${isDue ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-muted-foreground'}`}>
                            <span>Next review:</span>
                            <span>{isDue ? 'Due now' : nextReview.toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      {!isDue && nextReview && (
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            const daysUntil = Math.ceil((nextReview.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                            if (daysUntil === 0) return "Due today"
                            if (daysUntil === 1) return "Due tomorrow"
                            if (daysUntil < 7) return `Due in ${daysUntil} days`
                            if (daysUntil < 30) return `Due in ${Math.ceil(daysUntil / 7)} weeks`
                            return `Due in ${Math.ceil(daysUntil / 30)} months`
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

