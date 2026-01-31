/**
 * Sentence extraction utilities
 * Detects sentence boundaries and extracts full sentences containing words
 */

/**
 * Extract the full sentence containing a word at a given index
 */
export function extractSentence(text: string, wordIndex: number): string {
  if (!text || wordIndex < 0 || wordIndex >= text.length) {
    return text
  }

  // Find sentence boundaries (period, exclamation, question mark followed by space or end)
  const sentenceEndRegex = /[.!?]\s+/g
  const sentenceStartRegex = /^[.!?]\s+|[.!?]\s+/g

  // Find the start of the sentence
  let sentenceStart = 0
  let lastMatch: RegExpExecArray | null = null
  let match: RegExpExecArray | null

  // Reset regex
  sentenceEndRegex.lastIndex = 0

  while ((match = sentenceEndRegex.exec(text)) !== null) {
    if (match.index < wordIndex) {
      lastMatch = match
      sentenceStart = match.index + match[0].length
    } else {
      break
    }
  }

  // If no sentence end found before word, start from beginning or last sentence end
  if (sentenceStart === 0 && lastMatch === null) {
    // Check if there's a sentence start pattern at the beginning
    const startMatch = text.match(/^[A-Z]/)
    if (!startMatch) {
      // Try to find the start by looking backwards for sentence-ending punctuation
      for (let i = wordIndex; i >= 0; i--) {
        if (/[.!?]\s+/.test(text.substring(i, i + 2))) {
          sentenceStart = i + 2
          break
        }
      }
    }
  }

  // Find the end of the sentence
  let sentenceEnd = text.length
  sentenceEndRegex.lastIndex = wordIndex

  const endMatch = sentenceEndRegex.exec(text)
  if (endMatch) {
    sentenceEnd = endMatch.index + endMatch[0].length - 1 // Include the punctuation but not trailing space
  } else {
    // No sentence end found, check if we're at the end of text
    // Look for sentence-ending punctuation after the word
    for (let i = wordIndex; i < text.length; i++) {
      if (/[.!?]/.test(text[i])) {
        // Check if followed by space or end of string
        if (i === text.length - 1 || /\s/.test(text[i + 1])) {
          sentenceEnd = i + 1
          break
        }
      }
    }
  }

  // Extract the sentence
  const sentence = text.substring(sentenceStart, sentenceEnd).trim()

  // Fallback: if sentence is too short or empty, return a larger context
  if (sentence.length < 10) {
    const contextStart = Math.max(0, wordIndex - 100)
    const contextEnd = Math.min(text.length, wordIndex + 100)
    return text.substring(contextStart, contextEnd).trim()
  }

  return sentence
}

/**
 * Extract context around a word (sentence + surrounding sentences)
 */
export function extractContext(text: string, wordIndex: number, sentencesBefore: number = 0, sentencesAfter: number = 0): string {
  const sentence = extractSentence(text, wordIndex)

  if (sentencesBefore === 0 && sentencesAfter === 0) {
    return sentence
  }

  // For now, return the sentence with some surrounding context
  // A more sophisticated implementation would extract actual surrounding sentences
  const contextStart = Math.max(0, wordIndex - 150)
  const contextEnd = Math.min(text.length, wordIndex + 150)
  return text.substring(contextStart, contextEnd).trim()
}

/**
 * Find word index in text (case-insensitive)
 */
export function findWordIndex(text: string, word: string): number {
  const normalizedText = text.toLowerCase()
  const normalizedWord = word.toLowerCase().trim()
  return normalizedText.indexOf(normalizedWord)
}
