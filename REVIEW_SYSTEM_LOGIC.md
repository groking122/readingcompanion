# Review System - Complete Logic Documentation

## Overview

The review system implements a spaced repetition learning system using the SuperMemo 2 (SM-2) algorithm. It presents vocabulary words as interactive exercises, including matching pairs exercises every 5th card. The system tracks progress, updates flashcard intervals, and manages exercise generation.

## Data Structures

### Flashcard Interface
```typescript
interface Flashcard {
  flashcard: {
    id: string              // Unique flashcard ID
    easeFactor: number      // SM-2 ease factor (starts at 2.5)
    interval: number        // Days until next review
    repetitions: number     // Consecutive correct answers
    dueAt: string          // ISO timestamp of when card is due
  }
  vocabulary: {
    id: string             // Vocabulary item ID
    term: string           // English word/phrase
    termNormalized?: string // Normalized version
    translation: string    // Greek translation
    context: string        // Sentence context
    kind?: "word" | "phrase"
    bookId: string         // Book this word came from
  }
}
```

### Exercise Types
- `meaning-in-context`: MCQ showing context, asking for translation
- `cloze-blank`: Fill in the blank with word options
- `reverse-mcq`: Show translation, pick the English word
- `matching-pairs`: Match 5 words with their translations

## State Management

### Review Page State Variables

```typescript
const [flashcards, setFlashcards] = useState<Flashcard[]>([])
// Array of all due flashcards fetched from API

const [allVocab, setAllVocab] = useState<VocabularyItem[]>([])
// All vocabulary items (used for generating distractors)

const [currentIndex, setCurrentIndex] = useState(0)
// Current position in flashcards array (0-indexed)

const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null)
// Currently displayed exercise

const [isMatchingPairs, setIsMatchingPairs] = useState(false)
// Flag indicating if current exercise is matching pairs

const [consumedFlashcards, setConsumedFlashcards] = useState(0)
// Counter for flashcards that have been completed (for progress tracking)

const [matchingPairsFlashcardIds, setMatchingPairsFlashcardIds] = useState<string[]>([])
// Array of flashcard IDs used in current matching pairs exercise
// CRITICAL: Must be stored when exercise is generated, not looked up later

const [loading, setLoading] = useState(true)
// Initial loading state

const [updating, setUpdating] = useState(false)
// State during flashcard update API calls
```

## Complete Flow Diagram

### Mermaid Flow Diagram

```mermaid
flowchart TD
    Start([Page Load]) --> FetchFlashcards[fetchDueFlashcards<br/>GET /api/flashcards?due=true]
    FetchFlashcards --> FetchVocab[fetchAllVocab<br/>GET /api/vocabulary]
    FetchVocab --> GenerateExercise[generateCurrentExercise]
    
    GenerateExercise --> CheckMatching{currentIndex % 5 === 0<br/>AND<br/>flashcards.length - currentIndex >= 5?}
    
    CheckMatching -->|Yes| MatchingPath[Generate Matching Pairs]
    CheckMatching -->|No| RegularPath[Generate Regular Exercise]
    
    MatchingPath --> StoreIds[Store flashcard IDs<br/>matchingPairsFlashcardIds]
    StoreIds --> SetMatchingState[Set state:<br/>- currentExercise<br/>- isMatchingPairs = true<br/>- matchingPairsFlashcardIds]
    
    RegularPath --> SelectType[Select exercise type<br/>based on repetitions]
    SelectType --> GenerateRegular[Generate exercise<br/>with distractors]
    GenerateRegular --> SetRegularState[Set state:<br/>- currentExercise<br/>- isMatchingPairs = false<br/>- matchingPairsFlashcardIds = []]
    
    SetMatchingState --> Render[Render Exercise]
    SetRegularState --> Render
    
    Render --> UserInteracts[User Interacts<br/>- Answers question<br/>- Matches pairs]
    UserInteracts --> HandleAnswer[handleExerciseAnswer]
    
    HandleAnswer --> CheckType{isMatchingPairs?}
    
    CheckType -->|Yes| ConvertMatching[Convert to Quality<br/>isCorrect? timeMs?]
    CheckType -->|No| ConvertSingle[Convert to Quality<br/>isCorrect? timeMs?]
    
    ConvertMatching --> UpdateMatching[Update ALL 5 flashcards<br/>PATCH /api/flashcards<br/>Promise.all parallel]
    ConvertSingle --> UpdateSingle[Update single flashcard<br/>PATCH /api/flashcards]
    
    UpdateMatching --> UpdateConsumedMatching[consumedFlashcards += 5]
    UpdateSingle --> UpdateConsumedSingle[consumedFlashcards += 1]
    
    UpdateConsumedMatching --> AdvanceMatching[nextIndex = currentIndex + 5]
    UpdateConsumedSingle --> AdvanceSingle[nextIndex = currentIndex + 1]
    
    AdvanceMatching --> CheckDoneMatching{nextIndex >=<br/>flashcards.length?}
    AdvanceSingle --> CheckDoneSingle{nextIndex >=<br/>flashcards.length?}
    
    CheckDoneMatching -->|Yes| RefreshFlashcards[fetchDueFlashcards<br/>Refresh list]
    CheckDoneMatching -->|No| SetIndexMatching[setCurrentIndex nextIndex]
    CheckDoneSingle -->|Yes| RefreshFlashcards
    CheckDoneSingle -->|No| SetIndexSingle[setCurrentIndex nextIndex]
    
    RefreshFlashcards --> GenerateExercise
    SetIndexMatching --> GenerateExercise
    SetIndexSingle --> GenerateExercise
    
    style Start fill:#e1f5ff
    style MatchingPath fill:#fff4e6
    style RegularPath fill:#e6f7ff
    style UpdateMatching fill:#f0f9ff
    style UpdateSingle fill:#f0f9ff
    style RefreshFlashcards fill:#ffe6e6
```

