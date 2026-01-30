/**
 * Theme Controller - 5-Color Minimalist Theme System
 * Manages theme definitions, application, and cycling
 */

// Theme configuration - JSON-compatible format
export interface Theme {
  id: string
  name: string
  colors: [string, string, string, string, string] // [CANVAS, INK, STRONG, SOFT, SPARK]
}

export const themes: Theme[] = [
  {
    id: 'theme-1',
    name: 'Lavender Storm',
    // CANVAS, INK, STRONG, SOFT, SPARK
    colors: ['#ECEFF3', '#292B30', '#605F6F', '#A196AE', '#C4B1CE']
  },
  {
    id: 'theme-2',
    name: 'Ocean Breeze',
    // Soft blue-grey palette
    colors: ['#F0F4F8', '#1A202C', '#4A5568', '#718096', '#90CDF4']
  },
  {
    id: 'theme-3',
    name: 'Warm Sand',
    // Warm beige-brown palette
    colors: ['#FFF8F0', '#2C1810', '#5C4033', '#C9A961', '#E8D5B7']
  },
  {
    id: 'theme-4',
    name: 'Forest Green',
    // CANVAS, INK, STRONG, SOFT, SPARK
    colors: ['#BCCCC4', '#00190C', '#3D6856', '#6F9081', '#89A497']
  },
  {
    id: 'theme-5',
    name: 'Jet Black',
    // CANVAS, INK, STRONG, SOFT, SPARK
    // Main Background: #080808, Primary Text: #FFFFFF, Buttons: #E7E9EA, Secondary: #9CA3AF, Accents: #6B7280
    colors: ['#080808', '#FFFFFF', '#E7E9EA', '#9CA3AF', '#6B7280']
  }
]

// Black/White theme (separate from color themes)
export const blackWhiteTheme: Theme = {
  id: 'black-white',
  name: 'Black & White',
  colors: ['#FFFFFF', '#000000', '#000000', '#666666', '#000000']
}

// CSS variable names mapped to color roles
const colorVars = ['--c-canvas', '--c-ink', '--c-strong', '--c-soft', '--c-spark'] as const

/**
 * Dispatch theme change event
 */
function dispatchThemeChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('theme-change'))
  }
}

/**
 * Apply a theme by setting CSS variables
 */
export function applyTheme(themeIndex: number): void {
  if (themeIndex < 0 || themeIndex >= themes.length) {
    console.warn(`Theme index ${themeIndex} is out of range. Using theme 0 (Lavender Storm).`)
    themeIndex = 0
  }

  const root = document.documentElement
  const theme = themes[themeIndex]
  
  // Apply all theme colors
  theme.colors.forEach((color, index) => {
    root.style.setProperty(colorVars[index], color)
  })
  
  // Add data attribute for Jet Black theme (theme-5) to enable filled cards
  if (themeIndex === 4) { // Jet Black is theme-5 (index 4)
    root.setAttribute('data-theme', 'jet-black')
  } else {
    root.removeAttribute('data-theme')
  }
  
  // Persist to localStorage
  localStorage.setItem('user-theme-index', themeIndex.toString())
  localStorage.setItem('is-black-white', 'false')
  
  // Notify components of theme change
  dispatchThemeChange()
}

/**
 * Apply black/white theme
 */
export function applyBlackWhiteTheme(): void {
  const root = document.documentElement
  
  // Save current theme index before switching to black/white
  const currentIndex = parseInt(localStorage.getItem('user-theme-index') || '4', 10)
  localStorage.setItem('previous-theme-index', currentIndex.toString())
  
  blackWhiteTheme.colors.forEach((color, index) => {
    root.style.setProperty(colorVars[index], color)
  })
  
  // Remove Jet Black theme attribute
  root.removeAttribute('data-theme')
  
  // Persist to localStorage
  localStorage.setItem('is-black-white', 'true')
  
  // Notify components of theme change
  dispatchThemeChange()
}

/**
 * Check if black/white theme is currently active
 */
export function isBlackWhiteActive(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('is-black-white') === 'true'
}

/**
 * Toggle between black/white and color themes
 */
export function toggleBlackWhite(): void {
  const isBlackWhite = isBlackWhiteActive()
  
  if (isBlackWhite) {
    // Switch back to the previous theme (or default to Jet Black)
    const previousIndex = parseInt(localStorage.getItem('previous-theme-index') || '4', 10)
    // Safety check
    const safeIndex = previousIndex >= 0 && previousIndex < themes.length ? previousIndex : 4
    applyTheme(safeIndex)
  } else {
    // Switch to black/white (saves current theme automatically)
    applyBlackWhiteTheme()
  }
}

/**
 * Cycle through themes - public function that can be called directly
 */
export function cycleTheme(): void {
  // Don't cycle if black/white is active
  if (isBlackWhiteActive()) {
    return
  }
  
  let currentIndex = parseInt(localStorage.getItem('user-theme-index') || '0', 10)
  // Ensure index is valid
  if (currentIndex < 0 || currentIndex >= themes.length) {
    currentIndex = 0
  }
  currentIndex = (currentIndex + 1) % themes.length
  applyTheme(currentIndex)
}

/**
 * Initialize theme system and return cycle function
 */
export function initThemeSystem(): () => void {
  // Check if black/white is active
  const isBlackWhite = isBlackWhiteActive()
  
  if (isBlackWhite) {
    applyBlackWhiteTheme()
  } else {
    // Check localStorage or default to 0 (Lavender Storm) instead of 4
    let currentIndex = parseInt(localStorage.getItem('user-theme-index') || '0', 10)
    
    // Safety check
    if (currentIndex < 0 || currentIndex >= themes.length) {
      currentIndex = 0
    }
    
    // Apply initial theme
    applyTheme(currentIndex)
  }

  // Return cycle function that calls the public function
  return cycleTheme
}

/**
 * Get current theme index from localStorage
 */
export function getCurrentThemeIndex(): number {
  const index = parseInt(localStorage.getItem('user-theme-index') || '0', 10)
  return index >= 0 && index < themes.length ? index : 0
}

/**
 * Get all available themes (for debugging or UI display)
 */
export function getAllThemes(): Theme[] {
  return themes
}

/**
 * Get theme by index
 */
export function getTheme(themeIndex: number): Theme | null {
  if (themeIndex < 0 || themeIndex >= themes.length) {
    return null
  }
  return themes[themeIndex]
}

