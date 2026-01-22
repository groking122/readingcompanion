# UI/UX Architecture Documentation

## Overview

This document provides a comprehensive breakdown of each page's structure, user flows, and identifies opportunities for simplification and improvement.

---

## Design System Overview

### Color Usage Patterns
- **Background**: `#F5F5F7` (light) / `#0a0a0c` (dark) - Consistent across all pages
- **Cards**: `#FFFFFF` (light) / `#131316` (dark) - Using `bento-card` class
- **Primary Actions**: Gradient from amber to violet
- **Accent Colors**: 
  - Library: Primary (dark blue)
  - Suggested: Blue-500
  - Vocabulary: Violet
  - Review: Orange-500
  - Wishlist: Pink

### Typography Hierarchy
- **Headings**: Serif font (Playfair Display or similar) - Bold, large tracking
- **Body**: Sans-serif (Inter) - Medium weight
- **Small Text**: Sans-serif - Regular weight, muted color

### Spacing System
- Base unit: 4px (0.25rem)
- Cards: 24px border radius (`rounded-3xl`)
- Compact cards: 12px border radius (`rounded-xl`)
- Consistent padding: `p-4 md:p-6 lg:p-8`

### Component Patterns
- **Bento Card**: Main container with glassmorphism effect, 24px radius
- **Icon Container**: 48-56px squircle containers with colored backgrounds
- **Grid Layouts**: Responsive grids with consistent gaps

---

## Page-by-Page Breakdown

### 1. Home Page (`/`)

#### Purpose & User Goals
- **Primary Goal**: Quick overview of reading progress and quick navigation
- **User Actions**: 
  - Resume reading current book
  - View recent vocabulary words
  - Quick access to main sections
  - See reading statistics

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ Header (Greeting + Current Book Hero)  │
│ 60% width hero card + 40% stats cards   │
├─────────────────────────────────────────┤
│ Bento Grid:                             │
│ - Wishlist Widget (left)                │
│ - Recent Words Widget (right)           │
├─────────────────────────────────────────┤
│ Quick Actions (4 cards in grid)        │
└─────────────────────────────────────────┘
```

**Visual Hierarchy:**
1. Personal greeting (largest text)
2. Current book hero card (prominent CTA)
3. Stats cards (quick metrics)
4. Widgets (secondary information)
5. Quick Actions (navigation shortcuts)

#### Navigation Flow
- **Entry Point**: Default landing page after login
- **Can Navigate To**: All main sections via Quick Actions or header nav
- **Context**: No breadcrumbs needed (home page)

#### Key Components
1. **Hero Card** (`bento-card glass-card`)
   - Current book display
   - Progress bar
   - Resume button (primary CTA)
   
2. **Stats Cards** (3 small bento cards)
   - Books count
   - Words count
   - Due flashcards count

3. **Wishlist Widget**
   - Book spines visualization
   - "View All" link

4. **Recent Words Widget**
   - Compact grid (3-7 columns responsive)
   - Shows 15 words max
   - Word + translation only

5. **Quick Actions**
   - 4 icon cards with hover effects
   - Library, Suggested, Vocabulary, Review

#### Data Flow
- **On Load**: Fetches in parallel:
  - Books (`/api/books`)
  - Wishlist (`/api/wishlist`)
  - Vocabulary (`/api/vocabulary`)
  - Flashcards (`/api/flashcards?due=true`)
- **Secondary**: Fetches bookmarks for progress calculation
- **Display**: Shows latest book, recent 5 wishlist items, recent 15 words

#### Interaction Patterns
- **Hover**: Cards lift and scale slightly
- **Click**: Navigate to respective pages
- **Loading**: Spinner with message
- **Empty States**: Helpful CTAs to get started

#### Complexity Analysis
**Current Complexity:**
- ✅ Good: Clear visual hierarchy
- ✅ Good: Quick access to all sections
- ⚠️ Moderate: Multiple data fetches (could be optimized)
- ⚠️ Moderate: Progress calculation happens client-side

**Simplification Opportunities:**
1. **Reduce Data Fetching**: Could combine into single endpoint
2. **Simplify Progress Calculation**: Move to backend
3. **Consolidate Widgets**: Consider tabs for different views
4. **Reduce Visual Clutter**: Fewer cards, more whitespace

---

### 2. Library Page (`/library`)

#### Purpose & User Goals
- **Primary Goal**: Manage book collection, add new books/notes
- **User Actions**:
  - View all books and notes
  - Add new book (EPUB/PDF/text)
  - Add new note
  - Open book to read
  - Delete book
  - Add to wishlist

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ Header (Title + Add Button)            │
├──────────┬─────────────────────────────┤
│ Sidebar  │ Main Content Area           │
│ Filters  │ - Form (if adding)          │
│          │ - Book Grid (2 columns)     │
└──────────┴─────────────────────────────┘
```

