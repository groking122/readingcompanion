"use client"

import { useEffect } from "react"
import { offlineManager } from "@/lib/offline"
import { toast } from "@/lib/toast"

export function OfflineProvider() {
  useEffect(() => {
    // Only register service worker in production (not in development)
    // Service workers interfere with Next.js hot reloading and dev server
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration.scope)
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error)
        })
    }

    // Initialize offline manager
    offlineManager.init().then(() => {
      offlineManager.registerListeners(async (result) => {
        if (result.synced > 0 || result.failed > 0) {
          if (result.failed === 0) {
            toast.success(
              `Synced ${result.synced} ${result.synced === 1 ? 'attempt' : 'attempts'}`,
              "Your review progress has been saved."
            )
          } else {
            toast.show({
              type: "warning",
              title: `Synced ${result.synced} ${result.synced === 1 ? 'attempt' : 'attempts'}`,
              description: `${result.failed} ${result.failed === 1 ? 'failed' : 'failed'}—tap to retry`,
              duration: 8000,
              action: {
                label: "Retry",
                onClick: async () => {
                  const retryResult = await offlineManager.syncQueuedAttempts()
                  if (retryResult.synced > 0) {
                    toast.success(
                      `Synced ${retryResult.synced} ${retryResult.synced === 1 ? 'attempt' : 'attempts'}`,
                      retryResult.failed > 0
                        ? `${retryResult.failed} ${retryResult.failed === 1 ? 'still failed' : 'still failed'}`
                        : undefined
                    )
                  } else if (retryResult.failed > 0) {
                    toast.error(
                      "Sync failed",
                      "Could not sync review attempts. Please check your connection."
                    )
                  }
                },
              },
            })
          }
        }
      })
      
      // Sync queued attempts if online
      if (offlineManager.isOnline()) {
        offlineManager.syncQueuedAttempts().then((result) => {
          if (result.synced > 0) {
            toast.success(
              `Synced ${result.synced} ${result.synced === 1 ? 'attempt' : 'attempts'}`,
              "Your review progress has been saved."
            )
          }
        })
      }
    })
  }, [])

  return null
}

