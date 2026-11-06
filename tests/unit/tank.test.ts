import { describe, expect, it } from 'vitest';
import { LSHH_AT, Q_IN_MAX, TANK_AREA, TANK_H, createTankScene } from '../../src/plant/tank';
import { harness } from './machine-harness';

const rig = () => harness(createTankScene());
const pv = (h: ReturnType<typeof rig>) => h.plc.tags.readNum('Level_Pct');

describe('tank level PID', () => {
  it('fill rate at a wide-open valve, no demand: 0.03 m³/s ÷ 1.5 m² = 0.02 m/s (hand-worked)', () => {
    expect(Q_IN_MAX / TANK_AREA).toBeCloseTo(0.02);
  });

  it('default tuning: 30 % → 60 % in under 3 minutes with less than 5 % overshoot, then holds', () => {
    const h = rig();
    let peak = 0;
    h.tick(240000, () => { peak = Math.max(peak, pv(h)); });
    expect(Math.abs(pv(h) - 60)).toBeLessThan(1.5);
    expect(peak).toBeLessThan(65);
  });

  it('mass balance: level change × area = water in − water out; level stays inside the tank', () => {
    const h = rig();
    let vin = 0, vout = 0;
    const v0 = h.s.level * TANK_AREA;
    h.tick(120000, () => {
      vin += (Q_IN_MAX * h.s.valve) / 100 * 0.01; // approximate (ignores the 1 s delay line)
      if (h.io.DO[2]) vout += h.s.demand * 0.01;
      expect(h.s.level).toBeGreaterThanOrEqual(0);
      expect(h.s.level).toBeLessThanOrEqual(TANK_H);
    });
    const inLine = h.s.delayLine.reduce((a: number, q: number) => a + q * 0.01, 0);
    expect(h.s.level * TANK_AREA - v0).toBeCloseTo(vin - inLine - vout, 1);
  });

  it('high-high switch closes the valve: setpoint 100 % never overflows', () => {
    const h = rig();
    h.plc.tags.write('SP_Pct', 100);
    h.s.demand = 0;
    h.tick(400000);
    expect(h.s.overflowed).toBe(0);
    expect(h.s.level).toBeLessThan(LSHH_AT + 0.1);
    expect(h.io.DO[1]).toBe(true);
  });

  it('fault tk-tune: KP 200 swings the valve full scale', () => {
    const h = rig(); h.scene.setFault('tk-tune'); h.scene.armFault!('tk-tune', h.plc);
    let lo = 100, hi = 0, t = 0;
    h.tick(300000, () => { t += 10; if (t > 200000) { const cv = h.plc.tags.readNum('Level_PID.CV'); lo = Math.min(lo, cv); hi = Math.max(hi, cv); } });
    expect(hi - lo).toBeGreaterThan(80);
  });

  it('fault tk-wire: bad-signal light, valve commanded closed, pump keeps going until the low switch', () => {
    const h = rig(); h.scene.setFault('tk-wire');
    h.tick(5000);
    expect(h.io.DO[0]).toBe(true);
    expect(h.io.AO[0]).toBe(0);
  });

  it('fault tk-valve: CV winds up to 100 % but the level still falls under heavy demand', () => {
    const h = rig(); h.scene.setFault('tk-valve'); h.s.demand = 0.012;
    const l0 = h.s.level;
    h.tick(120000);
    expect(h.plc.tags.readNum('Level_PID.CV')).toBeCloseTo(100, 0);
    expect(h.s.level).toBeLessThan(l0);
  });

  it('fault tk-drift: the PID holds the transmitter at 60 % but the real level is ~0.8 m (20 %) lower', () => {
    const h = rig(); h.scene.setFault('tk-drift');
    h.tick(300000);
    expect(pv(h)).toBeCloseTo(60, 0);
    expect((h.s.level / TANK_H) * 100).toBeCloseTo(40, 0);
  });
});
