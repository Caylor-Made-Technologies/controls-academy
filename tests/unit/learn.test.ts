import { describe, expect, it } from 'vitest';
import { LESSONS, TRACKS } from '../../src/content';
import { recommendedLesson } from '../../src/features/learn/LearnPage';

describe('recommended next lesson', () => {
  it('reaches every track for every goal, ending only when all lessons are done (B-004)', () => {
    for (const goal of ['maintenance', 'new-tech', 'bas', 'curious'] as const) {
      const done: Record<string, true> = {};
      const seen = new Set<string>();
      for (let i = 0; i < LESSONS.length; i++) {
        const id = recommendedLesson(goal, done);
        expect(id, `${goal}: stopped after ${i} lessons`).toBeTruthy();
        seen.add(LESSONS.find((l) => l.id === id)!.track);
        done[id!] = true;
      }
      expect(recommendedLesson(goal, done)).toBeNull();
      expect(seen.size).toBe(TRACKS.length);
    }
  });
});
