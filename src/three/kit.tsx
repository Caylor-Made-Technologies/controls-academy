/**
 * Shared 3D building blocks (rounded boxes, canvas labels, LEDs with fake bloom) used by the
 * control panel scene and the hardware library models.
 */
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { AdditiveBlending, CatmullRomCurve3, TubeGeometry, Vector3, type Mesh, type MeshStandardMaterial, type Sprite } from 'three';
import { lowDetail, surface, surfaceFor, type Surface } from './materials';
import { haloTexture, labelTexture } from './textures';

/**
 * A box of some real material. Edges are beveled (raw boxes read as placeholders; a small bevel catches the
 * light like a molded or folded part). Pass `s` to name the surface; otherwise the closest recipe is picked
 * from `metal`/`rough` so older call sites get the shared materials too.
 */
export function Box({ size, pos, color, rough = 0.6, metal = 0.1, children, mref, opacity, round, s }: { size: [number, number, number]; pos: [number, number, number]; color: string; rough?: number; metal?: number; children?: ReactNode; mref?: React.Ref<Mesh>; opacity?: number; round?: number; s?: Surface }) {
  const minDim = Math.min(...size);
  // Only parts big enough to show a bevel get one: a beveled box is ~10× the triangles of a plain one, and a
  // panel has hundreds of small parts.
  const r = round ?? (minDim >= 0.03 ? Math.min(0.0055, minDim * 0.12) : 0);
  const mat = surface(s ?? surfaceFor(metal, rough), color, opacity);
  if (r > 0) {
    return (
      <RoundedBox ref={mref} args={size} radius={r} smoothness={2} position={pos} material={mat}>
        {children}
      </RoundedBox>
    );
  }
  return (
    <mesh ref={mref} position={pos} material={mat}>
      <boxGeometry args={size} />
      {children}
    </mesh>
  );
}

/** A pan-head screw seen from the front (faces +z). Small, so it is a 10-sided disc with a slot. */
export function ScrewHead({ pos, r = 0.006, rot }: { pos: [number, number, number]; r?: number; rot?: [number, number, number] }) {
  if (lowDetail()) return null;
  return (
    <group position={pos} rotation={rot}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={surface('machinedSteel')}><cylinderGeometry args={[r, r * 1.05, r * 0.5, 10]} /></mesh>
      <mesh position={[0, 0, r * 0.26]} material={surface('castIron')}><boxGeometry args={[r * 1.5, r * 0.22, r * 0.1]} /></mesh>
    </group>
  );
}

/** A riveted nameplate: brushed plate, printed text, a rivet at each end. Faces +z. */
export function Nameplate({ text, pos, w = 0.12, h = 0.04, rot, fg = '#11161d', bg = '#d9dde2' }: { text: string; pos: [number, number, number]; w?: number; h?: number; rot?: [number, number, number]; fg?: string; bg?: string }) {
  if (lowDetail()) return <Label text={text} pos={pos} w={w * 0.86} h={h * 0.78} fg={fg} bg={bg} rot={rot} />;
  return (
    <group position={pos} rotation={rot}>
      <mesh material={surface('brushedSteel')}><boxGeometry args={[w, h, 0.0015]} /></mesh>
      <Label text={text} pos={[0, 0, 0.001]} w={w * 0.86} h={h * 0.78} fg={fg} bg={bg} />
      <ScrewHead pos={[-w / 2 + h * 0.16, 0, 0.001]} r={h * 0.07} />
      <ScrewHead pos={[w / 2 - h * 0.16, 0, 0.001]} r={h * 0.07} />
    </group>
  );
}

/**
 * A cable that hangs between two points like a real one (a catenary-shaped sag), with a ferrule at each end.
 * `sag` is how far the middle drops, in meters.
 */
export function Cable({ from, to, color = '#1f2328', r = 0.006, sag = 0.06, ferrules = true }: { from: [number, number, number]; to: [number, number, number]; color?: string; r?: number; sag?: number; ferrules?: boolean }) {
  const geo = useMemo(() => {
    const a = new Vector3(...from), b = new Vector3(...to);
    const pts = Array.from({ length: 9 }, (_, i) => {
      const t = i / 8;
      const p = a.clone().lerp(b, t);
      // cosh-shaped droop: 0 at the ends, `sag` in the middle
      p.y -= sag * (1 - (Math.cosh((t - 0.5) * 2.4) - 1) / (Math.cosh(1.2) - 1));
      return p;
    });
    return new TubeGeometry(new CatmullRomCurve3(pts), 16, r, 6, false);
  }, [from, to, r, sag]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group>
      <mesh geometry={geo} material={surface('rubber', color)} />
      {ferrules && [from, to].map((p, i) => (
        <mesh key={i} position={p} material={surface('tinned')}><sphereGeometry args={[r * 1.5, 8, 6]} /></mesh>
      ))}
    </group>
  );
}

/** `overlay` draws the label on top of everything (call-out names in exploded views). */
export function Label({ text, pos, w = 0.06, h = 0.015, fg, bg, rot, overlay }: { text: string; pos: [number, number, number]; w?: number; h?: number; fg?: string; bg?: string; rot?: [number, number, number]; overlay?: boolean }) {
  const tex = useMemo(() => labelTexture(text, { fg: fg ?? '#11161d', bg: bg ?? '#f2f4f7', w: Math.round(w * 4000), h: Math.round(h * 4000), size: Math.round(h * 4000 * 0.62) }), [text, fg, bg, w, h]);
  return (
    <mesh position={pos} rotation={rot} renderOrder={overlay ? 10 : 0}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthTest={!overlay} />
    </mesh>
  );
}

/** An LED with a fake-bloom halo. `read` is polled every frame. */
export function Led({ pos, color, read, size = 0.007, halo = 0.05 }: { pos: [number, number, number]; color: string; read: () => boolean; size?: number; halo?: number }) {
  const mat = useRef<MeshStandardMaterial>(null);
  const spr = useRef<Sprite>(null);
  const htex = useMemo(() => haloTexture(), []);
  useFrame(() => {
    const on = read();
    if (mat.current) {
      mat.current.emissiveIntensity = on ? 3 : 0;
      mat.current.color.set(on ? color : '#3a4250');
    }
    if (spr.current) spr.current.visible = on;
  });
  return (
    <group position={pos}>
      <mesh>
        <boxGeometry args={[size, size, 0.004]} />
        <meshStandardMaterial ref={mat} color="#3a4250" emissive={color} emissiveIntensity={0} toneMapped={false} />
      </mesh>
      <sprite ref={spr} scale={[halo, halo, 1]} position={[0, 0, 0.004]}>
        <spriteMaterial map={htex} color={color} blending={AdditiveBlending} depthWrite={false} transparent opacity={0.85} />
      </sprite>
    </group>
  );
}

