import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MACHINES, createMachine } from '../../src/plant';
import { MACHINE_SCENES } from '../../src/three/machines';
import { keypadText } from '../../src/three/machines/vfd';
import { machineSignature } from '../../src/three/signature';
import { SimRuntime } from '../../src/features/simulator/runtime';
import type { VfdState } from '../../src/plant/vfd';

describe('3D machine scenes (3.3)', () => {
  it('every machine has a 3D view: the motor its panel, the rest a machine scene', () => {
    for (const m of MACHINES) {
      const scene = createMachine(m.id);
      expect(scene.view3d, m.id).toBeTruthy();
      if (scene.view3d === 'machine') expect(MACHINE_SCENES[m.id], m.id).toBeTruthy();
    }
    expect(Object.keys(MACHINE_SCENES).sort()).toEqual(MACHINES.map((m) => m.id).filter((id) => id !== 'motor').sort());
  });

  it('every tap target in a scene is a real device of that machine (so its wiring card opens)', () => {
    for (const id of Object.keys(MACHINE_SCENES)) {
      const src = readFileSync(`src/three/machines/${id}.tsx`, 'utf8');
      const devices = new Set(createMachine(id).devices.map((d) => d.id));
      const picks = [...src.matchAll(/<Pick (?:key=\{[^}]+\} )?id="([^"]+)"/g)].map((x) => x[1]);
      const mapped = [...src.matchAll(/\(\[([^\]]+)\] as const\)\.map\(\(id/g)].flatMap((x) => [...x[1].matchAll(/'([^']+)'/g)].map((y) => y[1]));
      expect(picks.length + mapped.length, id).toBeGreaterThan(3);
      for (const pid of [...picks, ...mapped]) expect(devices.has(pid), `${id}: "${pid}" is not a device`).toBe(true);
    }
  });

  it('scenes report motion only while something moves', () => {
    for (const [id, def] of Object.entries(MACHINE_SCENES)) {
      const rt = new SimRuntime(undefined, id);
      expect(typeof def.readout(rt), id).toBe('string');
      expect(def.camera.pos.every(Number.isFinite) && def.radius > 0, id).toBe(true);
    }
    const rt = new SimRuntime(undefined, 'fwdrev');
    rt.advance(200);
    expect(MACHINE_SCENES.fwdrev.moving(rt)).toBe(false);
    const sig = machineSignature(rt);
    rt.advance(2000);
    expect(machineSignature(rt)).toBe(sig); // idle machine → nothing to redraw
  });

  it('the VFD keypad shows only what the simulation knows', () => {
    const s = createMachine('vfd').state as VfdState;
    expect(keypadText({ ...s, hz: 0, running: false, bus: 680 })).toBe('READY  0.0 Hz\nBUS 680 V');
    expect(keypadText({ ...s, hz: 42.04, running: true, amps: 18.26, bus: 676 })).toBe('42.0 Hz  RUN\n18.3 A  676 V');
    expect(keypadText({ ...s, fault: 'OV' })).toBe('FAULT\nOV');
    expect(keypadText({ ...s, stoClosed: false, hz: 0 })).toMatch(/^SAFE TORQUE OFF/);
  });
});
