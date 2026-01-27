# How Bookmarks Work

This document explains the bookmark system, how it works, and potential issues.

## Overview

The bookmark system has **two types** of bookmarks:

1. **Auto-Save Bookmarks** (`title = "__LAST_READ__"`)
   - Automatically saves reading progress
   - Hidden from the UI
   - Updated every 3 seconds while reading

2. **Manual Bookmarks**
   - Created by clicking the bookmark button or pressing `B`
   - Shown in the bookmarks drawer
   - Can be named, edited, and deleted

---

## Database Schema

```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  book_id UUID NOT NULL REFERENCES books(id),
  title TEXT,                    -- NULL for auto-save, custom name for manual
  epub_location TEXT,            -- CFI string for EPUB books
  page_number INTEGER,           -- Page number for PDF/text books
  position INTEGER,              -- Character position for text books
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Key Points:**
- At least ONE of `epubLocation`, `pageNumber`, or `position` must be set
- `title` is NULL for auto-save bookmarks
- `title = "__LAST_READ__"` is the special marker for auto-save

---

## Bookmark Creation Flow

### 1. Manual Bookmark Creation (Button Click)

**Location:** `app/(protected)/reader/[id]/page.tsx` lines 1537-1580

**Steps:**

```typescript
// Step 1: Prepare bookmark data
const bookmarkData: any = { bookId: book.id }

// Step 2: Add location based on book type
if (book.type === "epub" && currentLocation) {
  bookmarkData.epubLocation = currentLocation  // CFI string
  if (currentPage !== null && currentPage > 0) {
    bookmarkData.pageNumber = currentPage
  }
} else if (book.type === "text" && currentPage !== null && currentPage > 0) {
  bookmarkData.pageNumber = currentPage
}

// Step 3: Validate - must have at least one location
if (!bookmarkData.epubLocation && !bookmarkData.pageNumber && !bookmarkData.position) {
  toast.error("Cannot create bookmark", "No valid location found.")
  return
}

// Step 4: Clean undefined values
const cleanBookmarkData = Object.fromEntries(
  Object.entries(bookmarkData).filter(([_, v]) => v !== undefined)
)

