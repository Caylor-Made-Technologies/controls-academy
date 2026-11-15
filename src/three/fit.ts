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
