/**
 * Spaced repetition: SM-2 (SuperMemo 2) per question, adapted:
 *  - two grades only (right = 4, wrong = 1) because answers are multiple choice;
 *  - intervals shrink for weak topics, so they come back sooner;
 *  - a card is retired once its interval passes RETIRE_DAYS (it's learned).
 * Pure functions — tested in tests/unit/srs.test.ts against hand-worked SM-2 values.
 */

export interface SrsCard {
  /** Ease factor (SM-2 "EF"), ≥ 1.3. Starts at 2.5. */
  ef: number;
  /** Days until the next review. */
  interval: number;
  /** Correct answers in a row. */
  reps: number;
  /** Times it was missed after being learned. */
  lapses: number;
  /** YYYY-MM-DD the card is next due. */
  due: string;
}

export const START_EF = 2.5;
export const MIN_EF = 1.3;
export const RETIRE_DAYS = 120;
export const GRADE_RIGHT = 4;
export const GRADE_WRONG = 1;

/** SM-2 ease update: EF' = EF + (0.1 − (5 − q)(0.08 + (5 − q) × 0.02)), never below 1.3. */
export function nextEf(ef: number, q: number): number {
  return Math.max(MIN_EF, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
}

/**
 * How much of the normal interval a topic gets: 1.0 for a strong topic (accuracy 100 %), down to 0.6 for a weak
 * one (accuracy 0 %). Unknown topics count as average-strong (0.9).
 */
export function topicFactor(accuracy: number | undefined): number {
  if (accuracy === undefined || Number.isNaN(accuracy)) return 0.9;
  return 0.6 + 0.4 * Math.min(1, Math.max(0, accuracy));
}

export function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(y, m - 1, d + n);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/** A question just missed for the first time: due tomorrow. */
export function newCard(today: string): SrsCard {
  return { ef: START_EF, interval: 1, reps: 0, lapses: 0, due: addDaysIso(today, 1) };
}

/**
 * Schedule after an answer. Returns null when the card is retired (learned).
 * Right: reps 1 → 1 day, reps 2 → 6 days, then interval × EF (× topic factor). Wrong: back to 1 day.
 */
export function review(card: SrsCard, correct: boolean, today: string, accuracy?: number): SrsCard | null {
  const q = correct ? GRADE_RIGHT : GRADE_WRONG;
  const ef = nextEf(card.ef, q);
  if (!correct) return { ef, interval: 1, reps: 0, lapses: card.lapses + 1, due: addDaysIso(today, 1) };
  const reps = card.reps + 1;
  const base = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(card.interval * ef);
  const interval = Math.max(1, Math.round(base * (reps <= 2 ? 1 : topicFactor(accuracy))));
  if (interval > RETIRE_DAYS) return null;
  return { ef, interval, reps, lapses: card.lapses, due: addDaysIso(today, interval) };
}

/** Old Leitner card ({ box 0–4, due }) → SM-2 card with a matching history. */
export function fromLeitner(box: number, due: string): SrsCard {
  const b = Math.max(0, Math.min(4, Math.floor(box)));
  const intervals = [1, 2, 4, 7, 14];
  return { ef: START_EF, interval: intervals[b], reps: b, lapses: 0, due };
}

/**
 * Today's queue: everything due, weakest topics first, then most-lapsed, then oldest due.
 * `topicOf` maps a question id to its topic; `accuracy` gives that topic's accuracy (0–1).
 */
export function dueQueue(cards: Record<string, SrsCard>, today: string, topicOf: (id: string) => string | undefined, accuracy: (topic: string | undefined) => number | undefined): string[] {
  return Object.entries(cards)
    .filter(([, c]) => c.due <= today)
    .sort(([a, ca], [b, cb]) => {
      const wa = accuracy(topicOf(a)) ?? 1, wb = accuracy(topicOf(b)) ?? 1;
      return wa - wb || cb.lapses - ca.lapses || ca.due.localeCompare(cb.due) || a.localeCompare(b);
    })
    .map(([id]) => id);
}
