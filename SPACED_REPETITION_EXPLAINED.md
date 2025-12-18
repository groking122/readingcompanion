# How "Next Review" Date Works

## What Does "Next: 12/16/2025" Mean?

**"Next: 12/16/2025"** means that's the date when this word will appear in your **Review** page again.

## How It Works

### 1. When You Save a Word
- A flashcard is automatically created
- It's **due immediately** (you can review it right away)
- The "Next" date is set to today

### 2. When You Review a Word
You go to the **Review** page and see flashcards. For each word, you rate how well you knew it:

- **Again (0)** - Didn't remember at all
- **Hard (2)** - Remembered with difficulty  
- **Good (4)** - Remembered correctly
- **Easy (5)** - Knew it immediately

### 3. The Algorithm Calculates Next Review Date

Based on your rating, the **SM-2 spaced repetition algorithm** calculates when you should review it next:

**Example Timeline:**

1. **Day 1** - You save "καλημέρα" → Due immediately
2. **Day 1** - You review and rate "Good (4)" → Next review in **1 day** (Day 2)
3. **Day 2** - You review and rate "Good (4)" → Next review in **6 days** (Day 8)
4. **Day 8** - You review and rate "Easy (5)" → Next review in **~16 days** (Day 24)
5. **Day 24** - You review and rate "Good (4)" → Next review in **~42 days** (Day 66)

### 4. The Review Page Only Shows Due Words

The **Review** page (`/review`) only shows words where:
- `dueAt <= today` (the date has arrived or passed)

So if "Next: 12/16/2025" means:
- **Before Dec 16, 2025**: Word won't appear in Review page
- **On/After Dec 16, 2025**: Word will appear in Review page

## Visual Indicators

### In Vocabulary Page:
- **"Due" badge** (orange) = Word is ready for review NOW
- **"Next review: 12/16/2025"** = Date when it will appear in Review page
- **"Due in X days"** = Countdown until review

### In Review Page:
- Only shows words that are **due now**
- After you review them, they disappear until their next due date

## Why This System?

**Spaced Repetition** is scientifically proven to:
- ✅ Maximize long-term memory retention
- ✅ Minimize study time
- ✅ Show difficult words more often
- ✅ Show easy words less often

The algorithm adapts to your performance - if you consistently rate words as "Easy", they'll appear less frequently. If you struggle with a word, it will appear more often until you master it.

## Summary

- **"Next: 12/16/2025"** = Date when word appears in Review page
- **Review page** = Only shows words due today or earlier
- **After reviewing** = Algorithm calculates new "Next" date based on how well you knew it
- **Better performance** = Longer intervals between reviews
- **Worse performance** = Shorter intervals (more practice)

