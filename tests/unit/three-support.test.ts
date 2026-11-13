import { describe, expect, it } from 'vitest';
import { capped, isSoftwareRenderer, pickTier, shouldOpen3D, tierSettings, type DeviceProbe } from '../../src/three/support';
import { panelSignature } from '../../src/three/signature';
import { SimRuntime } from '../../src/features/simulator/runtime';

const desktop: DeviceProbe = { webgl: true, renderer: 'ANGLE (NVIDIA GeForce RTX 3060)', cores: 12, memoryGB: 8, coarse: false, dpr: 1, reducedMotion: false };
const phone: DeviceProbe = { ...desktop, renderer: 'Apple GPU', cores: 6, memoryGB: 0, coarse: true, dpr: 3 };
const headless: DeviceProbe = { ...desktop, renderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)' };

describe('device test → tier', () => {
  it('spots software renderers', () => {
    expect(isSoftwareRenderer(headless.renderer)).toBe(true);
    expect(isSoftwareRenderer('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true);
    expect(isSoftwareRenderer('Microsoft Basic Render Driver')).toBe(true);
    expect(isSoftwareRenderer(desktop.renderer)).toBe(false);
    expect(isSoftwareRenderer('')).toBe(false);
  });
  it('auto picks by device; an explicit preference wins', () => {
    expect(pickTier('auto', desktop)).toBe('high');
    expect(pickTier('auto', phone)).toBe('medium');
    expect(pickTier('auto', headless)).toBe('low');
    expect(pickTier('auto', { ...desktop, memoryGB: 2 })).toBe('low');
    expect(pickTier('auto', { ...desktop, cores: 4 })).toBe('medium');
    expect(pickTier('high', headless)).toBe('high');
    expect(pickTier('low', desktop)).toBe('low');
  });
  it('a runtime cap only lowers the tier', () => {
    expect(capped('high', 'low')).toBe('low');
    expect(capped('low', 'high')).toBe('low');
    expect(capped('medium')).toBe('medium');
  });
  it('tier settings get cheaper going down', () => {
    const h = tierSettings('high', phone), m = tierSettings('medium', phone), l = tierSettings('low', phone);
    expect([h.dpr, m.dpr, l.dpr]).toEqual([2, 1.5, 1]);
    expect(h.shadows && !m.shadows && !l.shadows).toBe(true);
    expect(l.envRes).toBe(0);
    expect(l.contactRes).toBe(0);
    expect(l.maxFps).toBe(30);
    expect(tierSettings('high', { dpr: 1 }).dpr).toBe(1); // never above the screen's own density
  });
  it('3D opens by default only when it will run well', () => {
    expect(shouldOpen3D('auto', desktop)).toBe(true);
    expect(shouldOpen3D('auto', headless)).toBe(false);
    expect(shouldOpen3D('auto', { ...desktop, reducedMotion: true })).toBe(false);
    expect(shouldOpen3D('low', headless)).toBe(true); // chosen explicitly
    expect(shouldOpen3D('high', { ...desktop, webgl: false })).toBe(false);
    expect(shouldOpen3D('2d', desktop)).toBe(false);
  });
});

describe('render on change (B-001)', () => {
  it('the panel signature stays the same while nothing visible changes', () => {
    const rt = new SimRuntime();
    rt.advance(100); // field inputs settle on the first ticks (NC stop, overload, e-stop)
    const a = panelSignature(rt);
    rt.advance(5000);
    expect(panelSignature(rt)).toBe(a);
  });
  it('and changes when the motor starts', () => {
    const rt = new SimRuntime();
    rt.advance(100);
    const before = panelSignature(rt);
    rt.scene.state.startPressed = true;
    expect(panelSignature(rt)).not.toBe(before);
  });
});

import { LOOKS } from '../../src/three/look';
import { readFileSync } from 'node:fs';

describe('3D look per theme', () => {
  it('both themes define the same grade, in sane ranges', () => {
    expect(Object.keys(LOOKS.light).sort()).toEqual(Object.keys(LOOKS.dark).sort());
    for (const l of Object.values(LOOKS)) {
      expect(l.exposure).toBeGreaterThan(0.8);
      expect(l.exposure).toBeLessThan(1.3);
      expect(l.ao).toBeGreaterThan(0);
      expect(l.ao).toBeLessThan(1);
      expect(l.fog[0]).toBeLessThan(l.fog[1]);
    }
  });
  it('the canvas color matches the CSS backdrop behind it (no flash while 3D loads)', () => {
    // The backdrop gradient's middle stop is the --stage-2 token; each theme's value must equal the 3D clear color.
    const css = readFileSync('src/styles/tokens.css', 'utf8');
    const stage2 = [...css.matchAll(/--stage-2:\s*(#[0-9a-f]{6});/g)].map((m) => m[1]);
    expect(stage2).toEqual([LOOKS.dark.bg, LOOKS.light.bg]);
    expect(readFileSync('src/styles/app.css', 'utf8')).toMatch(/\.panel3d-bg \{[^}]*var\(--stage-2\)/);
  });
});