### Text Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PAGE LOAD                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  fetchDueFlashcards()         │
        │  - GET /api/flashcards?due=true│
        │  - Returns flashcards where   │
        │    dueAt <= now               │
        └──────────────┬─────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  fetchAllVocab()             │
        │  - GET /api/vocabulary        │
        │  - Returns all vocab items    │
        │    (for distractor generation)│
        └──────────────┬─────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  generateCurrentExercise()    │
        │  (useCallback)                │
        └──────────────┬─────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌───────────────────┐      ┌──────────────────────┐
│ Matching Pairs?   │      │ Regular Exercise      │
│ (every 5th card)   │      │                      │
│                    │      │                      │
│ Check:            │      │ - Select exercise     │
│ - currentIndex % 5│      │   type based on      │
│   === 0           │      │   repetitions         │
│ - At least 5       │      │ - Generate exercise  │
│   flashcards left  │      │   with distractors   │
└─────────┬─────────┘      └──────────┬───────────┘
           │                           │
           ▼                           ▼
┌──────────────────────┐    ┌──────────────────────┐
│ Generate Matching    │    │ Set exercise state   │
│ Pairs Exercise:      │    │ - currentExercise    │
│                      │    │ - isMatchingPairs=false│
│ 1. Take next 5       │    │ - Clear matching IDs │
│    flashcards        │    └──────────────────────┘
│ 2. Filter unique      │
│    (by term & trans) │
│ 3. Create pairs       │
│ 4. Shuffle columns   │
│ 5. STORE flashcard   │
│    IDs in state      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Set exercise state   │
│ - currentExercise    │
│ - isMatchingPairs=true│
│ - matchingPairsFlashcardIds│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   RENDER EXERCISE    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ User Interacts       │
│ - Answers question   │
│ - Matches pairs      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ handleExerciseAnswer()│
└──────────┬───────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌──────────┐  ┌──────────────┐
│ Matching │  │ Single       │
│ Pairs    │  │ Exercise     │
└────┬─────┘  └──────┬───────┘
     │               │
     ▼               ▼
┌──────────────────────────────┐
│ Convert to Quality Score    │
│ - isCorrect?                │
│   - No → quality = 0        │
│   - Yes:                    │
│     - timeMs < 3000 → 5     │
│     - else → 4              │
└──────────┬───────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌──────────┐  ┌──────────────┐
│ Update   │  │ Update      │
│ All 5    │  │ Single      │
│ Cards    │  │ Card        │
│          │  │             │
│ PATCH    │  │ PATCH       │
│ /api/    │  │ /api/       │
│ flashcards│  │ flashcards  │
│ (parallel)│  │             │
└────┬─────┘  └──────┬───────┘
     │               │
     ▼               ▼
