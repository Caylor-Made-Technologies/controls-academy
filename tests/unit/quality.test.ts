import { describe, expect, it } from 'vitest';
import { COURSE_ORDER, LESSONS, TRACKS } from '../../src/content';
import { qualityFailures } from '../../src/content/quality';
import { stableShuffle } from '../../src/features/learn/Drills';

/**
 * Lessons not yet upgraded to the 8-item quality bar (Phase 1.3 works through these track by track).
 * This list may only SHRINK: the test fails if a listed lesson already passes, so remove it when you upgrade it.
 * When it is empty, the quality fields become required in `Lesson` (types.ts).
 */
export const NOT_YET_UPGRADED = new Set<string>([
        'what-is-a-plc', 'sinking-sourcing', 'analog-420', 'numbers', 'data-types',
  'contacts-coils', 'timers', 'counters', 'latch-unlatch', 'duplicate-coils', 'compare-math', 'alarm-ack', 'sequencers', 'program-organization',
  'upload-download', 'forcing', 'compare-online',
  'troubleshooting-method', 'fault-codes',
  'ip-basics', 'profinet-names', 'modbus', 'legacy-networks',
  'vfd-basics', 'hmi-basics', 'bacnet-bms',
  'capstone-build', 'capstone-mixer',
  'pid-tuning', 'analog-alarming', 'structured-text', 'reusable-logic', 'network-troubleshooting', 'commissioning', 'safety-systems', 'change-management',
]);

const ids = new Set(LESSONS.map((l) => l.id));

describe('lesson quality bar (8 items)', () => {
  for (const l of LESSONS) {
    if (NOT_YET_UPGRADED.has(l.id)) continue;
    it(`${l.id} meets all 8`, () => {
      expect(qualityFailures(l, ids, COURSE_ORDER)).toEqual({});
    });
  }

  it('the not-yet-upgraded list only shrinks (no lesson on it already passes, no unknown ids)', () => {
    for (const id of NOT_YET_UPGRADED) {
      const l = LESSONS.find((x) => x.id === id);
      expect(l, `unknown lesson ${id}`).toBeTruthy();
      expect(Object.keys(qualityFailures(l!, ids, COURSE_ORDER)).length, `${id} passes now — remove it from NOT_YET_UPGRADED`).toBeGreaterThan(0);
    }
  });
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
