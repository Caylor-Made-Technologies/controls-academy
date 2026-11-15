/**
 * Camera fitting. Given the corners of what must be on screen, a viewing direction and the canvas shape, how
 * far back does the camera need to be so every corner is inside the picture (with a small margin)? Pure math,
 * no three.js import, unit-tested. Used so every machine scene shows the whole machine on a portrait phone and
 * doesn't sit small in the middle of a wide desktop canvas.
 */
export type V3 = [number, number, number];

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** The 8 corners of an axis-aligned box. */
export function boxCorners(min: V3, max: V3): V3[] {
  const out: V3[] = [];
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) out.push([x, y, z]);
  return out;
}

/**
 * Distance from `target` along `dir` (pointing from the target toward the camera) at which a perspective
 * camera with vertical field of view `fovDeg` and the given aspect shows every point in `points`.
 */
export function fitDistance(points: V3[], target: V3, dir: V3, fovDeg: number, aspect: number, margin = 1.08): number {
  const d = norm(dir);
  const right = norm(cross([0, 1, 0], d));
  const up = cross(d, right);
  const tanV = Math.tan((fovDeg * Math.PI) / 360) / margin;
  const tanH = tanV * aspect;
  let need = 0;
  for (const p of points) {
    const o = sub(p, target);
    const toward = dot(o, d); // how far this point sits toward the camera
    need = Math.max(need, toward + Math.abs(dot(o, right)) / tanH, toward + Math.abs(dot(o, up)) / tanV);
  }
  return need;
}

/** Camera position and target that frame the box from the direction of a reference camera. */
export function fitView(min: V3, max: V3, refPos: V3, refTarget: V3, fovDeg: number, aspect: number): { pos: V3; target: V3 } {
  const target: V3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const dir = norm(sub(refPos, refTarget));
  const dist = fitDistance(boxCorners(min, max), target, dir, fovDeg, aspect);
  return { pos: [target[0] + dir[0] * dist, target[1] + dir[1] * dist, target[2] + dir[2] * dist], target };
}

/** Parts of the canvas that controls cover, as fractions of the half-width/half-height (0 = none). */
export interface Insets { top: number; bottom: number; left: number; right: number }
export const NO_INSETS: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * Like fitView, but the machine's projected outline (not its box center) is centered in the part of the canvas
 * that is not covered by controls, and the margin is small. This is what stops a tall, deep box from leaving
 * empty sky above the machine. A few rounds of "fit distance, then re-center" converge quickly.
 */
export function fitViewInsets(min: V3, max: V3, refPos: V3, refTarget: V3, fovDeg: number, aspect: number, inset: Insets = NO_INSETS, margin = 1.03): { pos: V3; target: V3 } {
  const corners = boxCorners(min, max);
  const d = norm(sub(refPos, refTarget));
  const right = norm(cross([0, 1, 0], d));
  const up = cross(d, right);
  const tanV = Math.tan((fovDeg * Math.PI) / 360);
  const tanH = tanV * aspect;
  // usable window in tangent space, and where its middle sits
  const hx = ((2 - inset.left - inset.right) / 2) * tanH / margin;
  const hy = ((2 - inset.top - inset.bottom) / 2) * tanV / margin;
  const wx = ((inset.left - inset.right) / 2) * tanH;
  const wy = ((inset.bottom - inset.top) / 2) * tanV;
  const at = (t: V3, k: number): V3 => [t[0] + d[0] * k, t[1] + d[1] * k, t[2] + d[2] * k];
  // Projected outline (tangent space) of the box from a camera at `pos`.
  const outline = (pos: V3) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, behind = false;
    for (const c of corners) {
      const o = sub(c, pos);
      const z = -dot(o, d);
      if (z <= 1e-3) { behind = true; continue; }
      const x = dot(o, right) / z;
      const y = dot(o, up) / z;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return { x0, x1, y0, y1, behind };
  };
  // At a given distance, slide the camera sideways/up until the outline is centered in the window.
  const centered = (dist: number): { t: V3; fits: boolean } => {
    let t: V3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    for (let r = 0; r < 8; r++) {
      const o = outline(at(t, dist));
      if (o.behind) return { t, fits: false };
      const sx = ((o.x0 + o.x1) / 2 - wx) * dist;
      const sy = ((o.y0 + o.y1) / 2 - wy) * dist;
      t = [t[0] + right[0] * sx + up[0] * sy, t[1] + right[1] * sx + up[1] * sy, t[2] + right[2] * sx + up[2] * sy];
      if (Math.abs(sx) + Math.abs(sy) < 1e-5) break;
    }
    const o = outline(at(t, dist));
    const fits = !o.behind && (o.x1 - o.x0) / 2 <= hx && (o.y1 - o.y0) / 2 <= hy;
    return { t, fits };
  };
  // The closest distance that still fits, by bisection between "surely too close" and "surely fits".
  const center: V3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  let hi = fitDistance(corners, center, d, fovDeg, aspect, 1) * 2 + 1e-3;
  let lo = 0;
  while (!centered(hi).fits) hi *= 1.5;
  for (let k = 0; k < 30; k++) {
    const mid = (lo + hi) / 2;
    if (centered(mid).fits) hi = mid; else lo = mid;
  }
  const { t } = centered(hi);
  return { pos: at(t, hi), target: t };
}
