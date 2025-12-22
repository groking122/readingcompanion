-- Migration: Add missing columns to vocabulary table
-- Run this SQL script on your database to add the missing columns

-- Add term_normalized column (optional, for caching normalized terms)
ALTER TABLE vocabulary 
ADD COLUMN IF NOT EXISTS term_normalized TEXT;

-- Add kind column (word or phrase, defaults to 'word')
ALTER TABLE vocabulary 
ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'word';

-- Add is_known column (mark words as known, defaults to false)
ALTER TABLE vocabulary 
ADD COLUMN IF NOT EXISTS is_known BOOLEAN NOT NULL DEFAULT false;

-- Create an index on term_normalized for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_vocabulary_term_normalized ON vocabulary(term_normalized);

-- Create an index on is_known for filtering (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_vocabulary_is_known ON vocabulary(is_known);