┌──────────────────────────────┐
│ Update consumedFlashcards   │
│ - Matching: +5              │
│ - Single: +1                │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Advance Index                │
│ - Matching: +5              │
│ - Single: +1                │
│                             │
│ If index >= flashcards.length│
│   → fetchDueFlashcards()     │
│ Else                         │
│   → setCurrentIndex(next)    │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ useEffect triggers           │
│ generateCurrentExercise()    │
│ (because currentIndex changed)│
└──────────────────────────────┘
```

## Key Algorithms

### 1. Exercise Generation Logic (`generateCurrentExercise`)

```typescript
function generateCurrentExercise() {
  // Guard: Must have flashcards and vocab
  if (flashcards.length === 0 || allVocab.length === 0) return
  
  const current = flashcards[currentIndex]
  if (!current) return
  
  // MATCHING PAIRS CHECK (every 5th exercise)
  if (currentIndex % 5 === 0 && flashcards.length - currentIndex >= 5) {
    // Take next 5 flashcards
    const itemsForMatching = flashcards.slice(currentIndex, currentIndex + 5)
    
    // Transform to VocabularyItem format
    const vocabItems = itemsForMatching.map(fc => ({
      id: fc.vocabulary.id,
      term: fc.vocabulary.term,
      translation: fc.vocabulary.translation,
      // ... other fields
    }))
    
    // Generate matching pairs exercise
    const matchingExercise = generateMatchingPairsExercise(vocabItems)
    
    if (matchingExercise) {
      // CRITICAL: Store flashcard IDs NOW (before state changes)
      const flashcardIds = flashcards
        .slice(currentIndex, currentIndex + 5)
        .map(fc => fc.flashcard.id)
      
      setMatchingPairsFlashcardIds(flashcardIds)
      setCurrentExercise(matchingExercise)
      setIsMatchingPairs(true)
      return
    }
    // If matching fails, fall through to regular exercise
  }
  
  // REGULAR EXERCISE
  const vocabItem = {
    id: current.vocabulary.id,
    term: current.vocabulary.term,
    // ... other fields
  }
  
  // Select exercise type based on repetitions
  const exercise = generateExercise(
    vocabItem,
    allVocab,
    undefined,
    current.flashcard.repetitions
  )
  
  if (exercise) {
    setCurrentExercise(exercise)
    setIsMatchingPairs(false)
    setMatchingPairsFlashcardIds([]) // Clear
  }
}
```

**Key Points:**
- Matching pairs only shown when `currentIndex % 5 === 0`
- Must check `flashcards.length - currentIndex >= 5` to ensure enough cards remain
- **CRITICAL**: Store flashcard IDs immediately when generating matching pairs
- Clear matching pairs IDs when generating regular exercises

### 2. Matching Pairs Exercise Generation (`generateMatchingPairsExercise`)

```typescript
function generateMatchingPairsExercise(vocabList: VocabularyItem[]) {
  // 1. Filter for unique pairs
  const uniqueByTerm = uniqBy(vocabList, item => normalizeBase(item.term))
  const uniqueByTranslation = uniqBy(uniqueByTerm, item => normalizeGreek(item.translation))
  
  // 2. Need at least 4 items (5 is ideal)
  if (uniqueByTranslation.length < 4) return null
  
  // 3. Take up to 5 unique items
  const selected = uniqueByTranslation.slice(0, 5)
  
  // 4. Create pairs array
  const pairs = selected.map(item => ({
    term: item.term,
    translation: item.translation,
    id: item.id,  // Vocabulary ID (same for both columns!)
  }))
  
  // 5. Verify uniqueness
  const termNorms = pairs.map(p => normalizeBase(p.term))
  const transNorms = pairs.map(p => normalizeGreek(p.translation))
  
  if (new Set(termNorms).size !== pairs.length || 
      new Set(transNorms).size !== pairs.length) {
    return null
  }
  
  // 6. Shuffle both columns independently
  const shuffledTerms = [...pairs].sort(() => Math.random() - 0.5)
  const shuffledTranslations = [...pairs].sort(() => Math.random() - 0.5)
  
  // 7. Create exercise object
  return {
    type: "matching-pairs",
    vocabularyId: selected.map(s => s.id).join(","), // "id1,id2,id3,id4,id5"
    question: "Match each word with its translation:",
    metadata: {
      pairs,
      shuffledTerms: shuffledTerms.map(p => ({ id: p.id, text: p.term })),
      shuffledTranslations: shuffledTranslations.map(p => ({ id: p.id, text: p.translation })),
    },
    pairs, // Also on root level
  }
}
```

**Critical Understanding:**
- Both `shuffledTerms` and `shuffledTranslations` use the **same vocabulary IDs**
- A correct match is when `termId === translationId` (they're the same vocabulary item)
- The `id` field in both columns refers to the vocabulary item ID, not separate IDs

### 3. Matching Pairs Interaction Logic

```typescript
// In MatchingPairsExercise component

