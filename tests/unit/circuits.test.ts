import { describe, expect, it } from 'vitest';
import { HP_WATTS, ohm, power, twoLoads } from '../../src/lib/circuits';

describe('circuit math', () => {
  it('Ohm\'s law in all three forms', () => {
    expect(ohm.current(24, 240)).toBeCloseTo(0.1);
    expect(ohm.voltage(2, 60)).toBe(120);
    expect(ohm.resistance(24, 0.05)).toBeCloseTo(480);
  });
  it('power formulas agree with each other', () => {
    const v = 120, r = 60, i = ohm.current(v, r);
    expect(power.vi(v, i)).toBeCloseTo(240);
    expect(power.i2r(i, r)).toBeCloseTo(240);
    expect(power.v2r(v, r)).toBeCloseTo(240);
    expect(HP_WATTS).toBe(746);
  });
  it('three-phase power: 480 V × 10 A balanced resistive ≈ 8.31 kW', () => {
    expect(power.threePhase(480, 10)).toBeCloseTo(8313.8, 0);
    expect(power.threePhase(480, 10, 0.85)).toBeCloseTo(7066.8, 0);
  });
  it('series: same current, voltages add to the supply, open stops everything', () => {
    const s = twoLoads(120, 60, 60, 'series');
    expect(s.rTotal).toBe(120);
    expect(s.iTotal).toBeCloseTo(1);
    expect(s.v[0] + s.v[1]).toBeCloseTo(120);
    expect(s.p[0]).toBeCloseTo(60);
    const o = twoLoads(120, 60, 60, 'series', true);
    expect(o.iTotal).toBe(0);
    expect(o.v[1]).toBe(120); // full supply across the open
  });
  it('parallel: same voltage, currents add, one open branch leaves the other running', () => {
    const p = twoLoads(120, 60, 60, 'parallel');
    expect(p.rTotal).toBeCloseTo(30);
    expect(p.iTotal).toBeCloseTo(4);
    expect(p.p[0]).toBeCloseTo(240);
    const o = twoLoads(120, 60, 60, 'parallel', true);
    expect(o.iTotal).toBeCloseTo(2);
    expect(o.p[0]).toBeCloseTo(240);
  });
  it('energy sanity: total power equals supply × total current', () => {
    for (const mode of ['series', 'parallel'] as const) for (const r2 of [10, 60, 470]) {
      const x = twoLoads(120, 60, r2, mode);
      expect(x.p[0] + x.p[1]).toBeCloseTo(120 * x.iTotal, 6);
    }
  });
});
