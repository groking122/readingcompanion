// SuperMemo 2 (SM-2) Algorithm for spaced repetition

export interface SM2Card {
  easeFactor: number;
  interval: number; // days
  repetitions: number;
  dueAt: Date;
}

export interface SM2Result extends SM2Card {
  nextReview: Date;
}

const MIN_EASE_FACTOR = 1.3;
const INITIAL_EASE_FACTOR = 2.5;
const INITIAL_INTERVAL = 1; // days

export function createNewCard(): SM2Card {
  return {
    easeFactor: INITIAL_EASE_FACTOR,
    interval: INITIAL_INTERVAL,
    repetitions: 0,
    dueAt: new Date(),
  };
}

export function updateCard(card: SM2Card, quality: number): SM2Result {
  // Quality: 0-5 scale (0 = complete blackout, 5 = perfect response)
  // For simplicity, we'll use: 0-2 = incorrect, 3 = hard, 4 = good, 5 = easy

  let { easeFactor, interval, repetitions } = card;

  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(easeFactor, MIN_EASE_FACTOR);

  // Update repetitions
  if (quality < 3) {
    // Incorrect response - reset
    repetitions = 0;
    interval = 1;
  } else {
    // Correct response
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    
    // Prevent interval regression on correct answers (ease factor floor protection)
    // Don't reduce interval if the answer was correct (quality >= 3)
    if (interval < card.interval) {
      interval = card.interval;
    }
  }

  // Boost ease factor for consecutive perfect answers (quality === 5)
  // Track this via a streak mechanism (simplified: if quality is 5, slightly boost)
  // Note: Full streak tracking would require additional state, but this helps prevent ease hell
  if (quality === 5 && repetitions >= 3) {
    // Slight boost to ease factor for consistent excellent performance
    easeFactor = Math.min(easeFactor * 1.05, 2.5); // Cap at initial ease factor
  }

  // Calculate next review date using UTC epoch math to avoid DST issues
  // Convert interval (days) to milliseconds and add to current UTC time
  const nextReview = new Date(Date.now() + interval * 86400 * 1000);

  return {
    easeFactor,
    interval,
    repetitions,
    dueAt: nextReview,
    nextReview,
  };
}

