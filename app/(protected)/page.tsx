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
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="mb-12 lg:mb-16">
        <div className="inline-block mb-3">
          <span className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Welcome Back
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
          Your Reading Dashboard
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
          Track your progress, review vocabulary, and discover new books—all in one place.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-4 border border-primary/10">
          <div className="text-2xl md:text-3xl font-bold mb-1">{books.length || 0}</div>
          <div className="text-xs md:text-sm text-muted-foreground font-medium">Books</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-500/10 p-4 border border-blue-500/10">
          <div className="text-2xl md:text-3xl font-bold mb-1">{wishlistItems.length || 0}</div>
          <div className="text-xs md:text-sm text-muted-foreground font-medium">Wishlist</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-purple-500/5 to-purple-500/10 p-4 border border-purple-500/10">
          <div className="text-2xl md:text-3xl font-bold mb-1">{vocabularyItems.length || 0}</div>
          <div className="text-xs md:text-sm text-muted-foreground font-medium">Words</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-orange-500/5 to-orange-500/10 p-4 border border-orange-500/10">
          <div className="text-2xl md:text-3xl font-bold mb-1">{flashcards.length || 0}</div>
          <div className="text-xs md:text-sm text-muted-foreground font-medium">Due</div>
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
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
                  <BookOpen className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <p className="text-base font-medium mb-2">No books yet</p>
                <p className="text-sm text-muted-foreground mb-6">Start building your library</p>
                <Link href="/library">
                  <Button variant="outline" size="default" className="font-medium">
                    Browse Library
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
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-pink-500/10 mb-4">
                  <Heart className="h-8 w-8 text-pink-600/60 dark:text-pink-400/60" />
                </div>
                <p className="text-base font-medium mb-2">No wishlist items</p>
                <p className="text-sm text-muted-foreground mb-6">Start adding books you want to read</p>
                <Link href="/wishlist">
                  <Button variant="outline" size="default" className="font-medium">
                    Add Books
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
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 mb-4">
                  <BookMarked className="h-8 w-8 text-purple-600/60 dark:text-purple-400/60" />
                </div>
                <p className="text-base font-medium mb-2">No vocabulary yet</p>
                <p className="text-sm text-muted-foreground mb-6">Start reading to save words</p>
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
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 mb-4">
                  <RotateCcw className="h-8 w-8 text-orange-600/60 dark:text-orange-400/60" />
                </div>
                <p className="text-base font-medium mb-2">No reviews due</p>
                <p className="text-sm text-muted-foreground mb-6">All caught up! Add more words to review</p>
                <Link href="/vocab">
                  <Button variant="outline" size="default" className="font-medium">
                    Add Words
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-12 lg:mt-16">
        <h2 className="text-2xl font-bold mb-6 tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
          <Link href="/library">
            <Card className="group relative overflow-hidden border-0 shadow-soft hover:shadow-elevated hover-lift cursor-pointer bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-6 text-center">
                <div className="rounded-xl bg-primary/20 p-3 w-fit mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-soft">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-semibold">Library</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/suggested">
            <Card className="group relative overflow-hidden border-0 shadow-soft hover:shadow-elevated hover-lift cursor-pointer bg-gradient-to-br from-blue-500/5 to-blue-500/10">
              <CardContent className="p-6 text-center">
                <div className="rounded-xl bg-blue-500/20 p-3 w-fit mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-soft">
                  <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-semibold">Suggested</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/vocab">
            <Card className="group relative overflow-hidden border-0 shadow-soft hover:shadow-elevated hover-lift cursor-pointer bg-gradient-to-br from-purple-500/5 to-purple-500/10">
              <CardContent className="p-6 text-center">
                <div className="rounded-xl bg-purple-500/20 p-3 w-fit mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-soft">
                  <BookMarked className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-sm font-semibold">Vocabulary</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/review">
            <Card className="group relative overflow-hidden border-0 shadow-soft hover:shadow-elevated hover-lift cursor-pointer bg-gradient-to-br from-orange-500/5 to-orange-500/10">
              <CardContent className="p-6 text-center">
                <div className="rounded-xl bg-orange-500/20 p-3 w-fit mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-soft">
                  <RotateCcw className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <p className="text-sm font-semibold">Review</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}

