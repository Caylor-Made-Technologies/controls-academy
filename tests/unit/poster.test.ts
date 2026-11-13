import { describe, expect, it } from 'vitest';
import { hull, pickView, posterFaces, projector, rotate, type PosterSpec } from '../../src/three/poster/project';
import { POSTERS as SIM } from '../../src/three/poster/sim.gen';
import { POSTERS as WIRING } from '../../src/three/poster/wiring.gen';
import { POSTERS as INSIDE } from '../../src/three/poster/inside.gen';
import { POSTERS as METER } from '../../src/three/poster/meter.gen';
import { MACHINES } from '../../src/plant';
import { EXERCISES } from '../../src/lib/wiring';
import { INSIDE as INSIDE_DEVICES } from '../../src/content/inside';

const view = { aspect: 1, pos: [0, 0, 5] as [number, number, number], look: [0, 0, 0] as [number, number, number] };

describe('poster projector', () => {
  it('puts the look-at point in the middle and keeps y down', () => {
    const p = projector(view, 90);
    expect(p([0, 0, 0])[0]).toBeCloseTo(0);
    expect(p([0, 0, 0])[1]).toBeCloseTo(0);
    expect(p([0, 0, 0])[2]).toBeCloseTo(5);
    // fov 90°: a point 5 m up at 5 m depth sits on the top edge (y = -1 in a y-down space)
    expect(p([0, 5, 0])[1]).toBeCloseTo(-1);
    expect(p([5, 0, 0])[0]).toBeCloseTo(1);
  });

  it('rotates with a quaternion', () => {
    const s = Math.SQRT1_2;
    const v = rotate([1, 0, 0], [0, s, 0, s]); // 90° about Y
    expect(v[0]).toBeCloseTo(0);
    expect(v[2]).toBeCloseTo(-1);
  });

  it('builds a convex hull', () => {
    expect(hull([[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0.5]])).toHaveLength(4);
  });

  it('picks the captured view closest to the canvas shape', () => {
    const views = [{ ...view, aspect: 0.7 }, { ...view, aspect: 1.4 }, { ...view, aspect: 2.2 }];
    expect(pickView(views, 0.75).aspect).toBe(0.7);
    expect(pickView(views, 1.9).aspect).toBe(2.2);
  });

  it('a box seen straight on shows one face; from a corner it shows three', () => {
    const box: PosterSpec = { fov: 40, views: [view], prims: [[0, 0, 0, 500, 500, 500, 0]] };
    expect(posterFaces(box, 1)).toHaveLength(1);
    const corner: PosterSpec = { ...box, views: [{ aspect: 1, pos: [4, 4, 4], look: [0, 0, 0] }] };
    expect(posterFaces(corner, 1)).toHaveLength(3);
  });

  it('draws far parts first and skips anything behind the camera', () => {
    const spec: PosterSpec = { fov: 40, views: [view], prims: [[0, 0, 2000, 100, 100, 100, 0], [0, 0, -2000, 100, 100, 100, 0], [0, 0, 9000, 100, 100, 100, 0]] };
    const faces = posterFaces(spec, 1);
    expect(faces).toHaveLength(2);
    // the far box (z = -2 m) projects smaller, and is listed first
    const width = (f: { points: string }) => { const xs = f.points.split(' ').map((p) => Number(p.split(',')[0])); return Math.max(...xs) - Math.min(...xs); };
    expect(width(faces[0])).toBeLessThan(width(faces[1]));
  });

  it('a cylinder gives a silhouette and one end cap', () => {
    const spec: PosterSpec = { fov: 40, views: [{ aspect: 1, pos: [0, 3, 5], look: [0, 0, 0] }], prims: [[0, 0, 0, 300, 600, 300, 1]] };
    const faces = posterFaces(spec, 1);
    expect(faces).toHaveLength(2);
    expect(faces.every((f) => f.round && !f.glass)).toBe(true);
  });
});

describe('poster data covers every 3D view', () => {
  const sane = (s: PosterSpec) => {
    expect(s.views.length).toBeGreaterThan(0);
    expect(s.prims.length).toBeGreaterThan(2);
    expect(s.prims.length).toBeLessThanOrEqual(48);
    for (const v of s.views) {
      const faces = posterFaces(s, v.aspect);
      expect(faces.length).toBeGreaterThan(2);
      for (const f of faces) expect(f.points).not.toMatch(/NaN|Infinity/);
    }
  };
  it('the motor panel and every other machine', () => {
    sane(SIM.panel);
    for (const m of MACHINES.filter((x) => x.id !== 'motor')) sane(SIM[m.id]);
  });
  it('every wiring exercise', () => { for (const e of EXERCISES) sane(WIRING[e.id]); });
  it('every exploded view', () => { for (const d of INSIDE_DEVICES) sane(INSIDE[d.id]); });
  it('a meter bench for every machine with faults', () => { for (const m of MACHINES) sane(METER[m.id]); });
});
