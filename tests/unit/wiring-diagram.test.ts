import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../../src/lib/wiring';
import { layoutDiagram } from '../../src/features/wiring/WiringDiagram';

describe('wiring diagram layout', () => {
  for (const ex of EXERCISES) {
    it(`${ex.id}: every terminal has its own dot and every wire its own lane inside the drawing`, () => {
      const L = layoutDiagram(ex.devices, ex.solution.length);
      const ids = ex.devices.flatMap((d) => d.terminals.map((t) => t.id));
      expect(L.dots.size).toBe(ids.length);
      const ys = [...L.dots.values()].map((p) => p.y);
      expect(new Set(ys).size).toBe(ys.length); // no two terminals on one row
      expect(new Set(L.lanes).size).toBe(L.lanes.length);
      for (const x of L.lanes) expect(x).toBeLessThanOrEqual(360);
      for (const [a, b] of ex.solution) { expect(L.dots.has(a)).toBe(true); expect(L.dots.has(b)).toBe(true); }
    });
  }
});
