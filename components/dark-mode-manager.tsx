"use client"

import { useEffect, useLayoutEffect } from "react"
import { useThemeOverride } from "@/lib/theme-override-store"
import { getCurrentThemeIndex } from "@/lib/theme-controller"

/**
 * Global dark mode manager that respects theme override from reader
 * This is the single-writer for the `dark` class on <html>
 */
export function DarkModeManager() {
  const { override } = useThemeOverride()

  // Apply dark mode based on override or default theme
  useLayoutEffect(() => {
    const html = document.documentElement
    
    // If there's an override (from reader), use it
    if (override !== null) {
      if (override === "dark") {
        html.classList.add("dark")
      } else {
        html.classList.remove("dark")
      }
      return
    }
    
    // Otherwise, determine from current theme
    // Jet Black (theme-5, index 4) should be dark
    const currentIndex = getCurrentThemeIndex()
    const isDarkTheme = currentIndex === 4 // Jet Black
    
    if (isDarkTheme) {
      html.classList.add("dark")
    } else {
      html.classList.remove("dark")
    }
  }, [override])

  // Also sync on mount (in case override was set before this component mounted)
  useEffect(() => {
    const html = document.documentElement
    
    if (override !== null) {
      if (override === "dark") {
        html.classList.add("dark")
      } else {
        html.classList.remove("dark")
      }
    } else {
      const currentIndex = getCurrentThemeIndex()
      const isDarkTheme = currentIndex === 4
      
      if (isDarkTheme) {
        html.classList.add("dark")
      } else {
        html.classList.remove("dark")
      }
    }
  }, [override])

  return null
}
