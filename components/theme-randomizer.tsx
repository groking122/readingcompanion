"use client"

import { useEffect, useState } from "react"
import { Shuffle } from "lucide-react"
import { initThemeSystem, isBlackWhiteActive } from "@/lib/theme-controller"
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
    
    if (!cycleTheme) {
      console.warn("Theme cycle function not initialized")
      return
    }
    
    // Don't cycle if black/white is active
    if (isBlackWhiteActive()) {
      console.log("Black/white theme is active, cannot cycle")
      return
    }
    
    // Trigger click animation
    setIsAnimating(true)
    
    // Cycle theme
    cycleTheme()
    
    // Reset animation state after animation completes
    setTimeout(() => {
      setIsAnimating(false)
    }, 300)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBlackWhite || !cycleTheme}
      className={cn(
        "h-9 w-9 rounded-lg",
        "border border-white/20",
        "bg-white/5",
        "text-white",
        "flex items-center justify-center",
        "transition-all duration-300 ease-in-out",
        "hover:rotate-180 hover:bg-white/10 hover:border-white/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        "active:scale-90",
        "cursor-pointer",
        "relative z-10",
        "backdrop-blur-sm",
        "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:rotate-0 disabled:hover:bg-white/5 disabled:hover:border-white/20",
        isAnimating && "animate-pulse"
      )}
      aria-label="Cycle through color themes"
      title={isBlackWhite ? "Switch to color theme to cycle" : "Cycle through color themes"}
    >
      <Shuffle className="h-4 w-4" strokeWidth={2} />
    </button>
  )
}

