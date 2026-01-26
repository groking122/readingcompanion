/**
 * Review reminder and notification system
 * Uses browser Notification API for reminders
 */

export interface NotificationPermission {
  granted: boolean
  denied: boolean
  default: boolean
}

export class NotificationService {
  private static instance: NotificationService
  private checkInterval: NodeJS.Timeout | null = null
  private lastCheckTime: Date | null = null
  private enabled: boolean = false

  private constructor() {
    // Check if notifications are supported
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.warn("Browser notifications not supported")
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return { granted: false, denied: false, default: false }
    }

    if (Notification.permission === "granted") {
      return { granted: true, denied: false, default: false }
    }

    if (Notification.permission === "denied") {
      return { granted: false, denied: true, default: false }
    }

    try {
      const permission = await Notification.requestPermission()
      return {
        granted: permission === "granted",
        denied: permission === "denied",
        default: permission === "default",
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error)
      return { granted: false, denied: false, default: true }
    }
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return { granted: false, denied: false, default: false }
    }

    const permission = Notification.permission
    return {
      granted: permission === "granted",
      denied: permission === "denied",
      default: permission === "default",
    }
  }

  /**
   * Show a notification
   */
  showNotification(title: string, options?: NotificationOptions): void {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return
    }

    if (Notification.permission !== "granted") {
      console.warn("Notification permission not granted")
      return
    }

    try {
      const notification = new Notification(title, {
        icon: "/icon.svg",
        badge: "/icon.svg",
        tag: "review-reminder", // Replace existing notifications with same tag
        requireInteraction: false,
        ...options,
      })

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close()
      }, 5000)

      // Handle click - focus window
      notification.onclick = () => {
        window.focus()
        notification.close()
        // Navigate to review page if not already there
        if (window.location.pathname !== "/review") {
          window.location.href = "/review"
        }
      }
    } catch (error) {
      console.error("Error showing notification:", error)
    }
  }

  /**
   * Check for due flashcards and show notification
   */
  async checkDueFlashcards(): Promise<void> {
    if (typeof window === "undefined") return

    try {
      const response = await fetch("/api/flashcards?due=true")
      if (!response.ok) return

      const flashcards = await response.json()
      const dueCount = flashcards.length

      if (dueCount > 0) {
        this.showNotification(
          `You have ${dueCount} ${dueCount === 1 ? "card" : "cards"} due for review`,
          {
            body: "Click to start reviewing now!",
            data: { url: "/review" },
          }
        )
      }
    } catch (error) {
      console.error("Error checking due flashcards:", error)
    }
  }

  /**
   * Start periodic reminder checks
   */
  startReminders(checkIntervalMinutes: number = 60): void {
    if (this.checkInterval) {
      this.stopReminders()
    }

    const permission = this.getPermissionStatus()
    if (!permission.granted) {
      console.warn("Cannot start reminders: notification permission not granted")
      return
    }

    this.enabled = true

    // Check immediately
    this.checkDueFlashcards()
    this.lastCheckTime = new Date()

    // Then check periodically
    this.checkInterval = setInterval(() => {
      this.checkDueFlashcards()
      this.lastCheckTime = new Date()
    }, checkIntervalMinutes * 60 * 1000)
  }

  /**
   * Stop periodic reminder checks
   */
  stopReminders(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.enabled = false
  }

  /**
   * Check if reminders are currently enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Get last check time
   */
  getLastCheckTime(): Date | null {
    return this.lastCheckTime
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance()

