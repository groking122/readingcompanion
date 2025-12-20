/**
 * Exercise generation utilities for Duolingo-style review exercises
 * All exercises are generated automatically from vocabulary data
 */

export type ExerciseType = 
  | "meaning-in-context" 
  | "cloze-blank" 
  | "reverse-mcq" 
  | "matching-pairs"

export interface VocabularyItem {
  id: string
  term: string
  termNormalized?: string
  translation: string
  context: string
  kind?: "word" | "phrase"
  bookId: string
  epubLocation?: string
  pageNumber?: number
}

export interface Exercise {
  type: ExerciseType
  vocabularyId: string
  question: string
  correctAnswer: string
  options: string[]
  context?: string
  metadata?: Record<string, any>
}

/**
 * Normalization utilities for preventing duplicates and ambiguity
 */

// Removes punctuation, collapses spaces, lowercases
export function normalizeBase(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[""'.,!;:()[\]{}]/g, "")
}

// Greek-friendly: remove diacritics (τόνος/διαλυτικά)
export function normalizeGreek(s: string): string {
  // Remove combining diacritical marks (works for Greek)
  return normalizeBase(
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove combining marks
  )
}

// Unique by normalized key
export function uniqBy<T>(arr: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of arr) {
    const k = key(item)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(item)
  }
  return out
}

// Check if choices are ambiguous (duplicate normalized values)
export function isAmbiguousGreekChoices(choices: string[]): boolean {
  const norm = choices.map(normalizeGreek)
  return new Set(norm).size !== choices.length
}

export function isAmbiguousEnglishChoices(choices: string[]): boolean {
  const norm = choices.map(normalizeBase)
  return new Set(norm).size !== choices.length
}

/**
 * Robust cloze blank generation
 * Finds best match and replaces only that occurrence
 */
export function makeCloze(context: string, term: string): { cloze: string; found: boolean } {
  const hay = context
  const needle = term.trim()
  if (!hay || !needle) return { cloze: context, found: false }

  const idx = hay.toLowerCase().indexOf(needle.toLowerCase())
  if (idx === -1) return { cloze: context, found: false }

  const before = hay.slice(0, idx)
  const after = hay.slice(idx + needle.length)
  return { cloze: `${before}____${after}`, found: true }
}

/**
 * Generate distractors with weighted selection (book-local + similarity)
 * Returns unique, normalized-distinct distractors
 */
export function generateDistractors(
  correctTranslation: string,
  allVocab: VocabularyItem[],
  currentItem: VocabularyItem,
  count: number = 3,
  preferSameBook: boolean = true
): string[] {
  const correctNorm = normalizeGreek(correctTranslation)
  const used = new Set<string>([correctNorm])
  const distractors: string[] = []
  
  // Score candidates by "closeness"
  interface Candidate {
    item: VocabularyItem
    score: number
  }
  
  const candidates: Candidate[] = allVocab
    .filter(item => {
      if (item.id === currentItem.id) return false
      const transNorm = normalizeGreek(item.translation)
      if (used.has(transNorm)) return false
      // Avoid substring matches
      if (correctNorm.includes(transNorm) || transNorm.includes(correctNorm)) return false
      return true
    })
    .map(item => {
      let score = 0
      
      // Same book: +5
      if (preferSameBook && item.bookId === currentItem.bookId) {
        score += 5
      }
      
      // Same kind: +3
      if (item.kind === currentItem.kind) {
        score += 3
      }
      
      // Similar length: +2
      const correctLength = correctTranslation.length
      const itemLength = item.translation.length
      const lengthDiff = Math.abs(correctLength - itemLength)
      if (lengthDiff <= correctLength * 0.3) {
        score += 2
      }
      
      // Similar page (if available): +1
      if (currentItem.pageNumber && item.pageNumber) {
        const pageDiff = Math.abs(currentItem.pageNumber - item.pageNumber)
        if (pageDiff <= 10) {
          score += 1
        }
      }
      
      return { item, score }
    })
    .filter(c => c.score > 0) // Only plausible candidates
  
  // Sort by score (descending) and take top candidates
  candidates.sort((a, b) => b.score - a.score)
  
  // Pick unique distractors
  for (const candidate of candidates) {
    if (distractors.length >= count) break
    
    const transNorm = normalizeGreek(candidate.item.translation)
    if (!used.has(transNorm)) {
      distractors.push(candidate.item.translation)
      used.add(transNorm)
    }
  }
  
  // If not enough, fill with any remaining (lower quality)
  if (distractors.length < count) {
    const remaining = allVocab
      .filter(item => {
        if (item.id === currentItem.id) return false
        const transNorm = normalizeGreek(item.translation)
        return !used.has(transNorm) && 
               !correctNorm.includes(transNorm) && 
               !transNorm.includes(correctNorm)
      })
      .map(item => item.translation)
      .sort(() => Math.random() - 0.5)
    
    for (const trans of remaining) {
      if (distractors.length >= count) break
      const transNorm = normalizeGreek(trans)
      if (!used.has(transNorm)) {
        distractors.push(trans)
        used.add(transNorm)
      }
    }
  }
  
  return distractors.slice(0, count)
}

