import { describe, expect, it } from 'vitest';
import { BANK, EXAMS, bankFor, drawExam, scoreExam } from '../../src/content/bank';
import { TRACKS } from '../../src/content';

describe('question bank and exams', () => {
  it('every question is tagged with topic, level and difficulty', () => {
    for (const q of BANK) {
      expect(TRACKS.some((t) => t.id === q.track), q.id).toBe(true);
      expect([1, 2, 3]).toContain(q.difficulty);
      expect(q.level).toBeTruthy();
    }
  });

  it('each exam\'s bank holds at least 3× the questions one sitting shows', () => {
    for (const e of EXAMS) expect(bankFor(e).length, e.id).toBeGreaterThanOrEqual(3 * e.size);
  });

  it('a sitting has the right size, no repeats, and covers every topic in the exam', () => {
    for (const e of EXAMS) {
      for (const seed of [1, 42, 9999]) {
        const s = drawExam(e, seed);
        expect(s.length, e.id).toBe(e.size);
        expect(new Set(s.map((q) => q.id)).size).toBe(e.size);
        if (e.size >= e.tracks.length) expect(new Set(s.map((q) => q.track))).toEqual(new Set(e.tracks));
      }
    }
  });

  it('is randomized by seed but reproducible', () => {
    const e = EXAMS.find((x) => x.id === 'readiness')!;
    expect(drawExam(e, 7).map((q) => q.id)).toEqual(drawExam(e, 7).map((q) => q.id));
    expect(drawExam(e, 7).map((q) => q.id)).not.toEqual(drawExam(e, 8).map((q) => q.id));
  });

  it('weights lean the readiness check toward weak topics without dropping others', () => {
    const e = EXAMS.find((x) => x.id === 'readiness')!;
    const count = (seed: number, w = {}) => drawExam(e, seed, w).filter((q) => q.track === 't4').length;
    let base = 0, weighted = 0;
    for (let s = 1; s <= 20; s++) { base += count(s); weighted += count(s, { t4: 3 }); }
    expect(weighted).toBeGreaterThan(base);
    expect(new Set(drawExam(e, 3, { t4: 3 }).map((q) => q.track)).size).toBe(TRACKS.length);
  });

  it('scores per topic, weakest first, and lists the lessons to revisit', () => {
    const e = EXAMS.find((x) => x.id === 'beginner')!;
    const s = drawExam(e, 5);
    const answers = Object.fromEntries(s.map((q, i) => [q.id, i < 5 ? (q.answer + 1) % q.choices.length : q.answer]));
    const r = scoreExam(s, answers);
    expect(r.right).toBe(e.size - 5);
    expect(r.missedIds).toHaveLength(5);
    expect(r.missedLessons.length).toBeGreaterThan(0);
    expect(r.topics[0].right / r.topics[0].total).toBeLessThanOrEqual(r.topics[r.topics.length - 1].right / r.topics[r.topics.length - 1].total);
  });
});

describe('answer positions', () => {
  it('displayed correct answers are spread across positions (no "always B")', async () => {
    const { arrangeChoices } = await import('../../src/lib/shuffle');
    const counts = [0, 0, 0, 0];
    const four = BANK.filter((q) => q.choices.length === 4);
    for (const q of four) counts[arrangeChoices(q).answer]++;
    for (const c of counts) expect(c / four.length).toBeGreaterThan(0.15);
    for (const c of counts) expect(c / four.length).toBeLessThan(0.4);
  });
  it('the arranged order is stable and keeps every choice', async () => {
    const { arrangeChoices } = await import('../../src/lib/shuffle');
    const q = BANK[0];
    expect(arrangeChoices(q)).toEqual(arrangeChoices(q));
    expect([...arrangeChoices(q).order].sort()).toEqual(q.choices.map((_, i) => i));
  });
});
