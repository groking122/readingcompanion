/**
 * Design Tokens - Centralized design system values
 * Based on design principles from 150+ sources
 * 
 * Now uses 5-Color Minimalist Theme System
 */

// Re-export theme configuration
export { themes, type Theme } from "./theme-controller"

// Color Palette - Semantic and Purposeful
// Note: Colors now use CSS variables from theme system
export const colors = {
  // Primary Brand Colors
  primary: {
    50: 'hsl(222, 47%, 11%)',
    100: 'hsl(222, 47%, 15%)',
    200: 'hsl(222, 47%, 20%)',
    300: 'hsl(222, 47%, 30%)',
    400: 'hsl(222, 47%, 40%)',
    500: 'hsl(222, 47%, 50%)',
    600: 'hsl(222, 47%, 60%)',
    700: 'hsl(222, 47%, 70%)',
    800: 'hsl(222, 47%, 80%)',
    900: 'hsl(222, 47%, 90%)',
  },
  
  // Semantic Colors
  success: {
    light: 'hsl(142, 71%, 45%)',
    DEFAULT: 'hsl(142, 71%, 45%)',
    dark: 'hsl(142, 71%, 35%)',
    bg: 'hsl(142, 71%, 95%)',
  },
  
  warning: {
    light: 'hsl(38, 92%, 50%)',
    DEFAULT: 'hsl(38, 92%, 50%)',
    dark: 'hsl(38, 92%, 40%)',
    bg: 'hsl(38, 92%, 95%)',
  },
  
  error: {
    light: 'hsl(0, 84%, 60%)',
    DEFAULT: 'hsl(0, 84%, 60%)',
    dark: 'hsl(0, 84%, 50%)',
    bg: 'hsl(0, 84%, 95%)',
  },
  
  info: {
    light: 'hsl(217, 91%, 60%)',
    DEFAULT: 'hsl(217, 91%, 60%)',
    dark: 'hsl(217, 91%, 50%)',
    bg: 'hsl(217, 91%, 95%)',
  },
  
  // Category Colors (for Suggested Books)
  category: {
    Productivity: 'rgb(59, 130, 246)',
    'Self-Improvement': 'rgb(168, 85, 247)',
    Psychology: 'rgb(236, 72, 153)',
    Communication: 'rgb(234, 179, 8)',
    Spirituality: 'rgb(34, 197, 94)',
    Health: 'rgb(239, 68, 68)',
    Business: 'rgb(249, 115, 22)',
    Career: 'rgb(14, 165, 233)',
    Relationships: 'rgb(219, 39, 119)',
    Philosophy: 'rgb(139, 92, 246)',
    Practical: 'rgb(107, 114, 128)',
    Motivation: 'rgb(251, 146, 60)',
    Parenting: 'rgb(20, 184, 166)',
    Education: 'rgb(99, 102, 241)',
    'Sports Psychology': 'rgb(6, 182, 212)',
    Pets: 'rgb(147, 197, 253)',
  },
} as const

// Spacing Scale (8px base)
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
} as const

// Typography Scale
export const typography = {
  fontFamily: {
    sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Inter"', '"Roboto"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
    mono: ['"SF Mono"', 'Monaco', '"Cascadia Code"', '"Roboto Mono"', 'Consolas', 'monospace'],
  },
  
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const

// Border Radius
export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  DEFAULT: '0.5rem', // 8px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  full: '9999px',
} as const

// Shadows - Elevation System
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  
  // Custom shadows for Reading Companion
  soft: '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 4px 16px -4px rgba(0, 0, 0, 0.1)',
  elevated: '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 8px 24px -4px rgba(0, 0, 0, 0.12)',
  glow: '0 0 20px -5px rgba(59, 130, 246, 0.3)',
} as const

// Animation Durations
export const durations = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
  slowest: '1000ms',
} as const

// Animation Easing Functions
export const easing = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const

// Z-Index Scale
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
} as const

// Breakpoints (for responsive design)
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// Opacity Values
export const opacity = {
  0: '0',
  5: '0.05',
  10: '0.1',
  20: '0.2',
  30: '0.3',
  40: '0.4',
  50: '0.5',
  60: '0.6',
  70: '0.7',
  80: '0.8',
  90: '0.9',
  100: '1',
} as const

// Export all tokens
export const designTokens = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  durations,
  easing,
  zIndex,
  breakpoints,
  opacity,
} as const

export type DesignTokens = typeof designTokens

// 5-Color Minimalist Theme System Color Roles
export const colorRoles = {
  canvas: "var(--c-canvas)",  // Page background, empty space
  ink: "var(--c-ink)",          // Headings, body text, icons
  strong: "var(--c-strong)",   // Primary buttons, active states, high-emphasis borders
  soft: "var(--c-soft)",       // Secondary buttons, card borders, dividers, sub-text
  spark: "var(--c-spark)",     // Toggle switches, focus rings, badges, links
} as const