**Visual Hierarchy:**
1. Page title and primary action (Add Book)
2. Sidebar filters (sticky)
3. Book cards in grid

#### Navigation Flow
- **Entry Point**: Quick Actions, Header nav, or direct link
- **Can Navigate To**: 
  - Reader page (click book)
  - Wishlist (add from library)
- **Context**: Shows collection status

#### Key Components
1. **Sidebar** (`lg:col-span-1`)
   - Category filters (All, Books, Notes)
   - Sticky positioning
   - Bento card container

2. **Book Cards** (`lg:col-span-3`)
   - Cover placeholder (80% height)
   - Title + progress bar (20% height)
   - Action buttons (Open, Wishlist, Delete)
   - Uses `bento-card` styling

3. **Add Form** (conditional)
   - Category selector
   - File upload or text input
   - Form validation

#### Data Flow
- **On Load**: Fetches books (`/api/books`)
- **On Filter Change**: Client-side filtering
- **On Add**: POST to `/api/books`
- **On Delete**: DELETE to `/api/books/[id]`

#### Interaction Patterns
- **Filter**: Instant client-side filtering
- **Add**: Form appears inline, replaces grid
- **Delete**: Confirmation dialog
- **Hover**: Card lifts with shadow

#### Complexity Analysis
**Current Complexity:**
- ✅ Good: Sidebar filters are clear
- ✅ Good: Book cards show essential info
- ⚠️ Moderate: Form appears inline (could be modal)
- ⚠️ Moderate: Multiple actions per card

**Simplification Opportunities:**
1. **Form Modal**: Move add form to modal/drawer instead of inline
2. **Reduce Card Actions**: Consider dropdown menu instead of 2 buttons
3. **Simplify Filters**: Could use tabs instead of sidebar
4. **Progress Display**: Currently placeholder - needs real progress calculation

---

### 3. Vocabulary Page (`/vocab`)

