import type { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { ToastProvider } from "@/components/toast-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600", "700", "800", "900"]
})

export const metadata: Metadata = {
  title: "Lexis",
  description: "Your intelligent reading companion for vocabulary and comprehension",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.variable} ${playfair.variable} ${inter.className}`}>
          {children}
          <ToastProvider />
        </body>
      </html>
    </ClerkProvider>
  )
}

