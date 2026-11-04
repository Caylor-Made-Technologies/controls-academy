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
