# How the Review Algorithm Works - Simple Explanation

## The Big Idea

The algorithm helps you remember words by showing them to you **just before you forget**. The better you know a word, the longer you wait before reviewing it again.

## The Three Numbers

Every word has three important numbers:

### 1. **Ease Factor** (starts at 2.5)
- **What it is**: A multiplier that controls how fast intervals grow
- **How it changes**:
  - ✅ **Easy answer (5)**: Increases → word becomes "easier" → longer intervals
  - ✅ **Good answer (4)**: Stays about the same
  - ❌ **Hard answer (2)**: Decreases → word becomes "harder" → shorter intervals
  - ❌ **Wrong answer (0)**: Decreases a lot → word needs more practice

### 2. **Interval** (starts at 1 day)
- **What it is**: How many days until the next review
- **How it's calculated**:
  - **First review**: Always 1 day
  - **Second review**: 6 days (if you got it right)
  - **Third+ review**: Previous interval × Ease Factor

### 3. **Repetitions** (starts at 0)
- **What it is**: Count of consecutive correct answers
- **How it changes**:
  - ✅ **Correct answer**: Increases by 1
  - ❌ **Wrong answer**: Resets to 0

## Step-by-Step Example

Let's say you save the word "καλημέρα" (good morning):

### Day 1: First Review
- **You rate**: "Good" (4)
- **What happens**:
  - Repetitions: 0 → 1
  - Interval: 1 day
  - Ease Factor: 2.5 (stays same)
- **Next review**: Tomorrow (Day 2)

### Day 2: Second Review  
- **You rate**: "Good" (4)
- **What happens**:
  - Repetitions: 1 → 2
  - Interval: 6 days (special rule for 2nd review)
  - Ease Factor: 2.5 (stays same)
- **Next review**: Day 8 (6 days later)

### Day 8: Third Review
- **You rate**: "Easy" (5)
- **What happens**:
  - Repetitions: 2 → 3
  - Ease Factor: 2.5 → ~2.6 (increases because it was easy)
  - Interval: 6 × 2.6 = 15.6 days ≈ 16 days
- **Next review**: Day 24 (16 days later)

### Day 24: Fourth Review
- **You rate**: "Good" (4)
- **What happens**:
  - Repetitions: 3 → 4
  - Ease Factor: 2.6 (stays same)
  - Interval: 16 × 2.6 = 41.6 days ≈ 42 days
- **Next review**: Day 66 (42 days later)

## The Math (Simplified)

### Ease Factor Formula
```
New EF = Old EF + (0.1 - (5 - Quality) × (0.08 + (5 - Quality) × 0.02))
```

**Examples**:
- Quality 5 (Easy): EF increases by ~0.1
- Quality 4 (Good): EF stays about the same
- Quality 2 (Hard): EF decreases by ~0.15
- Quality 0 (Wrong): EF decreases by ~0.2

### Interval Formula
```
If repetitions = 1: interval = 1 day
If repetitions = 2: interval = 6 days
If repetitions ≥ 3: interval = previous interval × ease factor
```

## Why This Works

1. **Adaptive**: Adjusts to YOUR performance, not a fixed schedule
2. **Efficient**: Easy words reviewed less, hard words reviewed more
3. **Proven**: Used by millions in apps like Anki
4. **Simple**: Just 3 numbers track everything

## Visual Timeline

```
Day 1: Save word "καλημέρα"
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
...intervals keep growing...
```

## Key Points

- **Easy words** = High ease factor = Long intervals = Less frequent reviews
- **Hard words** = Low ease factor = Short intervals = More frequent reviews
- **Wrong answers** = Reset everything = Start over = More practice needed

## Where It's Stored

- **Code**: `lib/sm2.ts` (just 65 lines!)
- **Database**: `flashcards` table with columns:
  - `easeFactor` (e.g., 2.5)
  - `interval` (e.g., 6 days)
  - `repetitions` (e.g., 2)
  - `dueAt` (timestamp of next review)

## The Algorithm in Code

```typescript
// When you review a word and rate it:
updateCard(card, quality) {
  // 1. Update ease factor based on quality
  easeFactor = easeFactor + formula(quality)
  
  // 2. Update repetitions
  if (quality < 3) {
    repetitions = 0  // Reset if wrong
    interval = 1
  } else {
    repetitions += 1  // Increase if correct
    if (repetitions === 1) interval = 1
    else if (repetitions === 2) interval = 6
    else interval = interval × easeFactor
  }
  
  // 3. Calculate next review date
  dueAt = today + interval days
}
```

That's it! Simple but powerful. 🚀

