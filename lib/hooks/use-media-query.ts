"use client"

import { useState, useEffect } from "react"

/**
 * Hook to detect media query matches
 * @param query - CSS media query string (e.g., "(max-width: 768px)" or "(pointer: coarse)")
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Check if window is available (SSR safety)
    if (typeof window === "undefined") {
      return
    }

    // Create media query list
    const mediaQuery = window.matchMedia(query)
    
    // Set initial value
    setMatches(mediaQuery.matches)

    // Create event listener
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler)
      return () => mediaQuery.removeEventListener("change", handler)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler)
      return () => mediaQuery.removeListener(handler)
    }
  }, [query])

  return matches
}

/**
 * Hook to detect if device is mobile (touch device with small screen)
 * Uses pointer:coarse for touch detection and max-width for screen size
 */
export function useIsMobile(): boolean {
  const isTouchDevice = useMediaQuery("(pointer: coarse)")
  const isSmallScreen = useMediaQuery("(max-width: 768px)")
  
  // Mobile = touch device OR small screen (covers tablets in portrait, phones)
  return isTouchDevice || isSmallScreen
}

