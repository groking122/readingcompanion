import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="mb-8 text-center max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-3 tracking-tight">
          Lexis
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-4 font-sans">
          Your reading companion for learning English
        </p>
        <p className="text-sm md:text-base text-muted-foreground/80 font-sans">
          The smart way to learn English through reading. Instant Greek translations, vocabulary tracking, and adaptive flashcards help you learn naturally.
        </p>
      </div>
      <SignIn />
    </div>
  )
}

