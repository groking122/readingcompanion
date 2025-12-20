"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { BookOpen, BookMarked, RotateCcw, Moon, Sun, Heart, Sparkles, Home, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/suggested", label: "Suggested", icon: Sparkles },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/vocab", label: "Vocabulary", icon: BookMarked },
  { href: "/review", label: "Review", icon: RotateCcw },
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
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-soft">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-4 md:gap-8">
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
            
            <Link 
              href="/" 
              className="text-lg font-bold tracking-tight transition-colors hover:text-primary md:text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
            >
              Reading Companion
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className="h-9 w-9 p-0 rounded-lg hover:bg-accent/50 transition-all duration-200"
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
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
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
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

