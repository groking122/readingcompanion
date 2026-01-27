# How Page Numbers Work

This document explains how page numbers are calculated and displayed for both EPUB and text books.

## Overview

Page numbers work differently for **EPUB books** vs **text books** because they use different underlying technologies:

- **EPUB books**: Use epubjs library with CFI (Canonical Fragment Identifier) locations
- **Text books**: Calculate pages based on scroll position and content height

---

## State Variables

The component tracks these state variables:

```typescript
const [currentPage, setCurrentPage] = useState<number | null>(null)
const [totalPages, setTotalPages] = useState<number | null>(null)
const [readingProgress, setReadingProgress] = useState(0)
```

- `currentPage`: The current page number (1-indexed)
- `totalPages`: Total number of pages in the book
- `readingProgress`: Reading progress percentage (0-100)

---

## EPUB Books

### How It Works

EPUB books use the **epubjs** library which provides a `locations` API. This API:
1. Divides the book into "locations" (like pages)
2. Provides a `total` count of locations
3. Can convert between CFI (location string) and percentage

### Page Calculation Flow

**Step 1: Location Change Event**
```typescript
onLocationChange={(loc) => {
  // 'loc' is either a CFI string or percentage number
  // This fires when user navigates (arrow keys, TOC, etc.)
}}
```

**Step 2: Get Book Locations**
```typescript
const locations = bookRef.current.locations
```

**Step 3: Check if Locations are Ready**
```typescript
const hasLocations = locations.length && locations.length() > 0
const hasTotal = locations.total !== null && locations.total !== undefined
```

**Step 4: Calculate Percentage from CFI**
```typescript
if (typeof loc === 'string') {
  // loc is a CFI string like "epubcfi(/6/10!/4/2[filepos7618]/2/2/1:0)"
  percentage = locations.percentageFromCfi(loc) || 0
}
```

**Step 5: Calculate Page Number**
```typescript
if (locations.total > 0) {
  const total = Number(locations.total)  // e.g., 1000 locations
  setTotalPages(total)
  
  // Convert percentage to page number
  // percentage = 25.5 means we're 25.5% through the book
  // page = ceil(25.5 / 100 * 1000) = ceil(255) = 255
  const page = Math.max(1, Math.min(total, Math.ceil((percentage / 100) * total) || 1))
  setCurrentPage(page)
}
```

### Example

If a book has 1000 locations total:
- At 0% progress → Page 1
- At 25% progress → Page 250 (25% of 1000)
- At 50% progress → Page 500
- At 100% progress → Page 1000

### When Locations Are Generated

Locations are generated **asynchronously** after the book loads:

```typescript
onRenditionReady={async (rend, book) => {
  setTimeout(async () => {
    // Wait for book to fully open
    if (!bookObj.locations.length || bookObj.locations.length() === 0) {
      // Generate locations (1000 is a good default)
      await bookObj.locations.generate(1000)
    }
  }, 1000)
}}
```

**Important**: Page numbers won't show until locations are generated!

---

## Text Books

### How It Works

Text books calculate pages based on:
- **Content height**: Total height of all text content
- **Container height**: Visible viewport height
- **Scroll position**: How far user has scrolled

### Page Calculation Flow

**Step 1: Get DOM Elements**
```typescript
const contentEl = bookContentRef.current      // The content div
const container = scrollContainerRef.current // The scrollable container
```

**Step 2: Measure Heights**
```typescript
const containerHeight = container.clientHeight  // e.g., 600px (visible area)
const contentHeight = contentEl.scrollHeight   // e.g., 6000px (total content)
const scrollTop = container.scrollTop          // e.g., 1200px (scrolled down)
```

**Step 3: Calculate Total Pages**
```typescript
// Each "page" = one viewport height
// totalPages = ceil(6000 / 600) = 10 pages
const estimatedTotalPages = Math.max(1, Math.ceil(contentHeight / containerHeight))
setTotalPages(estimatedTotalPages)
```

**Step 4: Calculate Current Page**
```typescript
// currentPage = floor(1200 / 600) + 1 = floor(2) + 1 = 3
// We're on page 3 (1-indexed)
const currentPageNum = Math.max(1, Math.min(
  estimatedTotalPages, 
  Math.floor(scrollTop / containerHeight) + 1
))
setCurrentPage(currentPageNum)
```

