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
      <nav 
        className="theme-surface sticky top-0 z-50 w-full overflow-hidden !border-0"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          outline: 'none',
          boxShadow: 'none'
        }}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6 lg:px-8" style={{ border: 'none', outline: 'none' }}>
          {/* Logo - Left */}
          <div className="flex items-center">
            <Link 
              href="/" 
              className="text-lg font-serif font-bold tracking-tight transition-all duration-300 hover:opacity-80 md:text-xl relative cursor-pointer"
              style={{
                color: '#ffffff',
                textShadow: '0 0 20px rgba(255, 255, 255, 0.3)'
              }}
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
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <span className="relative">
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full z-10" />
                    )}
                    <span className={cn(
                      "absolute bottom-0 left-1/2 h-0.5 w-0 bg-white/30 -translate-x-1/2 group-hover:w-full transition-all duration-300 ease-out rounded-full",
                      isActive && "group-hover:bg-white/50"
                    )} />
                  </span>
                </Link>
              )
            })}
          </div>
          
          {/* Right Side - Mobile Menu & Actions */}
          <div className="flex items-center gap-2" style={{ border: 'none', outline: 'none' }}>
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden h-9 w-9 p-0 text-white hover:bg-white/10"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
            {/* Theme Controls */}
            <div className="flex items-center gap-2">
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

