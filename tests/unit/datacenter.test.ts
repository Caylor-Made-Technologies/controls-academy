import { describe, expect, it } from 'vitest';
import { GEN_READY_S, HEAT_CAP, createDatacenterScene } from '../../src/plant/datacenter';
import { harness } from './machine-harness';

const rig = () => harness(createDatacenterScene());

describe('data center ATS + CRAH', () => {
  it('heat balance with no cooling: 100 kW ÷ 600 kJ/K = 0.17 K/s (hand-worked)', () => {
    expect(100 / HEAT_CAP).toBeCloseTo(0.167, 3);
  });

  it('holds supply air at the 20 °C setpoint on utility', () => {
    const h = rig();
    h.tick(300000);
    expect(h.s.temp).toBeGreaterThan(19.3); expect(h.s.temp).toBeLessThan(20.7);
    expect(h.io.DO[0]).toBe(false);
  });

  it('outage: generator starts after the 2 s delay, transfers when ready, CRAH restarts; temperature stays below the alarm', () => {
    const h = rig();
    h.tick(120000);
    h.s.utility = false;
    let tStart = -1, tXfer = -1, t = 0, peak = 0;
    h.tick(60000, () => { t += 10; if (tStart < 0 && h.io.DO[0]) tStart = t; if (tXfer < 0 && h.io.DI[3]) tXfer = t; peak = Math.max(peak, h.s.temp); });
    expect(tStart / 1000).toBeCloseTo(2, 0);
    expect(tXfer / 1000).toBeGreaterThan(2 + GEN_READY_S);
    expect(tXfer / 1000).toBeLessThan(2 + GEN_READY_S + 1.5);
    expect(peak).toBeGreaterThan(20.5);
    expect(peak).toBeLessThan(27);
    expect(h.io.DI[4]).toBe(true);
    expect(h.io.DO[3]).toBe(false);
  });

  it('utility returns: retransfer only after 30 s stable, then the generator cools down 20 s and stops', () => {
    const h = rig();
    h.s.utility = false; h.tick(30000);
    h.s.utility = true;
    h.tick(25000);
    expect(h.io.DI[3]).toBe(true); // still on generator
    h.tick(10000);
    expect(h.io.DI[2]).toBe(true); // back on Normal
    expect(h.io.DO[0]).toBe(true); // cooling down
    h.tick(25000);
    expect(h.io.DO[0]).toBe(false);
  });

  it('fault dc-gen: no transfer, fail alarm after 15 s, room heats', () => {
    const h = rig(); h.scene.setFault('dc-gen');
    h.s.utility = false; h.tick(25000);
    expect(h.io.DI[3]).toBe(false);
    expect(h.io.DO[3]).toBe(true);
    expect(h.s.temp).toBeGreaterThan(22);
  });

  it('fault dc-ats: generator ready but the switch never moves; fail alarm', () => {
    const h = rig(); h.scene.setFault('dc-ats');
    h.s.utility = false; h.tick(20000);
    expect(h.io.DI[1]).toBe(true);
    expect(h.io.DI[3]).toBe(false);
    expect(h.io.DO[3]).toBe(true);
  });

  it('fault dc-valve: valve output 100 % but temperature climbs past the alarm', () => {
    const h = rig(); h.scene.setFault('dc-valve');
    h.tick(120000);
    expect(h.plc.tags.readNum('CHW_Valve')).toBeCloseTo(100, 0);
    expect(h.io.DO[4]).toBe(true);
  });

  it('fault dc-sat: bad sensor → valve forced fully open → overcooling', () => {
    const h = rig(); h.scene.setFault('dc-sat');
    h.tick(120000);
    expect(h.plc.tags.readNum('SAT_Bad')).toBeTruthy();
    expect(h.s.valve).toBeGreaterThan(95);
    expect(h.s.temp).toBeLessThan(18.5);
  });
});
