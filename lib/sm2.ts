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
  }

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    easeFactor,
    interval,
    repetitions,
    dueAt: nextReview,
    nextReview,
  };
}