/**
 * Generate "Meaning in Context" MCQ exercise
 * Shows context sentence with highlighted term, asks for Greek translation
 * Includes ambiguity guard and uniqueness checks
 */
export function generateMeaningInContextExercise(
  vocab: VocabularyItem,
  allVocab: VocabularyItem[],
  maxRetries: number = 5
): Exercise | null {
  let distractors: string[] = []
  let allOptions: string[] = []
  let attempts = 0
  
  // Retry until we get unique, unambiguous choices
  while (attempts < maxRetries) {
    distractors = generateDistractors(vocab.translation, allVocab, vocab, 3, true)
    allOptions = [vocab.translation, ...distractors]
    
    // Check for ambiguity
    if (!isAmbiguousGreekChoices(allOptions)) {
      break
    }
    
    attempts++
  }
  
  // If still ambiguous after retries, return null (fallback to flashcard)
  if (isAmbiguousGreekChoices(allOptions)) {
    return null
  }
  
  // Shuffle options
  allOptions = allOptions.sort(() => Math.random() - 0.5)
  
  // Highlight the term in context
  const highlightedContext = vocab.context.replace(
    new RegExp(`\\b${vocab.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
    (match) => `**${match}**`
  )
  
  return {
    type: "meaning-in-context",
    vocabularyId: vocab.id,
    question: `What does "${vocab.term}" mean here?`,
    correctAnswer: vocab.translation,
    options: allOptions,
    context: highlightedContext,
    metadata: {
      term: vocab.term,
      originalContext: vocab.context,
    },
  }
}

/**
 * Generate "Cloze Blank" exercise
 * Shows sentence with blank, user picks from 4 word options
 * Uses robust cloze generation and uniqueness checks
 */
export function generateClozeBlankExercise(
  vocab: VocabularyItem,
  allVocab: VocabularyItem[],
  maxRetries: number = 5
): Exercise | null {
  // Use robust cloze generation
  const { cloze, found } = makeCloze(vocab.context, vocab.term)
  
  // If term not found in context, fallback to meaning-in-context
  if (!found) {
    return null
  }
  
  // Generate distractors (prefer same book)
  const sameBookVocab = allVocab.filter(item => 
    item.bookId === vocab.bookId && 
    item.id !== vocab.id &&
    item.kind === vocab.kind
  )
  
  // Score and sort candidates
  const candidates = sameBookVocab
    .map(item => {
      let score = 0
      if (vocab.pageNumber && item.pageNumber) {
        const pageDiff = Math.abs(vocab.pageNumber - item.pageNumber)
        if (pageDiff <= 10) score += 2
      }
      // Similar length
      const lengthDiff = Math.abs(vocab.term.length - item.term.length)
      if (lengthDiff <= vocab.term.length * 0.3) score += 1
      return { item, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
  
  let distractors: string[] = []
  const used = new Set<string>([normalizeBase(vocab.term)])
  
  for (const candidate of candidates) {
    if (distractors.length >= 3) break
    const termNorm = normalizeBase(candidate.item.term)
    if (!used.has(termNorm)) {
      distractors.push(candidate.item.term)
      used.add(termNorm)
    }
  }
  
  // Fill remaining if needed
  if (distractors.length < 3) {
    const remaining = allVocab
      .filter(item => {
        if (item.id === vocab.id) return false
        if (item.kind !== vocab.kind) return false
        const termNorm = normalizeBase(item.term)
        return !used.has(termNorm)
      })
      .map(item => item.term)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3 - distractors.length)
    
    for (const term of remaining) {
      const termNorm = normalizeBase(term)
      if (!used.has(termNorm)) {
        distractors.push(term)
        used.add(termNorm)
      }
    }
  }
  
  const allOptions = [vocab.term, ...distractors.slice(0, 3)]
  
  // Check for ambiguity
  if (isAmbiguousEnglishChoices(allOptions)) {
    return null // Fallback
  }
  
  // Shuffle
  const shuffledOptions = allOptions.sort(() => Math.random() - 0.5)
  
  return {
    type: "cloze-blank",
    vocabularyId: vocab.id,
    question: "Fill in the blank:",
    correctAnswer: vocab.term,
    options: shuffledOptions,
    context: cloze,
    metadata: {
      translation: vocab.translation,
      originalContext: vocab.context,
    },
  }
}

/**
 * Generate "Reverse MCQ" exercise
 * Shows Greek translation, user picks the correct English word/phrase
 * Includes uniqueness checks
 */
export function generateReverseMcqExercise(
  vocab: VocabularyItem,
  allVocab: VocabularyItem[],
  maxRetries: number = 5
): Exercise | null {
  // Prefer same book distractors
  const sameBookVocab = allVocab.filter(item => 
    item.bookId === vocab.bookId && 
    item.id !== vocab.id &&
    item.kind === vocab.kind
  )
  
  let distractors: string[] = []
  const used = new Set<string>([normalizeBase(vocab.term)])
  
  // Try same book first
  for (const item of sameBookVocab.slice(0, 10)) {
    if (distractors.length >= 3) break
    const termNorm = normalizeBase(item.term)
    if (!used.has(termNorm)) {
      distractors.push(item.term)
      used.add(termNorm)
    }
  }
  
  // Fill with any remaining
  if (distractors.length < 3) {
    const remaining = allVocab
      .filter(item => {
        if (item.id === vocab.id) return false
        if (item.kind !== vocab.kind) return false
        const termNorm = normalizeBase(item.term)
        return !used.has(termNorm)
      })
      .map(item => item.term)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3 - distractors.length)
    
    for (const term of remaining) {
      const termNorm = normalizeBase(term)
      if (!used.has(termNorm)) {
        distractors.push(term)
        used.add(termNorm)
      }
    }
  }
  
  const allOptions = [vocab.term, ...distractors.slice(0, 3)]
  
  // Check for ambiguity
  if (isAmbiguousEnglishChoices(allOptions)) {
    return null
  }
  
  // Shuffle
  const shuffledOptions = allOptions.sort(() => Math.random() - 0.5)
  
  return {
    type: "reverse-mcq",
    vocabularyId: vocab.id,
    question: `Which word means "${vocab.translation}"?`,
    correctAnswer: vocab.term,
    options: shuffledOptions,
    context: vocab.context,
    metadata: {
      translation: vocab.translation,
    },
  }
}

/**
 * Generate "Matching Pairs" exercise
 * Returns 5 vocabulary items to match (enforces unique pairs)
 */
export function generateMatchingPairsExercise(
  vocabList: VocabularyItem[]
): (Exercise & { pairs: Array<{ term: string; translation: string; id: string }> }) | null {
  // Filter for unique pairs (by normalized term and translation)
  const uniqueByTerm = uniqBy(vocabList, item => normalizeBase(item.term))
  const uniqueByTranslation = uniqBy(uniqueByTerm, item => normalizeGreek(item.translation))
  
  // Need at least 4 items for matching (5 is ideal)
  const minItems = 4
  if (uniqueByTranslation.length < minItems) {
    return null // Not enough unique items
  }
  
  // Take up to 5 unique items
  const selected = uniqueByTranslation.slice(0, 5)
  
  const pairs = selected.map(item => ({
    term: item.term,
    translation: item.translation,
    id: item.id,
  }))
  
  // Verify uniqueness one more time
  const termNorms = pairs.map(p => normalizeBase(p.term))
  const transNorms = pairs.map(p => normalizeGreek(p.translation))
  
  if (new Set(termNorms).size !== pairs.length || new Set(transNorms).size !== pairs.length) {
    return null // Still has duplicates, can't generate
  }
  
  // Shuffle both columns
  const shuffledTerms = [...pairs].sort(() => Math.random() - 0.5)
  const shuffledTranslations = [...pairs].sort(() => Math.random() - 0.5)
  
  const exercise: Exercise & { pairs: typeof pairs } = {
    type: "matching-pairs",
    vocabularyId: selected.map(s => s.id).join(","), // Multiple IDs
    question: "Match each word with its translation:",
    correctAnswer: "", // Not used for matching
    options: [], // Not used for matching
    metadata: {
      pairs,
      shuffledTerms: shuffledTerms.map(p => ({ id: p.id, text: p.term })),
      shuffledTranslations: shuffledTranslations.map(p => ({ id: p.id, text: p.translation })),
    },
    pairs, // Add pairs directly to the exercise object
  }
  
  return exercise
}

/**
 * Select exercise type based on learning stage
 * Uses flashcard repetition count to determine difficulty
 */
export function selectExerciseType(
  repetitions: number,
  randomize: boolean = false
): ExerciseType {
  if (randomize) {
    const types: ExerciseType[] = ["meaning-in-context", "cloze-blank", "reverse-mcq"]
    return types[Math.floor(Math.random() * types.length)]
  }
  
  // New (0-1 correct): meaning-in-context
  if (repetitions <= 1) {
    return "meaning-in-context"
  }
  
  // Learning (2-4 correct): cloze + reverse MCQ
  if (repetitions <= 4) {
    return Math.random() > 0.5 ? "cloze-blank" : "reverse-mcq"
  }
  
  // Mature: mix all types
  const types: ExerciseType[] = ["meaning-in-context", "cloze-blank", "reverse-mcq"]
  return types[Math.floor(Math.random() * types.length)]
}

/**
 * Generate exercise for a vocabulary item
 * Returns null if generation fails (fallback to flashcard)
 */
export function generateExercise(
  vocab: VocabularyItem,
  allVocab: VocabularyItem[],
  exerciseType?: ExerciseType,
  repetitions: number = 0
): Exercise | null {
  const type = exerciseType || selectExerciseType(repetitions)
  
  let exercise: Exercise | null = null
  
  switch (type) {
    case "meaning-in-context":
      exercise = generateMeaningInContextExercise(vocab, allVocab)
      break
    case "cloze-blank":
      exercise = generateClozeBlankExercise(vocab, allVocab)
      // If cloze fails, fallback to meaning-in-context
      if (!exercise) {
        exercise = generateMeaningInContextExercise(vocab, allVocab)
      }
      break
    case "reverse-mcq":
      exercise = generateReverseMcqExercise(vocab, allVocab)
      // If reverse MCQ fails, fallback to meaning-in-context
      if (!exercise) {
        exercise = generateMeaningInContextExercise(vocab, allVocab)
      }
      break
    default:
      exercise = generateMeaningInContextExercise(vocab, allVocab)
  }
  
  // Final fallback: if all exercises fail, return null (review page will use flashcard)
  return exercise
}

