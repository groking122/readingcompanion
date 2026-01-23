"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Heart, Sparkles, BookMarked, RotateCcw, ChevronDown, ChevronUp, ExternalLink, Plus } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { formatTitleCase } from "@/lib/utils"
import { Footer } from "@/components/footer"

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
  notes?: string | null
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

  // Tooltip state for wishlist book spines
  const [tooltip, setTooltip] = useState<{
    top: number
    left: number
    visible: boolean
    itemId: string | null
    title: string
    author: string | null
    arrowPosition: number // Horizontal position for arrow to align with book spine
    arrowDirection: 'up' | 'down' // Direction arrow should point
  }>({
    top: 0,
    left: 0,
    visible: false,
    itemId: null,
    title: '',
    author: null,
    arrowPosition: 0,
    arrowDirection: 'down',
  })
  
  const spineRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Handle scroll and resize for tooltip positioning
  useEffect(() => {
    if (!tooltip.visible || !tooltip.itemId) return

    const updateTooltipPosition = () => {
      const itemId = tooltip.itemId
      if (!itemId) return
      const spineElement = spineRefs.current[itemId]
      if (!spineElement) return

      const rect = spineElement.getBoundingClientRect()
      const tooltipHeight = 40
      const tooltipWidth = 200
      const spacing = 8
      const viewportPadding = 10

      // Calculate spine center for arrow alignment
      const spineCenterX = rect.left + rect.width / 2

      // Try to position above first
      let top = rect.top - tooltipHeight - spacing
      let left = spineCenterX - tooltipWidth / 2
      let arrowDirection: 'up' | 'down' = 'down'

      // If not enough space above, position below
      if (top < viewportPadding) {
        top = rect.bottom + spacing
        arrowDirection = 'up'
      }

      // Keep tooltip within viewport horizontally
      if (left < viewportPadding) {
        left = viewportPadding
      } else if (left + tooltipWidth > window.innerWidth - viewportPadding) {
        left = window.innerWidth - tooltipWidth - viewportPadding
      }

      // Calculate arrow position relative to tooltip (spine center - tooltip left)
      const arrowPosition = spineCenterX - left

      setTooltip(prev => ({ ...prev, top, left, arrowPosition, arrowDirection }))
    }

    updateTooltipPosition()
    window.addEventListener('scroll', updateTooltipPosition, true)
    window.addEventListener('resize', updateTooltipPosition)

    return () => {
      window.removeEventListener('scroll', updateTooltipPosition, true)
      window.removeEventListener('resize', updateTooltipPosition)
    }
  }, [tooltip.visible, tooltip.itemId])

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
    <div className="max-w-7xl mx-auto page-transition" style={{ overflow: 'visible' }}>
      {/* Header Section - Personal Greeting */}
      <div className="relative mb-8 lg:mb-12">
        {/* Subtle mesh gradient from top-right - removed, using solid colors */}
        
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
        <div className="lg:col-span-6 flex h-full">
          {currentBook ? (
            <div className="bento-card glass-card p-6 md:p-8 relative group w-full h-full">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                {/* Book Cover Placeholder */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-32 md:w-32 md:h-40 rounded-lg bg-[var(--c-light)] flex items-center justify-center">
                    <BookOpen className="h-12 w-12 md:h-16 md:w-16 text-[var(--c-soft)]" />
                  </div>
                </div>
                
                {/* Book Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold mb-2 line-clamp-2">{formatTitleCase(currentBook.title)}</h3>
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
                    <Button className="w-full sm:w-auto px-6 md:px-8 py-4 md:py-6 rounded-full text-sm md:text-base font-semibold">
                      Resume Reading
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bento-card glass-card p-8 md:p-12 text-center w-full h-full flex flex-col justify-between">
              <div className="flex-1 flex flex-col justify-center">
                {/* Icon above the title */}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-[var(--c-light)] mb-5 mx-auto group hover:scale-105 transition-transform duration-300">
                  <BookOpen className="h-10 w-10 text-[var(--c-soft)] group-hover:text-[var(--c-spark)] transition-colors duration-300" />
                </div>
                <p className="text-xl font-serif font-semibold mb-2">Your library awaits</p>
                <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                  Every great reading journey begins with a single book.
                </p>
                
                {/* Info Box - Only shown when no books */}
                <div className="mb-6 p-4 rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm max-w-lg mx-auto hover:border-border/70 transition-colors duration-300">
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">Your reading companion for learning English.</span>{" "}
                    The smart way to learn English through reading. Instant Greek translations, vocabulary tracking, and adaptive flashcards help you learn naturally.
                  </p>
                </div>
              </div>
              
              <div>
                <Link href="/library">
                  <Button className="font-medium shadow-soft hover:shadow-elevated transition-all">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Book
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
        
        {/* Stats Bento Cards - 40% width (3 cards stacked to match Hero height) */}
        <div className="lg:col-span-4 flex flex-col gap-2 md:gap-4 h-full items-stretch">
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
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--c-spark)]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 items-stretch" style={{ overflow: 'visible' }}>

        {/* Wishlist Widget - Book Spines */}
        <div className="relative" style={{ overflow: 'visible', zIndex: 1 }}>
          <div className="bento-card p-6 flex flex-col h-full" style={{ overflow: 'visible' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[var(--c-light)] p-2 group hover:scale-105 transition-transform duration-300">
                  <Heart className="h-5 w-5 text-[var(--c-soft)] group-hover:text-[var(--c-spark)] transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-serif font-semibold">Wishlist</h3>
              </div>
              {wishlistItems.length > 0 && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {wishlistItems.length}
                </span>
              )}
            </div>
            {wishlistItems.length > 0 ? (
              <>
                <div className="flex gap-3 items-end min-h-[140px] overflow-x-auto pb-2 flex-1 scrollbar-hide">
                {wishlistItems.slice(0, 5).map((item, index) => {
                  const colors = [
                    { from: '240 70% 60%', to: '270 70% 65%' },
                    { from: '260 70% 58%', to: '280 70% 63%' },
                    { from: '280 70% 56%', to: '290 70% 61%' },
                    { from: '300 70% 54%', to: '310 70% 59%' },
                    { from: '320 70% 52%', to: '330 70% 57%' },
                  ]
                  const color = colors[index % colors.length]
                  
                  return (
                    <div
                      key={item.id}
                      ref={(el) => {
                        spineRefs.current[item.id] = el
                      }}
                      className="flex-shrink-0 relative group"
                      style={{ zIndex: 1 }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.zIndex = '50'
                        const rect = e.currentTarget.getBoundingClientRect()
                        const tooltipHeight = 40
                        const tooltipWidth = 200
                        const spacing = 8
                        const viewportPadding = 10

                        // Calculate spine center for arrow alignment
                        const spineCenterX = rect.left + rect.width / 2

                        // Try to position above first
                        let top = rect.top - tooltipHeight - spacing
                        let left = spineCenterX - tooltipWidth / 2
                        let arrowDirection: 'up' | 'down' = 'down'

                        // If not enough space above, position below
                        if (top < viewportPadding) {
                          top = rect.bottom + spacing
                          arrowDirection = 'up'
                        }

                        // Keep tooltip within viewport horizontally
                        if (left < viewportPadding) {
                          left = viewportPadding
                        } else if (left + tooltipWidth > window.innerWidth - viewportPadding) {
                          left = window.innerWidth - tooltipWidth - viewportPadding
                        }

                        // Calculate arrow position relative to tooltip (spine center - tooltip left)
                        const arrowPosition = spineCenterX - left

                        setTooltip({
                          top,
                          left,
                          visible: true,
                          itemId: item.id,
                          title: item.title,
                          author: item.author,
                          arrowPosition,
                          arrowDirection,
                        })
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.zIndex = '1'
                        setTooltip(prev => ({ ...prev, visible: false, itemId: null }))
                      }}
                    >
                      <Link
                        href="/wishlist"
                        className="book-spine cursor-pointer relative block"
                        style={{
                          width: '28px',
                          height: `${90 + index * 10}px`,
                          background: `linear-gradient(135deg, hsl(${color.from}), hsl(${color.to}))`,
                          borderRadius: '4px 4px 0 0',
                          boxShadow: 'inset -3px 0 6px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: 'translateY(0)',
                        }}
                        onMouseEnter={(e) => {
                          const parent = e.currentTarget.parentElement
                          if (parent) {
                            parent.style.zIndex = '50'
                          }
                          e.currentTarget.style.transform = 'translateY(-6px) scale(1.08)'
                          e.currentTarget.style.boxShadow = 'inset -3px 0 6px rgba(0,0,0,0.2), 0 8px 16px rgba(0,0,0,0.2)'
                        }}
                        onMouseLeave={(e) => {
                          const parent = e.currentTarget.parentElement
                          if (parent) {
                            parent.style.zIndex = '1'
                          }
                          e.currentTarget.style.transform = 'translateY(0) scale(1)'
                          e.currentTarget.style.boxShadow = 'inset -3px 0 6px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="w-1 h-8 bg-white/30 rounded-full"></div>
                        </div>
                      </Link>
                    </div>
                  )
                })}
              </div>
              {/* Fixed position tooltip */}
              {tooltip.visible && tooltip.itemId && (
                <div
                  className="fixed pointer-events-none z-[99999] transition-opacity duration-150"
                  style={{
                    top: `${tooltip.top}px`,
                    left: `${tooltip.left}px`,
                    opacity: tooltip.visible ? 1 : 0,
                  }}
                >
                  <div className="px-2.5 py-1.5 bg-foreground/95 text-background rounded-md shadow-xl text-xs font-medium whitespace-nowrap backdrop-blur-sm border border-background/20">
                    {formatTitleCase(tooltip.title)}
                    {tooltip.author && tooltip.author !== "Unknown" && (
                      <span className="text-background/70 ml-1">• {tooltip.author}</span>
                    )}
                  </div>
                  {/* Dynamic arrow pointing to book spine */}
                  <div 
                    className={`absolute ${tooltip.arrowDirection === 'down' ? 'top-full -mt-0.5' : 'bottom-full -mb-0.5'}`}
                    style={{
                      left: `${tooltip.arrowPosition}px`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div className={`w-1.5 h-1.5 bg-foreground/95 transform rotate-45 border-r border-b border-background/20 ${tooltip.arrowDirection === 'up' ? 'border-t border-l' : ''}`}></div>
                  </div>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-border/50">
                <Link href="/wishlist">
                  <Button variant="ghost" size="sm" className="w-full text-xs hover:bg-accent/50">
                    View All {wishlistItems.length > 5 && `(${wishlistItems.length})`} →
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <div className="w-20 h-20 rounded-xl bg-[var(--c-light)] flex items-center justify-center mb-4 group hover:scale-105 transition-transform duration-300">
                <Heart className="h-10 w-10 text-[var(--c-soft)] group-hover:text-[var(--c-spark)] transition-colors duration-300" />
              </div>
              <p className="font-serif font-semibold mb-2">Your wishlist is empty</p>
              <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                Start building your reading wishlist. Add books that spark your curiosity.
              </p>
              <Link href="/wishlist">
                <Button size="sm" className="font-medium shadow-soft hover:shadow-elevated transition-all">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Your First Book
                </Button>
              </Link>
            </div>
          )}
          </div>
        </div>

        {/* Recent Words Widget - Flashcard Strip */}
        <div className="bento-card p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[var(--c-light)] p-2 group hover:scale-105 transition-transform duration-300">
                <BookMarked className="h-5 w-5 text-[var(--c-soft)] group-hover:text-[var(--c-spark)] transition-colors duration-300" />
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
                    <p className="font-bold text-sm text-foreground mb-1 line-clamp-1">{formatTitleCase(item.term)}</p>
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
              <div className="icon-container icon-premium bg-[var(--c-light)] text-[var(--c-ink)] [data-theme='jet-black']:text-[var(--c-strong)] mx-auto mb-3 md:mb-4 group-hover:bg-[var(--c-soft)]/20 group-hover:-translate-y-0.5 transition-all duration-300 relative">
                <BookOpen className="h-5 w-5 md:h-6 md:w-6 stroke-[2.5px]" />
              </div>
              <p className="text-xs md:text-sm font-semibold">Library</p>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Your books</p>
            </div>
          </Link>
          <Link href="/suggested" className="group">
            <div className="bento-card p-4 md:p-6 text-center hover:scale-105 transition-transform duration-300 cursor-pointer relative">
              <div className="icon-container icon-premium bg-[var(--c-light)] text-[var(--c-ink)] [data-theme='jet-black']:text-[var(--c-strong)] mx-auto mb-3 md:mb-4 group-hover:bg-[var(--c-soft)]/20 group-hover:-translate-y-0.5 transition-all duration-300 relative">
                <Sparkles className="h-5 w-5 md:h-6 md:w-6 stroke-[2.5px]" />
              </div>
              <p className="text-xs md:text-sm font-semibold">Suggested</p>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Discover</p>
            </div>
          </Link>
          <Link href="/vocab" className="group">
            <div className="bento-card p-4 md:p-6 text-center hover:scale-105 transition-transform duration-300 cursor-pointer relative">
              <div className="icon-container icon-premium bg-[var(--c-light)] text-[var(--c-ink)] [data-theme='jet-black']:text-[var(--c-strong)] mx-auto mb-3 md:mb-4 group-hover:bg-[var(--c-soft)]/20 group-hover:-translate-y-0.5 transition-all duration-300 relative">
                <BookMarked className="h-5 w-5 md:h-6 md:w-6 stroke-[2.5px]" />
              </div>
              <p className="text-xs md:text-sm font-semibold">Vocabulary</p>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Your words</p>
            </div>
          </Link>
          <Link href="/review" className="group">
            <div className="bento-card p-4 md:p-6 text-center hover:scale-105 transition-transform duration-300 cursor-pointer relative">
              <div className="icon-container icon-premium bg-[var(--c-light)] text-[var(--c-ink)] [data-theme='jet-black']:text-[var(--c-strong)] mx-auto mb-3 md:mb-4 group-hover:bg-[var(--c-soft)]/20 group-hover:-translate-y-0.5 transition-all duration-300 relative">
                <RotateCcw className="h-5 w-5 md:h-6 md:w-6 stroke-[2.5px]" />
              </div>
              <p className="text-xs md:text-sm font-semibold">Review</p>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Practice</p>
            </div>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}

