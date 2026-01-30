# Reading Companion - Complete Website Documentation

## Table of Contents
1. [Overview](#overview)
2. [Application Architecture](#application-architecture)
3. [Page-by-Page Breakdown](#page-by-page-breakdown)
4. [Core Features](#core-features)
5. [User Journey](#user-journey)
6. [Data Models](#data-models)
7. [API Structure](#api-structure)
8. [Theme System](#theme-system)
9. [UI/UX Patterns](#uiux-patterns)
10. [System Architecture Diagrams](#system-architecture-diagrams)

---

## Overview

**Reading Companion** is a comprehensive vocabulary learning platform designed to help users learn new words while reading books. The application combines reading, vocabulary management, and spaced repetition flashcards into a unified learning experience.

### Core Purpose
- **Learn vocabulary** through contextual reading
- **Track progress** across multiple books
- **Review efficiently** using spaced repetition (SM-2 algorithm)
- **Organize reading** with library, wishlist, and suggested books

### Key Technologies
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: Clerk
- **Database**: Neon Postgres (via Drizzle ORM)
- **Book Formats**: EPUB, PDF, Plain Text
- **Translation**: DeepL/Google/LibreTranslate API

---

## Application Architecture

### High-Level Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    Reading Companion                         │
│                      Application                             │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Frontend    │   │   Backend    │   │   External   │
│  (Next.js)   │   │   (API)      │   │   Services   │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Pages       │   │  API Routes  │   │  Translation │
│  Components  │   │  Database    │   │  Clerk Auth  │
│  State Mgmt  │   │  Business    │   │  Storage     │
└──────────────┘   └──────────────┘   └──────────────┘
```

### Page Structure

```
app/
├── (protected)/              # Authenticated routes
│   ├── page.tsx              # Home/Dashboard
│   ├── library/              # Book library
│   ├── suggested/            # Suggested books
│   ├── wishlist/             # Reading wishlist
│   ├── reader/[id]/          # Book reader
│   ├── vocab/                # Vocabulary management
│   ├── review/               # Flashcard review
│   └── stats/                # Learning statistics
├── api/                      # API routes
│   ├── books/               # Book CRUD
│   ├── vocabulary/          # Vocabulary CRUD
│   ├── flashcards/          # Flashcard operations
│   ├── reviews/             # Review attempts & stats
│   ├── wishlist/            # Wishlist CRUD
│   ├── bookmarks/           # Bookmark management
│   ├── suggested-books/     # Suggested books API
│   └── translate/           # Translation service
└── sign-in/ & sign-up/       # Clerk authentication
```

---

## Page-by-Page Breakdown

### 1. Home/Dashboard Page (`app/(protected)/page.tsx`)

**Purpose**: Central hub showing reading activity, quick stats, and navigation

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│  Navigation Bar (Site Header)                                │
├─────────────────────────────────────────────────────────────┤
│  Personal Greeting                                           │
│  "Good [Morning/Afternoon/Evening], [Name]!"                │
├─────────────────────────────────────────────────────────────┤
│  Current Book Hero Card                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [Book Cover/Icon]  Book Title                       │  │
│  │  Progress: ████████░░░░ 45%                          │  │
│  │  [Resume Reading Button]                              │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Stats Grid (3 cards)                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  Books   │  │  Words   │  │  Due     │                 │
│  │    12    │  │   245    │  │    8     │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
├─────────────────────────────────────────────────────────────┤
│  Bento Grid (2 widgets)                                     │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Wishlist        │  │  Recent Words    │                │
│  │  [Book Spines]   │  │  [Word Grid]     │                │
│  └──────────────────┘  └──────────────────┘                │
├─────────────────────────────────────────────────────────────┤
│  Quick Actions (4 icon cards)                               │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐                          │
│  │Lib │  │Sug │  │Voc │  │Rev │                          │
│  └────┘  └────┘  └────┘  └────┘                          │
└─────────────────────────────────────────────────────────────┘
```

**Key Features**:
- **Time-based greeting**: Changes based on time of day
- **Current book display**: Shows most recently accessed book with progress
- **Quick stats**: Books count, vocabulary count, due flashcards
- **Wishlist preview**: Visual book spines with hover tooltips
- **Recent words**: Last 15 saved words in compact grid
- **Quick navigation**: Direct links to main sections

**Data Fetched**:
- Books (for current book and count)
- Bookmarks (for progress calculation)
- Wishlist items (last 5)
- Vocabulary items (last 15)
- Due flashcards count

**UI/UX Highlights**:
- Empty states with helpful CTAs
- Loading states with spinners
- Smooth animations and transitions
- Responsive grid layouts
- Hover effects on interactive elements

---

### 2. Library Page (`app/(protected)/library/page.tsx`)

**Purpose**: Manage your book collection - add, view, and delete books

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│  Header                                                     │
│  "Your Library" • [Add Book Button]                        │
├─────────────────────────────────────────────────────────────┤
│  Filter Tabs                                                │
│  [All] [Books] [Notes]                                      │
├─────────────────────────────────────────────────────────────┤
│  Book Grid/List                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │  Book 1  │  │  Book 2  │  │  Book 3  │                │
│  │  Title   │  │  Title   │  │  Title   │                │
│  │  [Open]  │  │  [Open]  │  │  [Open]  │                │
│  └──────────┘  └──────────┘  └──────────┘                │
└─────────────────────────────────────────────────────────────┘
```

**Key Features**:
- **Add Books**: Upload EPUB/PDF or paste plain text
- **Category Filtering**: All, Books, Notes
- **Book Cards**: Display title, type, creation date
- **Quick Actions**: Open book, delete, add to wishlist
- **Empty States**: Helpful guidance when library is empty

**Add Book Flow**:
```
User clicks "Add Book"
    │
    ▼
Form appears (Modal/Dialog)
    │
    ├── Option 1: Upload File
    │   ├── EPUB: Store as base64
    │   └── PDF: Extract text → Store as text
    │
    ├── Option 2: Paste Text
    │   └── Store as text content
    │
    └── Option 3: Select Category
        ├── Book (default)
        └── Note
    │
    ▼
POST /api/books
    │
    ▼
Book added to library
    │
    ▼
Refresh book list
```

**Book Types Supported**:
1. **EPUB**: Full EPUB file support with navigation
2. **PDF**: Converted to text (extracts selectable text)
3. **Text**: Plain text content (notes, articles, etc.)

**Categories**:
- **Book**: Traditional reading material
- **Note**: Personal notes, articles, resources

---

### 3. Suggested Books Page (`app/(protected)/suggested/page.tsx`)

**Purpose**: Browse curated book recommendations by category

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│  Header                                                     │
│  "Suggested Books"                                           │
├─────────────────────────────────────────────────────────────┤
│  Search & Filter                                             │
│  [Search Box]  [Category Dropdown]                         │
├─────────────────────────────────────────────────────────────┤
│  Book Grid                                                   │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │  Book Title  │  │  Book Title  │                       │
│  │  Author      │  │  Author      │                       │
│  │  Category    │  │  Category    │                       │
│  │  [Add to     │  │  [Add to     │                       │
│  │   Wishlist]  │  │   Library]   │                       │
│  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

**Key Features**:
- **Category Filtering**: 17+ categories (Productivity, Psychology, etc.)
- **Search**: Filter books by title/author
- **Quick Actions**: Add to wishlist or library directly
- **GitHub Integration**: Some books available as EPUBs from GitHub

**Categories Available**:
- Productivity, Self-Improvement, Psychology, Communication
- Spirituality, Health, Business, Career, Relationships
- Philosophy, Practical, Motivation, Parenting, Education
- Sports Psychology, Pets

**Book Actions**:
1. **Add to Wishlist**: Saves book for later reading
2. **Add to Library**: Downloads EPUB (if available) and adds to library

---

### 4. Wishlist Page (`app/(protected)/wishlist/page.tsx`)

**Purpose**: Manage books you want to read in the future

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│  Header                                                     │
│  "Wishlist" • [Add Book Button]                            │
├─────────────────────────────────────────────────────────────┤
│  Search & Filter                                            │
│  [Search]  [Status: All/Want to Read/Reading/Completed]   │
├─────────────────────────────────────────────────────────────┤
│  Book List/Grid                                             │
│  ┌──────────────────────────────────────┐                 │
│  │  Book Title                           │                 │
│  │  Author • Status Badge                │                 │
│  │  Notes (if any)                      │                 │
│  │  [Edit] [Delete]                     │                 │
│  └──────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

**Key Features**:
- **Status Management**: Want to Read, Reading, Completed
- **Priority System**: Normal, High, Low priority
- **Notes**: Add personal notes about why you want to read
- **Search & Filter**: Find books by title/author or status
- **Edit & Delete**: Manage wishlist entries

**Status Types**:
- **Want to Read**: Default status for new entries
- **Reading**: Currently reading this book
- **Completed**: Finished reading

**Visual Indicators**:
- Status badges with color coding
- Priority stars (high priority)
- Book spines visualization (on homepage)

---

### 5. Reader Page (`app/(protected)/reader/[id]/page.tsx`)

**Purpose**: Read books and learn vocabulary through contextual translation

**Comprehensive documentation**: See `READER_PAGE_DOCUMENTATION.md` for full details

**Quick Overview**:
- Multi-format support (EPUB, PDF, Text)
- Word-level interaction and translation
- Vocabulary word highlighting
- Customizable reading settings
- Progress tracking and auto-save
- Distraction-free mode
- Keyboard shortcuts

---

### 6. Vocabulary Page (`app/(protected)/vocab/page.tsx`)

**Purpose**: View, search, filter, and manage all saved vocabulary words

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│  Header                                                     │
│  "Vocabulary" • [Export] [Import] [View Toggle]            │
├─────────────────────────────────────────────────────────────┤
│  Search & Filter                                            │
│  [Search Box]  [Book Filter: All/Book Name]               │
├─────────────────────────────────────────────────────────────┤
│  Bulk Actions (when items selected)                         │
│  [Select All] [Delete Selected]                              │
├─────────────────────────────────────────────────────────────┤
│  Vocabulary List/Grid                                       │
│  ┌──────────────────────────────────────┐                 │
│  │  Word/Phrase                         │                 │
│  │  Translation                         │                 │
│  │  Context snippet...                  │                 │
│  │  Book • Page • Due Badge             │                 │
│  │  [Go to Word] [Reset] [Delete]       │                 │
│  └──────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

**Key Features**:
- **Search**: Find words by term or translation
- **Filter by Book**: Show words from specific books
- **View Modes**: Card view or list view
- **Bulk Operations**: Select multiple words for deletion
- **Export/Import**: JSON export/import functionality
- **Navigation**: Click to jump to word location in book
- **Flashcard Reset**: Reset spaced repetition progress
- **Due Indicators**: Shows which words are due for review

**Vocabulary Item Display**:
- **Term**: The word or phrase saved
- **Translation**: Greek translation
- **Context**: Snippet of text around the word
- **Book Link**: Navigate to book location
- **Page/Location**: Where word was found
- **Due Status**: Badge showing review status
- **Created Date**: When word was saved

**Export Format**:
```json
{
  "term": "example",
  "translation": "παράδειγμα",
  "context": "This is an example sentence...",
  "bookTitle": "Book Name",
  "pageNumber": 42,
  "createdAt": "2025-01-30T..."
}
```

---

### 7. Review Page (`app/(protected)/review/page.tsx`)

**Purpose**: Practice vocabulary using spaced repetition flashcards with interactive exercises

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│  Header                                                     │
│  "Review" • [Time Limit] • Progress: X/Y                  │
├─────────────────────────────────────────────────────────────┤
│  Exercise Card (Centered)                                   │
│  ┌──────────────────────────────────────┐                 │
│  │  Exercise Type: [Meaning/Cloze/etc]   │                 │
│  │                                        │                 │
│  │  Question/Exercise Content            │                 │
│  │                                        │                 │
│  │  [Answer Options/Input]               │                 │
│  │                                        │                 │
│  │  [Submit Answer]                      │                 │
│  └──────────────────────────────────────┘                 │
├─────────────────────────────────────────────────────────────┤
│  Quality Rating (After Answer)                              │
│  [Again] [Hard] [Good] [Easy]                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Features**:
- **Spaced Repetition**: SM-2 algorithm scheduling
- **Exercise Types**: 4 different exercise formats
- **Time Limits**: Optional session time limits
- **Progress Tracking**: Shows cards reviewed vs remaining
- **Offline Support**: Works offline with cached flashcards
- **Swipe Navigation**: Mobile swipe gestures

**Exercise Types**:

1. **Meaning in Context**
   - Shows word in context sentence
   - Multiple choice: Select correct translation
   - Tests understanding in context

2. **Cloze Blank**
   - Sentence with blank space
   - Fill in the missing word
   - Tests recall and usage

3. **Reverse MCQ**
   - Shows translation
   - Select correct original word
   - Tests reverse recognition

4. **Matching Pairs**
   - Multiple words and translations
   - Match pairs correctly
   - Tests multiple words at once

**Review Flow**:
```
Load Due Flashcards
    │
    ▼
Generate Exercise (Random type)
    │
    ▼
Display Exercise
    │
    ▼
User Answers
    │
    ▼
Show Correct Answer
    │
    ▼
User Rates Quality (0-5)
    │
    ▼
Update Flashcard (SM-2 algorithm)
    │
    ▼
Calculate Next Review Date
    │
    ▼
Move to Next Card
```

**Quality Ratings**:
- **0 (Again)**: Didn't remember - resets to 1 day
- **2 (Hard)**: Remembered with difficulty - decreases ease factor
- **4 (Good)**: Remembered correctly - normal progression
- **5 (Easy)**: Knew immediately - increases ease factor

**SM-2 Algorithm**:
- **Ease Factor**: Starts at 2.5, adjusts based on performance
- **Intervals**: 1 day → 6 days → 16 days → 42 days (grows exponentially)
- **Repetitions**: Tracks consecutive correct answers
- **Adaptive**: Easy words reviewed less, hard words reviewed more

---

### 8. Stats Page (`app/(protected)/stats/page.tsx`)

**Purpose**: View learning analytics and review performance statistics

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│  Header                                                     │
│  "Review Statistics" • [Period: 7/30/90 days]               │
├─────────────────────────────────────────────────────────────┤
│  Summary Cards                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Total    │  │  Success │  │  Streak  │               │
│  │  Attempts │  │   Rate   │  │          │               │
│  └──────────┘  └──────────┘  └──────────┘               │
├─────────────────────────────────────────────────────────────┤
│  Activity Chart                                             │
│  [Bar chart showing reviews per day]                       │
├─────────────────────────────────────────────────────────────┤
│  Hardest Words                                              │
│  [List of words with lowest average quality]               │
├─────────────────────────────────────────────────────────────┤
│  Exercise Type Breakdown                                    │
│  [Pie chart or list of exercise types]                    │
└─────────────────────────────────────────────────────────────┘
```

**Key Features**:
- **Time Period Selection**: 7, 30, or 90 days
- **Success Rate**: Percentage of correct answers
- **Current Streak**: Consecutive days with reviews
- **Activity Timeline**: Reviews per day visualization
- **Hardest Words**: Words with lowest average quality scores
- **Exercise Analytics**: Breakdown by exercise type
- **Response Time**: Average time to answer (if tracked)

**Metrics Tracked**:
- Total review attempts
- Success rate (quality ≥ 4)
- Current streak
- Average response time
- Hardest words (lowest avg quality)
- Activity by day
- Exercise type distribution

---

## Core Features

### 1. Authentication System

**Provider**: Clerk

**Features**:
- Email/password sign-up and sign-in
- Social authentication (if configured)
- User session management
- Protected routes via middleware
- User profile access

**Protected Routes**:
- All pages under `app/(protected)/`
- API routes check authentication
- User-specific data isolation

---

### 2. Book Management

**Supported Formats**:
1. **EPUB**: Full format support
   - Table of contents navigation
   - CFI-based location tracking
   - Chapter navigation
   - Word-level interaction

2. **PDF**: Converted to text
   - Text extraction on upload
   - Page-based navigation
   - Text selection support
   - Scanned PDF detection

3. **Plain Text**: Direct content
   - Paste or type content
   - Scroll-based pagination
   - Character position tracking
   - Full text search

**Book Storage**:
- EPUB/PDF: Base64 encoded in database
- Text: Direct text content
- Metadata: Title, type, category, timestamps

**Book Categories**:
- **Book**: Traditional reading material
- **Note**: Personal notes, articles, resources

---

### 3. Vocabulary Learning System

**Word Saving Flow**:
```
User selects text in book
    │
    ▼
Translation API called
    │
    ▼
Show translation popover/drawer
    │
    ▼
User clicks "Save Word"
    │
    ▼
POST /api/vocabulary
    │
    ├── Save vocabulary entry
    ├── Create flashcard (SM-2)
    └── Cache translation
    │
    ▼
Word added to vocabulary
```

**Vocabulary Features**:
- **Context Preservation**: Saves surrounding text
- **Location Tracking**: EPUB CFI, page number, or character position
- **Word vs Phrase**: Automatically detects (2-6 words = phrase)
- **Known Words**: Mark words as known (hides from lookups)
- **Normalization**: Lowercase, trimmed for efficient lookups

**Vocabulary Highlighting**:
- Words saved but not marked "known" are subtly highlighted
- Purple underline (very subtle)
- Only visible on close inspection
- Helps identify words to review

---

### 4. Translation System

**Providers Supported**:
1. **DeepL** (Recommended): High quality translations
2. **Google Translate**: Requires service account
3. **LibreTranslate**: Open source alternative

**Translation Flow**:
```
User selects text
    │
    ▼
Check translation cache
    │
    ├── Found: Return cached translation
    └── Not Found: Call translation API
        │
        ▼
    Translate text (en → el)
        │
        ▼
    Cache translation
        │
        ▼
    Return translation + alternatives
```

**Translation Features**:
- **Caching**: Reduces API calls and costs
- **Alternative Translations**: Shows multiple options
- **Context-Aware**: Uses surrounding text for better translation
- **Phrase Support**: Handles 2-6 word phrases
- **Error Handling**: Graceful fallbacks

**Translation Display**:
- **Desktop**: Popover near selection
- **Mobile**: Bottom drawer
- **Draggable**: Desktop popover can be moved
- **Auto-positioning**: Smart positioning to stay in viewport

---

### 5. Spaced Repetition System

**Algorithm**: SM-2 (SuperMemo 2)

**How It Works**:
```
Save Word
    │
    ▼
Create Flashcard
    ├── Ease Factor: 2.5 (default)
    ├── Interval: 1 day
    ├── Repetitions: 0
    └── Due At: Now
    │
    ▼
First Review (Day 1)
    │
    ▼
User Rates Quality
    │
    ├── Quality 0-2: Reset to 1 day
    └── Quality 3-5: Progress
        │
        ▼
    Calculate Next Review
        ├── Repetitions = 1: 1 day
        ├── Repetitions = 2: 6 days
        └── Repetitions ≥ 3: Previous × Ease Factor
        │
        ▼
    Update Ease Factor
        ├── Quality 5: Increase EF
        ├── Quality 4: Maintain EF
        └── Quality 0-2: Decrease EF
```

**SM-2 Parameters**:
- **Ease Factor**: 1.3 (minimum) to 2.5+ (default)
- **Intervals**: Grow exponentially (1 → 6 → 16 → 42 days)
- **Repetitions**: Tracks consecutive correct answers
- **Due Date**: Calculated based on last review + interval

**Review Scheduling**:
- Words due when `dueAt <= now`
- Review page only shows due words
- After review, word disappears until next due date
- Easy words appear less frequently
- Hard words appear more frequently

---

### 6. Progress Tracking

**Auto-Save Bookmarks**:
- Automatically saves reading progress
- Updates every 3 seconds while reading
- Hidden bookmark (`title = "__LAST_READ__"`)
- Restores position when book reopens

**Progress Calculation**:
- **EPUB**: Percentage from CFI location
- **PDF**: Page number / total pages
- **Text**: Scroll position / content height

**Progress Display**:
- Percentage shown in top bar
- Progress bars on book cards
- Chapter/page indicators
- Last read position restoration

---

### 7. Bookmark System

**Two Types**:

1. **Auto-Save Bookmarks** (`__LAST_READ__`)
   - Automatic progress saving
   - Hidden from UI
   - Updated every 3 seconds
   - One per book

2. **Manual Bookmarks**
   - Created by user (button or 'B' key)
   - Can be named/edited
   - Shown in bookmarks drawer
   - Multiple per book

**Bookmark Storage**:
- **EPUB**: CFI location string
- **PDF**: Page number
- **Text**: Character position

**Bookmark Features**:
- Navigate to bookmark location
- Edit bookmark title/notes
- Delete bookmarks
- View all bookmarks for a book

---

## User Journey

### New User Flow

```
1. Sign Up
    │
    ▼
2. Land on Homepage (Empty State)
    │
    ├── Option A: Add Book from Library
    │   └── Upload EPUB/PDF or paste text
    │
    └── Option B: Browse Suggested Books
        └── Add to Library or Wishlist
    │
    ▼
3. Open Book in Reader
    │
    ▼
4. Read and Select Words
    │
    ▼
5. View Translation
    │
    ▼
6. Save Word to Vocabulary
    │
    ▼
7. Word Appears in Vocabulary Page
    │
    ▼
8. Word Due for Review
    │
    ▼
9. Practice in Review Page
    │
    ▼
10. Track Progress in Stats
```

### Daily Usage Flow

```
1. Open Homepage
    │
    ▼
2. See Current Book & Progress
    │
    ▼
3. Resume Reading
    │
    ▼
4. Learn New Words
    │
    ▼
5. Review Due Words
    │
    ▼
6. Check Stats
```

---

## Data Models

### Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                      Database Tables                         │
└─────────────────────────────────────────────────────────────┘

books
├── id (UUID, PK)
├── user_id (TEXT, FK → Clerk)
├── title (TEXT)
├── type (TEXT: 'epub'|'pdf'|'text')
├── category (TEXT: 'book'|'note')
├── content (TEXT, nullable)
├── pdf_url (TEXT, nullable)
├── epub_url (TEXT, nullable)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

vocabulary
├── id (UUID, PK)
├── user_id (TEXT, FK → Clerk)
├── book_id (UUID, FK → books)
├── term (TEXT)
├── term_normalized (TEXT, indexed)
├── translation (TEXT)
├── context (TEXT)
├── kind (TEXT: 'word'|'phrase')
├── is_known (BOOLEAN)
├── page_number (INTEGER, nullable)
├── position (INTEGER, nullable)
├── epub_location (TEXT, nullable)
└── created_at (TIMESTAMP)

flashcards
├── id (UUID, PK)
├── vocabulary_id (UUID, FK → vocabulary)
├── user_id (TEXT, FK → Clerk)
├── ease_factor (DOUBLE, default: 2.5)
├── interval (INTEGER, default: 1)
├── repetitions (INTEGER, default: 0)
├── due_at (TIMESTAMP)
├── last_reviewed_at (TIMESTAMP, nullable)
└── created_at (TIMESTAMP)

bookmarks
├── id (UUID, PK)
├── user_id (TEXT, FK → Clerk)
├── book_id (UUID, FK → books)
├── title (TEXT, nullable)
├── epub_location (TEXT, nullable)
├── page_number (INTEGER, nullable)
├── position (INTEGER, nullable)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

wishlist
├── id (UUID, PK)
├── user_id (TEXT, FK → Clerk)
├── title (TEXT)
├── author (TEXT, nullable)
├── notes (TEXT, nullable)
├── priority (INTEGER, default: 0)
├── status (TEXT: 'want_to_read'|'reading'|'completed')
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

review_attempts
├── id (UUID, PK)
├── user_id (TEXT, FK → Clerk)
├── flashcard_id (UUID, FK → flashcards)
├── vocabulary_id (UUID, FK → vocabulary)
├── session_id (TEXT)
├── attempt_id (TEXT, unique)
├── quality (INTEGER: 0-5)
├── response_ms (INTEGER, nullable)
├── exercise_type (TEXT)
├── old_ease_factor (DOUBLE)
├── new_ease_factor (DOUBLE)
├── old_interval (INTEGER)
├── new_interval (INTEGER)
├── old_repetitions (INTEGER)
├── new_repetitions (INTEGER)
└── created_at (TIMESTAMP)

translation_cache
├── id (UUID, PK)
├── source_text (TEXT, indexed)
├── target_language (TEXT, default: 'el')
├── translated_text (TEXT)
└── created_at (TIMESTAMP)
```

### Data Relationships

```
User (Clerk)
    │
    ├──→ Books (1:N)
    │       │
    │       ├──→ Bookmarks (1:N)
    │       └──→ Vocabulary (1:N)
    │                   │
    │                   └──→ Flashcards (1:1)
    │                               │
    │                               └──→ Review Attempts (1:N)
    │
    ├──→ Wishlist (1:N)
    └──→ Translation Cache (shared)
```

---

## API Structure

### API Routes Overview

```
/api/
├── books/
│   ├── GET          # List user's books
│   ├── POST         # Create new book
│   ├── [id]/
│   │   ├── GET      # Get book details
│   │   ├── DELETE   # Delete book
│   │   └── epub/    # Serve EPUB files (catch-all)
│   └── extract-pdf-text  # Extract text from PDF
│
├── vocabulary/
│   ├── GET          # List vocabulary (filter by bookId)
│   ├── POST         # Save new word
│   ├── [id]/
│   │   ├── PATCH    # Update word (mark as known, etc.)
│   │   └── DELETE   # Delete word
│   └── bulk-delete  # Delete multiple words
│
├── flashcards/
│   ├── GET          # Get flashcards (filter: due=true)
│   └── [id]/
│       └── PATCH    # Update flashcard (review)
│
├── reviews/
│   ├── POST         # Submit review attempt
│   └── stats        # Get review statistics
│
├── bookmarks/
│   ├── GET          # List bookmarks (filter by bookId)
│   ├── POST         # Create bookmark
│   ├── [id]/
│   │   ├── PATCH    # Update bookmark
│   │   └── DELETE   # Delete bookmark
│   └── last-read    # Auto-save progress (PUT)
│
├── wishlist/
│   ├── GET          # List wishlist items
│   ├── POST         # Add to wishlist
│   └── [id]/
│       ├── PATCH    # Update wishlist item
│       └── DELETE   # Delete wishlist item
│
├── suggested-books/
│   └── GET          # Get suggested books (filter by category)
│
└── translate/
    └── POST         # Translate text (en → el)
```

### API Request/Response Examples

**Create Vocabulary**:
```typescript
POST /api/vocabulary
Body: {
  bookId: "uuid",
  term: "example",
  translation: "παράδειγμα",
  context: "This is an example...",
  kind: "word" | "phrase"
}
Response: {
  id: "uuid",
  term: "example",
  translation: "παράδειγμα",
  ...
}
```

**Review Flashcard**:
```typescript
PATCH /api/flashcards/{id}
Body: {
  quality: 4,  // 0-5
  exerciseType: "meaning-in-context",
  responseMs: 2500
}
Response: {
  id: "uuid",
  easeFactor: 2.5,
  interval: 6,
  repetitions: 2,
  dueAt: "2025-02-05T..."
}
```

---

## Theme System

### Theme Architecture

```
Global Theme Controller
    │
    ├── 5 Color Themes
    │   ├── Lavender Storm (Light pink/purple)
    │   ├── Ocean Breeze (Blue)
    │   ├── Warm Sand (Yellow/beige)
    │   ├── Forest Green (Green)
    │   └── Jet Black (Dark)
    │
    └── Black/White Mode (Separate)
```

### Theme Application Flow

```
User Clicks Theme Randomizer
    │
    ▼
cycleTheme() called
    │
    ▼
Get current theme index
    │
    ▼
Increment index (wrap around)
    │
    ▼
applyTheme(newIndex)
    │
    ├── Get theme colors
    ├── Set CSS variables
    │   ├── --c-canvas
    │   ├── --c-ink
    │   ├── --c-strong
    │   ├── --c-soft
    │   └── --c-spark
    ├── Set data-theme attribute (Jet Black)
    ├── Save to localStorage
    └── Dispatch 'theme-change' event
    │
    ▼
All Components Update
    ├── ReaderThemeSync (reader page)
    ├── Theme-aware components
    └── CSS variables propagate
```

### CSS Variable System

**Core Variables**:
- `--c-canvas`: Background colors
- `--c-ink`: Text colors
- `--c-strong`: Primary buttons, emphasis
- `--c-soft`: Borders, secondary elements
- `--c-spark`: Accents, focus rings
- `--c-hover`: Hover states
- `--c-muted`: Muted text
- `--c-light`: Light backgrounds

**Tailwind Mapping**:
- `--background` → `--c-canvas`
- `--foreground` → `--c-ink`
- `--primary` → `--c-strong`
- `--border` → `--c-soft`
- `--ring` → `--c-spark`

---

## UI/UX Patterns

### Design System

**Color Palette**: 5-color minimalist system
- Each theme uses 5 core colors
- Semantic naming (canvas, ink, strong, soft, spark)
- Theme-aware throughout application

**Typography**:
- Serif fonts for headings (Playfair Display)
- Sans-serif for body (Inter)
- Reading fonts available (Georgia, Times, etc.)

**Spacing**:
- 8px base unit
- Consistent spacing scale
- Responsive padding/margins

**Components**:
- shadcn/ui primitives
- Custom components built on top
- Consistent styling patterns
- Theme-aware by default

### Navigation Patterns

**Main Navigation**:
- Sticky header (top)
- Logo on left
- Centered nav items (desktop)
- Mobile hamburger menu
- Theme controls on right
- User button (Clerk)

**Navigation Items**:
1. Library
2. Suggested
3. Wishlist
4. Vocabulary
5. Review
6. Stats

**Breadcrumbs**: Not used (flat navigation structure)

**Quick Actions**: Homepage provides quick access to all sections

### Responsive Design

**Breakpoints**:
- Mobile: < 768px
- Desktop: ≥ 768px

**Mobile Adaptations**:
- Hamburger menu
- Full-screen modals
- Bottom drawers for translations
- Touch-optimized interactions
- Swipe gestures (review page)

**Desktop Features**:
- Side sheets for settings
- Popovers for translations
- Hover states
- Keyboard shortcuts
- Auto-hiding top bars

### Loading States

**Patterns Used**:
- Spinner with message
- Skeleton loading (where applicable)
- Progressive loading
- Optimistic updates

**Empty States**:
- Helpful messaging
- Clear CTAs
- Encouraging copy
- Visual icons

### Error Handling

**Error Types**:
- Network errors
- Validation errors
- Not found errors
- Permission errors

**Error Display**:
- Toast notifications
- Inline error messages
- Error boundaries
- Graceful fallbacks

---

## System Architecture Diagrams

### Complete Application Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Authentication                        │
│                    (Clerk Provider)                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Protected Routes                           │
│              (Middleware Authentication Check)                 │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Frontend   │   │   API Layer  │   │   Database   │
│   (Pages)    │──→│   (Routes)   │──→│   (Postgres) │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Components  │   │  Business    │   │  External    │
│  State       │   │  Logic       │   │  Services    │
└──────────────┘   └──────────────┘   └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  Translation │
                    │  API (DeepL) │
                    └──────────────┘
```

### Data Flow: Saving a Word

```
┌─────────────────────────────────────────────────────────────┐
│  User Selects Word in Reader                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Check Translation Cache                                       │
│  SELECT * FROM translation_cache                              │
│  WHERE source_text = 'word' AND target_language = 'el'       │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼ Found                                 ▼ Not Found
┌──────────────┐                       ┌──────────────┐
│ Return       │                       │ Call         │
│ Cached       │                       │ Translation  │
│ Translation  │                       │ API          │
└──────────────┘                       └──────────────┘
        │                                       │
        │                                       ▼
        │                               ┌──────────────┐
        │                               │ Cache         │
        │                               │ Translation   │
        │                               └──────────────┘
        │                                       │
        └───────────────────┬───────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  User Clicks "Save Word"                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /api/vocabulary                                          │
│  Body: { bookId, term, translation, context, ... }          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Database Transaction                                          │
│  1. INSERT INTO vocabulary                                    │
│  2. INSERT INTO flashcards (SM-2 defaults)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Response: { id, term, translation, flashcard, ... }         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Update UI                                                     │
│  - Show success toast                                         │
│  - Update vocabulary list                                     │
│  - Highlight word in reader                                   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Review Session

```
┌─────────────────────────────────────────────────────────────┐
│  User Opens Review Page                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  GET /api/flashcards?due=true                                 │
│  Returns: [{ flashcard, vocabulary }, ...]                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Generate Exercise                                             │
│  - Select random exercise type                                │
│  - Create exercise from vocabulary                            │
│  - Display to user                                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  User Answers Exercise                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Show Correct Answer                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  User Rates Quality (0-5)                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /api/reviews                                             │
│  Body: { flashcardId, vocabularyId, quality, ... }           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Update Flashcard (SM-2 Algorithm)                            │
│  1. Calculate new ease factor                                 │
│  2. Calculate new interval                                    │
│  3. Update repetitions                                        │
│  4. Calculate next due date                                   │
│  5. PATCH /api/flashcards/{id}                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Log Review Attempt                                            │
│  INSERT INTO review_attempts                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Move to Next Card                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Communication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Page Component                              │
│              (e.g., ReaderPage, VocabPage)                     │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Child       │   │  Child       │   │  Child       │
│  Component   │   │  Component   │   │  Component   │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Event Handlers                                                │
│  - handleTextSelection()                                      │
│  - handleSaveWord()                                           │
│  - handleAddBookmark()                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  API Calls                                                     │
│  - fetch('/api/...')                                         │
│  - POST/PATCH/DELETE                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  State Updates                                                 │
│  - setState() calls                                          │
│  - Re-render components                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature Details

### Vocabulary Management

**Word Features**:
- **Term Normalization**: Lowercase, trimmed for efficient lookups
- **Context Preservation**: 200+ characters around word
- **Location Tracking**: EPUB CFI, page number, or character position
- **Kind Detection**: Automatically detects word vs phrase
- **Known Status**: Mark words as known to hide from lookups

**Vocabulary Page Features**:
- **Search**: Full-text search across terms and translations
- **Filter**: By book, by known status
- **View Modes**: Card view (visual) or list view (compact)
- **Bulk Operations**: Select and delete multiple words
- **Export/Import**: JSON format for backup/restore
- **Navigation**: Click to jump to word location in book
- **Flashcard Reset**: Reset spaced repetition progress

### Review System

**Exercise Generation**:
- Randomly selects from 4 exercise types
- Ensures variety in practice
- Uses vocabulary context when available
- Generates distractors for multiple choice

**Exercise Types**:

1. **Meaning in Context**
   ```
   Question: "The example was clear."
            └─ What does "example" mean?
   
   Options:
   A) παράδειγμα (correct)
   B) ερώτηση
   C) απάντηση
   D) λέξη
   ```

2. **Cloze Blank**
   ```
   Sentence: "This is an _____ of good writing."
   
   Fill in: [input field]
   Answer: "example"
   ```

3. **Reverse MCQ**
   ```
   Question: What is the English word for "παράδειγμα"?
   
   Options:
   A) example (correct)
   B) question
   C) answer
   D) word
   ```

4. **Matching Pairs**
   ```
   Match the words with their translations:
   
   example    ←→  παράδειγμα
   question   ←→  ερώτηση
   answer     ←→  απάντηση
   ```

**Review Features**:
- **Time Limits**: Optional session time limits
- **Progress Tracking**: X/Y cards reviewed
- **Offline Support**: Cached flashcards work offline
- **Swipe Navigation**: Mobile swipe gestures
- **Session Management**: Prevents duplicate submissions
- **Concurrency Handling**: Multiple tabs supported

### Statistics & Analytics

**Metrics Tracked**:
- Total review attempts
- Success rate (quality ≥ 4)
- Current streak (consecutive days)
- Average response time
- Hardest words (lowest avg quality)
- Activity by day (bar chart)
- Exercise type distribution

**Time Periods**:
- 7 days (recent activity)
- 30 days (monthly trends)
- 90 days (quarterly overview)

**Visualizations**:
- Activity timeline (bar chart)
- Success rate indicator
- Streak counter
- Hardest words list
- Exercise type breakdown

---

## Navigation & User Flow

### Main Navigation Structure

```
Homepage (/)
    │
    ├──→ Library (/library)
    │       └──→ Reader (/reader/[id])
    │
    ├──→ Suggested (/suggested)
    │       ├──→ Add to Library
    │       └──→ Add to Wishlist
    │
    ├──→ Wishlist (/wishlist)
    │       └──→ Add to Library
    │
    ├──→ Vocabulary (/vocab)
    │       └──→ Reader (navigate to word)
    │
    ├──→ Review (/review)
    │       └──→ Vocabulary (view word details)
    │
    └──→ Stats (/stats)
```

### User Interaction Flows

**Reading Flow**:
```
Library → Select Book → Reader → Select Word → Translation → Save Word
                                                                    │
                                                                    ▼
                                                            Vocabulary Page
```

**Review Flow**:
```
Homepage → Review (see due count) → Review Page → Answer Exercise → Rate Quality
                                                                          │
                                                                          ▼
                                                                    Stats Updated
```

**Book Discovery Flow**:
```
Suggested → Browse Categories → Add to Wishlist → Wishlist → Add to Library → Reader
```

---

## Technical Implementation Details

### State Management

**Pattern**: React useState + useEffect

**State Locations**:
- Page-level state (useState)
- localStorage (persistence)
- URL params (sharing, deep linking)
- Database (server state)

**State Synchronization**:
- API calls update server state
- localStorage syncs on changes
- URL params for shareable links
- Real-time updates via refetch

### Performance Optimizations

**Caching**:
- Translation cache (database)
- EPUB location cache (IndexedDB)
- Flashcard cache (IndexedDB, offline)
- Component memoization

**Lazy Loading**:
- Drawers load on-demand
- Large lists paginate
- Images lazy load
- Code splitting (Next.js)

**Optimizations**:
- Debounced search (300ms)
- Throttled auto-save (3s)
- Batch API calls where possible
- Optimistic UI updates

### Offline Support

**Service Worker**:
- Caches static assets
- Caches API responses
- Offline fallbacks

**IndexedDB**:
- Flashcard cache
- EPUB location cache
- Offline vocabulary access

**Offline Features**:
- Review flashcards offline
- View cached vocabulary
- Read cached books (limited)

---

## Security & Privacy

### Authentication

**Provider**: Clerk
- Secure session management
- User isolation
- Protected routes
- API authentication checks

### Data Isolation

**User-Specific Data**:
- All data scoped to user_id
- API routes verify ownership
- Database queries filter by user
- No cross-user data access

### Data Privacy

**Stored Data**:
- Books: User's uploaded content
- Vocabulary: User's saved words
- Progress: User's reading data
- Reviews: User's learning data

**External Services**:
- Translation API: Text sent for translation
- Clerk: Authentication data
- No third-party analytics (by default)

---

## Accessibility

### Keyboard Navigation

**Full Keyboard Support**:
- Tab navigation
- Enter/Space for actions
- Arrow keys for navigation
- Esc to close modals
- Keyboard shortcuts (reader page)

### Screen Reader Support

**ARIA Labels**:
- All interactive elements labeled
- Descriptive button labels
- Form field labels
- Status announcements

### Visual Accessibility

**Color Contrast**:
- WCAG AA compliant
- Theme-aware contrast
- Focus indicators
- Error states visible

**Reduced Motion**:
- Respects `prefers-reduced-motion`
- Disables animations when requested
- Instant transitions

---

## Mobile Experience

### Mobile Optimizations

**Touch Interactions**:
- Larger tap targets
- Swipe gestures (review page)
- Bottom drawers (translations)
- Full-screen modals

**Responsive Layouts**:
- Stack layouts on mobile
- Full-width components
- Optimized spacing
- Mobile-first approach

**Performance**:
- Optimized images
- Lazy loading
- Efficient rendering
- Fast page loads

---

## Future Enhancements

### Planned Features

1. **Reading Analytics**
   - Reading speed tracking
   - Time spent reading
   - Words learned per session
   - Reading streaks

2. **Advanced Search**
   - Full-text search in books
   - Search within book
   - Highlight all matches
   - Search history

3. **Annotations**
   - Highlight text
   - Add notes to passages
   - Export annotations
   - Share annotations

4. **Social Features**
   - Share quotes
   - Reading groups
   - Progress sharing
   - Word sharing

5. **Export Features**
   - Export vocabulary to Anki
   - Export reading notes
   - PDF export of stats
   - CSV export of data

---

## Conclusion

Reading Companion is a comprehensive vocabulary learning platform that combines reading, vocabulary management, and spaced repetition into a unified experience. The application is built with modern web technologies, follows best practices, and provides a smooth user experience across devices.

**Key Strengths**:
- Clean, modular architecture
- Comprehensive feature set
- User-friendly interface
- Performance optimizations
- Accessibility support
- Offline capabilities

The platform successfully bridges reading and vocabulary learning, making it easy for users to learn new words in context while reading their favorite books.
