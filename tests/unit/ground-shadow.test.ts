import { describe, expect, it } from 'vitest';
import { paintShadows, type ShadowRect } from '../../src/three/GroundShadow';
import { SURFACES, surfaceFor } from '../../src/three/materials';

/** Records what was drawn, in place of a real 2D canvas. */
function fakeCtx() {
  const rects: { x: number; y: number; w: number; h: number; blur: number; color: string }[] = [];
  const ctx = {
    shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, fillStyle: '',
    clearRect() { /* nothing to clear */ },
    fillRect(x: number, y: number, w: number, h: number) { rects.push({ x: x + ctx.shadowOffsetX, y, w, h, blur: ctx.shadowBlur, color: ctx.shadowColor }); },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, rects };
}
const alpha = (c: string) => Number(/, ([\d.]+)\)$/.exec(c)![1]);

describe('baked contact shadows', () => {
  const touching: ShadowRect = { x0: -0.5, x1: 0.5, y0: -0.25, y1: 0.25, lift: 0 };
  it('maps meters on the ground patch to canvas pixels, centered, y up', () => {
    const { ctx, rects } = fakeCtx();
    paintShadows(ctx, 512, 4, 4, [touching], 0.6);
    // 1 m wide on a 4 m patch = a quarter of the canvas, centered
    expect(rects[0].w).toBeGreaterThan(128); // footprint plus a soft margin
    expect(rects[0].h).toBeGreaterThan(64);
    expect(rects[0].x).toBeLessThan(192);
    expect(rects[0].x + rects[0].w / 2).toBeCloseTo(256); // still centered
    expect(rects[0].y + rects[0].h / 2).toBeCloseTo(256);
  });
  it('a part that touches the ground gets a darker, tighter shadow than one lifted off it', () => {
    const { ctx, rects } = fakeCtx();
    paintShadows(ctx, 512, 4, 4, [touching, { ...touching, lift: 0.4 }], 0.6);
    expect(alpha(rects[0].color)).toBeGreaterThan(alpha(rects[1].color));
    expect(rects[0].blur).toBeLessThan(rects[1].blur);
  });
  it('parts beyond reach cast nothing', () => {
    const { ctx, rects } = fakeCtx();
    expect(paintShadows(ctx, 512, 4, 4, [{ ...touching, lift: 2 }], 0.6)).toBe(0);
    expect(rects).toHaveLength(0);
  });
});

describe('material library', () => {
  it('metals are fully metallic and coatings are not', () => {
    for (const s of ['brushedSteel', 'machinedSteel', 'copper', 'tinned', 'brass'] as const) expect(SURFACES[s].metalness).toBe(1);
    for (const s of ['powderCoat', 'enamel', 'plasticMatte', 'plasticGloss', 'rubber'] as const) expect(SURFACES[s].metalness).toBe(0);
  });
  it('every recipe has physically sensible values', () => {
    for (const [name, r] of Object.entries(SURFACES)) {
      expect(r.roughness, name).toBeGreaterThan(0.03);
      expect(r.roughness, name).toBeLessThanOrEqual(1);
      expect(r.color, name).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
  it('picks a sensible recipe for legacy metal/rough pairs', () => {
    expect(surfaceFor(0.9, 0.25)).toBe('machinedSteel');
    expect(surfaceFor(0.9, 0.4)).toBe('brushedSteel');
    expect(surfaceFor(0.1, 0.95)).toBe('rubber');
    expect(surfaceFor(0.1, 0.6)).toBe('powderCoat');
    expect(surfaceFor(0, 0.3)).toBe('plasticGloss');
  });
});

import { partKind, shortName } from '../../src/three/Inside3D';
import { INSIDE } from '../../src/content/inside';

describe('exploded views', () => {
  it('on-model labels are short', () => {
    expect(shortName('Heaters and bimetal strips (one per phase)')).toBe('Heaters and bimetal strips');
    expect(shortName('Cable: brown +, blue −, black output')).toBe('Cable');
    for (const d of INSIDE) for (const p of d.parts) expect(shortName(p.name).length).toBeLessThanOrEqual(26);
  });
  it('key parts are drawn as what they are, not as plain boxes', () => {
    const vfd = INSIDE.find((d) => d.id === 'vfd')!;
    const kind = (id: string) => partKind(vfd.parts.find((p) => p.id === id)!);
    expect(kind('caps')).toBe('caps');
    expect(kind('heatsink')).toBe('fins');
    expect(kind('igbt')).toBe('board');
    expect(kind('housing')).toBe('plain');
    const prox = INSIDE.find((d) => d.id === 'prox')!;
    expect(partKind(prox.parts.find((p) => p.id === 'coil')!)).toBe('coil');
    // every device has at least three parts with their own look
    for (const d of INSIDE) expect(d.parts.filter((p) => partKind(p) !== 'plain').length, d.id).toBeGreaterThanOrEqual(3);
  });
});
