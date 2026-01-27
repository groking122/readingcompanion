/**
 * Simple theme override store - allows reader to override global theme
 * Uses module-level state with event listeners for reactivity
 */

import { useState, useEffect } from "react"

type ThemeOverride = "light" | "dark" | null

let currentOverride: ThemeOverride = null
const listeners = new Set<() => void>()

export const themeOverrideStore = {
  getOverride: () => currentOverride,
  
  setOverride: (override: ThemeOverride) => {
    currentOverride = override
    listeners.forEach(listener => listener())
  },
  
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
}

// React hook for components
export function useThemeOverride() {
  // Initialize with current value, then subscribe to changes
  const [override, setOverrideState] = useState<ThemeOverride>(() => currentOverride)
  
  useEffect(() => {
    // Sync initial state
    setOverrideState(currentOverride)
    
    // Subscribe to changes
    const unsubscribe = themeOverrideStore.subscribe(() => {
      setOverrideState(themeOverrideStore.getOverride())
    })
    return unsubscribe
  }, [])
  
  return {
    override,
    setOverride: themeOverrideStore.setOverride
  }
}
