import { describe, expect, it } from 'vitest';
import { Plc, verifyProgram } from '../../src/engine';
import { createMotorScene } from '../../src/plant/motor';

function rig(fault: string | null = null) {
  const scene = createMotorScene();
  const plc = new Plc(scene.program());
  plc.setMode('RUN');
  scene.setFault(fault);
  const io = { DI: plc.fieldDI, DO: plc.fieldDO, AI: plc.fieldAI, AO: plc.fieldAO };
  const tick = (ms: number) => {
    for (let t = 0; t < ms; t += 10) {
      scene.step(10, io);
      plc.scan(10);
    }
  };
  return { scene, plc, tick, s: scene.state };
}

describe('motor start/stop scene', () => {
  it('shipped program verifies clean', () => {
    expect(verifyProgram(createMotorScene().program()).filter((i) => i.level === 'error')).toEqual([]);
  });

  it('starts, seals in, runs up to speed and stops', () => {
    const { s, plc, tick } = rig();
    tick(100);
    s.startPressed = true;
    tick(100);
    s.startPressed = false;
    tick(3000);
    expect(s.contactor).toBe(true);
    expect(s.rpm).toBeGreaterThan(1700);
    expect(plc.fieldDO[1]).toBe(true); // run light
    expect(s.amps).toBeLessThan(14);
    s.stopPressed = true;
    tick(100);
    s.stopPressed = false;
    tick(9000); // motors coast down slowly
    expect(s.contactor).toBe(false);
    expect(s.rpm).toBeLessThan(50);
  });

  it('E-stop drops the coil in hardware and the seal in logic — no restart on release', () => {
    const { s, tick } = rig();
    tick(50);
    s.startPressed = true; tick(100); s.startPressed = false; tick(1000);
    s.estopIn = true;
    tick(100);
    expect(s.contactor).toBe(false);
    s.estopIn = false;
    tick(500);
    expect(s.contactor).toBe(false);
  });

  it('jam trips the overload within seconds and lights the fault lamp', () => {
    const { s, plc, tick } = rig('jam');
    tick(50);
    s.startPressed = true; tick(100); s.startPressed = false;
    tick(15000);
    expect(s.olTripped).toBe(true);
    expect(s.contactor).toBe(false);
    expect(plc.fieldDO[2]).toBe(true);
  });

  it('open coil → fail-to-start alarm after 2 s, reset clears it', () => {
    const { s, plc, tick } = rig('coilopen');
    tick(50);
    s.startPressed = true; tick(100); s.startPressed = false;
    tick(2500);
    expect(plc.tags.read('Fail_Alarm')).toBe(true);
    expect(plc.fieldDO[0]).toBe(false);
    s.resetPressed = true; tick(50); s.resetPressed = false; tick(50);
    expect(plc.tags.read('Fail_Alarm')).toBe(false);
  });

  it('blown fuse kills every input', () => {
    const { plc, tick } = rig('fuse');
    tick(50);
    expect(plc.fieldDI.slice(0, 6).every((x) => !x)).toBe(true);
  });

  it('every fault has a culprit, complaint and method; meter points read', () => {
    const { scene, plc } = rig();
    for (const f of scene.faults) {
      expect(f.complaint && f.cause && f.howToFind && f.culprit).toBeTruthy();
    }
    expect(scene.faults.length).toBeGreaterThanOrEqual(8);
    const pts = scene.meterPoints({ DI: plc.fieldDI, DO: plc.fieldDO, AI: plc.fieldAI, AO: plc.fieldAO });
    for (const p of pts) expect(Number.isFinite(p.read().value)).toBe(true);
  });

  it('reset restores a healthy machine', () => {
    const { scene } = rig('estopin');
    expect(scene.state.estopIn).toBe(true);
    scene.reset();
    expect(scene.state.estopIn).toBe(false);
    expect(scene.activeFault).toBeNull();
  });
});

import { MOTOR_FLA, MOTOR_RPM, MOTOR_SYNC_RPM, currentPU, torquePU } from '../../src/plant/motor';

describe('motor physics', () => {
  it('torque curve: 1.0× at rated slip, ~1.5× locked rotor, ~2.5× breakdown', () => {
    const sr = 1 - MOTOR_RPM / MOTOR_SYNC_RPM;
    expect(torquePU(sr)).toBeCloseTo(1, 3);
    expect(torquePU(1)).toBeGreaterThan(1.3);
    expect(torquePU(1)).toBeLessThan(1.8);
    let peak = 0;
    for (let s = 0.01; s < 1; s += 0.002) peak = Math.max(peak, torquePU(s));
    expect(peak).toBeGreaterThan(2.2);
    expect(peak).toBeLessThan(2.8);
  });

  it('current: ~6× locked rotor, ~1× at rated, ~0.4× no-load', () => {
    expect(currentPU(1)).toBeGreaterThan(5.7);
    expect(currentPU(1)).toBeLessThan(6.3);
    expect(currentPU(1 - MOTOR_RPM / MOTOR_SYNC_RPM)).toBeCloseTo(1, 1);
    expect(currentPU(0.002)).toBeLessThan(0.5);
  });

  it('starts in under 2 s, settles between rated and sync speed below FLA, inrush near 6×', () => {
    const { s, tick } = rig();
    s.startPressed = true;
    tick(60);
    s.startPressed = false;
    let peak = 0;
    for (let t = 0; t < 2000; t += 10) { tick(10); peak = Math.max(peak, s.amps); }
    expect(peak / MOTOR_FLA).toBeGreaterThan(5);
    expect(s.rpm).toBeGreaterThan(MOTOR_RPM - 5);
    expect(s.rpm).toBeLessThan(MOTOR_SYNC_RPM);
    expect(s.amps).toBeLessThan(MOTOR_FLA);
    tick(3000);
    expect(s.olTripped).toBe(false);
  });

  it('a jam stalls the motor at locked-rotor current and a Class 10-style overload trips in ~3–10 s', () => {
    const { s, tick } = rig();
    s.jammed = true;
    s.startPressed = true;
    tick(60);
    s.startPressed = false;
    let t = 0;
    while (!s.olTripped && t < 15000) { tick(10); t += 10; }
    expect(s.rpm).toBe(0);
    expect(t).toBeGreaterThan(3000);
    expect(t).toBeLessThan(10000);
    tick(100); // the contactor drops out ~20 ms after 95-96 opens
    expect(s.contactor).toBe(false);
  });

  it('overload will not reset until it cools, then resets', () => {
    const { scene, s, tick } = rig('jam');
    s.startPressed = true;
    tick(60);
    s.startPressed = false;
    tick(9000);
    expect(s.olTripped).toBe(true);
    expect(scene.resetOverload!()).toBe(false);
    tick(12000);
    expect(scene.resetOverload!()).toBe(true);
    expect(s.olTripped).toBe(false);
  });

  it('coasts down slower than it starts', () => {
    const { s, tick } = rig();
    s.startPressed = true; tick(60); s.startPressed = false; tick(2500);
    s.stopPressed = true; tick(60); s.stopPressed = false;
    tick(500);
    expect(s.rpm).toBeGreaterThan(200);
    tick(15000);
    expect(s.rpm).toBe(0);
  });
});
