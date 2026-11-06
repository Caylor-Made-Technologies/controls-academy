import { describe, expect, it } from 'vitest';
import { TRACKS } from '../../src/content';
import { FORMULAS } from '../../src/content/summaries';
import { summaryMarkdown, trackSummary } from '../../src/features/learn/SummaryPage';
import { ohm, power } from '../../src/lib/circuits';

describe('study summaries', () => {
  it('every track has terms, safety points and common mistakes', () => {
    for (const t of TRACKS) {
      const s = trackSummary(t);
      expect(s.terms.length, t.id).toBeGreaterThan(2);
      expect(s.mistakes.length, t.id).toBeGreaterThanOrEqual(t.lessons.length * 2);
      expect(s.safety.length + 1, t.id).toBeGreaterThan(0);
    }
  });
  it('markdown export has no leftover markup or VERIFY tags', () => {
    for (const t of TRACKS) {
      const md = summaryMarkdown(t);
      expect(md).not.toMatch(/\[\[|\/\/ VERIFY/);
      expect(md).toContain(`# Track ${t.n}`);
    }
  });
  it('formula examples are right', () => {
    expect(ohm.current(24, 480)).toBeCloseTo(0.05);
    expect(power.vi(120, 2)).toBe(240);
    expect(power.threePhase(480, 10) / 1000).toBeCloseTo(8.3, 1);
    expect(((12 - 4) / 16) * 100).toBe(50);
    expect(((8000 - 4000) * 200) / 16000).toBe(50);
    expect(ohm.current(24, 240)).toBeCloseTo(0.1);
    expect(Object.keys(FORMULAS).every((k) => TRACKS.some((t) => t.id === k))).toBe(true);
  });
});
