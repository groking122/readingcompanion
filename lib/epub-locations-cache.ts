/**
 * EPUB Locations Cache
 * Caches EPUB location totals per book + layout fingerprint in IndexedDB
 */

export interface LayoutFingerprint {
  fontSize: number
  fontFamily: string
  lineHeight: number
  readingWidth: string
  containerWidth: number
  containerHeight: number
}

interface CachedLocations {
  fingerprint: string
  total: number
  generatedAt: number
}

const DB_NAME = 'reading-companion'
const DB_VERSION = 2 // Increment to add epubLocations store to existing DB
const STORE_NAME = 'epubLocations'
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Generate fingerprint string from layout settings
 */
export function createFingerprint(layout: LayoutFingerprint): string {
  return [
    layout.fontSize,
    layout.fontFamily,
    layout.lineHeight,
    layout.readingWidth,
    Math.round(layout.containerWidth),
    Math.round(layout.containerHeight),
  ].join("|")
}

/**
 * Initialize IndexedDB for locations cache
 */
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      const oldVersion = event.oldVersion || 0

      // Create locations store if it doesn't exist (for new DBs or upgrades)
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('bookId', 'bookId', { unique: false })
        store.createIndex('generatedAt', 'generatedAt', { unique: false })
      }
    }
  })
}

/**
 * Get cache key for book + fingerprint
 */
function getCacheKey(bookId: string, fingerprint: string): string {
  return `${bookId}:${fingerprint}`
}

/**
 * Get cached locations for a book + fingerprint
 */
export async function getCachedLocations(
  bookId: string,
  fingerprint: string
): Promise<CachedLocations | null> {
  try {
    const db = await initDB()
    const key = getCacheKey(bookId, fingerprint)

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(key)

      request.onsuccess = () => {
        const cached = request.result
        if (!cached) {
          resolve(null)
          return
        }

        // Check if cache is expired
        const age = Date.now() - cached.generatedAt
        if (age > CACHE_EXPIRY_MS) {
          // Cache expired, delete it
          const deleteTransaction = db.transaction([STORE_NAME], 'readwrite')
          const deleteStore = deleteTransaction.objectStore(STORE_NAME)
          deleteStore.delete(key)
          resolve(null)
          return
        }

        resolve({
          fingerprint: cached.fingerprint,
          total: cached.total,
          generatedAt: cached.generatedAt,
        })
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  } catch (error) {
    console.debug('Error getting cached locations:', error)
    return null
  }
}

/**
 * Save cached locations for a book + fingerprint
 */
export async function saveCachedLocations(
  bookId: string,
  fingerprint: string,
  total: number
): Promise<void> {
  try {
    const db = await initDB()
    const key = getCacheKey(bookId, fingerprint)

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      
      const data = {
        key,
        bookId,
        fingerprint,
        total,
        generatedAt: Date.now(),
      }

      const request = store.put(data)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  } catch (error) {
    console.debug('Error saving cached locations:', error)
    // Don't throw - caching is optional
  }
}
