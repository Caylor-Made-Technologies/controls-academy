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
    expect(rects[0].w).toBeCloseTo(128);
    expect(rects[0].h).toBeCloseTo(64);
    expect(rects[0].x).toBeCloseTo(192);
    expect(rects[0].y).toBeCloseTo(224);
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
