"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Heart, Sparkles, BookMarked, RotateCcw, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"

interface Book {
  id: string
  title: string
  createdAt: string
  type: string
}

interface Bookmark {
  id: string
  bookId: string
  title: string | null
  epubLocation: string | null
  pageNumber: number | null
  position: number | null
  progressPercentage?: number | null
  updatedAt: string
}

interface WishlistItem {
  id: string
  title: string
  author: string | null
  status: string
}

interface VocabularyItem {
  id: string
  term: string
  translation: string
  context?: string
  bookId: string
}

interface Flashcard {
  flashcard: {
    id: string
    dueAt: string
  }
  vocabulary: VocabularyItem
}

export default function HomePage() {
  const { user } = useUser()
  const [currentBook, setCurrentBook] = useState<Book | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItem[]>([])
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [bookProgress, setBookProgress] = useState<{ [bookId: string]: number }>({})
  const [loading, setLoading] = useState(true)
  
  // Get user's first name for greeting
  const userName = user?.firstName || user?.username || "there"
  
  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 18) return "Good Afternoon"
    return "Good Evening"
  }
  
  // Expanded states for each widget
  const [expanded, setExpanded] = useState({
    book: false,
    wishlist: false,
    vocabulary: false,
    review: false,
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch all data in parallel
      const [booksRes, wishlistRes, vocabRes, flashcardsRes] = await Promise.all([
        fetch("/api/books"),
        fetch("/api/wishlist"),
        fetch("/api/vocabulary"),
        fetch("/api/flashcards?due=true"),
      ])

      if (booksRes.ok) {
        const booksData = await booksRes.json()
        const booksArray = Array.isArray(booksData) ? booksData : []
        setBooks(booksArray)
        const latestBook = booksArray.length > 0 ? booksArray[booksArray.length - 1] : null
        setCurrentBook(latestBook)
        
        // Fetch bookmarks for progress calculation
        if (latestBook) {
          try {
            const bookmarksRes = await fetch(`/api/bookmarks?bookId=${latestBook.id}`)
            if (bookmarksRes.ok) {
              const bookmarks: Bookmark[] = await bookmarksRes.json()
              // Look for the auto-saved "last read" bookmark first
              const lastReadBookmark = bookmarks.find(b => b.title === "__LAST_READ__")
              
              if (lastReadBookmark) {
                // Use saved progress percentage if available, otherwise calculate
                const progress = lastReadBookmark.progressPercentage !== null && lastReadBookmark.progressPercentage !== undefined
                  ? Math.round(lastReadBookmark.progressPercentage)
                  : calculateProgress(lastReadBookmark, latestBook.type)
                setBookProgress({ [latestBook.id]: progress })
              } else if (bookmarks.length > 0) {
                // Fallback to most recent bookmark
                const latestBookmark = bookmarks[0]
                const progress = calculateProgress(latestBookmark, latestBook.type)
                setBookProgress({ [latestBook.id]: progress })
              } else {
                setBookProgress({ [latestBook.id]: 0 })
              }
            }
          } catch (error) {
            console.error("Error fetching bookmarks:", error)
            setBookProgress({ [latestBook.id]: 0 })
          }
        }
      }

      if (wishlistRes.ok) {
        const wishlist = await wishlistRes.json()
        setWishlistItems(Array.isArray(wishlist) ? wishlist.slice(0, 5) : [])
      }

      if (vocabRes.ok) {
        const vocab = await vocabRes.json()
        setVocabularyItems(Array.isArray(vocab) ? vocab.slice(0, 5) : [])
      }

      if (flashcardsRes.ok) {
        const cards = await flashcardsRes.json()
        // API returns array of { flashcard, vocabulary } objects
        setFlashcards(Array.isArray(cards) ? cards.slice(0, 5) : [])
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (section: keyof typeof expanded) => {
    setExpanded((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Calculate progress from bookmark
  const calculateProgress = (bookmark: Bookmark, bookType: string): number => {
    if (!bookmark) return 0
    
    // For EPUB books, estimate progress from epubLocation
    if (bookType === "epub" && bookmark.epubLocation) {
      const cfi = bookmark.epubLocation
      const segments = cfi.split('/').length
      // More segments = further in book (rough estimate)
      const estimatedProgress = Math.min(80, Math.max(10, segments * 5))
      return estimatedProgress
    }
    
    // For PDF books, use pageNumber if available
    if (bookType === "pdf" && bookmark.pageNumber) {
      return bookmark.pageNumber > 50 ? Math.min(80, (bookmark.pageNumber / 100) * 100) : 20
    }
    
    // For text books, use position if available
    if (bookType === "text" && bookmark.position) {
      return bookmark.position > 1000 ? Math.min(80, (bookmark.position / 5000) * 100) : 20
    }
    
    // If bookmark exists but no specific location data, assume minimal progress
    return 10
  }

  // Get progress for current book
  const getCurrentBookProgress = (): number => {
    if (!currentBook) return 0
    return bookProgress[currentBook.id] || 0
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto page-transition">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground font-medium">Loading your reading journey...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto page-transition">
      {/* Header Section - Personal Greeting */}
      <div className="relative mb-8 lg:mb-12">
        {/* Subtle mesh gradient from top-right */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber/10 via-violet/5 to-transparent rounded-full blur-3xl pointer-events-none opacity-50" />
        
        {/* Greeting Content - Aligned with Current Book card */}
        <div className="relative z-10">
          <h1 className="text-[2.75rem] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[5.5rem] font-serif font-bold mb-2 md:mb-3 tracking-tight">
            {getGreeting()}, {userName}.
          </h1>
          {currentBook ? (
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground font-sans">
              Time to dive back into the flow.
            </p>
          ) : (
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground font-sans">
              Ready to start your next reading journey?
            </p>
          )}
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 md:gap-6 mb-6 md:mb-8 items-stretch">
        {/* Current Book Hero Card - 60% width */}
        <div className="lg:col-span-6 flex">
          {currentBook ? (
            <div className="bento-card glass-card p-6 md:p-8 relative group w-full">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                {/* Book Cover Placeholder */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-32 md:w-32 md:h-40 rounded-lg bg-gradient-to-br from-amber/20 to-violet/20 flex items-center justify-center shadow-lg">
                    <BookOpen className="h-12 w-12 md:h-16 md:w-16 text-amber/60" />
                  </div>
                </div>
                
                {/* Book Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold mb-2 line-clamp-2">{currentBook.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 md:mb-4">Author Name</p>
                  
                  {/* Progress Bar */}
                  <div className="mb-4 md:mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">Progress</span>
                      <span className="text-[10px] sm:text-xs font-medium text-foreground">
                        {getCurrentBookProgress()}%
                      </span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div className="glow-progress" style={{ width: `${getCurrentBookProgress()}%` }}></div>
                    </div>
                  </div>
                  
                  {/* Resume Button */}
                  <Link href={`/reader/${currentBook.id}`}>
                    <Button className="w-full sm:w-auto px-6 md:px-8 py-4 md:py-6 rounded-full text-sm md:text-base font-semibold bg-gradient-to-r from-amber to-violet hover:from-amber/90 hover:to-violet/90 transition-all shadow-lg hover:shadow-xl">
                      Resume Reading
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bento-card glass-card p-8 md:p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber/20 to-violet/20 mb-5">
                <BookOpen className="h-10 w-10 text-amber/60" />
              </div>
              <p className="text-xl font-serif font-semibold mb-2">Your library awaits</p>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Every great reading journey begins with a single book.
              </p>
              <Link href="/library">
                <Button className="font-medium">Add Your First Book</Button>
              </Link>
            </div>
          )}
        </div>
        
        {/* Stats Bento Cards - 40% width (3 cards stacked to match Hero height) */}
        <div className="lg:col-span-4 flex flex-col gap-2 md:gap-4 h-full">
          {/* Books Stat */}
          <div className="bento-card p-4 md:p-6 flex flex-col items-center justify-center text-center group hover:scale-105 transition-transform duration-300 flex-1">
            <div className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2 text-foreground">{books.length || 0}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground font-medium">Books</div>
          </div>
          
          {/* Words Stat */}
          <div className="bento-card p-4 md:p-6 flex flex-col items-center justify-center text-center group hover:scale-105 transition-transform duration-300 relative overflow-hidden flex-1">
            <div className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2 text-foreground">{vocabularyItems.length || 0}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground font-medium">Words</div>
            {/* Animated graph line on hover */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-violet/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <svg className="w-full h-full" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0,8 Q25,2 50,5 T100,3" stroke="currentColor" strokeWidth="1" fill="none" className="text-violet" />
              </svg>
            </div>
          </div>
          
          {/* Due Stat */}
          <div className="bento-card p-4 md:p-6 flex flex-col items-center justify-center text-center group hover:scale-105 transition-transform duration-300 flex-1">
            <div className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2 text-foreground">{flashcards.length || 0}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground font-medium">Due</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 items-stretch">

        {/* Wishlist Widget - Book Spines */}
        <div className="bento-card p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-pink-500/20 p-2">
              <Heart className="h-5 w-5 text-pink-500" />
            </div>
            <h3 className="text-lg font-serif font-semibold">Wishlist</h3>
          </div>
          {wishlistItems.length > 0 ? (
            <>
              <div className="flex gap-2 items-end h-32 overflow-x-auto pb-2 flex-1">
                {wishlistItems.slice(0, 5).map((item, index) => (
                  <div
                    key={item.id}
                    className="flex-shrink-0 book-spine group cursor-pointer"
                    style={{
                      width: '24px',
                      height: `${80 + index * 8}px`,
                      background: `linear-gradient(135deg, hsl(${240 + index * 20}, 70%, ${50 + index * 5}%), hsl(${260 + index * 20}, 60%, ${45 + index * 5}%))`,
                      borderRadius: '2px 2px 0 0',
                      boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.3)',
                      transition: 'all 0.3s ease',
                      transform: 'translateY(0)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)'
                      e.currentTarget.style.zIndex = '10'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)'
                      e.currentTarget.style.zIndex = '1'
                    }}
                  >
                    <div className="absolute bottom-0 left-0 right-0 p-1 text-[8px] font-bold text-white/80 rotate-90 origin-left whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.title}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border/50">
                <Link href="/wishlist">
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    View All →
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <div className="w-24 h-32 rounded-lg bg-gradient-to-br from-amber/20 to-violet/20 flex items-center justify-center mb-4 shadow-lg">
                <BookOpen className="h-12 w-12 text-amber/60" />
              </div>
              <p className="font-serif font-semibold mb-1">Thinking, Fast and Slow</p>
              <p className="text-xs text-muted-foreground mb-4">By Daniel Kahneman</p>
              <Link href="/wishlist">
                <Button size="sm" className="font-medium">
                  Add to List
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Recent Words Widget - Flashcard Strip */}
        <div className="bento-card p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet/20 p-2">
                <BookMarked className="h-5 w-5 text-violet" />
              </div>
              <h3 className="text-lg font-serif font-semibold">Recent Words</h3>
            </div>
            {vocabularyItems.length > 0 && (
              <Link href="/review">
                <Button variant="ghost" size="sm" className="text-xs">
                  Review →
                </Button>
              </Link>
            )}
          </div>
          {vocabularyItems.length > 0 ? (
            <>
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4">
                {vocabularyItems.slice(0, 12).map((item) => (
                  <div
                    key={item.id}
                    className="recent-word-card group cursor-pointer hover:shadow-soft"
                  >
                    <p className="font-bold text-sm text-foreground mb-1 line-clamp-1">{item.term}</p>
                    <p className="text-xs text-muted-foreground italic line-clamp-1">
                      {item.translation}
                    </p>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-border/50">
                <Link href="/vocab">
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    View All Vocabulary →
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">No words saved yet</p>
              <Link href="/library">
                <Button variant="outline" size="sm" className="font-medium">
                  Start Reading
                </Button>
              </Link>
            </div>
          )}
        </div>

      </div>

      {/* Quick Actions */}
      <div className="mt-8 md:mt-12 lg:mt-16">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-serif font-bold tracking-tight">Quick Actions</h2>
          <p className="text-xs md:text-sm text-muted-foreground hidden md:block">Navigate with ease</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          <Link href="/library" className="group">
            <div className="bento-card p-4 md:p-6 text-center hover:scale-105 transition-transform duration-300 cursor-pointer relative">
              <div className="icon-container icon-premium bg-primary/10 text-primary mx-auto mb-3 md:mb-4 group-hover:bg-primary/20 group-hover:-translate-y-0.5 group-hover:icon-glow transition-all duration-300 relative">
                <BookOpen className="h-5 w-5 md:h-6 md:w-6 stroke-[2.5px] icon-gradient-primary" />
              </div>
              <p className="text-xs md:text-sm font-semibold">Library</p>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Your books</p>
            </div>
          </Link>
          <Link href="/suggested" className="group">
            <div className="bento-card p-4 md:p-6 text-center hover:scale-105 transition-transform duration-300 cursor-pointer relative">
              <div className="icon-container icon-premium bg-blue-500/10 text-blue-500 mx-auto mb-3 md:mb-4 group-hover:bg-blue-500/20 group-hover:-translate-y-0.5 group-hover:icon-glow transition-all duration-300 relative">
                <Sparkles className="h-5 w-5 md:h-6 md:w-6 stroke-[2.5px] icon-gradient-blue" />
              </div>
              <p className="text-xs md:text-sm font-semibold">Suggested</p>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Discover</p>
            </div>
          </Link>
          <Link href="/vocab" className="group">
            <div className="bento-card p-4 md:p-6 text-center hover:scale-105 transition-transform duration-300 cursor-pointer relative">
              <div className="icon-container icon-premium bg-violet/10 text-violet mx-auto mb-3 md:mb-4 group-hover:bg-violet/20 group-hover:-translate-y-0.5 group-hover:icon-glow transition-all duration-300 relative">
                <BookMarked className="h-5 w-5 md:h-6 md:w-6 stroke-[2.5px] icon-gradient-violet" />
              </div>
              <p className="text-xs md:text-sm font-semibold">Vocabulary</p>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Your words</p>
            </div>
          </Link>
          <Link href="/review" className="group">
            <div className="bento-card p-4 md:p-6 text-center hover:scale-105 transition-transform duration-300 cursor-pointer relative">
              <div className="icon-container icon-premium bg-orange-500/10 text-orange-500 mx-auto mb-3 md:mb-4 group-hover:bg-orange-500/20 group-hover:-translate-y-0.5 group-hover:icon-glow transition-all duration-300 relative">
                <RotateCcw className="h-5 w-5 md:h-6 md:w-6 stroke-[2.5px] icon-gradient-orange" />
              </div>
              <p className="text-xs md:text-sm font-semibold">Review</p>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Practice</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 md:mt-20 lg:mt-24 py-6 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div>© 2026 Lexis Inc.</div>
            <div className="flex items-center gap-4">
              <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
              <span>•</span>
              <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
              <span>•</span>
              <Link href="#" className="hover:text-foreground transition-colors">Support</Link>
            </div>
            <div>Made with ♥ for readers</div>
          </div>
        </div>
      </footer>
    </div>
  )
}

