"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Heart, Sparkles, BookMarked, RotateCcw, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import Link from "next/link"

interface Book {
  id: string
  title: string
  createdAt: string
  type: string
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
  const [currentBook, setCurrentBook] = useState<Book | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItem[]>([])
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  
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
        setCurrentBook(booksArray.length > 0 ? booksArray[booksArray.length - 1] : null)
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
      {/* Hero Section */}
      <div className="mb-12 lg:mb-16 fade-in">
        <div className="inline-block mb-4">
          <span className="text-sm font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 backdrop-blur-sm">
            Welcome Back
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
          Your Reading Journey
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
          Every word you learn brings you closer to fluency. Track your progress, review vocabulary, and discover new stories—all in one thoughtfully designed space.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 fade-in-delay">
        <div className="group rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-5 border border-primary/10 hover:border-primary/20 transition-all duration-300 hover:shadow-soft interactive-scale">
          <div className="text-2xl md:text-3xl font-bold mb-1.5 text-foreground">{books.length || 0}</div>
          <div className="text-xs md:text-sm text-muted-foreground font-medium">Books</div>
          <div className="mt-2 h-1 bg-primary/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.min((books.length / 10) * 100, 100)}%` }}></div>
          </div>
        </div>
        <div className="group rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-500/10 p-5 border border-blue-500/10 hover:border-blue-500/20 transition-all duration-300 hover:shadow-soft interactive-scale">
          <div className="text-2xl md:text-3xl font-bold mb-1.5 text-foreground">{wishlistItems.length || 0}</div>
          <div className="text-xs md:text-sm text-muted-foreground font-medium">Wishlist</div>
          <div className="mt-2 h-1 bg-blue-500/20 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${Math.min((wishlistItems.length / 20) * 100, 100)}%` }}></div>
          </div>
        </div>
        <div className="group rounded-xl bg-gradient-to-br from-purple-500/5 to-purple-500/10 p-5 border border-purple-500/10 hover:border-purple-500/20 transition-all duration-300 hover:shadow-soft interactive-scale">
          <div className="text-2xl md:text-3xl font-bold mb-1.5 text-foreground">{vocabularyItems.length || 0}</div>
          <div className="text-xs md:text-sm text-muted-foreground font-medium">Words</div>
          <div className="mt-2 h-1 bg-purple-500/20 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${Math.min((vocabularyItems.length / 100) * 100, 100)}%` }}></div>
          </div>
        </div>
        <div className="group rounded-xl bg-gradient-to-br from-orange-500/5 to-orange-500/10 p-5 border border-orange-500/10 hover:border-orange-500/20 transition-all duration-300 hover:shadow-soft interactive-scale">
          <div className="text-2xl md:text-3xl font-bold mb-1.5 text-foreground">{flashcards.length || 0}</div>
          <div className="text-xs md:text-sm text-muted-foreground font-medium">Due</div>
          <div className="mt-2 h-1 bg-orange-500/20 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${flashcards.length > 0 ? '100%' : '0%'}` }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* Current Book Widget */}
        <Card className="group relative overflow-hidden border-0 shadow-elevated hover:shadow-elevated hover-lift bg-gradient-to-br from-card to-card/95">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="pb-5 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-2.5 shadow-soft">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl font-bold">Current Book</CardTitle>
              </div>
              {currentBook && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded("book")}
                  className="h-9 w-9 p-0 rounded-lg hover:bg-primary/10"
                >
                  {expanded.book ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            {currentBook ? (
              <>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg line-clamp-2 leading-tight">{currentBook.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                    <span>
                      {new Date(currentBook.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                </div>
                {expanded.book && (
                  <div className="mt-6 pt-5 border-t border-border/50">
                    <Link href={`/reader/${currentBook.id}`}>
                      <Button className="w-full font-semibold shadow-soft" size="default">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Continue Reading
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 mb-5 pulse-subtle">
                  <BookOpen className="h-10 w-10 text-primary/60" />
                </div>
                <p className="text-lg font-semibold mb-2">Your library awaits</p>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  Every great reading journey begins with a single book. Add your first one to get started.
                </p>
                <Link href="/library">
                  <Button size="default" className="font-medium shadow-soft hover:shadow-elevated transition-all">
                    Add Your First Book
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wishlist Widget */}
        <Card className="group relative overflow-hidden border-0 shadow-elevated hover:shadow-elevated hover-lift bg-gradient-to-br from-card to-card/95">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="pb-5 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-500/10 p-2.5 shadow-soft">
                  <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                </div>
                <CardTitle className="text-xl font-bold">Wishlist</CardTitle>
              </div>
              {wishlistItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded("wishlist")}
                  className="h-9 w-9 p-0 rounded-lg hover:bg-pink-500/10"
                >
                  {expanded.wishlist ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            {wishlistItems.length > 0 ? (
              <>
                <div className="space-y-3">
                  {wishlistItems.slice(0, expanded.wishlist ? 10 : 3).map((item) => (
                    <div key={item.id} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
                      <p className="font-semibold text-sm line-clamp-1 leading-snug">{item.title}</p>
                      {item.author && (
                        <p className="text-xs text-muted-foreground mt-1">{item.author}</p>
                      )}
                    </div>
                  ))}
                </div>
                {expanded.wishlist && (
                  <div className="mt-6 pt-5 border-t border-border/50">
                    <Link href="/wishlist">
                      <Button variant="outline" className="w-full font-medium" size="default">
                        View All
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500/10 to-pink-500/5 mb-5 pulse-subtle">
                  <Heart className="h-10 w-10 text-pink-600/60 dark:text-pink-400/60" />
                </div>
                <p className="text-lg font-semibold mb-2">Build your reading wishlist</p>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  Save books you're curious about. Your future self will thank you.
                </p>
                <Link href="/wishlist">
                  <Button variant="outline" size="default" className="font-medium">
                    Explore Books
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vocabulary Widget */}
        <Card className="hover:shadow-lg transition-all duration-200 border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-primary/10 p-2">
                  <BookMarked className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg font-semibold">Recent Words</CardTitle>
              </div>
              {vocabularyItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded("vocabulary")}
                  className="h-8 w-8 p-0"
                >
                  {expanded.vocabulary ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {vocabularyItems.length > 0 ? (
              <>
                <div className="space-y-3">
                  {vocabularyItems.slice(0, expanded.vocabulary ? 10 : 3).map((item) => (
                    <div key={item.id} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{item.term}</span>
                        <span className="text-muted-foreground/60">→</span>
                        <span className="text-sm text-muted-foreground">{item.translation}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {expanded.vocabulary && (
                  <div className="mt-6 pt-5 border-t border-border/50">
                    <Link href="/vocab">
                      <Button variant="outline" className="w-full font-medium" size="default">
                        View All Vocabulary
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 mb-5 pulse-subtle">
                  <BookMarked className="h-10 w-10 text-purple-600/60 dark:text-purple-400/60" />
                </div>
                <p className="text-lg font-semibold mb-2">Your vocabulary journey begins</p>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  As you read, save words that catch your attention. Each one is a step toward fluency.
                </p>
                <Link href="/library">
                  <Button variant="outline" size="default" className="font-medium">
                    Start Reading
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Widget */}
        <Card className="group relative overflow-hidden border-0 shadow-elevated hover:shadow-elevated hover-lift bg-gradient-to-br from-card to-card/95">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="pb-5 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/10 p-2.5 shadow-soft">
                  <RotateCcw className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-xl font-bold">Review</CardTitle>
              </div>
              {flashcards.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded("review")}
                  className="h-9 w-9 p-0 rounded-lg hover:bg-orange-500/10"
                >
                  {expanded.review ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            {flashcards.length > 0 ? (
              <>
                <div className="space-y-3">
                  {flashcards.slice(0, expanded.review ? 10 : 3).map((card) => (
                    <div key={card.flashcard.id} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
                      <p className="font-semibold text-sm leading-snug mb-1">{card.vocabulary.term}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(card.flashcard.dueAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  ))}
                </div>
                {expanded.review && (
                  <div className="mt-6 pt-5 border-t border-border/50">
                    <Link href="/review">
                      <Button className="w-full font-semibold shadow-soft" size="default">
                        Start Review Session
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 mb-5">
                  <RotateCcw className="h-10 w-10 text-orange-600/60 dark:text-orange-400/60" />
                </div>
                <p className="text-lg font-semibold mb-2">All caught up!</p>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  You're doing great. Keep reading and adding words to continue your learning journey.
                </p>
                <Link href="/vocab">
                  <Button variant="outline" size="default" className="font-medium">
                    View Vocabulary
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-12 lg:mt-16 fade-in-delay">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Quick Actions</h2>
          <p className="text-sm text-muted-foreground hidden md:block">Navigate with ease</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
          <Link href="/library" className="group">
            <Card className="relative overflow-hidden border-0 shadow-soft hover:shadow-elevated hover-lift cursor-pointer bg-gradient-to-br from-primary/5 to-primary/10 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-6 text-center relative">
                <div className="rounded-xl bg-primary/20 p-3.5 w-fit mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-soft">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-semibold">Library</p>
                <p className="text-xs text-muted-foreground mt-1">Your books</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/suggested" className="group">
            <Card className="relative overflow-hidden border-0 shadow-soft hover:shadow-elevated hover-lift cursor-pointer bg-gradient-to-br from-blue-500/5 to-blue-500/10 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-6 text-center relative">
                <div className="rounded-xl bg-blue-500/20 p-3.5 w-fit mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-soft">
                  <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-semibold">Suggested</p>
                <p className="text-xs text-muted-foreground mt-1">Discover</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/vocab" className="group">
            <Card className="relative overflow-hidden border-0 shadow-soft hover:shadow-elevated hover-lift cursor-pointer bg-gradient-to-br from-purple-500/5 to-purple-500/10 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-6 text-center relative">
                <div className="rounded-xl bg-purple-500/20 p-3.5 w-fit mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-soft">
                  <BookMarked className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-sm font-semibold">Vocabulary</p>
                <p className="text-xs text-muted-foreground mt-1">Your words</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/review" className="group">
            <Card className="relative overflow-hidden border-0 shadow-soft hover:shadow-elevated hover-lift cursor-pointer bg-gradient-to-br from-orange-500/5 to-orange-500/10 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-6 text-center relative">
                <div className="rounded-xl bg-orange-500/20 p-3.5 w-fit mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-soft">
                  <RotateCcw className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <p className="text-sm font-semibold">Review</p>
                <p className="text-xs text-muted-foreground mt-1">Practice</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}

