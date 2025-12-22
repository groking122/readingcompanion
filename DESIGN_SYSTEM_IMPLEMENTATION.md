# Design System Implementation

## Overview
This document details the sophisticated design system implementation for Reading Companion, including color tokens, toast notifications, and micro-interactions.

## 1. Design Tokens (`lib/design-tokens.ts`)

### Color System
- **Primary Colors**: HSL-based primary color palette (50-900 scale)
- **Semantic Colors**: Success, Warning, Error, Info with light/dark variants
- **Category Colors**: 17 predefined colors for book categories
- **Background Colors**: Light/dark mode support

### Spacing Scale
- 8px base unit system
- Consistent spacing from 4px to 96px
- Used throughout the application for consistent layouts

### Typography
- **Font Families**: Sans-serif and monospace stacks
- **Font Sizes**: xs to 6xl with line heights
- **Font Weights**: Normal, medium, semibold, bold
- **Letter Spacing**: Tighter to widest scale

### Shadows & Elevation
- **Standard Shadows**: sm, md, lg, xl, 2xl
- **Custom Shadows**: soft, elevated, glow
- **Inner Shadow**: For inset elements

### Animation System
- **Durations**: Fast (150ms) to slowest (1000ms)
- **Easing Functions**: Linear, easeIn, easeOut, easeInOut, bounce, smooth
- **Z-Index Scale**: Base to toast (0-1080)

### Breakpoints
- Responsive breakpoints: sm, md, lg, xl, 2xl
- Mobile-first approach

## 2. Toast Notification System

### Components
- **`components/ui/toast.tsx`**: Toast component with 4 types (success, error, warning, info)
- **`components/toast-provider.tsx`**: Provider component for global toast state
- **`lib/toast.ts`**: Toast manager singleton with React hook

### Features
- **4 Toast Types**: Success (green), Error (red), Warning (yellow), Info (blue)
- **Auto-dismiss**: Configurable duration (default 5s, errors 7s)
- **Manual Dismiss**: Close button on each toast
- **Action Buttons**: Optional action buttons in toasts
- **Smooth Animations**: Slide-in from right, fade out
- **Accessibility**: ARIA labels and live regions

### Usage
```typescript
import { toast } from "@/lib/toast"

// Success
toast.success("Word saved!", "Added to your vocabulary.")

// Error
toast.error("Failed to save", "Please try again.")

// Warning
toast.warning("EPUB not available", "This book might be a PDF.")

// Info
toast.info("Already in library", "This book is already in your library.")

// With action
toast.show({
  type: "success",
  title: "Export complete!",
  description: "Exported 50 words to JSON file.",
  action: {
    label: "View file",
    onClick: () => window.open("/downloads")
  }
})
```

### Integration Points
- ✅ Library: Book add/delete, wishlist add
- ✅ Vocabulary: Export, import, word operations
- ✅ Wishlist: Add, update, delete
- ✅ Suggested Books: Add to library/wishlist
- ✅ Reader: Save word, mark known, undo, bookmark

## 3. Micro-Interactions

### Enhanced Button Component
- **Hover Effects**: Lift with shadow, translate up
- **Active State**: Scale down (0.98) for tactile feedback
- **Smooth Transitions**: 200ms duration with ease-out
- **Variant-Specific**: Different hover effects per variant

### Card Interactions
- **Hover Lift**: Cards lift with enhanced shadow
- **Scale on Hover**: Subtle scale (1.02) for depth
- **Staggered Animations**: List items animate with delay
- **Gradient Overlays**: Subtle gradient on hover

### Icon Animations
- **Rotate on Hover**: Icons rotate 3deg on hover
- **Scale Animation**: Icons scale to 110% on hover
- **Smooth Transitions**: 300ms duration

### Utility Classes (`app/globals.css`)

#### Hover Effects
- `.hover-lift-smooth`: Lift with shadow on hover
- `.interactive-press`: Scale down on active
- `.magnetic-hover`: Subtle translate up
- `.glow-hover`: Glowing shadow effect

#### Animations
- `.bounce-in`: Bounce entrance animation
- `.slide-in-right`: Slide from right
- `.fade-in-scale`: Fade with scale
- `.pulse-glow`: Pulsing glow effect
- `.gradient-shift`: Animated gradient background

#### Loading States
- `.shimmer-loading`: Shimmer effect for loading
- `.skeleton`: Skeleton loading animation

### Ripple Effect
- `.ripple`: Ripple effect on button press
- Expands from click point
- Smooth fade out

## 4. Enhanced Global Styles

### CSS Custom Properties
- Semantic color variables
- Animation duration variables
- Z-index scale variables
- Consistent spacing

### Transitions
- Smooth transitions for theme changes
- Optimized performance (excluded media)
- Consistent timing across elements

### Scrollbar Styling
- Custom scrollbar matching design system
- Smooth hover states
- Dark mode support

### Selection Styling
- Branded selection colors
- Better visibility
- Consistent across browsers

## 5. Integration Examples

### Library Page
- Toast on book add: "Book added! Your EPUB has been added to your library."
- Toast on delete: "Book deleted. The book and its associated vocabulary have been removed."
- Toast on wishlist add: "Added to wishlist! [Title] has been added to your wishlist."
- Cards with hover-lift-smooth effect
- Staggered fade-in animations

### Vocabulary Page
- Toast on export: "Export complete! Exported X words to JSON file."
- Toast on import: Success/error with count
- Cards with enhanced hover effects
- Smooth transitions

### Reader Page
- Toast on save word: "Word saved! [word] has been added to your vocabulary."
- Toast on mark known: "Marked as known. [word] won't show in future lookups."
- Toast on undo: "Undone. Word has been removed from your vocabulary."
- Toast on bookmark: "Bookmark added! You can return to this location anytime."

### Wishlist Page
- Toast on add: "Added to wishlist! [Title] has been added to your wishlist."
- Toast on update: "Wishlist updated! [Title] has been updated."
- Toast on delete: "Removed from wishlist. [Title] has been removed."

### Suggested Books Page
- Toast on add to library: "Book added! [Title] has been added to your library."
- Toast on add to wishlist: "Added to wishlist! [Title] has been added to your wishlist."
- Toast on duplicate: "Already in library. This book is already in your library!"

## 6. Design Principles Applied

### Feedback & Visibility (Don Norman)
- ✅ Toast notifications provide immediate feedback
- ✅ Visual indicators for all actions
- ✅ Clear success/error states

### Consistency & Standards (Shneiderman)
- ✅ Unified design tokens
- ✅ Consistent spacing and typography
- ✅ Predictable interactions

### Aesthetic & Minimalist Design (Dieter Rams)
- ✅ Clean, purposeful animations
- ✅ Subtle micro-interactions
- ✅ Refined color usage

### User Control & Freedom (Tognazzini)
- ✅ Undo capabilities with feedback
- ✅ Clear action feedback
- ✅ Dismissible notifications

## 7. Performance Considerations

- CSS transforms for animations (GPU-accelerated)
- Excluded media elements from transitions
- Efficient animation timing
- Reduced repaints and reflows
- Optimized toast rendering

## 8. Accessibility

- ARIA labels on toasts
- Live regions for screen readers
- Keyboard accessible (Esc to dismiss)
- Focus management
- High contrast support

## Conclusion

The design system provides a sophisticated, consistent, and delightful user experience throughout the Reading Companion application. All interactions feel polished, responsive, and provide clear feedback to users.

