"use client"

import { useEffect } from "react"
import { initThemeSystem } from "@/lib/theme-controller"

export function ThemeProvider() {
  useEffect(() => {
    // Initialize theme system on mount
    initThemeSystem()
  }, [])

  return null
}