// Step 5: Send to API
fetch("/api/bookmarks", {
  method: "POST",
  body: JSON.stringify(cleanBookmarkData)
})
```

**Potential Issues:**
- ❌ If `currentLocation` is null/undefined for EPUB → bookmark fails
- ❌ If `currentPage` is null/0 for text books → bookmark fails
- ❌ No user feedback if bookmark creation fails silently

### 2. Manual Bookmark Creation (Keyboard Shortcut `B`)

**Location:** `app/(protected)/reader/[id]/page.tsx` lines 541-595

**Same flow as button click**, but triggered by keyboard shortcut.

### 3. Auto-Save Bookmark (Reading Progress)

**Location:** `app/(protected)/reader/[id]/page.tsx` lines 282-328

**Steps:**

```typescript
// Called automatically every 3 seconds while reading
const autoSaveProgress = async (loc: string | number, progress: number) => {
  // Skip if location hasn't changed
  if (lastSavedLocationRef.current === loc) return
  
  // Prepare data
  const bookmarkData: any = {
    bookId: book.id,
    progressPercentage: Math.round(progress)
  }
  
  // Add location based on book type
  if (book.type === "epub" && typeof loc === "string") {
    bookmarkData.epubLocation = loc
    if (currentPage !== null && currentPage > 0) {
      bookmarkData.pageNumber = currentPage
    }
  } else if (book.type === "text" && typeof loc === "number") {
    bookmarkData.position = loc  // ⚠️ Uses position, not pageNumber!
  }
  
  // Send to special endpoint
  fetch("/api/bookmarks/last-read", {
    method: "PUT",  // Upsert (update or create)
    body: JSON.stringify(bookmarkData)
  })
}
```

**Key Differences:**
- Uses `PUT /api/bookmarks/last-read` (not `POST /api/bookmarks`)
- Automatically sets `title = "__LAST_READ__"`
- For text books, uses `position` instead of `pageNumber` ⚠️

**Potential Issues:**
- ⚠️ **Inconsistency**: Manual bookmarks use `pageNumber`, auto-save uses `position` for text books
- ❌ Auto-save might fail silently if location is invalid

---

## Bookmark Navigation Flow

### 1. EPUB Books

**Location:** `app/(protected)/reader/[id]/page.tsx` lines 1992-2002

```typescript
if (book.type === "epub" && bookmark.epubLocation && renditionRef.current) {
  try {
    // Navigate using CFI location
    renditionRef.current.display(bookmark.epubLocation)
    setLocation(bookmark.epubLocation)
    setCurrentLocation(bookmark.epubLocation)
    setBookmarksOpen(false)
    toast.success("Navigated to bookmark", "...")
  } catch (e) {
    console.error("Error navigating to bookmark:", e)
    toast.error("Navigation failed", "...")
  }
}
```

**How It Works:**
1. Uses epubjs `rendition.display(epubLocation)` to navigate
2. Updates state to reflect new location
3. Shows success/error toast

**Potential Issues:**
- ❌ If `renditionRef.current` is null → navigation fails silently
- ❌ If `epubLocation` is invalid → navigation fails
- ❌ No fallback if CFI location doesn't exist

### 2. Text Books

**Location:** `app/(protected)/reader/[id]/page.tsx` lines 2003-2025

```typescript
if (book.type === "text" && bookmark.pageNumber) {
  const container = scrollContainerRef.current
  if (container && bookContentRef.current) {
    const containerHeight = container.clientHeight
    // Calculate scroll position: (pageNumber - 1) * containerHeight
    const scrollPosition = (bookmark.pageNumber - 1) * containerHeight
    container.scrollTo({
      top: scrollPosition,
      behavior: 'smooth'
    })
    setCurrentPage(bookmark.pageNumber)
    setBookmarksOpen(false)
    toast.success("Navigated to bookmark", "...")
  } else {
    // Fallback: just set page number
    setCurrentPage(bookmark.pageNumber)
    setBookmarksOpen(false)
    toast.success("Navigated to bookmark", "...")
  }
}
```

**How It Works:**
1. Gets scroll container and content refs
2. Calculates scroll position: `(pageNumber - 1) * containerHeight`
3. Scrolls to that position
4. Updates current page state

**Potential Issues:**
- ❌ **Major Issue**: If refs aren't ready → fallback just sets state, doesn't scroll
- ❌ If content height changed (font size, window resize) → wrong scroll position
- ❌ Page calculation might be wrong if content hasn't fully rendered
- ⚠️ Fallback doesn't actually navigate, just sets state

---

## API Endpoints

### 1. GET `/api/bookmarks?bookId=xxx`

**Purpose:** Fetch all bookmarks for a book

**Returns:** Array of bookmarks (including auto-save)

**Code:** `app/api/bookmarks/route.ts` lines 9-51

### 2. POST `/api/bookmarks`

**Purpose:** Create a manual bookmark

**Request Body:**
```json
{
  "bookId": "uuid",
  "epubLocation": "epubcfi(...)",  // Optional for EPUB
  "pageNumber": 123,                // Optional for text/PDF
  "position": 456,                  // Optional for text
  "title": "My Bookmark"            // Optional
}
```

**Validation:**
- Must have `bookId`
- Must have at least one location (`epubLocation`, `pageNumber`, or `position`)

**Code:** `app/api/bookmarks/route.ts` lines 53-137

### 3. PUT `/api/bookmarks/last-read`

**Purpose:** Upsert (update or create) auto-save bookmark

**Request Body:**
```json
{
  "bookId": "uuid",
  "epubLocation": "epubcfi(...)",  // Optional
  "pageNumber": 123,                // Optional
  "position": 456,                  // Optional
  "progressPercentage": 45          // Optional
}
```

**Behavior:**
- If bookmark with `title = "__LAST_READ__"` exists → UPDATE
- Otherwise → CREATE

**Code:** `app/api/bookmarks/last-read/route.ts`

### 4. DELETE `/api/bookmarks/[id]`

**Purpose:** Delete a bookmark

**Code:** `app/api/bookmarks/[id]/route.ts` lines 9-44

### 5. PATCH `/api/bookmarks/[id]`

**Purpose:** Update bookmark title

**Code:** `app/api/bookmarks/[id]/route.ts` lines 46-84

---

## UI Components

### BookmarksDrawer

**Location:** `components/bookmarks-drawer.tsx`

**Features:**
- Lists all bookmarks (filters out `__LAST_READ__`)
- Click bookmark → navigate
- Edit button → rename bookmark
- Delete button → remove bookmark
- Shows page number and creation date

**Key Code:**
```typescript
// Filter out auto-save bookmarks
const displayBookmarks = bookmarks.filter(b => b.title !== "__LAST_READ__")
```

---

## Common Issues & Bugs

### Issue 1: Bookmarks Don't Navigate Correctly

**Symptoms:**
- Click bookmark → nothing happens
- Click bookmark → wrong location
- Click bookmark → error toast

**Causes:**
1. **EPUB**: `renditionRef.current` is null
2. **Text**: Refs not ready when navigation happens
3. **Text**: Content height changed since bookmark was created
4. **Text**: Page calculation is wrong

**Debug:**
```typescript
console.log('Rendition ready:', !!renditionRef.current)
console.log('Bookmark:', bookmark)
console.log('Scroll container:', !!scrollContainerRef.current)
console.log('Content ref:', !!bookContentRef.current)
```

**Fix:** Add better error handling and retry logic

### Issue 2: Bookmarks Created Without Location

**Symptoms:**
- Bookmark created but navigation doesn't work
- Error: "No valid location found"

**Causes:**
1. `currentLocation` is null for EPUB
2. `currentPage` is null/0 for text books
3. Page numbers not calculated yet

**Fix:** Wait for location/page to be ready before allowing bookmark creation

### Issue 3: Auto-Save Uses Different Field

**Symptoms:**
- Auto-save works but manual bookmarks don't navigate correctly
- Text book bookmarks use `position` vs `pageNumber`

**Cause:** Inconsistency between auto-save (uses `position`) and manual (uses `pageNumber`)

**Fix:** Standardize on `pageNumber` for text books

### Issue 4: Page Numbers Wrong After Font Size Change

**Symptoms:**
- Bookmark navigates to wrong page after changing font size
- Page numbers recalculate but bookmarks don't update

**Cause:** Page numbers are calculated based on content height, which changes with font size

**Fix:** Store percentage or CFI instead of page number, or recalculate on navigation

---

## Recommended Fixes

### Fix 1: Better Navigation Error Handling

```typescript
onNavigate={(bookmark) => {
  if (book.type === "epub") {
    if (!renditionRef.current) {
      toast.error("Book not ready", "Please wait for the book to load.")
      return
    }
    if (!bookmark.epubLocation) {
      toast.error("Invalid bookmark", "This bookmark has no location data.")
      return
    }
    // ... navigation code
  } else if (book.type === "text") {
    if (!scrollContainerRef.current || !bookContentRef.current) {
      // Retry after a delay
      setTimeout(() => onNavigate(bookmark), 500)
      return
    }
    // ... navigation code
  }
}}
```

### Fix 2: Wait for Location Before Creating Bookmark

```typescript
const canCreateBookmark = () => {
  if (book.type === "epub") {
    return !!currentLocation && !!renditionRef.current
  } else if (book.type === "text") {
    return currentPage !== null && currentPage > 0 && !!scrollContainerRef.current
  }
  return false
}

