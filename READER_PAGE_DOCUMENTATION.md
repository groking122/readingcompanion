# Reader Page - Comprehensive Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Component Structure](#component-structure)
4. [UI/UX Design](#uiux-design)
5. [Settings Menu](#settings-menu)
6. [State Management](#state-management)
7. [Theme System Integration](#theme-system-integration)
8. [Book Format Handling](#book-format-handling)
9. [User Interactions](#user-interactions)
10. [Data Flow Diagrams](#data-flow-diagrams)

---

## Overview

The Reader Page (`app/(protected)/reader/[id]/page.tsx`) is a sophisticated reading interface that supports multiple book formats (EPUB, PDF, and plain text) with advanced features including:

- **Multi-format support**: EPUB, PDF, and plain text books
- **Vocabulary learning**: Word highlighting, translation, and vocabulary saving
- **Reading customization**: Font, size, spacing, and layout controls
- **Progress tracking**: Automatic bookmarking and progress saving
- **Distraction-free mode**: Minimal UI for focused reading
- **Theme integration**: Uses global site theme colors
- **Keyboard shortcuts**: Power user navigation and controls

---

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Reader Page Component                     │
│              (app/(protected)/reader/[id]/page.tsx)         │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Top Bar     │   │  Content     │   │  Drawers/    │
│  (Controls)  │   │  Area        │   │  Overlays    │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ ReaderTopBar │   │ EpubReader   │   │ Settings     │
│              │   │ PdfViewer    │   │ Translation  │
│              │   │ TextContent  │   │ Bookmarks    │
└──────────────┘   └──────────────┘   └──────────────┘
```

### Component Hierarchy

```
ReaderPage (Main Container)
├── ReaderThemeSync (Theme synchronization)
├── ReaderTopBar (Auto-hiding navigation bar)
│   ├── Back Button
│   ├── Book Title
│   ├── Page/Chapter Info
│   ├── Bookmark Button
│   └── Settings Button
├── ReaderSettings (Settings drawer/sheet)
│   ├── Typography Section
│   │   ├── Font Family Selector
│   │   ├── Font Size Slider
│   │   └── Line Height Buttons
│   └── Layout Section
│       ├── Reading Width Toggle
│       └── Paragraph Spacing Slider
├── Content Area (Book-specific renderer)
│   ├── EpubReader (for EPUB books)
│   │   ├── ReactReader wrapper
│   │   ├── Word-level interaction handlers
│   │   └── Vocabulary word highlighting
│   ├── PdfViewer (for PDF books)
│   └── TextContent (for plain text books)
├── Overlays & Drawers
│   ├── TranslationPopover (Desktop)
│   ├── TranslationDrawer (Mobile)
│   ├── BookmarksDrawer
│   ├── TocDrawer (EPUB only)
│   └── KeyboardShortcutsOverlay
└── ReadingProgressIndicator
```

---

## Component Structure

### Main Reader Page Component

**File**: `app/(protected)/reader/[id]/page.tsx`

**Key Responsibilities**:
- Book data fetching and loading
- State management for all reading settings
- Coordination between child components
- Progress tracking and auto-save
- Keyboard shortcut handling
- Text selection and translation flow

**Core State Variables**:

```typescript
// Book & Loading
const [book, setBook] = useState<Book | null>(null)
const [loading, setLoading] = useState(true)
const [epubUrl, setEpubUrl] = useState<string | null>(null)
const [epubError, setEpubError] = useState<string | null>(null)

// Reading Settings
const [fontSize, setFontSize] = useState(16)
const [fontFamily, setFontFamily] = useState("Inter")
const [lineHeight, setLineHeight] = useState(1.6)
const [readingWidth, setReadingWidth] = useState<"comfort" | "wide">("comfort")
const [paragraphSpacing, setParagraphSpacing] = useState(1.5)
const [distractionFree, setDistractionFree] = useState(false)

// Location & Progress
const [location, setLocation] = useState<string | number>(0)
const [currentLocation, setCurrentLocation] = useState<string | number>(0)
const [currentPage, setCurrentPage] = useState<number | null>(null)
const [totalPages, setTotalPages] = useState<number | null>(null)
const [readingProgress, setReadingProgress] = useState(0)
const [currentChapter, setCurrentChapter] = useState<string>("")

// Translation & Vocabulary
const [selectedText, setSelectedText] = useState("")
const [translation, setTranslation] = useState("")
const [alternativeTranslations, setAlternativeTranslations] = useState<string[]>([])
const [translating, setTranslating] = useState(false)
const [saving, setSaving] = useState(false)
const [savedWordId, setSavedWordId] = useState<string | null>(null)
const [knownWords, setKnownWords] = useState<Set<string>>(new Set())
const [vocabularyWords, setVocabularyWords] = useState<Set<string>>(new Set())
const [hasKnownWordsData, setHasKnownWordsData] = useState(false)

// UI State
const [settingsOpen, setSettingsOpen] = useState(false)
const [tocOpen, setTocOpen] = useState(false)
const [bookmarksOpen, setBookmarksOpen] = useState(false)
const [shortcutsOpen, setShortcutsOpen] = useState(false)
const [popoverOpen, setPopoverOpen] = useState(false)
const [popoverPosition, setPopoverPosition] = useState<{x, y, width, height} | undefined>()
const [isDragging, setIsDragging] = useState(false)
```

### ReaderTopBar Component

**File**: `components/reader-top-bar.tsx`

**Features**:
- Auto-hiding behavior (desktop: hides after 3s inactivity, mobile: hides on scroll down)
- Shows book title, current page/chapter, and reading progress
- Quick access buttons: Back, Bookmark, Settings
- Theme-aware styling with backdrop blur

**Auto-Hide Logic**:
```
Desktop:
  - Show on scroll or mouse movement
  - Hide after 3 seconds of inactivity
  - Smooth fade transition

Mobile:
  - Show on scroll up
  - Hide on scroll down (>50px)
  - Instant show/hide
```

### ReaderSettings Component

**File**: `components/reader-settings.tsx`

**Layout**:
- **Desktop**: Right-side Sheet (360px wide)
- **Mobile**: Full-screen Dialog with sticky header

**Settings Sections**:

1. **Typography**
   - Font Family: Georgia, Times New Roman, Inter, Arial, Courier New
   - Font Size: 12-24px (slider with +/- buttons)
   - Line Height: 1.4, 1.6, 1.8 (button group)

2. **Layout**
   - Reading Width: Comfort (85ch) or Wide (100ch)
   - Paragraph Spacing: 0.5-3.0rem (slider)

**Settings Persistence**:
- Saved per-book in localStorage
- Key format: `reader_settings_{bookId}`
- Auto-loads when book changes
- Auto-saves when settings change

### EpubReader Component

**File**: `components/epub-reader.tsx`

**Key Features**:
- Wraps `react-reader` library
- Word-level interaction (click/tap words)
- Vocabulary word highlighting (subtle purple underline)
- Theme-aware styling using CSS variables
- Custom request handler for API endpoint routing
- Location tracking and progress calculation

**Word Interaction Flow**:
```
User clicks/taps word
    │
    ▼
Word wrapped in <span class="epub-word">
    │
    ▼
Click handler extracts word text
    │
    ▼
Gets context around word (100 chars before/after)
    │
    ▼
Calls onTextSelected(word, cfiRange, context)
    │
    ▼
Parent component handles translation
```

---

## UI/UX Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Main Navigation (Site Header)                              │
├─────────────────────────────────────────────────────────────┤
│  ReaderTopBar (Auto-hiding)                                 │
│  [←] Book Title • Page X of Y • 45%  [🔖] [⚙️]            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │         Reading Content Area                        │   │
│  │         (Centered, max-width: 85ch/100ch)          │   │
│  │                                                      │   │
│  │         [EPUB/PDF/Text Content]                     │   │
│  │                                                      │   │
│  └────────────────────────────────────────────────────┘   │
│                                                              │
│  ReadingProgressIndicator (Bottom)                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Visual Hierarchy

1. **Primary Content**: Reading area (centered, optimal width)
2. **Secondary Controls**: Top bar (auto-hiding, minimal)
3. **Tertiary Overlays**: Settings, translations, bookmarks (on-demand)

### Responsive Behavior

**Desktop (>768px)**:
- Reading width: Comfort (85ch) or Wide (100ch)
- Settings: Right-side sheet
- Translation: Popover near selection
- Top bar: Auto-hides after inactivity

**Mobile (≤768px)**:
- Reading width: Full width with padding
- Settings: Full-screen dialog
- Translation: Bottom drawer
- Top bar: Hides on scroll down, shows on scroll up

### Distraction-Free Mode

When enabled:
- Hides top bar completely
- Removes container padding
- Full-screen reading experience
- Exit button in top-right corner
- All keyboard shortcuts still work

---

## Settings Menu

### Typography Settings

**Font Family**:
- **Serif fonts**: Georgia, Times New Roman (for traditional reading)
- **Sans-serif fonts**: Inter, Arial (for modern reading)
- **Monospace**: Courier New (for code/technical content)

**Font Size**:
- Range: 12px - 24px
- Default: 16px
- Controls: Slider + increment/decrement buttons
- Real-time preview

**Line Height**:
- Options: 1.4 (tight), 1.6 (normal), 1.8 (relaxed)
- Default: 1.6
- Visual button selection

### Layout Settings

**Reading Width**:
- **Comfort**: 85ch (optimal for most readers)
- **Wide**: 100ch (for wider screens/preference)
- Affects max-width of content container

**Paragraph Spacing**:
- Range: 0.5rem - 3.0rem
- Default: 1.5rem
- Controls vertical spacing between paragraphs
- Only applies to text/PDF books (EPUB uses its own spacing)

### Settings Persistence Flow

```
User changes setting
    │
    ▼
State updates (useState)
    │
    ▼
useEffect detects change
    │
    ▼
saveBookSettings() called
    │
    ▼
localStorage.setItem(`reader_settings_${bookId}`, JSON)
    │
    ▼
Settings persist across sessions
```

### Settings Loading Flow

```
Book loads
    │
    ▼
useEffect([book?.id]) triggers
    │
    ▼
loadBookSettings(bookId) called
    │
    ▼
localStorage.getItem(`reader_settings_${bookId}`)
    │
    ▼
Parse JSON and apply settings
    │
    ▼
State updated with saved values
```

---

## State Management

### State Categories

1. **Book State**: Loading, book data, errors
2. **Reading State**: Location, page, progress, chapter
3. **Settings State**: Font, size, spacing, width
4. **UI State**: Drawers, popovers, modals
5. **Vocabulary State**: Known words, vocabulary words, selection

### State Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    State Management                      │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Local State │   │  localStorage│   │  API State   │
│  (React)     │   │  (Persistence)│   │  (Server)   │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  UI Updates  │   │  Settings    │   │  Bookmarks   │
│  Real-time   │   │  Persisted   │   │  Progress   │
└──────────────┘   └──────────────┘   └──────────────┘
```

### Key State Interactions

**Settings Changes**:
```
User Action → State Update → useEffect → Save to localStorage → Persist
```

**Progress Tracking**:
```
Location Change → Calculate Progress → Auto-save (every 3s) → API Call
```

**Theme Changes**:
```
Theme Cycle → CSS Variables Update → ReaderThemeSync → Apply Colors
```

---

## Theme System Integration

### Theme Flow

```
Global Theme Controller
    │
    ▼
CSS Variables Updated (--c-canvas, --c-ink, etc.)
    │
    ▼
ReaderThemeSync Component
    │
    ├── Reads current theme index
    ├── Gets theme colors from theme controller
    └── Applies CSS variables to document root
    │
    ▼
Reader Page Uses CSS Variables
    │
    ├── Background: var(--c-canvas)
    ├── Text: var(--c-ink)
    ├── Borders: var(--c-soft)
    └── Accents: var(--c-spark)
```

### Theme Synchronization

**ReaderThemeSync Component** (`components/reader-theme-sync.tsx`):

1. **Initialization**: Reads current theme on mount
2. **Theme Change Listener**: Listens for 'theme-change' events
3. **CSS Variable Application**: Applies theme colors to document root
4. **Cleanup**: Restores original values on unmount

**Theme Colors Applied**:
- `--c-canvas`: Background color
- `--c-ink`: Text color
- `--c-strong`: Primary buttons, emphasis
- `--c-soft`: Borders, secondary elements
- `--c-spark`: Accents, focus rings
- `--c-hover`: Hover states
- `--c-muted`: Muted text
- `--c-light`: Light backgrounds

---

## Book Format Handling

### EPUB Books

**Rendering**: Uses `react-reader` library (wraps epubjs)

**Features**:
- CFI-based location tracking
- Table of contents support
- Word-level interaction
- Vocabulary word highlighting
- Custom API endpoint routing

**Location System**:
```
EPUB Location (CFI string)
    │
    ▼
epubjs locations.generate()
    │
    ▼
Location cache (fingerprint-based)
    │
    ▼
Page calculation from CFI
    │
    ▼
Progress percentage
```

**API Routing**:
- Main EPUB: `/api/books/{id}/epub`
- Internal files: `/api/books/{id}/epub/{path}`
- Handles META-INF, OEBPS, and other EPUB structure

### PDF Books

**Rendering**: Uses `react-pdf` library

**Features**:
- Page-based navigation
- Page number tracking
- Text selection support

### Plain Text Books

**Rendering**: Direct HTML rendering with pagination

**Features**:
- Scroll-based pagination
- Character position tracking
- Word marking for vocabulary
- Search highlighting

**Pagination Logic**:
```
Content Height ÷ Viewport Height = Total Pages
Scroll Position ÷ Viewport Height = Current Page
```

---

## User Interactions

### Text Selection Flow

```
User selects text (click/tap word or drag selection)
    │
    ▼
handleTextSelection() called
    │
    ├── EPUB: Word passed from EpubReader
    ├── PDF/Text: Window selection used
    └── Context extracted (100 chars before/after)
    │
    ▼
Validation (2-6 words, max 100 chars)
    │
    ▼
Translation API call
    │
    ├── POST /api/translate
    ├── Body: { text: selectedText }
    └── Response: { translatedText, alternativeTranslations }
    │
    ▼
Show Translation UI
    ├── Desktop: Popover near selection
    └── Mobile: Bottom drawer
    │
    ▼
User can:
    ├── Save to vocabulary
    ├── View alternatives
    └── Close translation
```

### Bookmark Flow

```
User clicks bookmark button (or presses 'B')
    │
    ▼
handleAddBookmark() called
    │
    ▼
Get current location
    ├── EPUB: CFI string + page number
    ├── PDF: Page number
    └── Text: Character position
    │
    ▼
Create bookmark via API
    ├── POST /api/bookmarks
    ├── Body: { bookId, epubLocation/pageNumber/position }
    └── Response: { id, ... }
    │
    ▼
Update bookmarks list
    │
    ▼
Show success toast
```

### Auto-Save Progress Flow

```
Location changes (every page turn/scroll)
    │
    ▼
Throttled auto-save (every 3 seconds)
    │
    ▼
autoSaveProgress() called
    │
    ▼
PUT /api/bookmarks/last-read
    ├── Body: { bookId, progressPercentage, location }
    └── Silent save (no toast)
    │
    ▼
lastSavedLocationRef updated
    │
    ▼
Prevents duplicate saves
```

### Keyboard Shortcuts

**Navigation**:
- `←` / `→`: Previous/Next page (EPUB/PDF)
- `↑` / `↓`: Scroll up/down (Text)
- `Home` / `End`: First/Last page

**Actions**:
- `B`: Add bookmark
- `S`: Save word to vocabulary (when translation open)
- `Esc`: Close overlays/drawers
- `?`: Show keyboard shortcuts help
- `F`: Toggle distraction-free mode

**Shortcut Handling**:
```
Keydown Event
    │
    ▼
Check if modal/dialog open (ignore if so)
    │
    ▼
Check modifier keys (Ctrl/Cmd/Alt)
    │
    ▼
Execute action based on key
    │
    ▼
Prevent default if handled
```

---

## Data Flow Diagrams

### Complete Reading Session Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Opens Reader                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Load Book Data                                              │
│  - Fetch from /api/books/{id}                               │
│  - Load saved settings from localStorage                    │
│  - Load last read position                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Initialize Reader                                           │
│  - Apply settings (font, size, etc.)                        │
│  - Set up theme sync                                        │
│  - Initialize book-specific renderer                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Render Content                                              │
│  - EPUB: Load via EpubReader                                │
│  - PDF: Load pages via PdfViewer                            │
│  - Text: Render paginated content                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  User Interactions Loop                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │  Read    │→ │  Select  │→ │ Translate│                │
│  └──────────┘  └──────────┘  └──────────┘                │
│       │              │              │                        │
│       │              │              ▼                        │
│       │              │      ┌──────────┐                    │
│       │              │      │  Save    │                    │
│       │              │      │  Word    │                    │
│       │              │      └──────────┘                    │
│       │              │                                      │
│       │              ▼                                      │
│       │      ┌──────────┐                                  │
│       │      │ Bookmark │                                  │
│       │      └──────────┘                                  │
│       │                                                    │
│       ▼                                                    │
│  ┌──────────┐                                            │
│  │ Progress │                                            │
│  │ Auto-save│                                            │
│  └──────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

### Settings Change Flow

```
┌─────────────────────────────────────────────────────────────┐
│  User Changes Setting (e.g., Font Size)                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  State Update                                                │
│  setFontSize(newValue)                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  useEffect([fontSize]) Triggers                              │
│  - Save to localStorage                                      │
│  - Apply to book renderer                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Book Renderer Updates                                        │
│  - EPUB: Update rendition themes                             │
│  - PDF: Re-render with new font                             │
│  - Text: Recalculate pagination                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Visual Update                                               │
│  - Content reflows with new settings                         │
│  - Progress recalculated if needed                           │
└─────────────────────────────────────────────────────────────┘
```

### Translation Flow

```
┌─────────────────────────────────────────────────────────────┐
│  User Selects Text                                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  handleTextSelection()                                        │
│  - Extract text and context                                  │
│  - Validate (2-6 words, max 100 chars)                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Translation API Call                                         │
│  POST /api/translate                                         │
│  Body: { text: selectedText }                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Show Translation UI                                          │
│  - Desktop: Popover positioned near selection                │
│  - Mobile: Bottom drawer                                     │
│  - Display: Translation + Alternatives                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  User Actions                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │   Save   │  │  Close   │  │  View    │                │
│  │   Word   │  │          │  │  Alts    │                │
│  └──────────┘  └──────────┘  └──────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### EPUB Location & Progress Flow

```
┌─────────────────────────────────────────────────────────────┐
│  EPUB Book Loads                                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Generate Locations                                           │
│  - Check cache (fingerprint-based)                           │
│  - If not cached: locations.generate()                        │
│  - Cache result for future use                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Location Changes (Page Turn)                                 │
│  - CFI string updated                                         │
│  - Calculate percentage from CFI                              │
│  - Calculate page number                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Progress Update                                              │
│  - Update currentPage state                                   │
│  - Update readingProgress state                              │
│  - Update currentChapter (if available)                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Auto-Save (Throttled)                                        │
│  - Every 3 seconds                                           │
│  - Only if location changed                                  │
│  - PUT /api/bookmarks/last-read                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      ReaderPage                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  State Management                                      │  │
│  │  - Settings state                                      │  │
│  │  - Book state                                         │  │
│  │  - UI state                                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│        ┌───────────────────┼───────────────────┐          │
│        │                   │                   │          │
│        ▼                   ▼                   ▼          │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐        │
│  │ TopBar   │      │ Settings │      │ Content  │        │
│  │          │      │          │      │          │        │
│  │ Shows:   │      │ Controls:│      │ Renders: │        │
│  │ - Title  │      │ - Font   │      │ - EPUB   │        │
│  │ - Page   │      │ - Size   │      │ - PDF    │        │
│  │ - %      │      │ - Layout │      │ - Text   │        │
│  └──────────┘      └──────────┘      └──────────┘        │
│        │                   │                   │          │
│        │                   │                   │          │
│        └───────────────────┼───────────────────┘          │
│                            │                                │
│                            ▼                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Event Handlers                                       │  │
│  │  - handleTextSelection()                             │  │
│  │  - handleAddBookmark()                               │  │
│  │  - handleSaveWord()                                  │  │
│  │  - Keyboard shortcuts                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│                            ▼                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Overlays & Drawers                                   │  │
│  │  - TranslationPopover/Drawer                          │  │
│  │  - BookmarksDrawer                                    │  │
│  │  - TocDrawer                                          │  │
│  │  - KeyboardShortcutsOverlay                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features Deep Dive

### Vocabulary Word Highlighting

**How it works**:
1. User saves words to vocabulary (not marked as "known")
2. Vocabulary data loads when book opens
3. EpubReader wraps each word in `<span class="epub-word">`
4. Words in vocabulary set get `unknown-word` class
5. CSS applies subtle purple highlight

**Visual Indicator**:
- Very subtle background: `rgba(147, 51, 234, 0.12)`
- Subtle border-bottom: `rgba(147, 51, 234, 0.25)`
- Only visible on close inspection
- Hover: Slightly more visible

### Auto-Hide Top Bar

**Desktop Behavior**:
```
User Activity Detected
    │
    ├── Scroll event
    ├── Mouse movement
    └── Any interaction
    │
    ▼
Show Top Bar (opacity: 1)
    │
    ▼
Start 3-second timer
    │
    ▼
Timer expires
    │
    ▼
Hide Top Bar (opacity: 0)
```

**Mobile Behavior**:
```
Scroll Down (>50px)
    │
    ▼
Hide Top Bar
    │
    ▼
Scroll Up
    │
    ▼
Show Top Bar
```

### Distraction-Free Mode

**When Enabled**:
- Top bar completely hidden
- Container padding removed
- Full viewport reading
- Exit button in top-right (minimal)
- All functionality preserved

**Exit Methods**:
- Click exit button
- Press 'F' key
- Open settings (exits automatically)

---

## Performance Optimizations

### Location Caching

**EPUB Location Cache**:
- Fingerprint-based caching
- Fingerprint includes: fontSize, fontFamily, lineHeight, readingWidth, containerSize
- Cached in IndexedDB
- Prevents regeneration on every load

### Throttled Updates

**Auto-Save**:
- Throttled to every 3 seconds
- Only saves if location changed
- Silent (no toast notifications)

**Settings Application**:
- EPUB theme updates throttled (100ms)
- Prevents excessive re-renders
- Batched updates

### Lazy Loading

**Components**:
- Drawers load on-demand
- Translation API called only when needed
- Vocabulary data loaded asynchronously

---

## Error Handling

### Book Loading Errors

**EPUB Errors**:
- File not found
- Invalid EPUB format
- Network errors
- Displayed in error boundary

**PDF Errors**:
- File corruption
- Rendering failures
- Fallback to error message

**Text Errors**:
- Content loading failures
- Displayed inline

### Error Boundaries

**ReaderErrorBoundary**:
- Catches rendering errors
- Shows user-friendly error message
- Allows retry

---

## Accessibility Features

### Keyboard Navigation

- Full keyboard support
- Focus management
- ARIA labels on all interactive elements
- Screen reader friendly

### Reduced Motion

- Respects `prefers-reduced-motion`
- Disables animations when requested
- Instant transitions

### Focus Management

- Focus trap in modals
- Focus restoration on close
- Keyboard focus indicators

---

## Future Enhancements

### Potential Additions

1. **Reading Analytics**
   - Reading speed tracking
   - Time spent reading
   - Words learned

2. **Advanced Search**
   - Full-text search
   - Search within book
   - Highlight all matches

3. **Annotations**
   - Highlight text
   - Add notes
   - Export annotations

4. **Social Features**
   - Share quotes
   - Reading groups
   - Progress sharing

---

## Technical Notes

### Dependencies

- **react-reader**: EPUB rendering
- **react-pdf**: PDF rendering
- **epubjs**: EPUB parsing and location management
- **lucide-react**: Icons
- **@radix-ui**: UI primitives (Sheet, Dialog, Popover, etc.)

### Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers supported
- Requires JavaScript enabled

### Performance Considerations

- Large EPUBs: Locations generation can take time
- PDF rendering: Page-by-page loading
- Text books: Pagination calculated on render

---

## Conclusion

The Reader Page is a sophisticated, multi-format reading interface with extensive customization options, vocabulary learning features, and a focus on user experience. The architecture is modular, allowing for easy extension and maintenance.

Key strengths:
- Clean separation of concerns
- Comprehensive state management
- Responsive design
- Accessibility support
- Performance optimizations

The component structure allows for easy addition of new features while maintaining code quality and user experience.
