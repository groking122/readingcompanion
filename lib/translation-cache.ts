/**
 * LRU Cache for translations within session
 * Avoids duplicate API calls for the same word
 */

interface CacheEntry {
  translation: string
  alternativeTranslations: string[]
  timestamp: number
}

class LRUCache {
  private cache: Map<string, CacheEntry>
  private maxSize: number

  constructor(maxSize: number = 100) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry
  }

  set(key: string, value: CacheEntry): void {
    // If key already exists, update it
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, value)
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Singleton instance for session
let translationCacheInstance: LRUCache | null = null

export function getTranslationCache(): LRUCache {
  if (!translationCacheInstance) {
    translationCacheInstance = new LRUCache(100)
  }
  return translationCacheInstance
}

export function clearTranslationCache(): void {
  if (translationCacheInstance) {
    translationCacheInstance.clear()
  }
}

/**
 * Get cached translation or null if not cached
 */
export function getCachedTranslation(text: string): CacheEntry | null {
  const cache = getTranslationCache()
  const normalizedKey = text.toLowerCase().trim()
  return cache.get(normalizedKey)
}

/**
 * Cache a translation
 */
export function cacheTranslation(
  text: string,
  translation: string,
  alternativeTranslations: string[] = []
): void {
  const cache = getTranslationCache()
  const normalizedKey = text.toLowerCase().trim()
  cache.set(normalizedKey, {
    translation,
    alternativeTranslations,
    timestamp: Date.now(),
  })
}
