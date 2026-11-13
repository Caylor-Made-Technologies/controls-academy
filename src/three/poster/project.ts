/**
 * Poster frames: a tiny software projector that turns a list of boxes and cylinders into flat-shaded SVG
 * polygons, seen through the same camera as the live 3D scene. No three.js import, so a poster can be drawn
 * from the first chunk while the real 3D layer is still downloading. Pure functions; unit-tested.
 */
export type V3 = [number, number, number];

/** Packed primitive: center xyz and half-size xyz in millimetres, kind (0 box, 1 cylinder along local Y, +2 if
 *  see-through),
 *  then an optional rotation quaternion ×1000 (x, y, z, w). */
export type PackedPrim = number[];

export interface PosterView { aspect: number; pos: V3; look: V3 }
export interface PosterSpec {
  /** Vertical field of view in degrees (matches the scene camera). */
  fov: number;
  /** Camera placement captured at one or more canvas shapes; the nearest one is used. */
  views: PosterView[];
  prims: PackedPrim[];
}

export interface PosterFace {
  /** SVG points string in a y-down space where the visible height is -1..1. */
  points: string;
  /** 0 (in shadow) to 3 (facing the key light). */
  shade: 0 | 1 | 2 | 3;
  /** Round surfaces are drawn with softer edges. */
  round: boolean;
  /** See-through parts (covers, sight glass) are drawn as an outline with a light tint. */
  glass: boolean;
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Rotate v by the quaternion q = [x, y, z, w]. */
export function rotate(v: V3, q: [number, number, number, number]): V3 {
  const [x, y, z, w] = q;
  const u: V3 = [x, y, z];
  const t = cross(u, v);
  const t2: V3 = [t[0] * 2, t[1] * 2, t[2] * 2];
  const c = cross(u, t2);
  return [v[0] + w * t2[0] + c[0], v[1] + w * t2[1] + c[1], v[2] + w * t2[2] + c[2]];
}

/** The captured view whose canvas shape is closest to `aspect` (compared on a log scale). */
export function pickView(views: PosterView[], aspect: number): PosterView {
  return views.reduce((best, v) => (Math.abs(Math.log(v.aspect / aspect)) < Math.abs(Math.log(best.aspect / aspect)) ? v : best));
}

/** Perspective projector for one camera. Returns [x, y, depth]; y is down, visible height is -1..1. */
export function projector(view: PosterView, fovDeg: number): (p: V3) => V3 {
  const f = norm(sub(view.look, view.pos));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const s = 1 / Math.tan((fovDeg * Math.PI) / 360);
  return (p) => {
    const d = sub(p, view.pos);
    const z = dot(d, f);
    return [(dot(d, r) * s) / z, (-dot(d, u) * s) / z, z];
  };
}

/** Convex hull (monotone chain) of 2D points, counter-clockwise. */
export function hull(pts: [number, number][]): [number, number][] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const q of p) { while (lower.length >= 2 && cr(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  const upper: [number, number][] = [];
  for (const q of p.reverse()) { while (upper.length >= 2 && cr(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

const KEY = norm([0.45, 0.8, 0.55]);
const shadeOf = (n: V3): 0 | 1 | 2 | 3 => Math.max(0, Math.min(3, Math.round(1 + dot(n, KEY) * 2.2))) as 0 | 1 | 2 | 3;
const fmt = (pts: (V3 | [number, number])[]) => pts.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(' ');
const NEAR = 0.02;
const SEG = 14;

/** Project every primitive to shaded faces, far to near (painter's order). */
export function posterFaces(spec: PosterSpec, aspect: number): PosterFace[] {
  const view = pickView(spec.views, aspect);
  const proj = projector(view, spec.fov);
  const items: { depth: number; faces: PosterFace[] }[] = [];
  for (const pr of spec.prims) {
    const c: V3 = [pr[0] / 1000, pr[1] / 1000, pr[2] / 1000];
    const h: V3 = [pr[3] / 1000, pr[4] / 1000, pr[5] / 1000];
    const q = pr.length >= 11 ? ([pr[7] / 1000, pr[8] / 1000, pr[9] / 1000, pr[10] / 1000] as [number, number, number, number]) : null;
    const world = (l: V3): V3 => { const v = q ? rotate(l, q) : l; return [c[0] + v[0], c[1] + v[1], c[2] + v[2]]; };
    const dir = (l: V3): V3 => (q ? rotate(l, q) : l);
    const center = proj(c);
    if (center[2] < NEAR) continue;
    const faces: PosterFace[] = [];
    const glass = pr[6] >= 2;
    if (pr[6] % 2 === 1) {
      // Cylinder along local Y: silhouette hull, then the end cap that faces the camera.
      const ring = (y: number) => Array.from({ length: SEG }, (_, i) => { const a = (i / SEG) * Math.PI * 2; return world([Math.cos(a) * h[0], y, Math.sin(a) * h[2]]); });
      const top = ring(h[1]).map(proj);
      const bot = ring(-h[1]).map(proj);
      if ([...top, ...bot].some((p) => p[2] < NEAR)) continue;
      const side = norm(sub(view.pos, c));
      faces.push({ points: fmt(hull([...top, ...bot].map((p) => [p[0], p[1]] as [number, number]))), shade: shadeOf(side), round: true, glass });
      const axis = dir([0, 1, 0]);
      const up = dot(sub(view.pos, c), axis) > 0;
      faces.push({ points: fmt(up ? top : bot), shade: shadeOf(up ? axis : [-axis[0], -axis[1], -axis[2]]), round: true, glass });
    } else {
      const corners: V3[] = [];
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) corners.push(world([sx * h[0], sy * h[1], sz * h[2]]));
      const pc = corners.map(proj);
      if (pc.some((p) => p[2] < NEAR)) continue;
      // corner index = (sx+1)/2*4 + (sy+1)/2*2 + (sz+1)/2
      const FACES: [V3, number[]][] = [
        [[1, 0, 0], [4, 5, 7, 6]], [[-1, 0, 0], [0, 1, 3, 2]],
        [[0, 1, 0], [2, 3, 7, 6]], [[0, -1, 0], [0, 1, 5, 4]],
        [[0, 0, 1], [1, 3, 7, 5]], [[0, 0, -1], [0, 2, 6, 4]],
      ];
      for (const [n, idx] of FACES) {
        const wn = dir(n);
        const fc = world([n[0] * h[0], n[1] * h[1], n[2] * h[2]]);
        if (dot(sub(view.pos, fc), wn) <= 0) continue;
        faces.push({ points: fmt(idx.map((i) => pc[i])), shade: shadeOf(wn), round: false, glass });
      }
    }
    items.push({ depth: center[2], faces });
  }
  items.sort((a, b) => b.depth - a.depth);
  return items.flatMap((i) => i.faces);
}
