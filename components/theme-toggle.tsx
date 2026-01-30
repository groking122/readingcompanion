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
        "border border-border/20",
        "bg-background/5",
        "text-foreground",
        "flex items-center justify-center",
        "transition-all duration-200 ease-out",
        "hover:bg-foreground/10 hover:border-border/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-90",
        "backdrop-blur-sm"
      )}
      aria-label={isBlackWhite ? "Switch to color theme" : "Switch to black and white theme"}
      title={isBlackWhite ? "Switch to color theme" : "Switch to black and white theme"}
    >
      <Contrast className="h-4 w-4" strokeWidth={2} />
    </button>
  )
}

