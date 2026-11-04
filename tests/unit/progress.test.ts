import { describe, expect, it } from 'vitest';
import { EMPTY, badges, level, streak, today, validateProgress, dueReviews } from '../../src/state/progress';

describe('progress helpers', () => {
  it('streak counts consecutive days ending today or yesterday', () => {
    expect(streak(['2026-11-02', '2026-11-03', '2026-11-04'], '2026-11-04')).toBe(3);
    expect(streak(['2026-11-02', '2026-11-03'], '2026-11-04')).toBe(2);
    expect(streak(['2026-11-01'], '2026-11-04')).toBe(0);
    expect(streak(['2026-10-31', '2026-11-01'], '2026-11-01')).toBe(2);
  });
  it('levels', () => {
    expect(level(0).name).toBe('Apprentice');
    expect(level(250).name).toBe('Panel Rookie');
    expect(level(99999).next).toBeNull();
    expect(level(100).pct).toBeCloseTo(0.5);
  });
  it('today is YYYY-MM-DD', () => {
    expect(today(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('badges are computed', () => {
    const b = badges({ ...EMPTY, stepped: true, skinsSeen: ['iec', 'ab-logix', 'ab-slc', 'omron', 'modicon'] });
    expect(b.find((x) => x.id === 'scan')!.earned).toBe(true);
    expect(b.find((x) => x.id === 'dialects')!.earned).toBe(true);
    expect(b.find((x) => x.id === 'hunter')!.earned).toBe(false);
  });
  it('import validation rejects junk and cleans unknown keys', () => {
    expect(validateProgress(null)).toBeNull();
    expect(validateProgress({ version: 2 })).toBeNull();
    expect(validateProgress({ version: 1, xp: -1, lessons: {}, review: {}, hunts: {}, days: [] })).toBeNull();
    const v = validateProgress({
      version: 1, xp: 120.7, lessons: { 'three-wire': { score: 3, total: 3, taskDone: true, at: 'x' }, '<script>': {} },
      review: { 'meter.q1': { box: 9, due: '2026-11-05' }, 'bad key!': {} }, hunts: { fuse: { bestMs: 5000, safe: true } },
      days: ['2026-11-04', 'nope'], skinsSeen: ['iec'], stepped: true, perfectQuizzes: 2,
    })!;
    expect(v.xp).toBe(120);
    expect(Object.keys(v.lessons)).toEqual(['three-wire']);
    expect(v.review['meter.q1'].box).toBe(4);
    expect(Object.keys(v.review)).toEqual(['meter.q1']);
    expect(v.days).toEqual(['2026-11-04']);
    expect(dueReviews(v, '2026-11-05')).toEqual(['meter.q1']);
    expect(dueReviews(v, '2026-11-04')).toEqual([]);
  });
});
