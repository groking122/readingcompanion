# Database Migration Instructions

## Problem
The vocabulary table is missing some columns that are defined in the schema:
- `term_normalized` (TEXT, optional)
- `kind` (TEXT, defaults to 'word')
- `is_known` (BOOLEAN, defaults to false)

## Solution

### Option 1: Run SQL Migration (Recommended)

1. **Connect to your Neon database**:
   - Go to your Neon dashboard
   - Open the SQL Editor
   - Or use any PostgreSQL client (psql, DBeaver, etc.)

2. **Run the migration script**:
   - Copy the contents of `migrations/add_vocabulary_columns.sql`
   - Paste and execute it in your database

### Option 2: Use Drizzle Kit (If configured)

If you have Drizzle Kit set up, you can generate and run migrations:

```bash
# Generate migration
npx drizzle-kit generate

# Apply migration (if you have a migration runner)
npx drizzle-kit migrate
```

### Option 3: Manual SQL (Quick Fix)

Run these SQL commands directly in your database:

```sql
-- Add term_normalized column
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS term_normalized TEXT;

-- Add kind column
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'word';

-- Add is_known column
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS is_known BOOLEAN NOT NULL DEFAULT false;
```

## Verification

After running the migration, verify the columns exist:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'vocabulary'
ORDER BY ordinal_position;
```

You should see:
- `term_normalized` (text, nullable)
- `kind` (text, not null, default 'word')
- `is_known` (boolean, not null, default false)

## After Migration

Once the migration is complete, the save word functionality should work without errors. The app will automatically start using these columns.

