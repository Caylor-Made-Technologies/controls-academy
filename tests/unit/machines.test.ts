import { describe, expect, it } from 'vitest';
import { MACHINES, allFaults } from '../../src/plant';
import { harness } from './machine-harness';

describe('every machine follows the machine interface', () => {
  it('fault ids are unique across all machines', () => {
    const ids = allFaults().map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const m of MACHINES) {
    describe(m.title, () => {
      const scene = m.create();
      it('has a clean shipped program and a known live meter point', () => {
        expect(harness(m.create()).errors()).toEqual([]);
        expect(scene.meterPoints({ DI: [], DO: [], AI: [], AO: [] }).some((p) => p.id === 'psu')).toBe(true);
      });
      it('every fault has a symptom, meter readings, root cause, fix and safety note', () => {
        expect(scene.faults.length).toBeGreaterThanOrEqual(3);
        for (const f of scene.faults) for (const k of ['complaint', 'readings', 'cause', 'howToFind', 'fix', 'safety'] as const) expect(f[k].length, `${f.id}.${k}`).toBeGreaterThan(20);
      });
      it('every I/O device has wiring notes, and I/O points are not double-booked', () => {
        const seen = new Set<string>();
        for (const d of scene.devices) {
          expect(d.wiring.length, d.id).toBeGreaterThan(10);
          if (d.io) { const k = `${d.io.kind}${d.io.point}`; expect(seen.has(k), k).toBe(false); seen.add(k); }
        }
      });
      it('runs 60 s untouched and with every fault without NaN or infinity', () => {
        for (const f of [null, ...scene.faults.map((x) => x.id)]) {
          const h = harness(m.create());
          if (f) h.scene.setFault(f);
          h.tick(60000);
          for (const [k, v] of Object.entries(h.scene.state)) if (typeof v === 'number') expect(Number.isFinite(v), `${f ?? 'none'} ${k}`).toBe(true);
        }
      });
    });
  }
});

describe('fault hunt evidence', () => {
  it('every evidence point exists on its machine', () => {
    for (const m of MACHINES) {
      const scene = m.create();
      const ids = new Set(scene.meterPoints({ DI: [], DO: [], AI: [], AO: [] }).map((p) => p.id));
      for (const f of scene.faults) for (const e of f.evidence ?? []) expect(ids.has(e), `${f.id} → ${e}`).toBe(true);
    }
  });
  it('most faults can be proved with the meter', () => {
    const all = allFaults();
    expect(all.filter((f) => f.evidence?.length).length).toBeGreaterThanOrEqual(30);
  });
});
