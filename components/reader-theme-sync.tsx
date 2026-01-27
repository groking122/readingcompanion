"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useThemeOverride } from "@/lib/theme-override-store"
import { getCurrentThemeIndex, isBlackWhiteActive } from "@/lib/theme-controller"

/**
 * Derives site theme from global theme controller
 * Jet Black (index 4) = dark, others = light
 */
function deriveSiteThemeFromGlobal(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  
  // Check if black/white is active (light theme)
  if (isBlackWhiteActive()) {
    return "light"
  }
  
  // Jet Black (index 4) is dark, others are light
  const currentIndex = getCurrentThemeIndex()
  return currentIndex === 4 ? "dark" : "light"
}

// Light theme CSS variables (Lavender Storm - Theme 1)
const lightThemeVars = {
  '--c-canvas': '#ECEFF3',
  '--c-ink': '#292B30',
  '--c-strong': '#605F6F',
  '--c-soft': '#A196AE',
  '--c-spark': '#C4B1CE',
  '--c-hover': '#44454F',
  '--c-muted': '#807A8F',
  '--c-light': '#E8E6F0',
}

// Dark theme CSS variables (Jet Black - Theme 5)
const darkThemeVars = {
  '--c-canvas': '#080808',
  '--c-ink': '#FFFFFF',
  '--c-strong': '#E7E9EA',
  '--c-soft': '#9CA3AF',
  '--c-spark': '#6B7280',
  '--c-hover': '#1F1F1F',
  '--c-muted': '#4B5563',
  '--c-light': '#1F1F1F',
}

/**
 * Reader theme sync - syncs global theme to reader page
 * Reads from theme controller and applies to reader page
 */
export function ReaderThemeSync() {
  const { setOverride } = useThemeOverride()
  const originalVarsRef = useRef<Record<string, string> | null>(null)
  const [siteTheme, setSiteTheme] = useState<"light" | "dark">(() => deriveSiteThemeFromGlobal())

  // Listen for theme changes from global theme controller
  useEffect(() => {
    const handleThemeChange = () => {
      const newTheme = deriveSiteThemeFromGlobal()
      setSiteTheme(newTheme)
    }
    
    window.addEventListener('theme-change', handleThemeChange)
    window.addEventListener('storage', handleThemeChange)
    
    return () => {
      window.removeEventListener('theme-change', handleThemeChange)
      window.removeEventListener('storage', handleThemeChange)
    }
  }, [])

  // Set override and CSS variables synchronously before paint
  useLayoutEffect(() => {
    const currentTheme = deriveSiteThemeFromGlobal()
    setSiteTheme(currentTheme)
    setOverride(currentTheme)
    
    // Also override CSS variables to match the site theme
    const root = document.documentElement
    const vars = siteTheme === "dark" ? darkThemeVars : lightThemeVars
    
    // Store original values only once
    if (!originalVarsRef.current) {
      originalVarsRef.current = {}
      Object.keys(vars).forEach(key => {
        const computed = getComputedStyle(root).getPropertyValue(key)
        if (computed) {
          originalVarsRef.current![key] = computed
        }
      })
    }
    
    // Apply theme variables
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
    
    // Listen for theme changes and re-apply override
    const handleThemeChange = () => {
      Object.entries(vars).forEach(([key, value]) => {
        root.style.setProperty(key, value)
      })
    }
    
    window.addEventListener('theme-change', handleThemeChange)
    
    return () => {
      window.removeEventListener('theme-change', handleThemeChange)
    }
  }, [siteTheme, setOverride])

  // Cleanup on unmount: restore original values and clear override
  useEffect(() => {
    return () => {
      setOverride(null)
      if (originalVarsRef.current) {
        const root = document.documentElement
        Object.entries(originalVarsRef.current).forEach(([key, value]) => {
          if (value) {
            root.style.setProperty(key, value)
          } else {
            root.style.removeProperty(key)
          }
        })
        originalVarsRef.current = null
      }
    }
  }, [setOverride])

  return null
}