const tryMatch = (termId: string, translationId: string) => {
  // CORRECT MATCH CHECK
  // Both columns use same vocabulary IDs
  // Match is correct when IDs are equal
  const isCorrect = termId === translationId
  
  if (isCorrect) {
    // Add both IDs to matched set
    const newMatched = new Set(matchedPairs)
    newMatched.add(termId)
    newMatched.add(translationId)
    setMatchedPairs(newMatched)
    
    // Clear selections
    setSelectedTerm(null)
    setSelectedTranslation(null)
    
    // Check completion: all pairs matched?
    // Each pair has 2 IDs (term + translation)
    if (newMatched.size >= exercise.pairs.length * 2) {
      setCompleted(true)
      setTimeout(() => {
        const timeMs = Date.now() - startTime
        onAnswer(true, timeMs) // Call parent callback
      }, 1000)
    }
  } else {
    // Wrong match - clear selections after delay
    setTimeout(() => {
      setSelectedTerm(null)
      setSelectedTranslation(null)
    }, 500)
  }
}
```

### 4. Answer Handling (`handleExerciseAnswer`)

```typescript
async function handleExerciseAnswer(isCorrect: boolean, timeMs: number) {
  // Convert answer to quality score (0-5)
  const quality = convertAnswerToQuality(isCorrect, timeMs)
  // - isCorrect = false → 0
  // - isCorrect = true && timeMs < 3000 → 5
  // - isCorrect = true && timeMs >= 3000 → 4
  
  if (isMatchingPairs && matchingPairsFlashcardIds.length > 0) {
    // MATCHING PAIRS PATH
    
    setUpdating(true)
    try {
      // Update ALL flashcards in parallel
      await Promise.all(
        matchingPairsFlashcardIds.map(flashcardId =>
          fetch("/api/flashcards", {
            method: "PATCH",
            body: JSON.stringify({ flashcardId, quality }),
          })
        )
      )
      
      // Update consumed count
      const consumed = matchingPairsFlashcardIds.length // Usually 5
      setConsumedFlashcards(prev => prev + consumed)
      
      // Advance index
      const nextIndex = currentIndex + consumed
      if (nextIndex >= flashcards.length) {
        await fetchDueFlashcards() // Refresh if done
      } else {
        setCurrentIndex(nextIndex)
      }
    } finally {
      setUpdating(false)
    }
  } else {
    // SINGLE EXERCISE PATH
    
    const current = flashcards[currentIndex]
    if (!current) return
    
    setUpdating(true)
    try {
      // Update single flashcard
      await fetch("/api/flashcards", {
        method: "PATCH",
        body: JSON.stringify({
          flashcardId: current.flashcard.id,
          quality,
        }),
      })
      
      // Update consumed count
      setConsumedFlashcards(prev => prev + 1)
      
      // Advance index
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        await fetchDueFlashcards() // Refresh if done
      }
    } finally {
      setUpdating(false)
    }
  }
}
```

### 5. Progress Calculation

```typescript
// Calculate progress including current exercise
const currentExerciseCount = isMatchingPairs 
  ? matchingPairsFlashcardIds.length  // Usually 5
  : 1                                  // Single exercise

const totalConsumed = consumedFlashcards + currentExerciseCount
const progressPercentage = flashcards.length > 0 
  ? (totalConsumed / flashcards.length) * 100 
  : 0

