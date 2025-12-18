# Quick Setup Guide - Get Started in 10 Minutes

Follow these steps in order to get your Reading Companion app running:

## Step 1: Set Up Clerk Authentication (5 minutes)

1. Go to [clerk.com](https://clerk.com) and sign up/login
2. Click "Create Application"
3. Choose "Next.js" as your framework
4. Copy your **Publishable Key** (starts with `pk_test_...`)
5. Copy your **Secret Key** (starts with `sk_test_...`)
6. In Clerk Dashboard → **Paths**, configure:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in: `/library`
   - After sign-up: `/library`

## Step 2: Set Up Neon Database (3 minutes)

1. Go to [neon.tech](https://neon.tech) and sign up/login
2. Click "Create Project"
3. Choose a name (e.g., "reading-companion")
4. Copy your **Connection String** (looks like: `postgresql://user:pass@host.neon.tech/dbname?sslmode=require`)

## Step 3: Set Up Translation API (2 minutes)

**Option A: DeepL (Recommended - Free tier: 500k chars/month)**
1. Go to [deepl.com/pro-api](https://www.deepl.com/pro-api)
2. Sign up for free account
3. Copy your **API Key**

**Option B: LibreTranslate (Free, no signup needed)**
- Use the public instance (no API key needed)

## Step 4: Create Environment File

Create a file named `.env.local` in the root directory with:

```env
# Clerk (from Step 1)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
CLERK_SECRET_KEY=sk_test_YOUR_KEY_HERE

# Database (from Step 2)
DATABASE_URL=postgresql://YOUR_CONNECTION_STRING_HERE

# Translation (from Step 3 - choose one)
# For DeepL:
DEEPL_API_KEY=YOUR_DEEPL_KEY_HERE
TRANSLATION_PROVIDER=deepL

# OR for LibreTranslate (no key needed):
# LIBRETRANSLATE_API_URL=https://libretranslate.com/translate
# TRANSLATION_PROVIDER=libreTranslate
```

## Step 5: Set Up Database Tables

Run this command to create all database tables:

```bash
npm run db:push
```

## Step 6: Start the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 7: Test Adding a Book

1. Sign up for a new account (Clerk will handle this)
2. You'll be redirected to the Library page
3. Click "Add Book"
4. Enter a title (e.g., "Test Book")
5. Paste some text in the text area (e.g., "The quick brown fox jumps over the lazy dog.")
6. Click "Create Book"
7. Click "Open Book" on your new book
8. Select a word to see the Greek translation!

## Troubleshooting

**Database connection error?**
- Check your `DATABASE_URL` is correct
- Make sure it includes `?sslmode=require` at the end

**Clerk authentication not working?**
- Verify your keys are correct in `.env.local`
- Make sure `http://localhost:3000` is in Clerk's allowed origins

**Translation not working?**
- Check your API key is correct
- For DeepL, verify you haven't exceeded free tier limits
- For LibreTranslate, the public instance might be slow

**Can't see the app?**
- Make sure the dev server is running (`npm run dev`)
- Check the terminal for any error messages


