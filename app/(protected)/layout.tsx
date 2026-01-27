import React from "react"
import { Nav } from "@/components/nav"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Nav />
      <main className="theme-surface min-h-[calc(100vh-4rem)]" style={{ overflow: 'visible', border: 'none', outline: 'none', backgroundColor: 'transparent' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12" style={{ overflow: 'visible', border: 'none', outline: 'none', backgroundColor: 'transparent' }}>
          {children}
        </div>
      </main>
    </>
  )
}

