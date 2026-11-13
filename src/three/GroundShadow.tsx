/**
 * Baked contact shadows. Once, after the scene has mounted, every solid mesh under this component's parent
 * is measured and its footprint is painted as a soft dark patch on a small canvas texture; that texture sits
 * just above the ground (or just in front of a backplate). Parts that touch the surface get a tight, dark
 * shadow; parts that stand off it get a wider, fainter one.
 *
 * Why not real-time shadow maps or a render-to-texture pass: this costs one draw call and no extra render,
 * looks the same on every quality tier, and grounding is what stops equipment from looking like it floats.
 * It does not follow moving parts (a bag on a belt), which is fine for a contact shadow.
 */
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Box3, CanvasTexture, Matrix4, Vector3, type Mesh } from 'three';

export interface ShadowRect { x0: number; x1: number; y0: number; y1: number; lift: number }

/**
 * Paint footprints onto a canvas. Coordinates are in meters on the receiving plane, centered on it; `lift`
 * is how far the part's nearest face is from the plane. Exported for the unit test.
 */
export function paintShadows(ctx: CanvasRenderingContext2D, px: number, w: number, h: number, rects: ShadowRect[], reach: number): number {
  const sx = px / w;
  const sy = px / h;
  ctx.clearRect(0, 0, px, px);
  let drawn = 0;
  for (const r of rects) {
    if (r.lift > reach) continue;
    const k = 1 - r.lift / reach; // 1 touching … 0 at the edge of reach
    const soft = w * 0.016 + r.lift * 0.55; // meters: wider for bigger scenes and for parts held off the surface
    const blur = soft * Math.min(sx, sy);
    const grow = soft * 0.5;
    ctx.shadowColor = `rgba(0, 0, 0, ${(0.2 + 0.6 * k).toFixed(3)})`;
    ctx.shadowBlur = Math.max(2, blur);
    // Draw the rectangle far off-canvas and let only its blurred shadow land on it.
    ctx.shadowOffsetX = px * 3;
    ctx.fillStyle = '#000';
    const x = (r.x0 - grow + w / 2) * sx;
    const y = (h / 2 - r.y1 - grow) * sy;
    ctx.fillRect(x - px * 3, y, Math.max(1, (r.x1 - r.x0 + grow * 2) * sx), Math.max(1, (r.y1 - r.y0 + grow * 2) * sy));
    drawn++;
  }
  ctx.shadowOffsetX = 0;
  ctx.shadowBlur = 0;
  return drawn;
}

/**
 * `axis` is the direction the surface faces in the parent's space: 'y' for a floor, 'z' for a backplate.
 * `size` is the patch covered (meters), centered on `center`; `at` is the surface's position on the axis.
 */
export function GroundShadow({ axis = 'y', size, center = [0, 0], at = 0, reach = 0.6, opacity = 0.6, res = 512 }: { axis?: 'y' | 'z'; size: [number, number]; center?: [number, number]; at?: number; reach?: number; opacity?: number; res?: number }) {
  const mesh = useRef<Mesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = res;
    return new CanvasTexture(c);
  }, [res]);
  useEffect(() => () => tex.dispose(), [tex]);

  useEffect(() => {
    // One frame later: sibling parts have mounted and have their final transforms.
    const id = requestAnimationFrame(() => {
      const me = mesh.current;
      const root = me?.parent;
      const ctx = (tex.image as HTMLCanvasElement).getContext('2d');
      if (!me || !root || !ctx) return;
      root.updateWorldMatrix(true, true);
      const toRoot = new Matrix4().copy(root.matrixWorld).invert();
      const m = new Matrix4();
      const box = new Box3();
      const local = new Box3();
      const corner = new Vector3();
      const rects: ShadowRect[] = [];
      root.traverseVisible((o) => {
        const part = o as Mesh;
        if (!part.isMesh || part === me || !part.geometry || o.userData.noShadow) return;
        if (/Plane|Shape|Ring|Circle/.test(part.geometry.type)) return;
        const mat = Array.isArray(part.material) ? part.material[0] : part.material;
        if (!mat || !mat.visible || (mat.transparent && mat.opacity < 0.5)) return;
        if (!part.geometry.boundingBox) part.geometry.computeBoundingBox();
        m.multiplyMatrices(toRoot, part.matrixWorld);
        local.copy(part.geometry.boundingBox!);
        box.makeEmpty();
        for (let i = 0; i < 8; i++) box.expandByPoint(corner.set(i & 1 ? local.max.x : local.min.x, i & 2 ? local.max.y : local.min.y, i & 4 ? local.max.z : local.min.z).applyMatrix4(m));
        const lift = (axis === 'y' ? box.min.y : box.min.z) - at;
        if (lift < -0.02) return; // below or behind the surface
        const v0 = axis === 'y' ? -box.max.z : box.min.y;
        const v1 = axis === 'y' ? -box.min.z : box.max.y;
        rects.push({ x0: box.min.x - center[0], x1: box.max.x - center[0], y0: v0 - center[1], y1: v1 - center[1], lift: Math.max(0, lift) });
      });
      // Big, low things first so small parts' tighter shadows stay crisp on top.
      rects.sort((a, b) => b.lift - a.lift);
      paintShadows(ctx, res, size[0], size[1], rects, reach);
      tex.needsUpdate = true;
      invalidate();
    });
    return () => cancelAnimationFrame(id);
  }, [tex, axis, at, center, size, reach, res, invalidate]);

  const pos: [number, number, number] = axis === 'y' ? [center[0], at + 0.003, -center[1]] : [center[0], center[1], at + 0.0015];
  return (
    <mesh ref={mesh} position={pos} rotation={axis === 'y' ? [-Math.PI / 2, 0, 0] : [0, 0, 0]} userData={{ noPoster: true, noShadow: true }} renderOrder={1}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
