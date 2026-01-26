"use client"

import { useEffect } from "react"
import { offlineManager } from "@/lib/offline"

export function OfflineProvider() {
  useEffect(() => {
    // Register service worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
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
      offlineManager.registerListeners()
      
      // Sync queued attempts if online
      if (offlineManager.isOnline()) {
        offlineManager.syncQueuedAttempts()
      }
    })
  }, [])

  return null
}