**Step 5: Calculate Progress**
```typescript
// progress = (1200 / (6000 - 600)) * 100 = (1200 / 5400) * 100 = 22.2%
const progress = Math.min(100, Math.max(0, 
  (scrollTop / (contentHeight - containerHeight)) * 100
))
setReadingProgress(progress)
```

### Example

If content is 6000px tall and viewport is 600px:
- Scroll at 0px → Page 1 (0%)
- Scroll at 600px → Page 2 (11%)
- Scroll at 3000px → Page 5 (55%)
- Scroll at 5400px → Page 10 (100%)

### Event Listeners

Page numbers update in real-time:

```typescript
// Recalculate on scroll
container.addEventListener('scroll', calculatePages, { passive: true })

// Recalculate on window resize (font size changes, etc.)
window.addEventListener('resize', calculatePages, { passive: true })
```

---

## Display Logic

### EPUB Books Display

```typescript
{(readingProgress > 0 || currentPage !== null) && (
  <div>
    <span>
      {currentChapter || "Reading..."}
      {/* Show "Page X of Y" if both are available */}
      {currentPage !== null && totalPages !== null && totalPages > 0 && 
        ` • Page ${currentPage} of ${totalPages}`}
      {/* Show "Page X" if only current page is available */}
      {currentPage !== null && (totalPages === null || totalPages === 0) && 
        ` • Page ${currentPage}`}
    </span>
    {readingProgress > 0 && <span>{Math.round(readingProgress)}%</span>}
  </div>
)}
```

### Text Books Display

```typescript
{book.type === "text" && currentPage !== null && totalPages !== null && (
  <div>
    <span>Page {currentPage} of {totalPages}</span>
    {readingProgress > 0 && <span>{Math.round(readingProgress)}%</span>}
  </div>
)}
```

---

## Common Issues & Debugging

### Issue 1: Page Numbers Not Showing for EPUB

**Possible Causes:**
1. Locations haven't been generated yet
2. `locations.total` is null or 0
3. Book hasn't fully loaded

**Debug:**
```typescript
console.log('Locations:', bookRef.current?.locations)
console.log('Total:', bookRef.current?.locations?.total)
console.log('Current page:', currentPage)
console.log('Total pages:', totalPages)
```

**Solution:** Wait for locations to generate (usually happens automatically after book loads)

### Issue 2: Page Numbers Wrong for Text Books

**Possible Causes:**
1. Content height not calculated correctly
2. Scroll position not updating
3. Font size changes not triggering recalculation

**Debug:**
```typescript
console.log('Content height:', contentEl.scrollHeight)
console.log('Container height:', container.clientHeight)
console.log('Scroll top:', container.scrollTop)
console.log('Calculated page:', currentPageNum)
```

**Solution:** Check that `bookContentRef` and `scrollContainerRef` are properly attached

### Issue 3: Page Numbers Jump Around

**Possible Causes:**
1. Multiple calculations happening simultaneously
2. Race conditions in state updates

**Solution:** The code uses `Math.max` and `Math.min` to clamp values, but ensure calculations only happen when needed

---

## Key Differences Summary

| Feature | EPUB Books | Text Books |
|---------|-----------|------------|
| **Source** | epubjs locations API | DOM measurements |
| **Total Pages** | `locations.total` | `ceil(contentHeight / containerHeight)` |
| **Current Page** | `ceil(percentage / 100 * total)` | `floor(scrollTop / containerHeight) + 1` |
| **Updates** | On location change | On scroll/resize |
| **Requires** | Locations generation | DOM rendering |

---

## Testing Page Numbers

### For EPUB:
1. Open an EPUB book
2. Wait a few seconds for locations to generate
3. Navigate using arrow keys or TOC
4. Check if page numbers update

### For Text:
1. Open a text book
2. Scroll down
3. Check if page numbers update
4. Resize window - page numbers should recalculate
5. Change font size - page numbers should recalculate

---

## Code Locations

- **State variables**: `app/(protected)/reader/[id]/page.tsx` lines 253-254
- **EPUB calculation**: `app/(protected)/reader/[id]/page.tsx` lines 1704-1790
- **Text calculation**: `app/(protected)/reader/[id]/page.tsx` lines 352-394
- **Display**: `app/(protected)/reader/[id]/page.tsx` lines 1672-1689 (EPUB) and 2052-2055 (text)


