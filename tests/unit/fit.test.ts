import { describe, expect, it } from 'vitest';
import { boxCorners, fitDistance, fitView, type V3 } from '../../src/three/fit';

/** Project a point with a camera at `pos` looking at `target` (fov in degrees); returns NDC x, y. */
function ndc(p: V3, pos: V3, target: V3, fov: number, aspect: number): [number, number] {
  const f = [target[0] - pos[0], target[1] - pos[1], target[2] - pos[2]];
  const fl = Math.hypot(f[0], f[1], f[2]); const fw = f.map((v) => v / fl);
  const r = [fw[1] * 0 - fw[2] * 1, fw[2] * 0 - fw[0] * 0, fw[0] * 1 - fw[1] * 0];
  const rl = Math.hypot(r[0], r[1], r[2]); const rr = r.map((v) => v / rl);
  const u = [rr[1] * fw[2] - rr[2] * fw[1], rr[2] * fw[0] - rr[0] * fw[2], rr[0] * fw[1] - rr[1] * fw[0]];
  const o = [p[0] - pos[0], p[1] - pos[1], p[2] - pos[2]];
  const z = o[0] * fw[0] + o[1] * fw[1] + o[2] * fw[2];
  const t = Math.tan((fov * Math.PI) / 360);
  return [(o[0] * rr[0] + o[1] * rr[1] + o[2] * rr[2]) / (z * t * aspect), (o[0] * u[0] + o[1] * u[1] + o[2] * u[2]) / (z * t)];
}

describe('camera fitting', () => {
  const min: V3 = [-3, 0, -1];
  const max: V3 = [3, 2, 1];
  for (const aspect of [0.55, 1, 2.2]) {
    it(`keeps a wide machine fully on screen at aspect ${aspect}`, () => {
      const v = fitView(min, max, [1, 2, 5], [0, 1, 0], 40, aspect);
      for (const c of boxCorners(min, max)) {
        const [x, y] = ndc(c, v.pos, v.target, 40, aspect);
        expect(Math.abs(x)).toBeLessThanOrEqual(1.0001);
        expect(Math.abs(y)).toBeLessThanOrEqual(1.0001);
      }
    });
  }
  it('backs off further on a portrait phone than on a wide screen', () => {
    const corners = boxCorners(min, max);
    expect(fitDistance(corners, [0, 1, 0], [0, 0.3, 1], 40, 0.55)).toBeGreaterThan(fitDistance(corners, [0, 1, 0], [0, 0.3, 1], 40, 2));
  });
  it('the tightest corner just touches the edge (no wasted space beyond the margin)', () => {
    const v = fitView(min, max, [0, 0, 10], [0, 1, 0], 40, 1);
    const xs = boxCorners(min, max).map((c) => Math.abs(ndc(c, v.pos, v.target, 40, 1)[0]));
    expect(Math.max(...xs)).toBeGreaterThan(0.85);
  });
});

import { fitViewInsets } from '../../src/three/fit';

describe('camera fitting with covered edges', () => {
  const min: V3 = [-2, 0, -0.6];
  const max: V3 = [2, 2.6, 0.6]; // tall and deep: the case that used to leave empty sky
  const inset = { top: 0.06, bottom: 0.26, left: 0.04, right: 0.04 };
  for (const aspect of [0.55, 1.2, 2.2]) {
    it(`keeps every corner inside the uncovered window at aspect ${aspect}, and uses it`, () => {
      const v = fitViewInsets(min, max, [1, 2.5, 5], [0, 1, 0], 40, aspect, inset);
      const pts = boxCorners(min, max).map((c) => ndc(c, v.pos, v.target, 40, aspect));
      for (const [x, y] of pts) {
        expect(x).toBeGreaterThanOrEqual(-1 + inset.left - 1e-3);
        expect(x).toBeLessThanOrEqual(1 - inset.right + 1e-3);
        expect(y).toBeGreaterThanOrEqual(-1 + inset.bottom - 1e-3);
        expect(y).toBeLessThanOrEqual(1 - inset.top + 1e-3);
      }
      // the content touches the window on at least one axis (no wasted margin)
      const spanX = Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]));
      const spanY = Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]));
      expect(Math.max(spanX / (2 - inset.left - inset.right), spanY / (2 - inset.top - inset.bottom))).toBeGreaterThan(0.9);
    });
  }
});
