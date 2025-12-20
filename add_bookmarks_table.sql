-- Migration: Add bookmarks table
-- Run this migration to add bookmark functionality

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

