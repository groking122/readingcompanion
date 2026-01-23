"use client"

import { useEffect, useState } from "react"
import { Contrast } from "lucide-react"
import { toggleBlackWhite, isBlackWhiteActive, initThemeSystem } from "@/lib/theme-controller"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const [isBlackWhite, setIsBlackWhite] = useState(false)

  useEffect(() => {
    // Initialize and check current state
    initThemeSystem()
    setIsBlackWhite(isBlackWhiteActive())
    
    // Listen for theme changes
    const handleThemeChange = () => {
      setIsBlackWhite(isBlackWhiteActive())
    }
    window.addEventListener('theme-change', handleThemeChange)
    window.addEventListener('storage', handleThemeChange)
    
    return () => {
      window.removeEventListener('theme-change', handleThemeChange)
      window.removeEventListener('storage', handleThemeChange)
    }
  }, [])

  const handleToggle = () => {
    toggleBlackWhite()
    // Force immediate state update
    setIsBlackWhite(!isBlackWhiteActive())
  }

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "h-9 w-9 rounded-lg",
        "border border-[var(--c-soft)]",
        "bg-transparent",
        "text-[var(--c-ink)]",
        "flex items-center justify-center",
        "transition-all duration-200 ease-out",
        "hover:opacity-80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-spark)] focus-visible:ring-offset-2",
        "active:scale-90"
      )}
      aria-label={isBlackWhite ? "Switch to color theme" : "Switch to black and white theme"}
      title={isBlackWhite ? "Switch to color theme" : "Switch to black and white theme"}
    >
      <Contrast className="h-4 w-4" strokeWidth={2} />
    </button>
  )
}

