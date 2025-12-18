# Review Algorithm Explanation

## Overview

Reading Companion uses the **SuperMemo 2 (SM-2)** algorithm for spaced repetition. This is a well-established, research-backed algorithm used by popular flashcard apps like Anki.

## How It Works

### What is Spaced Repetition?

Spaced repetition is a learning technique where you review information at increasing intervals. The better you know something, the longer you wait before reviewing it again. This maximizes learning efficiency and long-term retention.

### SM-2 Algorithm Details

#### Key Components

1. **Ease Factor (EF)**: A multiplier that determines how quickly intervals increase
   - Starts at 2.5 (default)
   - Minimum: 1.3
   - Increases when you answer correctly
   - Decreases when you answer incorrectly

2. **Interval**: Days until the next review
   - Starts at 1 day
   - Increases based on repetitions and ease factor

3. **Repetitions**: Number of consecutive correct answers
   - Resets to 0 when you answer incorrectly
   - Affects how intervals are calculated

#### Quality Scale

When reviewing, you rate how well you knew the answer:

- **0 (Again)**: Complete blackout - didn't remember at all
- **2 (Hard)**: Remembered with difficulty
- **4 (Good)**: Remembered correctly
- **5 (Easy)**: Knew it immediately, very easy

#### How Intervals Are Calculated

1. **First review (repetitions = 0)**:
   - Interval = 1 day (regardless of quality)

2. **Second review (repetitions = 1)**:
   - If quality ≥ 3: Interval = 6 days
   - If quality < 3: Reset to 1 day

3. **Third review and beyond (repetitions ≥ 2)**:
   - If quality ≥ 3: Interval = Previous Interval × Ease Factor
   - If quality < 3: Reset to 1 day

#### Ease Factor Updates

The ease factor changes based on your performance:

```
New EF = Old EF + (0.1 - (5 - Quality) × (0.08 + (5 - Quality) × 0.02))
```

- **Quality 5 (Easy)**: EF increases (makes it easier)
- **Quality 4 (Good)**: EF stays roughly the same
- **Quality 2 (Hard)**: EF decreases (makes it harder)
- **Quality 0 (Again)**: EF decreases significantly

### Example Timeline

Let's say you save a new word "καλημέρα" (good morning):

1. **Day 1**: First review
   - You rate it "Good" (4)
   - Interval = 1 day
   - Next review: Day 2

2. **Day 2**: Second review
   - You rate it "Good" (4)
   - Interval = 6 days
   - Next review: Day 8

3. **Day 8**: Third review
   - You rate it "Easy" (5)
   - EF increases to ~2.6
   - Interval = 6 × 2.6 = 15.6 days ≈ 16 days
   - Next review: Day 24

4. **Day 24**: Fourth review
   - You rate it "Good" (4)
   - Interval = 16 × 2.6 = 41.6 days ≈ 42 days
   - Next review: Day 66

As you can see, the intervals grow exponentially, meaning well-known words are reviewed less frequently, while difficult words are reviewed more often.

### Why SM-2?

1. **Proven**: Used by millions of learners worldwide
2. **Adaptive**: Adjusts to your individual performance
3. **Efficient**: Maximizes retention while minimizing review time
4. **Simple**: Easy to understand and implement

### Tips for Best Results

1. **Be honest**: Rate yourself accurately - don't cheat!
2. **Review daily**: Consistency is key to spaced repetition
3. **Focus on difficult words**: The algorithm will show them more often
4. **Trust the system**: Even if a word seems easy, review it when due

## Technical Implementation

The algorithm is implemented in `lib/sm2.ts`:

- `createNewCard()`: Creates a new flashcard with default SM-2 values
- `updateCard(card, quality)`: Updates a card based on your quality rating

The flashcards are stored in the database with:
- `easeFactor`: Current ease factor
- `interval`: Days until next review
- `repetitions`: Number of consecutive correct answers
- `dueAt`: Timestamp of when the card is due for review

