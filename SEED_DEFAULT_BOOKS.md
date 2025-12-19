# Seeding Default Books

This guide explains how to pre-download and store default books in the database for faster access.

## Why Pre-Seed Default Books?

**Benefits:**
- ✅ **Faster**: No GitHub download needed when users add books
- ✅ **More Reliable**: No dependency on GitHub availability
- ✅ **Better UX**: Instant book addition
- ✅ **Server-Side**: Books stored once, copied to users

## How It Works

1. **Default Books**: Stored in database with `userId = "system_default"`
2. **User Adds Book**: System copies the EPUB data from default book to user's library
3. **No Download**: No GitHub fetch needed - instant copy operation

## Setup Instructions

### 1. Install tsx (if not already installed)

```bash
npm install -D tsx
```

### 2. Run the Seed Script

```bash
npx tsx scripts/seed-default-books.ts
```

This will:
- Download EPUBs from GitHub
- Convert to base64
- Store in database with `userId = "system_default"`

### 3. Verify

Check your database:
```sql
SELECT title, type, created_at 
FROM books 
WHERE user_id = 'system_default';
```

## Default Books Included

- Deep Work
- The Power Of Now
- The Memory Bible
- The Marshmallow Test
- The Art of Extraordinary Confidence
- The Big Leap
- The Happiness Purpose
- The Kindness Challenge
- The MindBody Code
- The Brave Athlete
- The Driving Book
- 60 Second Solutions: Motivation
- 8 Keys to Raising the Quirky Child

## Re-Seeding

To update or re-seed:
1. Delete existing default books:
   ```sql
   DELETE FROM books WHERE user_id = 'system_default';
   ```
2. Run the seed script again

## API Endpoint

Users add books via:
- **Old**: `/api/books/add-from-github` (downloads from GitHub)
- **New**: `/api/books/add-from-default` (copies from defaults) ⚡ Faster!

The suggested books page now uses the faster default endpoint automatically.

