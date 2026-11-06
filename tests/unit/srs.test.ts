import { describe, expect, it } from 'vitest';
import { RETIRE_DAYS, addDaysIso, dueQueue, fromLeitner, newCard, nextEf, review, topicFactor } from '../../src/state/srs';
import { EMPTY, dueReviews, topicAccuracy, topicOf, validateProgress } from '../../src/state/progress';

const T = '2026-11-06';

describe('SM-2 scheduling', () => {
  it('ease factor follows the SM-2 formula (hand-worked)', () => {
    expect(nextEf(2.5, 4)).toBeCloseTo(2.5); // 2.5 + (0.1 − 1 × (0.08 + 0.02)) = 2.5
    expect(nextEf(2.5, 1)).toBeCloseTo(1.96); // 2.5 + (0.1 − 4 × (0.08 + 0.08)) = 1.96
    expect(nextEf(1.4, 1)).toBe(1.3); // floor
  });

  it('right answers: 1 day, 6 days, then interval × EF (strong topic)', () => {
    let c = newCard(T);
    expect(c.due).toBe('2026-11-07');
    c = review(c, true, T, 1)!; expect([c.reps, c.interval, c.due]).toEqual([1, 1, '2026-11-07']);
    c = review(c, true, T, 1)!; expect([c.reps, c.interval, c.due]).toEqual([2, 6, '2026-11-12']);
    c = review(c, true, T, 1)!; expect(c.interval).toBe(15); // round(6 × 2.5)
    c = review(c, true, T, 1)!; expect(c.interval).toBe(38); // round(15 × 2.5)
    c = review(c, true, T, 1)!; expect(c.interval).toBe(95);
    expect(review(c, true, T, 1)).toBeNull(); // 238 days > RETIRE_DAYS → learned
    expect(RETIRE_DAYS).toBe(120);
  });

  it('a missed item comes back tomorrow and loses ease', () => {
    let c = review(review(review(newCard(T), true, T)!, true, T)!, true, T)!;
    c = review(c, false, T)!;
    expect(c).toMatchObject({ reps: 0, interval: 1, lapses: 1, due: '2026-11-07' });
    expect(c.ef).toBeLessThan(2.5);
  });

  it('weak topics come back sooner than strong ones', () => {
    const grown = review(review(newCard(T), true, T)!, true, T)!; // reps 2, interval 6
    const strong = review(grown, true, T, 1)!;
    const weak = review(grown, true, T, 0)!;
    expect(strong.interval).toBe(15);
    expect(weak.interval).toBe(9); // 15 × 0.6
    expect(topicFactor(undefined)).toBe(0.9);
    expect(topicFactor(0.5)).toBeCloseTo(0.8);
  });

  it('old Leitner cards migrate', () => {
    expect(fromLeitner(2, T)).toEqual({ ef: 2.5, interval: 4, reps: 2, lapses: 0, due: T });
  });

  it('due queue: only due cards, weakest topic first, then most lapses', () => {
    const cards = {
      'a.q1': { ...newCard(T), due: T, lapses: 0 },
      'b.q1': { ...newCard(T), due: T, lapses: 3 },
      'c.q1': { ...newCard(T), due: addDaysIso(T, 3) },
      'd.q1': { ...newCard(T), due: T, lapses: 0 },
    };
    const topic = (id: string) => id[0];
    const acc = (t?: string) => (t === 'd' ? 0.2 : 0.9);
    expect(dueQueue(cards, T, topic, acc)).toEqual(['d.q1', 'b.q1', 'a.q1']);
  });
});

describe('review count on the Learn page', () => {
  it('counts exactly the cards due today and orders weak topics first', () => {
    const p = validateProgress({
      ...EMPTY,
      lessons: { 'z-electricity': { score: 1, total: 4, taskDone: false, at: '' }, timers: { score: 4, total: 4, taskDone: false, at: '' } },
      review: {
        'timers.q1': { ef: 2.5, interval: 1, reps: 0, lapses: 0, due: T },
        'z-electricity.q2': { ef: 2.5, interval: 1, reps: 0, lapses: 0, due: T },
        'timers.q2': { ef: 2.5, interval: 6, reps: 2, lapses: 0, due: addDaysIso(T, 2) },
      },
    })!;
    expect(topicOf('z-electricity.q2')).toBe('t0');
    expect(topicAccuracy(p.lessons)).toEqual({ t0: 0.25, t5: 1 });
    expect(dueReviews(p, T)).toEqual(['z-electricity.q2', 'timers.q1']);
  });
});
