import { describe, expect, it } from 'vitest';
import { INSIDE } from '../../src/content/inside';

describe("What's inside (3.7)", () => {
  it('has the four devices the plan calls for', () => {
    expect(INSIDE.map((d) => d.id).sort()).toEqual(['input-card', 'overload', 'prox', 'vfd']);
  });
  for (const d of INSIDE) {
    it(`${d.id}: parts are unique, explained, and actually move apart`, () => {
      const ids = d.parts.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(d.parts.length).toBeGreaterThanOrEqual(5);
      expect(d.safety.length).toBeGreaterThan(40);
      for (const p of d.parts) {
        expect(p.what.length, p.id).toBeGreaterThan(40);
        expect(Math.hypot(...p.dir), p.id).toBeGreaterThan(0);
        expect([...p.pos, ...p.dir].every(Number.isFinite), p.id).toBe(true);
      }
    });
  }
  it('VFD warns about the charged DC bus; prox and overload carry their key teaching points', () => {
    const t = (id: string) => JSON.stringify(INSIDE.find((d) => d.id === id));
    expect(t('vfd')).toMatch(/stay charged/);
    expect(t('prox')).toMatch(/PNP.*sinking input/);
    expect(t('overload')).toMatch(/95–96/);
  });
});
