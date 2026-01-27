"use client"

import { useEffect, useRef } from "react"
import { toast } from "@/lib/toast"

export function ServiceWorkerUpdater() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    // Check for service worker updates
    navigator.serviceWorker.ready.then((reg) => {
      registrationRef.current = reg

      // Listen for service worker updates
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing
        if (!newWorker) return

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New service worker is installed and waiting
            toast.show({
              type: "info",
              title: "New version available",
              description: "A new version of the app is ready. Refresh to update.",
              duration: 10000, // Show for 10 seconds
              action: {
                label: "Refresh",
                onClick: () => {
                  if (registrationRef.current?.waiting) {
                    registrationRef.current.waiting.postMessage({ type: "SKIP_WAITING" })
                    window.location.reload()
                  } else {
                    window.location.reload()
                  }
                },
              },
            })
          }
        })
      })

      // Check for updates periodically (every hour)
      const intervalId = setInterval(() => {
        reg.update()
      }, 60 * 60 * 1000) // 1 hour

      // Also check immediately
      reg.update()

      // Cleanup interval on unmount
      return () => {
        clearInterval(intervalId)
      }
    })

    // Listen for controller change (service worker activated)
    const handleControllerChange = () => {
      // Service worker has been updated and activated
      window.location.reload()
    }
    
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange)
    }
  }, [])

  return null
}

