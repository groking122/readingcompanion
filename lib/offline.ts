/**
 * Offline support utilities
 * Handles IndexedDB caching and offline queue
 */

interface CachedFlashcard {
  id: string
  flashcard: any
  vocabulary: any
  cachedAt: number
}

interface OfflineReviewAttempt {
  id: string
  flashcardId: string
  vocabularyId: string
  quality: number
  responseMs?: number
  exerciseType?: string
  timestamp: number
  synced: boolean
}

class OfflineManager {
  private static instance: OfflineManager
  private db: IDBDatabase | null = null
  private dbName = 'reading-companion'
  private dbVersion = 1

  private constructor() {}

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager()
    }
    return OfflineManager.instance
  }

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      console.warn('IndexedDB not supported')
      return
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.error('Failed to open IndexedDB')
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create flashcards store
        if (!db.objectStoreNames.contains('flashcards')) {
          const flashcardStore = db.createObjectStore('flashcards', { keyPath: 'id' })
          flashcardStore.createIndex('cachedAt', 'cachedAt', { unique: false })
        }

        // Create review attempts queue
        if (!db.objectStoreNames.contains('reviewAttempts')) {
          const attemptStore = db.createObjectStore('reviewAttempts', { keyPath: 'id' })
          attemptStore.createIndex('synced', 'synced', { unique: false })
          attemptStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  /**
   * Cache flashcards for offline use
   */
  async cacheFlashcards(flashcards: CachedFlashcard[]): Promise<void> {
    if (!this.db) await this.init()
    if (!this.db) return

    const transaction = this.db.transaction(['flashcards'], 'readwrite')
    const store = transaction.objectStore('flashcards')

    for (const flashcard of flashcards) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          ...flashcard,
          cachedAt: Date.now(),
        })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }
  }

  /**
   * Get cached flashcards
   */
  async getCachedFlashcards(): Promise<CachedFlashcard[]> {
    if (!this.db) await this.init()
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['flashcards'], 'readonly')
      const store = transaction.objectStore('flashcards')
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  /**
   * Queue review attempt for sync when online
   */
  async queueReviewAttempt(attempt: Omit<OfflineReviewAttempt, 'id' | 'synced' | 'timestamp'>): Promise<void> {
    if (!this.db) await this.init()
    if (!this.db) return

    const transaction = this.db.transaction(['reviewAttempts'], 'readwrite')
    const store = transaction.objectStore('reviewAttempts')

    const offlineAttempt: OfflineReviewAttempt = {
      ...attempt,
      id: `offline-${Date.now()}-${Math.random()}`,
      synced: false,
      timestamp: Date.now(),
    }

    await new Promise<void>((resolve, reject) => {
      const request = store.add(offlineAttempt)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get queued review attempts
   */
  async getQueuedAttempts(): Promise<OfflineReviewAttempt[]> {
    if (!this.db) await this.init()
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['reviewAttempts'], 'readonly')
      const store = transaction.objectStore('reviewAttempts')
      const index = store.index('synced')
      const request = index.getAll(IDBKeyRange.only(false)) // Get unsynced attempts

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  /**
   * Mark attempt as synced
   */
  async markAttemptSynced(attemptId: string): Promise<void> {
    if (!this.db) await this.init()
    if (!this.db) return

    const transaction = this.db.transaction(['reviewAttempts'], 'readwrite')
    const store = transaction.objectStore('reviewAttempts')

    await new Promise<void>((resolve, reject) => {
      const getRequest = store.get(attemptId)
      getRequest.onsuccess = () => {
        const attempt = getRequest.result
        if (attempt) {
          attempt.synced = true
          const putRequest = store.put(attempt)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          resolve()
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Sync queued attempts when online
   */
  async syncQueuedAttempts(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.onLine) {
      return
    }

    const queued = await this.getQueuedAttempts()
    
    for (const attempt of queued) {
      try {
        // Try to sync the attempt
        const response = await fetch('/api/flashcards', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flashcardId: attempt.flashcardId,
            quality: attempt.quality,
            responseMs: attempt.responseMs,
            exerciseType: attempt.exerciseType,
          }),
        })

        if (response.ok) {
          await this.markAttemptSynced(attempt.id)
        }
      } catch (error) {
        console.error('Failed to sync attempt:', error)
        // Keep attempt in queue for next sync
      }
    }
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine
  }

  /**
   * Register online/offline listeners
   */
  registerListeners(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('online', () => {
      console.log('Back online, syncing queued attempts...')
      this.syncQueuedAttempts()
    })

    window.addEventListener('offline', () => {
      console.log('Gone offline, using cached data')
    })
  }
}

export const offlineManager = OfflineManager.getInstance()

