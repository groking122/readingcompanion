"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useThemeOverride } from "@/lib/theme-override-store"
import { getCurrentThemeIndex, isBlackWhiteActive, getAllThemes, getTheme } from "@/lib/theme-controller"

/**
 * Get current theme CSS variables from theme controller
 */
function getCurrentThemeVars(): Record<string, string> {
  if (typeof window === "undefined") {
    // Return default theme (Lavender Storm)
    return {
      '--c-canvas': '#ECEFF3',
      '--c-ink': '#292B30',
      '--c-strong': '#605F6F',
      '--c-soft': '#A196AE',
      '--c-spark': '#C4B1CE',
      '--c-hover': '#44454F',
      '--c-muted': '#807A8F',
      '--c-light': '#E8E6F0',
    }
  }
  
  // Check if black/white is active
  if (isBlackWhiteActive()) {
    return {
      '--c-canvas': '#FFFFFF',
      '--c-ink': '#000000',
      '--c-strong': '#000000',
      '--c-soft': '#666666',
      '--c-spark': '#000000',
      '--c-hover': '#000000',
      '--c-muted': '#666666',
      '--c-light': '#FFFFFF',
    }
  }
  
  // Get current theme from theme controller
  const currentIndex = getCurrentThemeIndex()
  const theme = getTheme(currentIndex)
  
  if (!theme) {
    // Fallback to default
    return {
      '--c-canvas': '#ECEFF3',
      '--c-ink': '#292B30',
      '--c-strong': '#605F6F',
      '--c-soft': '#A196AE',
      '--c-spark': '#C4B1CE',
      '--c-hover': '#44454F',
      '--c-muted': '#807A8F',
      '--c-light': '#E8E6F0',
    }
  }
  
  // Map theme colors to CSS variables
  // Theme colors: [CANVAS, INK, STRONG, SOFT, SPARK]
  const [canvas, ink, strong, soft, spark] = theme.colors
  
  // Calculate additional colors based on theme
  // For hover, use a darker/lighter version of strong or ink
  // For muted, use soft
  // For light, use a lighter version of canvas or a neutral light color
  // These are theme-specific calculations
  let hover = '#44454F' // Default
  let muted = soft
  let light = '#E8E6F0' // Default
  
  if (currentIndex === 4) {
    // Jet Black theme
    hover = '#1F1F1F'
    light = '#1F1F1F'
  } else if (currentIndex === 1) {
    // Ocean Breeze
    hover = '#2D3748'
    light = '#E2E8F0'
  } else if (currentIndex === 2) {
    // Warm Sand
    hover = '#4A3728'
    light = '#F5E6D3'
  } else if (currentIndex === 3) {
    // Forest Green
    hover = '#2D4A3D'
    light = '#D4E4DD'
  } else {
    // Lavender Storm (default)
    hover = '#44454F'
    light = '#E8E6F0'
  }
  
  return {
    '--c-canvas': canvas,
    '--c-ink': ink,
    '--c-strong': strong,
    '--c-soft': soft,
    '--c-spark': spark,
    '--c-hover': hover,
    '--c-muted': muted,
    '--c-light': light,
  }
}

/**
 * Reader theme sync - syncs global theme to reader page
 * Reads from theme controller and applies actual theme colors to reader page
 */
export function ReaderThemeSync() {
  const { setOverride } = useThemeOverride()
  const originalVarsRef = useRef<Record<string, string> | null>(null)
  const [themeIndex, setThemeIndex] = useState(() => getCurrentThemeIndex())

  // Listen for theme changes from global theme controller
  useEffect(() => {
    const handleThemeChange = () => {
      const newIndex = getCurrentThemeIndex()
      setThemeIndex(newIndex)
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
    const applyThemeVars = () => {
      const currentIndex = getCurrentThemeIndex()
      
      // Determine if dark theme for override (Jet Black is index 4)
      const isDark = currentIndex === 4 && !isBlackWhiteActive()
      setOverride(isDark ? "dark" : "light")
      
      // Get current theme variables from theme controller
      const vars = getCurrentThemeVars()
      const root = document.documentElement
      
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
      
      setThemeIndex(currentIndex)
    }
    
    // Apply immediately
    applyThemeVars()
    
    // Listen for theme changes and re-apply theme variables
    const handleThemeChange = () => {
      applyThemeVars()
    }
    
    window.addEventListener('theme-change', handleThemeChange)
    window.addEventListener('storage', handleThemeChange)
    
    return () => {
      window.removeEventListener('theme-change', handleThemeChange)
      window.removeEventListener('storage', handleThemeChange)
    }
  }, [setOverride])

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
