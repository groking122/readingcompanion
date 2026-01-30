"use client"

import { useEffect, useState } from "react"
import { Shuffle } from "lucide-react"
import { initThemeSystem, isBlackWhiteActive, cycleTheme as cycleThemeDirect } from "@/lib/theme-controller"
import { cn } from "@/lib/utils"

export function ThemeRandomizer() {
  const [cycleTheme, setCycleTheme] = useState<(() => void) | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isBlackWhite, setIsBlackWhite] = useState(false)

  useEffect(() => {
    // Initialize theme system and get cycle function
    const cycle = initThemeSystem()
    setCycleTheme(() => cycle)
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

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Don't cycle if black/white is active
    if (isBlackWhiteActive()) {
      return
    }
    
    // Trigger click animation
    setIsAnimating(true)
    
    // Cycle theme - use direct function call as fallback
    if (cycleTheme) {
      cycleTheme()
    } else {
      cycleThemeDirect()
    }
    
    // Reset animation state after animation completes
    setTimeout(() => {
      setIsAnimating(false)
    }, 300)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBlackWhite}
      className={cn(
        "h-9 w-9 rounded-lg",
        "border border-border/20",
        "bg-background/5",
        "text-foreground",
        "flex items-center justify-center",
        "transition-all duration-300 ease-in-out",
        "hover:rotate-180 hover:bg-foreground/10 hover:border-border/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-90",
        "cursor-pointer",
        "relative z-10",
        "backdrop-blur-sm",
        "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:rotate-0 disabled:hover:bg-background/5 disabled:hover:border-border/20",
        isAnimating && "animate-pulse"
      )}
      aria-label="Cycle through color themes"
      title={isBlackWhite ? "Switch to color theme to cycle" : "Cycle through color themes"}
    >
      <Shuffle className="h-4 w-4" strokeWidth={2} />
    </button>
  )
}

