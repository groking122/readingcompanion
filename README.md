# Reading Companion

A minimal MVP application to help you learn vocabulary while reading books. Built with Next.js (App Router), TypeScript, Tailwind CSS, Clerk authentication, and Neon Postgres.

## Features

- **Authentication**: Secure sign-in/sign-up with Clerk
- **Library**: Upload PDFs or paste plain text to create books
- **Reader**: Read books and click/select words to get Greek translations
- **Vocabulary**: View all saved words, searchable and filterable by book
- **Review**: Spaced repetition flashcards using SM-2 algorithm
- **Translation**: Cached translations via DeepL, Google Translate, or LibreTranslate

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: Clerk
- **Database**: Neon Postgres (via Drizzle ORM)
- **PDF Rendering**: react-pdf
- **Translation**: DeepL/Google/LibreTranslate API

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database (Neon Postgres)
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# Translation API (choose one)
# Option 1: DeepL (recommended)
DEEPL_API_KEY=your_deepl_api_key
TRANSLATION_PROVIDER=deepL

# Option 2: LibreTranslate
LIBRETRANSLATE_API_URL=https://libretranslate.com/translate
LIBRETRANSLATE_API_KEY=your_api_key_if_needed
TRANSLATION_PROVIDER=libreTranslate

# Option 3: Google Translate (requires additional setup)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
TRANSLATION_PROVIDER=google
```

### 3. Database Setup

1. Create a Neon Postgres database at [neon.tech](https://neon.tech)
2. Copy your connection string to `DATABASE_URL`
3. Run migrations:

```bash
npm run db:push
```

### 4. Clerk Setup

1. Create an account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy your publishable key and secret key to `.env.local`
4. Configure Clerk:
   - Add `http://localhost:3000` to allowed origins
   - Set sign-in/sign-up URLs to `/sign-in` and `/sign-up`

### 5. Translation API Setup

Choose one translation provider:

**DeepL (Recommended):**
- Sign up at [deepl.com](https://www.deepl.com/pro-api)
- Get your API key
- Set `TRANSLATION_PROVIDER=deepL` and `DEEPL_API_KEY`

**LibreTranslate:**
- Use the public instance or self-host
- Set `TRANSLATION_PROVIDER=libreTranslate`
- Optionally set `LIBRETRANSLATE_API_URL` and `LIBRETRANSLATE_API_KEY`

**Google Translate:**
- Requires Google Cloud setup
- Set `TRANSLATION_PROVIDER=google`
- Configure service account credentials

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `DATABASE_URL`
   - `DEEPL_API_KEY` (or your chosen translation provider)
   - `TRANSLATION_PROVIDER`

### 3. Configure Clerk for Production

1. In Clerk dashboard, add your Vercel domain to allowed origins
2. Update sign-in/sign-up URLs if needed

### 4. Database Migrations

After deployment, run migrations:

```bash
npm run db:push
```

Or use Vercel's CLI:

```bash
vercel env pull .env.local
npm run db:push
```

## Project Structure

```
├── app/
│   ├── (protected)/          # Protected routes
│   │   ├── library/          # Library page
│   │   ├── reader/[id]/      # Reader page
│   │   ├── vocab/            # Vocabulary page
│   │   └── review/           # Review/flashcards page
│   ├── api/                  # API routes
│   │   ├── books/           # Book CRUD
│   │   ├── vocabulary/      # Vocabulary CRUD
│   │   ├── flashcards/      # Flashcard operations
│   │   └── translate/       # Translation endpoint
│   ├── sign-in/             # Clerk sign-in
│   ├── sign-up/             # Clerk sign-up
│   └── layout.tsx           # Root layout
├── components/
│   ├── ui/                  # shadcn/ui components
│   └── nav.tsx              # Navigation component
├── db/
│   ├── schema.ts            # Database schema
│   └── index.ts             # Database connection
├── lib/
│   ├── translation.ts       # Translation service
│   ├── sm2.ts               # SM-2 algorithm
│   └── utils.ts             # Utility functions
└── middleware.ts            # Clerk middleware
```

## Database Schema

- **books**: Stores book metadata (title, content, PDF URL)
- **vocabulary**: Stores saved words with translations and context
- **flashcards**: Stores flashcard data with SM-2 scheduling
- **translation_cache**: Caches translations to reduce API calls

## Usage

1. **Sign Up/In**: Create an account or sign in
2. **Add Books**: Go to Library, click "Add Book", upload PDF or paste text
3. **Read & Learn**: Open a book, select words/phrases to see Greek translations
4. **Save Words**: Click "Save Word" to add to your vocabulary
5. **Review**: Go to Review page to practice with spaced repetition flashcards
6. **Manage Vocabulary**: View all saved words in Vocabulary page, search and filter

## Notes

- PDFs are stored as base64 in the database (MVP approach). For production, consider using S3 or similar storage.
- Translations are cached to reduce API costs
- SM-2 algorithm schedules reviews based on your performance
- All translations default to Greek (el) as the target language

## License

MIT

