import { describe, expect, it } from 'vitest';
import { IN_FLIGHT_S, SCREW_RATE, createMixerScene } from '../../src/plant/mixer';
import { harness } from './machine-harness';

const rig = () => harness(createMixerScene());
const step = (h: ReturnType<typeof rig>) => h.plc.tags.readNum('Step');

describe('flour batch mixer', () => {
  it('in-flight overshoot ≈ 40 lb/s × 0.5 s = 20 lb per screw stop (hand-worked)', () => {
    expect(SCREW_RATE * IN_FLIGHT_S).toBe(20);
  });

  it('runs a whole batch through every state and returns to idle; real batch ≈ 1000 lb + overshoot', () => {
    const h = rig();
    const seen = new Set<number>();
    h.press('startPressed');
    h.tick(120000, () => seen.add(step(h)));
    for (const n of [5, 10, 20, 30, 40, 50, 0]) expect(seen.has(n), `step ${n}`).toBe(true);
    expect(h.s.batches).toBe(1);
    expect(h.s.lastBatch).toBeGreaterThan(1000);
    expect(h.s.lastBatch).toBeLessThan(1050);
    expect(h.plc.tags.readNum('Batch_Ctr.ACC')).toBe(1);
  });

  it('never feeds without dust-collector proof, never opens the gate onto a stopped conveyor', () => {
    const h = rig();
    h.press('startPressed');
    h.tick(120000, () => {
      if (h.io.DO[1] || h.io.DO[2]) expect(h.io.DI[2]).toBe(true);
      if (h.io.DO[4]) expect(h.io.DI[5]).toBe(true);
    });
  });

  it('stop during a batch → 906, everything off, reset → idle', () => {
    const h = rig();
    h.press('startPressed'); h.tick(8000);
    h.press('stopPressed');
    expect(step(h)).toBe(906);
    expect(h.io.DO[1] || h.io.DO[2] || h.io.DO[3]).toBe(false);
    h.press('resetPressed');
    expect(step(h)).toBe(0);
  });

  it('fault mx-dc: 901 after 10 s, nothing fed', () => {
    const h = rig(); h.scene.setFault('mx-dc');
    h.press('startPressed'); h.tick(12000);
    expect(step(h)).toBe(901);
    expect(h.s.weight).toBe(0);
  });

  it('fault mx-wt: completes normally but the real batch is ~15 % heavy', () => {
    const h = rig(); h.scene.setFault('mx-wt');
    h.press('startPressed'); h.tick(120000);
    expect(h.s.batches).toBe(1);
    expect(h.s.lastBatch).toBeGreaterThan(1150);
  });

  it('fault mx-gate: start ignored (permissive), no fault code', () => {
    const h = rig(); h.scene.setFault('mx-gate');
    h.press('startPressed'); h.tick(3000);
    expect(step(h)).toBe(0);
    expect(h.io.DO[6]).toBe(false);
  });

  it('fault mx-screw: 902 feed A timeout', () => {
    const h = rig(); h.scene.setFault('mx-screw');
    h.press('startPressed'); h.tick(40000);
    expect(step(h)).toBe(902);
  });
});
