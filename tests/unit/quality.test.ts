import { describe, expect, it } from 'vitest';
import { COURSE_ORDER, LESSONS, TRACKS } from '../../src/content';
import { qualityFailures } from '../../src/content/quality';
import { stableShuffle } from '../../src/features/learn/Drills';

const ids = new Set(LESSONS.map((l) => l.id));

describe('lesson quality bar (8 items)', () => {
  // Every lesson must meet the bar. The fields are required by the Lesson type; this checks their content.
  for (const l of LESSONS) {
    it(`${l.id} meets all 8`, () => {
      expect(qualityFailures(l, ids, COURSE_ORDER)).toEqual({});
    });
  }
});

describe('course order', () => {
  it('LESSONS follow the track order, so "Next lesson" never skips (B-003)', () => {
    expect(LESSONS.map((l) => l.id)).toEqual(TRACKS.flatMap((t) => t.lessons));
    expect(COURSE_ORDER.indexOf('protection-devices')).toBe(COURSE_ORDER.indexOf('relays-contactors') + 1);
  });
});

describe('drills', () => {
  it('stableShuffle is stable, a permutation, and never the answer order', () => {
    const steps = ['a', 'b', 'c', 'd', 'e'];
    const x = stableShuffle(steps, 'seed');
    expect(stableShuffle(steps, 'seed')).toEqual(x);
    expect([...x].sort()).toEqual(steps);
    expect(x).not.toEqual(steps);
    for (const s of ['p1', 'p2', 'p3', 'xyz', '']) expect(stableShuffle(['a', 'b'], s)).not.toEqual(['a', 'b']);
  });
});