// Disable button if can't create bookmark
<Button
  disabled={!canCreateBookmark()}
  onClick={...}
>
```

### Fix 3: Standardize Text Book Location Storage

**Current:** Auto-save uses `position`, manual uses `pageNumber`

**Fix:** Use `pageNumber` for both, or convert `position` to `pageNumber` on navigation

### Fix 4: Store Percentage Instead of Page Number

For text books, store scroll percentage instead of page number:

```typescript
const scrollPercentage = (scrollTop / (contentHeight - containerHeight)) * 100
bookmarkData.scrollPercentage = scrollPercentage

// On navigation:
const scrollPosition = (scrollPercentage / 100) * (contentHeight - containerHeight)
container.scrollTo({ top: scrollPosition })
```

---

## Testing Checklist

- [ ] Create bookmark for EPUB book → navigates correctly
- [ ] Create bookmark for text book → navigates correctly
- [ ] Edit bookmark name → saves correctly
- [ ] Delete bookmark → removes from list
- [ ] Auto-save works → last read position restored on reload
- [ ] Navigate to bookmark after font size change → still correct
- [ ] Navigate to bookmark after window resize → still correct
- [ ] Create bookmark when location not ready → shows error
- [ ] Navigate when book not ready → shows error or retries

---

## Code Locations

- **Bookmark Creation (Button)**: `app/(protected)/reader/[id]/page.tsx` lines 1537-1580
- **Bookmark Creation (Keyboard)**: `app/(protected)/reader/[id]/page.tsx` lines 541-595
- **Auto-Save**: `app/(protected)/reader/[id]/page.tsx` lines 282-328
- **Navigation**: `app/(protected)/reader/[id]/page.tsx` lines 1991-2026
- **API GET/POST**: `app/api/bookmarks/route.ts`
- **API PUT (last-read)**: `app/api/bookmarks/last-read/route.ts`
- **API DELETE/PATCH**: `app/api/bookmarks/[id]/route.ts`
- **UI Component**: `components/bookmarks-drawer.tsx`