const currentExerciseNumber = totalConsumed || 1
```

**Key Points:**
- `consumedFlashcards` tracks completed exercises (updated after answer)
- Current exercise is added to show progress including what's being worked on
- Matching pairs count as 5 flashcards for progress

### 6. SM-2 Algorithm (`updateCard`)

```typescript
function updateCard(card: SM2Card, quality: number): SM2Result {
  let { easeFactor, interval, repetitions } = card
  
  // 1. Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  easeFactor = Math.max(easeFactor, 1.3) // Minimum 1.3
  
  // 2. Update repetitions and interval
  if (quality < 3) {
    // Wrong answer - reset
    repetitions = 0
    interval = 1
  } else {
    // Correct answer
    repetitions += 1
    if (repetitions === 1) {
      interval = 1
    } else if (repetitions === 2) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }
  }
  
  // 3. Calculate next review date
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)
  
  return {
    easeFactor,
    interval,
    repetitions,
    dueAt: nextReview,
  }
}
```

## API Interactions

### GET /api/flashcards?due=true

**Purpose:** Fetch flashcards that are due for review

**Query Parameters:**
- `due=true`: Only return flashcards where `dueAt <= now`

**Response:**
```json
[
  {
    "flashcard": {
      "id": "uuid",
      "easeFactor": 2.5,
      "interval": 1,
      "repetitions": 0,
      "dueAt": "2024-01-01T00:00:00Z"
    },
    "vocabulary": {
      "id": "uuid",
      "term": "hello",
      "translation": "γεια",
      "context": "...",
      "bookId": "uuid"
    }
  }
]
```

**Order:** Descending by `dueAt` (oldest due first)

### PATCH /api/flashcards

**Purpose:** Update flashcard after review

**Request Body:**
```json
{
  "flashcardId": "uuid",
  "quality": 4  // 0-5 scale
}
```

**Process:**
1. Fetch current flashcard from database
2. Call `updateCard()` with current state and quality
3. Update database with new values
4. Set `lastReviewedAt` to current timestamp

**Response:**
```json
{
  "id": "uuid",
  "easeFactor": 2.6,
  "interval": 6,
  "repetitions": 1,
  "dueAt": "2024-01-07T00:00:00Z",
  "lastReviewedAt": "2024-01-01T12:00:00Z"
}
```

## Critical Bugs Fixed

### Bug 1: Matching Pairs Logic
**Problem:** Code was comparing `pair.id === translationId` which would never match correctly.

**Fix:** Changed to `termId === translationId` because both columns use the same vocabulary IDs.

### Bug 2: Progress Calculation
**Problem:** Progress didn't account for matching pairs consuming 5 flashcards.

**Fix:** Added `consumedFlashcards` state and include current exercise in calculation.

### Bug 3: Index Management
**Problem:** Could go out of bounds when fewer than 5 flashcards remain.

**Fix:** Changed condition to `flashcards.length - currentIndex >= 5`.

### Bug 4: Flashcard Updates
**Problem:** Looked up flashcards by vocabulary ID after state might have changed.

**Fix:** Store flashcard IDs when generating matching pairs exercise, use stored IDs for updates.

### Bug 5: useEffect Dependencies
**Problem:** `generateCurrentExercise` wasn't memoized, causing stale closures.

**Fix:** Wrapped in `useCallback` with proper dependencies.

## Edge Cases Handled

1. **Not enough flashcards for matching pairs:**
   - Falls through to regular exercise
   - Checks `flashcards.length - currentIndex >= 5`

2. **Matching pairs generation fails:**
   - Returns `null` if not enough unique items
   - Falls through to regular exercise

3. **Exercise generation fails:**
   - Shows loading state if `currentExercise` is null
   - User can't proceed until exercise is generated

4. **All flashcards completed:**
   - Calls `fetchDueFlashcards()` to refresh
   - Shows "All caught up!" message if none due

5. **Fewer than 5 flashcards remaining:**
   - Matching pairs check fails gracefully
   - Continues with regular exercises

## State Synchronization

**Important:** The following state must be kept in sync:

1. `currentIndex` - Position in flashcards array
2. `consumedFlashcards` - Count of completed exercises
3. `matchingPairsFlashcardIds` - IDs for current matching pairs (if any)
4. `isMatchingPairs` - Flag for current exercise type

**When to reset:**
- `fetchDueFlashcards()` resets: `currentIndex = 0`, `consumedFlashcards = 0`
- `generateCurrentExercise()` clears: `matchingPairsFlashcardIds = []` for regular exercises
- `generateCurrentExercise()` sets: `matchingPairsFlashcardIds` for matching pairs

## Testing Checklist

- [ ] Matching pairs correctly identifies matches
- [ ] Progress bar shows correct percentage
- [ ] Index advances correctly after matching pairs (by 5)
- [ ] Index advances correctly after single exercises (by 1)
- [ ] All flashcards updated after matching pairs
- [ ] No out-of-bounds errors with < 5 flashcards
- [ ] Refresh works when all flashcards completed
- [ ] Exercise generation doesn't cause infinite loops
- [ ] Matching pairs only shows every 5th exercise
- [ ] Regular exercises work when matching pairs fails

