import { describe, expect, it } from 'vitest';
import { BAG_M, BELT_SPEED, PE1_AT, PE2_AT, blocks, createConveyorScene } from '../../src/plant/conveyor';
import { harness } from './machine-harness';

const rig = () => harness(createConveyorScene());

describe('bag conveyor', () => {
  it('photo-eye geometry: a bag blocks an eye only while it covers it', () => {
    expect(blocks([{ x: 0.7 }], PE1_AT)).toBe(true);
    expect(blocks([{ x: 1.01 }], PE1_AT)).toBe(false);
    expect(BAG_M / BELT_SPEED).toBeCloseTo(0.8); // a bag passes an eye in 0.8 s — well under the 3 s jam time
  });

  it('runs, counts every bag exactly once, and the count matches bags delivered', () => {
    const h = rig();
    h.press('startPressed');
    h.tick(60000);
    expect(h.plc.tags.readNum('Bag_Ctr.ACC')).toBeGreaterThan(14); // ~(60 − 11) / 3
    // Every counted bag either left the belt or is past/at the exit eye.
    const pastEye = h.s.bags.filter((b: { x: number }) => b.x + BAG_M >= PE2_AT).length;
    expect(h.plc.tags.readNum('Bag_Ctr.ACC')).toBe(h.s.delivered + pastEye);
    expect(h.io.DO[2]).toBe(false);
  });

  it('travel time PE1 → PE2 ≈ 4.5 m ÷ 0.5 m/s ≈ 9 s', () => {
    const h = rig();
    h.press('startPressed');
    let t1 = -1, t2 = -1, t = 0;
    h.tick(30000, () => { t += 10; if (t1 < 0 && h.io.DI[3]) t1 = t; if (t2 < 0 && h.io.DI[4]) t2 = t; });
    expect((t2 - t1) / 1000).toBeGreaterThan(8.6);
    expect((t2 - t1) / 1000).toBeLessThan(9.6);
  });

  it('fault cv-pe1-dirty: false jam a few seconds after start', () => {
    const h = rig(); h.scene.setFault('cv-pe1-dirty');
    h.press('startPressed'); h.tick(5000);
    expect(h.io.DO[2]).toBe(true);
    expect(h.io.DO[0]).toBe(false);
  });

  it('fault cv-pe2-wire: bags delivered, count stays 0', () => {
    const h = rig(); h.scene.setFault('cv-pe2-wire');
    h.press('startPressed'); h.tick(40000);
    expect(h.s.delivered).toBeGreaterThan(5);
    expect(h.plc.tags.readNum('Bag_Ctr.ACC')).toBe(0);
  });

  it('fault cv-jam: a wedged bag holds the exit eye and the jam logic stops the belt', () => {
    const h = rig(); h.scene.setFault('cv-jam');
    h.press('startPressed'); h.tick(25000);
    expect(h.io.DI[4]).toBe(true);
    expect(h.io.DO[2]).toBe(true);
    expect(h.io.DO[0]).toBe(false);
  });

  it('fault cv-ol: normal current trips an overload dialed too low; running current is ~9–10 A', () => {
    const h = rig(); h.scene.setFault('cv-ol');
    h.press('startPressed'); h.tick(3000);
    expect(h.s.motor.amps).toBeGreaterThan(7); expect(h.s.motor.amps).toBeLessThan(10.5);
    h.tick(180000); // ~140 s of normal running heats it to trip
    expect(h.s.motor.tripped).toBe(true);
    expect(h.io.DO[0]).toBe(false);
  });
});