#### Purpose & User Goals
- **Primary Goal**: Review and manage saved vocabulary words
- **User Actions**:
  - Search words
  - Filter by book
  - View word details (term, translation, context)
  - Navigate to word location in book
  - Export vocabulary
  - Import vocabulary

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ Header (Title + Export/Import)         │
├─────────────────────────────────────────┤
│ Search Bar (large, glowing) + Filter   │
├─────────────────────────────────────────┤
│ Card Grid (2 columns)                  │
│ Each card:                              │
│ - Term + Translation                    │
│ - Context sentence                      │
│ - Book info + Date                      │
│ - Flashcard status                      │
└─────────────────────────────────────────┘
```

**Visual Hierarchy:**
1. Search bar (prominent, glowing on focus)
2. Word cards (equal importance)
3. Metadata (smaller, muted)

#### Navigation Flow
- **Entry Point**: Quick Actions, Header nav, or from Recent Words widget
- **Can Navigate To**: 
  - Reader page (click "Go to location")
  - Review page (for due words)
- **Context**: Shows vocabulary collection status

#### Key Components
1. **Search Bar**
   - Large size (h-14)
   - Rounded-2xl
   - Glow effect on focus
   - Search icon

2. **Word Cards** (`bento-card`)
   - Term (bold, large)
   - Translation (medium, muted)
   - Context sentence (italic, smaller)
   - Metadata row (book, date, flashcard info)
   - "Due" badge if applicable

3. **Filter Dropdown**
   - Book selector
   - "All Books" option

#### Data Flow
- **On Load**: Fetches vocabulary (`/api/vocabulary`) and books (`/api/books`)
- **On Search**: Client-side filtering
- **On Filter**: Client-side filtering
- **Export**: Generates JSON file client-side
- **Import**: Reads file, POSTs to `/api/vocabulary`

#### Interaction Patterns
- **Search**: Real-time filtering as you type
- **Filter**: Instant filtering
- **Card Click**: Navigate to word location
- **Export/Import**: File operations

#### Complexity Analysis
**Current Complexity:**
- ✅ Good: Prominent search
- ✅ Good: Cards show all relevant info
- ⚠️ Moderate: Cards can be information-dense
- ⚠️ Moderate: Multiple metadata fields

**Simplification Opportunities:**
1. **Reduce Card Density**: Hide some metadata by default, show on hover
2. **Simplify Export/Import**: Could be in dropdown menu
3. **Better Empty States**: More actionable when no words
4. **Group by Book**: Consider tabs or sections by book

---

### 4. Suggested Page (`/suggested`)

#### Purpose & User Goals
- **Primary Goal**: Discover new books to read
- **User Actions**:
  - Browse suggested books
  - Search books
  - Filter by category
  - Add to library (if EPUB available)
  - Add to wishlist

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ Header (Title + Description)            │
├─────────────────────────────────────────┤
│ Search + Category Filter                │
├─────────────────────────────────────────┤
│ Featured Book Hero (if no filters)      │
├─────────────────────────────────────────┤
│ Category Strips (horizontal scroll)     │
│ OR                                      │
│ Book Grid (if filtered/searched)        │
└─────────────────────────────────────────┘
```

**Visual Hierarchy:**
1. Featured book (when no filters - large hero card)
2. Category sections (horizontal scrolling)
3. Book cards (grid layout)

#### Navigation Flow
- **Entry Point**: Quick Actions or Header nav
- **Can Navigate To**: 
  - Library (after adding book)
  - Wishlist (after adding)
- **Context**: Discovery/exploration mode

#### Key Components
1. **Featured Book Hero**
   - Large bento card with glass effect
   - Book cover placeholder
   - Title, author, category
   - Action buttons

2. **Category Strips**
   - Horizontal scrolling sections
   - Each category has its own strip
   - Cards in horizontal flex layout

3. **Book Cards**
   - Category-colored left border
   - Title, author, category badge
   - Add EPUB or Wishlist buttons

#### Data Flow
- **On Load**: Fetches suggested books (`/api/suggested-books`)
- **On Search/Filter**: Debounced API call (300ms)
- **On Add**: POST to `/api/books/add-from-default` or `/api/wishlist`

#### Interaction Patterns
- **Search**: Debounced API call
- **Filter**: Instant API call
- **Horizontal Scroll**: Smooth scrolling
- **Add Actions**: Loading states, success toasts

#### Complexity Analysis
**Current Complexity:**
- ✅ Good: Featured book draws attention
- ✅ Good: Category organization
- ⚠️ Moderate: Two different layouts (featured vs grid)
- ⚠️ Moderate: Horizontal scrolling can be missed

**Simplification Opportunities:**
1. **Unify Layout**: Always use same card style
2. **Simplify Categories**: Could use tabs instead of horizontal scroll
3. **Reduce Actions**: Combine "Add EPUB" and "Wishlist" into dropdown
4. **Better Empty States**: More engaging when no results

---

### 5. Review Page (`/review`)

