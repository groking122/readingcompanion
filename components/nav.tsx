"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { BookOpen, BookMarked, RotateCcw, Heart, Sparkles, Home, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ThemeRandomizer } from "@/components/theme-randomizer"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/suggested", label: "Suggested", icon: Sparkles },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/vocab", label: "Vocabulary", icon: BookMarked },
  { href: "/review", label: "Review", icon: RotateCcw },
]

export function Nav() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--c-spark)] rounded-full" />
                    )}
                    {!isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--c-soft)]/30 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 rounded-full" />
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
            {/* Theme Controls */}
            <div className="hidden md:flex items-center gap-2">
              <ThemeToggle />
              <ThemeRandomizer />
            </div>
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
                      ? "bg-[var(--c-strong)] text-[var(--c-canvas)]"
                      : "text-muted-foreground hover:opacity-80"
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
                          ? "bg-[var(--c-strong)] text-[var(--c-canvas)]"
                          : "text-muted-foreground hover:opacity-80"
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

