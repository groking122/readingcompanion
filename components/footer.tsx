import Link from "next/link"

export function Footer() {
  return (
    <footer className="mt-16 md:mt-20 lg:mt-24 py-6 border-t border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>© 2026 Lexis Inc.</div>
          <div className="flex items-center gap-4">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <span>•</span>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
            <span>•</span>
            <Link href="#" className="hover:text-foreground transition-colors">Support</Link>
          </div>
          <div>Made with ♥ for readers</div>
        </div>
      </div>
    </footer>
  )
}

