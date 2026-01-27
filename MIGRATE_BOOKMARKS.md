# Bookmarks Table Migration

## Error
The error `relation "bookmarks" does not exist` means the bookmarks table hasn't been created in your database yet.

## Solution

Run the SQL migration to create the bookmarks table:

### Option 1: Using Neon Dashboard (Recommended)

1. Go to your Neon dashboard: https://console.neon.tech
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Copy and paste the contents of `add_bookmarks_table.sql`
5. Click "Run" to execute the migration

### Option 2: Using psql Command Line

```bash
# Connect to your database
psql "your-database-connection-string"

# Then run the SQL file
\i add_bookmarks_table.sql
```

### Option 3: Copy-Paste SQL Directly

Copy this SQL and run it in your database:

```sql
-- Migration: Add bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  title TEXT, -- Optional bookmark title/note
  epub_location TEXT, -- EPUB CFI location
  page_number INTEGER, -- Page number for PDFs
  position INTEGER, -- Character position for text
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON bookmarks(book_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_book ON bookmarks(user_id, book_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bookmarks_updated_at BEFORE UPDATE ON bookmarks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Verification

After running the migration, verify the table exists:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'bookmarks';
```

You should see `bookmarks` in the results.

## After Migration

Once the migration is complete:
- Bookmarks will work correctly
- Auto-save reading progress will work
- The error will stop appearing


