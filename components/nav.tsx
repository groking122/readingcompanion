"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { BookOpen, BookMarked, RotateCcw, Moon, Sun, Heart, Sparkles, Home, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/suggested", label: "Suggested", icon: Sparkles },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/vocab", label: "Vocabulary", icon: BookMarked },
]

export function Nav() {
  const pathname = usePathname()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem("darkMode") === "true"
    setIsDarkMode(savedDarkMode)
    if (savedDarkMode) {
      document.documentElement.classList.add("dark")
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    localStorage.setItem("darkMode", newDarkMode.toString())
    
    // Apply theme change immediately and synchronously
    // Remove requestAnimationFrame to ensure all elements change at the same time
    if (newDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <>
      <nav className="theme-surface sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
          {/* Logo - Left */}
          <div className="flex items-center">
            <Link 
              href="/" 
              className="text-lg font-serif font-bold tracking-tight transition-all duration-300 hover:text-primary md:text-xl bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent hover:scale-105 inline-block cursor-pointer"
            >
              Lexis
            </Link>
          </div>
          
          {/* Centered Navigation */}
          <div className="hidden items-center gap-1 md:flex absolute left-1/2 transform -translate-x-1/2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 relative group",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="relative">
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                    {!isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted-foreground/30 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 rounded-full" />
                    )}
                  </span>
                </Link>
              )
            })}
          </div>
          
          {/* Right Side - Mobile Menu & Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden h-9 w-9 p-0"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className="h-9 w-9 p-0 rounded-lg hover:bg-accent/50 transition-[background-color,transform] duration-150 ease-out relative overflow-hidden"
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-150 ease-out" style={{ opacity: isDarkMode ? 0 : 1 }}>
                <Moon className="h-4 w-4" />
              </span>
              <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-150 ease-out" style={{ opacity: isDarkMode ? 1 : 0 }}>
                <Sun className="h-4 w-4" />
              </span>
              <span className="sr-only">Toggle theme</span>
            </Button>
            <UserButton />
          </div>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          
          {/* Mobile Menu */}
          <div
            className={cn(
              "fixed top-16 left-0 right-0 z-50 bg-background border-b shadow-lg md:hidden transition-transform duration-300 ease-in-out",
              mobileMenuOpen ? "translate-y-0" : "-translate-y-full"
            )}
          >
            <nav className="container mx-auto px-4 py-4">
              <div className="flex flex-col gap-1">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-all duration-200",
                    pathname === "/"
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground hover:text-foreground"
                  )}
                >
                  <Home className="h-5 w-5" />
                  <span>Home</span>
                </Link>
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-soft"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  )
}

