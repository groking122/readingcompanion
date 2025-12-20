-- Migration: Add kind and isKnown fields to vocabulary table
-- Run this migration to add phrase support and mark-as-known functionality

-- Add kind column (word or phrase)
ALTER TABLE vocabulary 
ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'word' NOT NULL;

-- Add term_normalized column for caching
ALTER TABLE vocabulary 
ADD COLUMN IF NOT EXISTS term_normalized TEXT;

-- Add is_known column (mark words/phrases as known)
ALTER TABLE vocabulary 
ADD COLUMN IF NOT EXISTS is_known BOOLEAN DEFAULT false NOT NULL;

-- Create index on term_normalized for faster lookups
CREATE INDEX IF NOT EXISTS idx_vocabulary_term_normalized ON vocabulary(term_normalized);

-- Create index on is_known for filtering
CREATE INDEX IF NOT EXISTS idx_vocabulary_is_known ON vocabulary(is_known);

-- Update existing records to have normalized terms
UPDATE vocabulary 
SET term_normalized = LOWER(TRIM(REGEXP_REPLACE(term, '\s+', ' ', 'g')))
WHERE term_normalized IS NULL;

