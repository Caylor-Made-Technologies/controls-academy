import { describe, expect, it } from 'vitest';
import { BUS_C, BUS_NOM, BUS_OV_TRIP, FAN_J, createVfdScene, fanTorque, vhzMotor } from '../../src/plant/vfd';
import { MOTOR_FLA, MOTOR_T_RATED } from '../../src/plant/motor';
import { harness } from './machine-harness';

const rig = () => harness(createVfdScene());

describe('VFD station', () => {
  it('shipped program verifies clean', () => expect(rig().errors()).toEqual([]));

  it('fan torque is ≈ 0.94 × rated at 1750 rpm and ∝ n² (hand-worked)', () => {
    expect(fanTorque(1750) / MOTOR_T_RATED).toBeCloseTo(0.94, 2);
    expect(fanTorque(875) / MOTOR_T_RATED).toBeCloseTo(0.04 + 0.9 * 0.25, 2);
  });

  it('V/Hz motor: no torque at sync speed, motoring below it, generating above it', () => {
    expect(vhzMotor(30, 900).tPU).toBeCloseTo(0, 3);
    expect(vhzMotor(30, 880).tPU).toBeGreaterThan(0);
    expect(vhzMotor(30, 920).tPU).toBeLessThan(0);
  });

  it('starts from the terminals and ramps to the pot speed: 75 % → 6 + 0.75 × 54 = 46.5 Hz', () => {
    const { s, tick, press, io } = rig();
    press('startPressed');
    tick(5000);
    expect(s.hz).toBeGreaterThan(29); expect(s.hz).toBeLessThan(32); // 6 Hz/s for ~5.25 s
    tick(10000);
    expect(s.hz).toBeCloseTo(46.5, 0);
    expect(s.rpm).toBeGreaterThan(46.5 * 30 - 40); expect(s.rpm).toBeLessThan(46.5 * 30);
    expect(s.amps).toBeLessThan(MOTOR_FLA);
    expect(io.DO[2]).toBe(true);
    expect(s.fault).toBe('');
  });

  it('speed never exceeds what the drive commands', () => {
    const { s, tick, press } = rig();
    press('startPressed');
    tick(20000, () => expect(s.rpm).toBeLessThanOrEqual(s.hz * 30 + 1e-6 + (s.hz === 0 ? 2000 : 0)));
  });

  it('fault: accel 0.5 s with current limit off trips OC; with the limit on it just accelerates slower', () => {
    const a = rig();
    a.scene.setFault('vfd-oc');
    a.press('startPressed');
    a.tick(2000);
    expect(a.s.fault).toBe('OC');
    const b = rig();
    b.s.accelS = 0.5;
    b.press('startPressed');
    b.tick(3000);
    expect(b.s.fault).toBe('');
    expect(b.s.amps).toBeLessThanOrEqual(MOTOR_FLA * 1.6);
  });

  it('fault: 2 s decel without a braking resistor trips OV on stop; the default 30 s decel, a resistor or coasting does not', () => {
    const run = (setup: (s: ReturnType<typeof rig>['s']) => void) => {
      const r = rig();
      r.press('startPressed'); r.tick(15000);
      setup(r.s);
      r.press('stopPressed'); r.tick(25000);
      return r.s;
    };
    expect(run((s) => { s.decelS = 2; }).fault).toBe('OV');
    expect(run((s) => { s.decelS = 30; }).fault).toBe('');
    expect(run((s) => { s.decelS = 2; s.brakeResistor = true; }).fault).toBe('');
    expect(run((s) => { s.decelS = 2; s.stopMode = 'coast'; }).fault).toBe('');
  });

  it('energy sanity: the bus never gains more energy than the fan lost', () => {
    const r = rig();
    r.press('startPressed'); r.tick(15000);
    const w0 = (r.s.rpm * 2 * Math.PI) / 60;
    const ke0 = 0.5 * FAN_J * w0 * w0;
    r.s.decelS = 2;
    r.s.stopPressed = true;
    let maxBus = BUS_NOM;
    r.s.startPressed = false;
    r.tick(3000, () => { maxBus = Math.max(maxBus, r.s.bus); });
    const busGain = 0.5 * BUS_C * (maxBus * maxBus - BUS_NOM * BUS_NOM);
    expect(busGain).toBeLessThan(ke0);
    expect(maxBus).toBeGreaterThan(BUS_OV_TRIP - 5);
    expect(r.s.fault).toBe('OV');
  });

  it('fault: open guard (STO) — no run command, no torque, keypad shows STO', () => {
    const { s, scene, tick, press, io } = rig();
    scene.setFault('vfd-sto');
    press('startPressed'); tick(3000);
    expect(io.DO[0]).toBe(false);
    expect(s.rpm).toBe(0);
    expect(scene.ui!.indicators.find((x) => x.label === 'Drive keypad')!.kind).toBe('text');
  });

  it('fault: broken 4–20 mA reference wire → LOSS OF REF; the same break on 0–10 V runs silently at min speed', () => {
    const a = rig();
    a.scene.setFault('vfd-ref');
    a.press('startPressed'); a.tick(2000);
    expect(a.s.fault).toBe('LOSS OF REF');
    const b = rig();
    b.scene.setFault('vfd-ref');
    b.s.refSource = '0-10V';
    b.press('startPressed'); b.tick(8000);
    expect(b.s.fault).toBe('');
    expect(b.s.hz).toBeCloseTo(6, 0);
  });

  it('fault: failing bearing → drive in current limit below commanded speed → motor overload trips; reset refused until it cools', () => {
    const { s, scene, tick, press } = rig();
    scene.setFault('vfd-ol');
    press('startPressed');
    let t = 0;
    while (s.fault !== 'MOTOR OL' && t < 120000) { tick(500); t += 500; }
    expect(s.fault).toBe('MOTOR OL');
    expect(s.hz === 0 || s.hz < 52).toBe(true);
    press('resetPressed');
    expect(s.fault).toBe('MOTOR OL');
  });
});
