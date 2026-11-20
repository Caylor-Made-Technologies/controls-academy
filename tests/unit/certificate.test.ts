import { describe, expect, it } from 'vitest';
import { certificateText, fitSize } from '../../src/features/profile/certificate';
import { PRACTICE_RECORD } from '../../src/lib/practice';

describe('certificates', () => {
  it('every certificate carries the practice-record label', () => {
    expect(PRACTICE_RECORD).toBe('Practice record — not a qualification or license.');
    expect(certificateText({ name: 'Sam', track: 'Start from Zero', trackN: 0, date: '2026-11-06', lessons: 11 }).label).toBe(PRACTICE_RECORD);
    const r = certificateText({ kind: 'readiness', name: 'Sam', date: '2026-11-06', pct: 86 });
    expect(r.label).toBe(PRACTICE_RECORD);
    expect(r.title).toBe('Practice Record');
    expect(r.line1).toContain('86 %');
  });
  it('very long or blank names are handled', () => {
    expect(certificateText({ name: 'x'.repeat(500), track: 'T', trackN: 1, date: 'd', lessons: 1 }).who).toHaveLength(40);
    expect(certificateText({ name: '   ', track: 'T', trackN: 1, date: 'd', lessons: 1 }).who).toBe('A Controls Academy learner');
  });
  it('B-021: long names shrink to fit the page; short ones keep the full size', () => {
    const measure = (chars: number) => (px: number) => chars * px * 0.9; // a wide font
    expect(fitSize(measure(8), 84, 36, 1300)).toBe(84);
    const px = fitSize(measure(30), 84, 36, 1300);
    expect(px).toBeLessThan(84);
    expect(measure(30)(px)).toBeLessThanOrEqual(1300);
    expect(fitSize(measure(500), 84, 36, 1300)).toBe(36);
  });
});