#### Purpose & User Goals
- **Primary Goal**: Practice vocabulary with spaced repetition
- **User Actions**:
  - Answer exercise questions
  - Rate difficulty (Hard/Good/Easy)
  - Complete review session
  - View progress

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ Fullscreen Focus Mode                   │
│ ┌───────────────────────────────────┐  │
│ │ Minimal Header (Progress)          │  │
│ ├───────────────────────────────────┤  │
│ │                                     │  │
│ │   Centered Card (Exercise)         │  │
│ │                                     │  │
│ └───────────────────────────────────┘  │
│ Blurred Background                      │
└─────────────────────────────────────────┘
```

**Visual Hierarchy:**
1. Exercise card (centered, prominent)
2. Progress indicator (minimal, top)
3. Background (blurred, non-distracting)

#### Navigation Flow
- **Entry Point**: Quick Actions, Header nav, or from Vocabulary page
- **Can Navigate To**: 
  - Library (after completion)
  - Vocabulary (view all words)
- **Context**: Focus mode - minimal distractions

#### Key Components
1. **Progress Bar**
   - Top of screen
   - Shows current/total
   - Percentage display

2. **Exercise Card** (`bento-card`)
   - Centered on screen
   - Max width: 2xl
   - Contains exercise component:
     - Meaning in Context
     - Cloze Blank
     - Reverse MCQ
     - Matching Pairs

3. **Background**
   - Blurred (`backdrop-blur-xl`)
   - Semi-transparent (`bg-background/80`)

#### Data Flow
- **On Load**: Fetches due flashcards (`/api/flashcards?due=true`) and all vocabulary
- **On Answer**: PATCH to `/api/flashcards` with quality rating
- **On Complete**: Refetches due flashcards

#### Interaction Patterns
- **Answer**: Click/tap answer, shows result
- **Next**: Automatically moves to next exercise
- **Loading**: Fullscreen spinner
- **Empty**: Shows completion message with CTAs

#### Complexity Analysis
**Current Complexity:**
- ✅ Excellent: Focus mode reduces distractions
- ✅ Good: Clear progress indication
- ⚠️ Moderate: Multiple exercise types (could be overwhelming)
- ⚠️ Moderate: No way to pause/skip

**Simplification Opportunities:**
1. **Simplify Exercise Types**: Show one type per session
2. **Add Pause/Skip**: Allow users to take breaks
3. **Session Summary**: Show stats after completion
4. **Reduce Visual Complexity**: Even simpler card design

---

### 6. Wishlist Page (`/wishlist`)

#### Purpose & User Goals
- **Primary Goal**: Manage books you want to read
- **User Actions**:
  - Add books to wishlist
  - Edit wishlist items
  - Delete items
  - Search/filter wishlist
  - Set priority and status

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ Header (Title + Add Button)            │
├─────────────────────────────────────────┤
│ Search + Status Filter                  │
├─────────────────────────────────────────┤
│ Add/Edit Form (if active)               │
├─────────────────────────────────────────┤
│ Card Grid (3 columns)                   │
│ Each card:                              │
│ - Title + Author                        │
│ - Status badge                          │
│ - Notes (if any)                        │
│ - Edit + Delete buttons                 │
└─────────────────────────────────────────┘
```

**Visual Hierarchy:**
1. Add button (primary action)
2. Search/filter (secondary actions)
3. Wishlist cards (content)

#### Navigation Flow
- **Entry Point**: Header nav or from other pages
- **Can Navigate To**: 
  - Library (if book is added)
  - Suggested (to find more books)
- **Context**: Reading goals management

#### Key Components
1. **Add/Edit Form**
   - Inline card (appears above grid)
   - Title, Author, Notes fields
   - Priority and Status selectors
   - Save/Cancel buttons

2. **Wishlist Cards**
   - Priority-colored left border
   - Title, author, status badge
   - Star icon for high priority
   - Notes preview
   - Edit/Delete actions

3. **Search & Filter**
   - Search by title/author
   - Filter by status (All, Want to Read, Reading, Completed)

#### Data Flow
- **On Load**: Fetches wishlist (`/api/wishlist`)
- **On Add**: POST to `/api/wishlist`
- **On Edit**: PATCH to `/api/wishlist/[id]`
- **On Delete**: DELETE to `/api/wishlist/[id]`
- **On Search/Filter**: Client-side filtering

#### Interaction Patterns
- **Add**: Form appears inline
- **Edit**: Form populates with item data
- **Delete**: Confirmation dialog
- **Search**: Real-time filtering
- **Filter**: Instant filtering

