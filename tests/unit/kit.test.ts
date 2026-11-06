import { describe, expect, it } from 'vitest';
import { fracFromMa, lag, mA, momentary, motorStep, newMotor, canResetOverload, type MotorSim } from '../../src/plant/kit';
import { MOTOR_FLA } from '../../src/plant/motor';

const run = (m: MotorSim, dir: -1 | 0 | 1, secs: number, extra = {}) => { for (let t = 0; t < secs; t += 0.01) m = motorStep(m, { dir, loadPU: 0.6, ...extra }, 0.01); return m; };

describe('machine kit', () => {
  it('4–20 mA helpers', () => {
    expect(mA(0)).toBe(4); expect(mA(0.5)).toBe(12); expect(mA(1)).toBe(20); expect(mA(2)).toBe(20);
    expect(fracFromMa(12)).toBe(0.5);
  });
  it('lag approaches the target', () => {
    let x = 0; for (let i = 0; i < 500; i++) x = lag(x, 10, 1, 0.01);
    expect(x).toBeGreaterThan(9.9);
  });
  it('motor runs up forward and reverse to near rated speed, current near rated', () => {
    const f = run(newMotor(), 1, 3);
    expect(f.rpm).toBeGreaterThan(1740); expect(f.rpm).toBeLessThan(1800);
    expect(f.amps).toBeLessThan(MOTOR_FLA * 1.1);
    const r = run(newMotor(), -1, 3);
    expect(r.rpm).toBeLessThan(-1740);
  });
  it('plugging (reverse while running forward) draws locked-rotor-class current and reverses', () => {
    let m = run(newMotor(), 1, 3);
    m = motorStep(m, { dir: -1, loadPU: 0.6 }, 0.01);
    expect(m.amps).toBeGreaterThan(MOTOR_FLA * 5);
    m = run(m, -1, 4);
    expect(m.rpm).toBeLessThan(-1700);
  });
  it('coasts to a stop without reversing when switched off', () => {
    let m = run(newMotor(), 1, 3);
    m = run(m, 0, 20);
    expect(m.rpm).toBe(0); expect(m.amps).toBe(0);
  });
  it('energy sanity: a coasting motor never speeds up', () => {
    let m = run(newMotor(), 1, 3); let prev = m.rpm;
    for (let i = 0; i < 300; i++) { m = motorStep(m, { dir: 0, loadPU: 0.6 }, 0.01); expect(m.rpm).toBeLessThanOrEqual(prev); prev = m.rpm; }
  });
  it('a jam stalls the motor and the overload trips within seconds (Class 10 feel), then must cool', () => {
    let m = newMotor(); let t = 0;
    while (!m.tripped && t < 30) { m = motorStep(m, { dir: 1, loadPU: 0.6, jammed: true }, 0.01); t += 0.01; }
    expect(m.rpm).toBe(0);
    expect(t).toBeGreaterThan(2); expect(t).toBeLessThan(12);
    expect(canResetOverload(m)).toBe(false);
    m = run({ ...m }, 0, 60);
    expect(canResetOverload(m)).toBe(true);
  });
  it('momentary fields hold a between-steps tap for the minimum time', () => {
    const s = {} as { a: boolean };
    const mo = momentary(s, ['a'], 60);
    s.a = true; s.a = false;
    expect(mo.held('a')).toBe(true);
    mo.tick(70);
    expect(mo.held('a')).toBe(false);
  });
});
