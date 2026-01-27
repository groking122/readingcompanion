import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Inter, Playfair_Display, Crimson_Text, Libre_Baskerville, Source_Serif_4, Spectral, Literata, Open_Sans, Source_Sans_3, Work_Sans, Poppins } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { ToastProvider } from "@/components/toast-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { DarkModeManager } from "@/components/dark-mode-manager"
import { OfflineProvider } from "@/components/offline-provider"
import { ServiceWorkerUpdater } from "@/components/service-worker-updater"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600", "700", "800", "900"]
})

// Additional reading fonts (loaded but not applied by default)
const crimsonText = Crimson_Text({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-crimson", display: "swap" })
const libreBaskerville = Libre_Baskerville({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-libre", display: "swap" })
const sourceSerifPro = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-source-serif", display: "swap" })
const spectral = Spectral({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-spectral", display: "swap" })
const literata = Literata({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-literata", display: "swap" })
const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-open-sans", display: "swap" })
const sourceSansPro = Source_Sans_3({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-source-sans", display: "swap" })
const workSans = Work_Sans({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-work-sans", display: "swap" })
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-poppins", display: "swap" })

export const metadata: Metadata = {
  title: "Lexis",
  description: "The smart way to learn English through reading. Instant Greek translations, vocabulary tracking, and adaptive flashcards help you learn naturally.",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.variable} ${playfair.variable} ${crimsonText.variable} ${libreBaskerville.variable} ${sourceSerifPro.variable} ${spectral.variable} ${literata.variable} ${openSans.variable} ${sourceSansPro.variable} ${workSans.variable} ${poppins.variable} ${inter.className}`}>
          {children}
          <ToastProvider />
          <ThemeProvider />
          <DarkModeManager />
          <OfflineProvider />
          <ServiceWorkerUpdater />
        </body>
      </html>
    </ClerkProvider>
  )
}

