import { describe, expect, it } from 'vitest';
import { momentsFor, snapshot } from '../../src/features/rewards';
import { EMPTY, type ProgressData } from '../../src/state/progress';

const lesson = { score: 3, total: 3, at: '2026-11-15' } as unknown as ProgressData['lessons'][string];

describe('reward moments', () => {
  it('celebrates the first lesson (badge) once', () => {
    const before = snapshot(EMPTY);
    const after: ProgressData = { ...EMPTY, xp: 50, lessons: { 'z-electricity': lesson } };
    const m = momentsFor(before, after);
    expect(m).toEqual(['Badge earned: Powered Up. Finish your first lesson.']);
    expect(momentsFor(snapshot(after), after)).toEqual([]);
  });
  it('announces a level-up by name', () => {
    const a: ProgressData = { ...EMPTY, xp: 190, lessons: { 'z-electricity': lesson } };
    const b: ProgressData = { ...a, xp: 210 };
    expect(momentsFor(snapshot(a), b)).toEqual(["Level up: you're now Panel Rookie."]);
  });
  it('stays quiet for a backup import or an erase', () => {
    const big: ProgressData = { ...EMPTY, xp: 700, lessons: { a: lesson, b: lesson, c: lesson }, hunts: { x: { bestMs: 30000, safe: true } as unknown as ProgressData['hunts'][string] } };
    expect(momentsFor(snapshot(EMPTY), big)).toEqual([]);
    expect(momentsFor(snapshot(big), EMPTY)).toEqual([]);
  });
});
