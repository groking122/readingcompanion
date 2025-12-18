# How the Review Algorithm Works - Simple Guide

## The Big Picture

The algorithm helps you remember words by showing them **just before you forget**. Easy words appear less often, hard words appear more often.

## The Three Key Numbers

Every word has 3 numbers that track how well you know it:

### 1. **Ease Factor** (starts at 2.5)
- **What it does**: Controls how fast review intervals grow
- **How it changes**:
  - ✅ **Easy (5)**: Goes UP → word becomes "easier" → longer waits
  - ✅ **Good (4)**: Stays the SAME
  - ❌ **Hard (2)**: Goes DOWN → word becomes "harder" → shorter waits  
  - ❌ **Wrong (0)**: Goes DOWN a lot → needs more practice

### 2. **Interval** (starts at 1 day)
- **What it is**: Days until next review
- **How it's calculated**:
  - **1st review**: Always 1 day
  - **2nd review**: 6 days (if correct)
  - **3rd+ review**: Previous interval × Ease Factor

### 3. **Repetitions** (starts at 0)
- **What it is**: Count of correct answers in a row
- **How it changes**:
  - ✅ **Correct**: +1
  - ❌ **Wrong**: Resets to 0

## Real Example: Learning "καλημέρα"

### Day 1: First Review
- **You see**: "καλημέρα"
- **You rate**: "Good" (4)
- **What happens**:
  - Repetitions: 0 → 1
  - Interval: 1 day
  - Ease Factor: 2.5 (no change)
- **Next review**: Tomorrow

### Day 2: Second Review
- **You see**: "καλημέρα"  
- **You rate**: "Good" (4)
- **What happens**:
  - Repetitions: 1 → 2
  - Interval: 6 days (special rule!)
  - Ease Factor: 2.5 (no change)
- **Next review**: Day 8 (6 days later)

### Day 8: Third Review
- **You see**: "καλημέρα"
- **You rate**: "Easy" (5)
- **What happens**:
  - Repetitions: 2 → 3
  - Ease Factor: 2.5 → 2.6 (increased!)
  - Interval: 6 × 2.6 = 15.6 ≈ 16 days
- **Next review**: Day 24

### Day 24: Fourth Review
- **You see**: "καλημέρα"
- **You rate**: "Good" (4)
- **What happens**:
  - Repetitions: 3 → 4
  - Ease Factor: 2.6 (stays same)
  - Interval: 16 × 2.6 = 41.6 ≈ 42 days
- **Next review**: Day 66

**See how intervals grow?** 1 day → 6 days → 16 days → 42 days...

## The Math (Simple Version)

### Ease Factor Formula
```
New EF = Old EF + (0.1 - (5 - Quality) × (0.08 + (5 - Quality) × 0.02))
```

**What this means**:
- Quality 5 (Easy): EF + 0.1
- Quality 4 (Good): EF + 0.0 (stays same)
- Quality 2 (Hard): EF - 0.15
- Quality 0 (Wrong): EF - 0.2

### Interval Formula
```
If repetitions = 1: interval = 1 day
If repetitions = 2: interval = 6 days  
If repetitions ≥ 3: interval = previous interval × ease factor
```

## Visual Timeline

```
Day 1: Save "καλημέρα"
  ↓
Day 1: Review → "Good" → Next: Day 2
  ↓
Day 2: Review → "Good" → Next: Day 8  
  ↓
Day 8: Review → "Easy" → Next: Day 24
  ↓
Day 24: Review → "Good" → Next: Day 66
  ↓
Day 66: Review → "Good" → Next: Day 108
  ↓
...keeps growing...
```

## Why It Works

1. **Adaptive**: Adjusts to YOUR performance
2. **Efficient**: Easy words = less reviews, Hard words = more reviews
3. **Proven**: Used by millions (Anki, SuperMemo, etc.)
4. **Simple**: Just 3 numbers!

## Where It Lives

- **Code**: `lib/sm2.ts` (65 lines)
- **Database**: `flashcards` table
  - `easeFactor`: 2.5
  - `interval`: 6
  - `repetitions`: 2
  - `dueAt`: 2025-01-08

## The Code (Simplified)

```typescript
function updateCard(card, quality) {
  // 1. Update ease factor
  easeFactor = easeFactor + formula(quality)
  
  // 2. Update repetitions and interval
  if (quality < 3) {
    // Wrong - reset everything
    repetitions = 0
    interval = 1
  } else {
    // Correct - increase
    repetitions += 1
    if (repetitions === 1) interval = 1
    else if (repetitions === 2) interval = 6
    else interval = interval × easeFactor
  }
  
  // 3. Calculate next review
  dueAt = today + interval days
}
```

## Key Takeaways

- ✅ **Easy words** = High EF = Long intervals = Less reviews
- ❌ **Hard words** = Low EF = Short intervals = More reviews  
- 🔄 **Wrong answers** = Reset = Start over = More practice

That's it! Simple but powerful. 🎯

