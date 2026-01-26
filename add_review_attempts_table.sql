-- Migration: Add review_attempts table
-- Run this migration to add review attempt history tracking
-- This table is append-only for analytics and debugging

CREATE TABLE IF NOT EXISTS review_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  session_id TEXT, -- Groups attempts in a review session
  attempt_id TEXT NOT NULL, -- For idempotency (unique per attempt)
  quality INTEGER NOT NULL, -- 0-5 quality score (SM-2)
  response_ms INTEGER, -- Response time in milliseconds
  exercise_type TEXT, -- "meaning-in-context", "cloze-blank", "reverse-mcq", "matching-pairs"
  old_ease_factor DOUBLE PRECISION, -- Before update
  new_ease_factor DOUBLE PRECISION, -- After update
  old_interval INTEGER, -- Before update (days)
  new_interval INTEGER, -- After update (days)
  old_repetitions INTEGER, -- Before update
  new_repetitions INTEGER, -- After update
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_review_attempts_user_id ON review_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_review_attempts_flashcard_id ON review_attempts(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_review_attempts_vocabulary_id ON review_attempts(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_review_attempts_session_id ON review_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_review_attempts_attempt_id ON review_attempts(attempt_id);
CREATE INDEX IF NOT EXISTS idx_review_attempts_created_at ON review_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_review_attempts_user_created ON review_attempts(user_id, created_at DESC);

-- Unique constraint on attempt_id to prevent duplicate logging
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_attempts_attempt_id_unique ON review_attempts(attempt_id);

