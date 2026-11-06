import { describe, expect, it } from 'vitest';
import { createFwdRevScene } from '../../src/plant/fwdrev';
import { MOTOR_FLA } from '../../src/plant/motor';
import { harness } from './machine-harness';

const rig = () => harness(createFwdRevScene());

describe('forward/reverse screw conveyor', () => {
  it('runs forward and reverse; the lights need command AND proof', () => {
    const h = rig();
    h.press('fwdPressed'); h.tick(3000);
    expect(h.s.motor.rpm).toBeGreaterThan(1700);
    expect(h.io.DO[2]).toBe(true);
    h.press('stopPressed'); h.tick(15000);
    expect(h.s.motor.rpm).toBe(0);
    h.press('revPressed'); h.tick(3000);
    expect(h.s.motor.rpm).toBeLessThan(-1700);
    expect(h.io.DO[3]).toBe(true);
  });

  it('never closes both contactors and never plugs: reverse is refused while turning forward', () => {
    const h = rig();
    h.press('fwdPressed'); h.tick(2000);
    h.tick(3000, () => { h.s.revPressed = true; expect(h.s.f && h.s.r).toBe(false); });
    h.s.revPressed = false; h.tick(50);
    expect(h.s.motor.rpm).toBeGreaterThan(1700);
    expect(h.s.motor.amps).toBeLessThan(MOTOR_FLA * 1.2);
  });

  it('hardwired interlocks hold even if the program calls both directions', () => {
    const h = rig();
    h.press('fwdPressed'); h.tick(2000);
    h.plc.forces.DO.set(1, true); // someone forces reverse ON
    h.tick(1000);
    expect(h.s.r).toBe(false);
    expect(h.s.f).toBe(true);
  });

  it('fault fr-raux: forward blocked by the logic interlock (O0 never on)', () => {
    const h = rig(); h.scene.setFault('fr-raux');
    h.press('fwdPressed'); h.tick(1000);
    expect(h.io.DO[0]).toBe(false);
    h.press('revPressed'); h.tick(2000);
    expect(h.s.motor.rpm).toBeLessThan(-1000);
  });

  it('fault fr-fcoil: O0 on but F never pulls in', () => {
    const h = rig(); h.scene.setFault('fr-fcoil');
    h.press('fwdPressed'); h.tick(1000);
    expect(h.io.DO[0]).toBe(true);
    expect(h.s.f).toBe(false);
  });

  it('fault fr-zss: neither direction starts', () => {
    const h = rig(); h.scene.setFault('fr-zss');
    h.press('fwdPressed'); h.press('revPressed'); h.tick(1000);
    expect(h.io.DO[0] || h.io.DO[1]).toBe(false);
  });

  it('fault fr-choke: stalls and trips the overload', () => {
    const h = rig(); h.scene.setFault('fr-choke');
    h.press('fwdPressed'); h.tick(15000);
    expect(h.s.motor.tripped).toBe(true);
    expect(h.io.DI[3]).toBe(false);
    expect(h.s.f).toBe(false);
  });
});