#### Complexity Analysis
**Current Complexity:**
- ✅ Good: Clear form structure
- ✅ Good: Status badges are clear
- ⚠️ Moderate: Form appears inline (could be modal)
- ⚠️ Moderate: Multiple fields in form

**Simplification Opportunities:**
1. **Form Modal**: Move to modal/drawer
2. **Simplify Form**: Reduce fields, use smart defaults
3. **Better Status Management**: Visual status indicators
4. **Bulk Actions**: Select multiple items for batch operations

---

## Design System Patterns

### Bento Card Pattern
- **Usage**: Main container for content sections
- **Styling**: `bento-card` class
- **Properties**: 
  - 24px border radius
  - Glass effect in dark mode
  - Subtle shadow
  - Border with gradient in dark mode

### Icon Container Pattern
- **Usage**: Quick Actions and navigation icons
- **Styling**: `icon-container` class
- **Properties**:
  - 48-56px size
  - Squircle shape (16px radius)
  - Colored background (10% opacity)
  - Hover lift effect

### Grid Layout Pattern
- **Usage**: Consistent responsive grids
- **Breakpoints**:
  - Mobile: 1 column
  - Tablet: 2 columns
  - Desktop: 3-4 columns
  - Large: 4-6 columns

---

## Simplification Opportunities Summary

### High Priority
1. **Consolidate Forms**: Move inline forms to modals/drawers
2. **Reduce Card Actions**: Use dropdown menus instead of multiple buttons
3. **Unify Layouts**: Consistent card styles across pages
4. **Simplify Navigation**: Reduce cognitive load in header

### Medium Priority
1. **Optimize Data Fetching**: Combine API calls where possible
2. **Improve Empty States**: More actionable and engaging
3. **Better Loading States**: Consistent loading patterns
4. **Reduce Visual Clutter**: More whitespace, fewer elements

### Low Priority
1. **Add Bulk Actions**: Select multiple items for batch operations
2. **Session Summaries**: Show stats after completing actions
3. **Better Progress Indicators**: Real progress calculation
4. **Keyboard Shortcuts**: Power user features

---

## User Flow Simplification Ideas

### Current Flow Complexity
- **Home → Library**: 1 click ✅
- **Home → Vocabulary**: 1 click ✅
- **Library → Reader**: 1 click ✅
- **Vocabulary → Reader**: 1 click ✅
- **Review → Complete**: Multiple clicks ⚠️

### Proposed Simplifications
1. **Unified Search**: Global search across all content
2. **Quick Actions Everywhere**: Contextual actions in cards
3. **Reduced Form Steps**: Fewer fields, smart defaults
4. **Inline Editing**: Edit without leaving page
5. **Keyboard Navigation**: Arrow keys, shortcuts

---

## Accessibility Considerations

### Current State
- ✅ Semantic HTML
- ✅ ARIA labels on buttons
- ✅ Focus states visible
- ⚠️ Could improve: Keyboard navigation
- ⚠️ Could improve: Screen reader announcements

### Improvements Needed
1. **Keyboard Navigation**: Full keyboard support
2. **Focus Management**: Better focus trapping in modals
3. **Screen Reader**: More descriptive labels
4. **Color Contrast**: Verify all text meets WCAG AA

---

## Performance Considerations

### Current Optimizations
- ✅ Parallel data fetching
- ✅ Client-side filtering
- ✅ Debounced search
- ⚠️ Could improve: Image optimization
- ⚠️ Could improve: Code splitting

### Improvements Needed
1. **Image Optimization**: Lazy loading, proper sizing
2. **Code Splitting**: Route-based splitting
3. **Caching**: Better API response caching
4. **Bundle Size**: Reduce JavaScript bundle

---

## Conclusion

The current UI/UX is well-structured with consistent design patterns. Main areas for improvement focus on:
1. Reducing form complexity (modals instead of inline)
2. Simplifying card actions (dropdowns)
3. Optimizing data flow (combined endpoints)
4. Improving empty and loading states
5. Better keyboard navigation and accessibility

The design system is solid and consistent, making it easier to implement improvements across all pages.

