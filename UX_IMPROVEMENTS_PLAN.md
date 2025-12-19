# UX/UI Improvements Implementation Plan

## Priority 1: Reader Experience (Biggest UX Win)

### ✅ Reading Mode Layout
- Center text with max-width ~66ch (45-75ch range)
- Consistent margins
- Proper line length for comfortable reading

### ✅ Theme Presets
- Light / Sepia / Dark / Paper backgrounds
- Remove gradients from reading surface
- Keep gradients only in dashboards

### ✅ Settings Drawer
- Single "Aa" button
- Unified controls: font family, size, line height, paragraph spacing, max-width
- Works same for EPUB + text

### ✅ Distraction-Free Mode
- Toggle to hide sidebars/top UI
- Tap/press to show controls

## Priority 2: Word Lookup Popover

### ✅ Dismissible/Hoverable/Persistent
- Close button + Esc to dismiss
- Doesn't vanish when cursor moves into it
- WCAG compliant

### ✅ Positioning
- Never covers selected word
- Pin position above/below option
- Doesn't hide keyboard focus

### ✅ Saved State Feedback
- Clear "Saved ✓" indicator
- Undo toast notification
- No "did it save?" anxiety

## Priority 3: Mobile-First Polish

### ✅ Touch Targets
- Minimum 48×48px (WCAG 2.2 AA)
- Material Design 48×48dp standard

### ✅ Bottom Action Bar
- Mobile reader: Save / Known / Highlight / Note
- Big touch targets

## Priority 4: Accessibility

### ✅ Focus Visibility
- Strong focus ring
- Not obscured by overlays/sticky UI

### ✅ Reflow Support
- No sideways scroll at 320px
- Works at zoom levels

### ✅ Spacing Tolerance
- Support increased line height
- Support paragraph spacing
- Support letter/word spacing
- Don't break functionality

## Priority 5: Vocabulary Page

### ✅ Dense List View
- Toggle between cards/list
- Better for 500+ words

### ✅ Quick Filters
- Due now, New, Learning, Mastered
- By book, By date

### ✅ Bulk Actions
- Multi-select
- Delete, mark known, move book, export

## Priority 6: Review UX

### ✅ Swipe Gestures
- Mobile: swipe for Hard/Good/Easy
- Progress bar
- "X due today" clarity

### ✅ Session Summary
- Words reviewed
- Accuracy
- Next due

### ✅ Better Buttons
- Big, consistent rating buttons
- Simple answer reveal

## Priority 7: Library/Dashboard

### ✅ Resume Reading
- Primary CTA: last book + position
- Reading progress on cards
- Last opened timestamp

### ✅ Better Empty States
- "Upload EPUB/PDF or paste text"
- 1-click sample book

