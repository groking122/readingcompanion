-- Add epub_location column to vocabulary table
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS epub_location TEXT;

