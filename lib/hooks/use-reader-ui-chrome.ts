"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useMediaQuery } from "./use-media-query"

interface UseReaderUIChromeReturn {
  headerVisible: boolean
  toggleChrome: () => void
  reducedMotion: boolean
  headerMinimized: boolean
  setHeaderMinimized: (minimized: boolean) => void
}

/**
 * Hook to manage reader UI chrome (header visibility, double-tap toggle, reduced motion)
 */
export function useReaderUIChrome(): UseReaderUIChromeReturn {
  const [headerVisible, setHeaderVisible] = useState(true)
  const [headerMinimized, setHeaderMinimized] = useState(false)
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  
  const lastScrollY = useRef(0)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTapTimeRef = useRef(0)
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Throttled scroll handler for header hide/show
  useEffect(() => {
    if (reducedMotion) {
      // Don't hide/show header with reduced motion
      return
    }

    const handleScroll = () => {
      // Clear any pending timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Throttle scroll handling
      scrollTimeoutRef.current = setTimeout(() => {
        const currentScrollY = window.scrollY || document.documentElement.scrollTop
        
        // Hide header on scroll down, show on scroll up
        if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
          setHeaderVisible(false)
        } else if (currentScrollY < lastScrollY.current) {
          setHeaderVisible(true)
        }
        
        lastScrollY.current = currentScrollY
      }, 150) // Throttle to 150ms
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [reducedMotion])

  // Double-tap toggle for UI chrome
  const toggleChrome = useCallback(() => {
    const now = Date.now()
    const timeSinceLastTap = now - lastTapTimeRef.current
    
    if (timeSinceLastTap < 300) {
      // Double tap detected
      setHeaderMinimized(prev => !prev)
      setHeaderVisible(true) // Always show when toggling
      lastTapTimeRef.current = 0 // Reset
    } else {
      // Single tap - start timer
      lastTapTimeRef.current = now
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current)
      }
      tapTimeoutRef.current = setTimeout(() => {
        lastTapTimeRef.current = 0 // Reset after timeout
      }, 300)
    }
  }, [])

  return {
    headerVisible,
    toggleChrome,
    reducedMotion,
    headerMinimized,
    setHeaderMinimized,
  }
}
