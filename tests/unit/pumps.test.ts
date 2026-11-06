import { describe, expect, it } from 'vitest';
import { PUMP_Q, WELL_AREA, createPumpsScene } from '../../src/plant/pumps';
import { harness } from './machine-harness';

const rig = () => harness(createPumpsScene());

describe('lift station lead/lag', () => {
  it('fill time 0.8 → 2.0 m at 0.03 m³/s inflow: 1.2 m × 4 m² ÷ 0.03 = 160 s (hand-worked)', () => {
    expect((1.2 * WELL_AREA) / 0.03).toBeCloseTo(160);
    // pump-down with one pump: net 0.01 m³/s out → 1.2 m × 4 m² ÷ 0.01 = 480 s
    expect((1.2 * WELL_AREA) / (PUMP_Q - 0.03)).toBeCloseTo(480);
  });

  it('alternates the lead pump each cycle and keeps the level in its band', { timeout: 60000 }, () => {
    const h = rig();
    h.s.inflow = 0.02;
    h.tick(3_000_000, () => { expect(h.s.level).toBeLessThan(3.0); });
    expect(h.s.starts[0]).toBeGreaterThanOrEqual(2);
    expect(h.s.starts[1]).toBeGreaterThanOrEqual(2);
    expect(Math.abs(h.s.starts[0] - h.s.starts[1])).toBeLessThanOrEqual(1);
  });

  it('storm inflow beats one pump: the lag pump starts at 3.0 m and no flooding', () => {
    const h = rig();
    h.s.inflow = 0.06;
    let both = false;
    h.tick(1_200_000, () => { if (h.io.DI[0] && h.io.DI[1]) both = true; });
    expect(both).toBe(true);
    expect(h.s.flooded).toBe(0);
  });

  it('fault pp-p1-ol: P2 takes over as lead immediately; fail light on', () => {
    const h = rig(); h.scene.setFault('pp-p1-ol');
    h.s.level = 1.9;
    h.tick(30000);
    expect(h.io.DI[1]).toBe(true);
    expect(h.io.DO[0]).toBe(false);
    expect(h.io.DO[3]).toBe(true); // pump fail light: any pump down
  });

  it('fault pp-p2-aux: P2 runs but is locked out as failed after 3 s', () => {
    const h = rig(); h.scene.setFault('pp-p2-aux');
    h.tick(10); h.s.level = 3.1; h.s.inflow = 0.07; // both pumps called
    h.tick(20000);
    expect(h.plc.tags.readNum('P2_Fail')).toBeTruthy();
    expect(h.plc.tags.readNum('P1_Fail')).toBeFalsy();
  });

  it('fault pp-lt: transmitter frozen low — only the float runs the pumps, high alarm', () => {
    const h = rig(); h.scene.setFault('pp-lt');
    h.s.inflow = 0.03;
    let floatRan = false;
    h.tick(600000, () => { if (h.io.DI[4] && (h.io.DO[0] || h.io.DO[1])) floatRan = true; });
    expect(floatRan).toBe(true);
    expect(h.s.flooded).toBe(0);
    expect(h.s.p1.tripped || h.s.p2.tripped).toBe(false); // no short-cycling: the TOF holds the pumps on
  });

  it('fault pp-float: both pumps called with the well nearly empty; the low cutout stops dry running', () => {
    const h = rig(); h.scene.setFault('pp-float');
    let both = false;
    h.tick(120000, () => { if (h.io.DO[0] && h.io.DO[1]) both = true; if (h.s.level < 0.35) expect(h.io.DO[0] || h.io.DO[1]).toBe(false); });
    expect(both).toBe(true);
    expect(h.io.DO[2]).toBe(true);
    expect(h.s.level).toBeGreaterThan(0.35);
    expect(h.s.level).toBeLessThan(1.0);
  });
});
