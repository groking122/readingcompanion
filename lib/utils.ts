import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a string to Title Case
 * Handles common words like "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"
 */
export function formatTitleCase(str: string | null | undefined): string {
  if (!str) return ""
  
  const lowerWords = ["a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "as"]
  
  return str
    .split(/\s+/)
    .map((word, index) => {
      // Always capitalize first word
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      }
      // Don't capitalize articles and prepositions unless they're the first word
      if (lowerWords.includes(word.toLowerCase())) {
        return word.toLowerCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(" ")
}

/**
 * Capitalizes the first letter of each word
 * Simpler version for tags and short phrases
 */
export function capitalizeWords(str: string | null | undefined): string {
  if (!str) return ""
  return str
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

