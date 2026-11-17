import { describe, expect, it } from 'vitest';
import { FLOWCHARTS } from '../../src/content/flowcharts';
import { LESSONS } from '../../src/content';

describe('troubleshooting flowcharts', () => {
  for (const f of FLOWCHARTS) {
    const byId = new Map(f.steps.map((s) => [s.id, s]));
    it(`${f.id}: ids are unique and every answer points to a real step`, () => {
      expect(byId.size).toBe(f.steps.length);
      expect(byId.has(f.start)).toBe(true);
      for (const s of f.steps) for (const a of s.answers ?? []) expect(byId.has(a.next), `${s.id} → ${a.next}`).toBe(true);
    });
    it(`${f.id}: every step is either a question with answers or an end with a fix`, () => {
      for (const s of f.steps) {
        if (s.end) { expect(s.answers ?? []).toHaveLength(0); expect(s.end.fix.length).toBeGreaterThan(20); }
        else { expect(s.ask?.length ?? 0).toBeGreaterThan(5); expect((s.answers ?? []).length).toBeGreaterThan(0); }
      }
    });
    it(`${f.id}: every path from the start ends in an answer, with no loops, and every step is reachable`, () => {
      const seen = new Set<string>();
      const walk = (id: string, path: string[]) => {
        expect(path.includes(id), `loop: ${[...path, id].join(' → ')}`).toBe(false);
        seen.add(id);
        const s = byId.get(id)!;
        if (s.end) return;
        for (const a of s.answers!) walk(a.next, [...path, id]);
      };
      walk(f.start, []);
      expect([...byId.keys()].filter((k) => !seen.has(k))).toEqual([]);
    });
    it(`${f.id}: links to a lesson that exists`, () => {
      if (f.lesson) expect(LESSONS.some((l) => l.id === f.lesson)).toBe(true);
    });
  }
});
