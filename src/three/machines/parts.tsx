/**
 * Procedural building blocks for the machine scenes. Every moving part reads the live engine through a
 * `read` function polled in useFrame, so the picture is the simulation, not a canned animation.
 * Sizes are meters. Spin speeds are shown slowed down (a 1,780 rpm shaft would just look still).
 */
import { Billboard, Edges } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  CanvasTexture, CatmullRomCurve3, DoubleSide, Quaternion, RepeatWrapping, SRGBColorSpace, Vector3,
  type Group, type Mesh, type MeshStandardMaterial, type Texture,
} from 'three';
import { Box, Label } from '../kit';
import { floorTexture } from '../textures';
import type { Look } from '../look';

export const PAINT = {
  motor: '#2f5d8a', steel: '#b8c0c8', galv: '#9aa3ad', dark: '#2b3240', cabinet: '#c9ced4', safety: '#f5c400',
  pipe: '#7b8794', water: '#3b82c4', flour: '#efe6d2', rubber: '#1f2328', copper: '#c7804a', green: '#16a34a',
};

/** Visual spin: real rev/s slowed so motion reads on screen (and never strobes backwards). */
export function visualRps(realRps: number): number {
  const a = Math.abs(realRps);
  const v = Math.min(1.6, a * 0.08 + (a > 0.05 ? 0.15 : 0));
  return Math.sign(realRps) * v;
}

/** Rotates its children about a local axis at `rps()` (real rev/s, shown slowed). */
export function Spinner({ rps, axis = 'x', children }: { rps: () => number; axis?: 'x' | 'y' | 'z'; children: ReactNode }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation[axis] += visualRps(rps()) * Math.PI * 2 * Math.min(dt, 0.1);
  });
  return <group ref={g}>{children}</group>;
}

/** Tap target with hover/selected outline and a floating name tag. */
export function Pick({ id, label, size, pos = [0, 0, 0], selected, onPick, children }: {
  id: string; label: string; size: [number, number, number]; pos?: [number, number, number];
  selected: boolean; onPick: (id: string, at?: [number, number, number]) => void; children: ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const on = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onPick(id, [e.point.x, e.point.y, e.point.z]); };
  useEffect(() => () => { document.body.style.cursor = ''; }, []);
  return (
    <group
      onClick={on}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHover(true); }}
      onPointerOut={() => { document.body.style.cursor = ''; setHover(false); }}
      onPointerUp={(e) => { if (e.pointerType !== 'mouse') setHover(false); }}
      onPointerCancel={() => setHover(false)}
    >
      {children}
      {(selected || hover) && (
        <>
          <mesh position={pos} raycast={() => null}>
            <boxGeometry args={size} />
            <meshBasicMaterial color="#3d8bff" transparent opacity={selected ? 0.1 : 0.04} depthWrite={false} />
            <Edges color="#3d8bff" transparent opacity={selected ? 1 : 0.6} />
          </mesh>
          <Billboard position={[pos[0], pos[1] + size[1] / 2 + 0.09, pos[2]]}>
            <Label text={label} pos={[0, 0, 0]} w={Math.max(0.25, label.length * 0.028)} h={0.07} fg="#ffffff" bg={selected ? '#1b63eb' : '#1a2230'} />
          </Billboard>
        </>
      )}
    </group>
  );
}

/** TEFC induction motor lying along +x (shaft end at +x). `rps` is shaft rev/s. */
export function Motor({ pos, rot = [0, 0, 0], rps, scale = 1, color = PAINT.motor }: { pos: [number, number, number]; rot?: [number, number, number]; rps: () => number; scale?: number; color?: string }) {
  const fins = useMemo(() => Array.from({ length: 9 }, (_, i) => (i / 9) * Math.PI * 2), []);
  return (
    <group position={pos} rotation={rot} scale={scale}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.13, 0.13, 0.36, 28]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.5} />
      </mesh>
      {fins.map((a) => (
        <mesh key={a} position={[0, Math.sin(a) * 0.135, Math.cos(a) * 0.135]} rotation={[-a, 0, 0]} castShadow>
          <boxGeometry args={[0.34, 0.012, 0.02]} />
          <meshStandardMaterial color={color} metalness={0.35} roughness={0.5} />
        </mesh>
      ))}
      {/* fan cover at the back */}
      <mesh position={[-0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.125, 0.12, 0.09, 28]} />
        <meshStandardMaterial color="#3b4350" metalness={0.5} roughness={0.45} />
      </mesh>
      {/* conduit box */}
      <Box size={[0.12, 0.08, 0.1]} pos={[0.02, 0.16, 0.05]} color={color} metal={0.3} rough={0.5} />
      {/* feet */}
      <Box size={[0.3, 0.03, 0.26]} pos={[0, -0.145, 0]} color="#2a313b" metal={0.4} rough={0.6} />
      {/* shaft with a painted key so you can see it turn */}
      <group position={[0.23, 0, 0]}>
        <Spinner rps={rps} axis="x">
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.1, 16]} />
            <meshStandardMaterial color="#d1d5db" metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[0.02, 0.026, 0]}><boxGeometry args={[0.05, 0.008, 0.012]} /><meshStandardMaterial color={PAINT.safety} /></mesh>
        </Spinner>
      </group>
    </group>
  );
}

/** A pilot light (or stack-light segment): emissive when `on()`. */
export function Lamp({ pos, color, on, r = 0.03, rot = [Math.PI / 2, 0, 0] }: { pos: [number, number, number]; color: string; on: () => boolean; r?: number; rot?: [number, number, number] }) {
  const m = useRef<MeshStandardMaterial>(null);
  useFrame(() => { if (m.current) m.current.emissiveIntensity = on() ? 2.6 : 0.03; });
  return (
    <mesh position={pos} rotation={rot}>
      <cylinderGeometry args={[r, r, r * 0.6, 24]} />
      <meshStandardMaterial ref={m} color="#2a2f36" emissive={color} emissiveIntensity={0} toneMapped={false} roughness={0.3} />
    </mesh>
  );
}

/** Straight pipe between two points. */
export function Pipe({ from, to, r = 0.04, color = PAINT.pipe }: { from: [number, number, number]; to: [number, number, number]; r?: number; color?: string }) {
  const { mid, len, quat } = useMemo(() => {
    const a = new Vector3(...from), b = new Vector3(...to);
    const dir = b.clone().sub(a);
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize());
    return { mid: a.add(b).multiplyScalar(0.5), len: dir.length(), quat: q };
  }, [from, to]);
  return (
    <mesh position={mid} quaternion={quat} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, len, 16]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
    </mesh>
  );
}

/** Vertical tank with a see-through shell and a live liquid level (0…1 of `h`). */
export function Tank({ pos, r, h, level, liquid = PAINT.water, shell = '#cfd6de' }: { pos: [number, number, number]; r: number; h: number; level: () => number; liquid?: string; shell?: string }) {
  const fill = useRef<Mesh>(null);
  useFrame(() => {
    const f = Math.max(0.001, Math.min(1, level()));
    if (fill.current) { fill.current.scale.y = f; fill.current.position.y = (f * h) / 2; }
  });
  return (
    <group position={pos}>
      <mesh ref={fill} position={[0, h / 4, 0]}>
        <cylinderGeometry args={[r * 0.97, r * 0.97, h, 40]} />
        <meshStandardMaterial color={liquid} roughness={0.15} metalness={0.1} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, h, 40, 1, true]} />
        <meshStandardMaterial color={shell} metalness={0.5} roughness={0.35} transparent opacity={0.28} side={DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, h + 0.01, 0]} castShadow><cylinderGeometry args={[r * 1.02, r * 1.02, 0.02, 40]} /><meshStandardMaterial color={shell} metalness={0.6} roughness={0.35} /></mesh>
      <mesh position={[0, 0.01, 0]} receiveShadow><cylinderGeometry args={[r * 1.02, r * 1.02, 0.02, 40]} /><meshStandardMaterial color="#6b7280" metalness={0.5} roughness={0.5} /></mesh>
      {/* level marks every quarter */}
      {[0.25, 0.5, 0.75].map((f) => (
        <mesh key={f} position={[0, f * h, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r * 1.005, 0.004, 6, 48]} /><meshBasicMaterial color="#94a3b8" /></mesh>
      ))}
    </group>
  );
}

/** Control valve: body in the line along x, actuator on top; the stem indicator rides with `open()` 0…1. */
export function Valve({ pos, open, failOpen = false }: { pos: [number, number, number]; open: () => number; failOpen?: boolean }) {
  const stem = useRef<Mesh>(null);
  useFrame(() => { if (stem.current) stem.current.position.y = 0.16 + Math.max(0, Math.min(1, open())) * 0.06; });
  return (
    <group position={pos}>
      <mesh castShadow><sphereGeometry args={[0.07, 20, 14]} /><meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[0.012, 0.012, 0.12, 10]} /><meshStandardMaterial color="#d1d5db" metalness={0.9} roughness={0.25} /></mesh>
      <mesh position={[0, 0.27, 0]} castShadow><cylinderGeometry args={[0.1, 0.1, 0.07, 28]} /><meshStandardMaterial color="#64748b" metalness={0.3} roughness={0.45} /></mesh>
      {/* Fail action tag, as on a P&ID: FO = fails open, FC = fails closed (on loss of air or signal). */}
      <Label text={failOpen ? 'FO' : 'FC'} pos={[0, 0.27, 0.102]} w={0.07} h={0.04} fg="#111" bg="#f8fafc" />
      <mesh ref={stem} position={[0, 0.16, 0.02]}><boxGeometry args={[0.04, 0.012, 0.012]} /><meshStandardMaterial color={PAINT.safety} /></mesh>
    </group>
  );
}

/** Small 2-line text display (drive keypad, HMI tile). Redraws its texture only when the text changes. */
export function Display({ pos, w, h, text, rot, fg = '#7dffb0', bg = '#0b1410' }: { pos: [number, number, number]; w: number; h: number; text: () => string; rot?: [number, number, number]; fg?: string; bg?: string }) {
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = Math.round(256 * (h / w));
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return { canvas: c, tex: t as Texture };
  }, [w, h]);
  useEffect(() => () => tex.dispose(), [tex]);
  const last = useRef('');
  useFrame(() => {
    const s = text();
    if (s === last.current) return;
    last.current = s;
    const g = canvas.getContext('2d');
    if (!g) return;
    g.fillStyle = bg; g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = fg;
    const lines = s.split('\n');
    let size = Math.floor(canvas.height / (lines.length + 0.6));
    const font = (n: number) => `700 ${n}px ui-monospace, Menlo, Consolas, monospace`;
    g.font = font(size);
    // shrink until the widest line fits
    while (size > 8 && Math.max(...lines.map((l) => g.measureText(l).width)) > canvas.width - 20) { size--; g.font = font(size); }
    g.textBaseline = 'middle';
    lines.forEach((ln, i) => g.fillText(ln, 10, (i + 0.8) * (canvas.height / (lines.length + 0.6))));
    tex.needsUpdate = true;
  });
  return (
    <mesh position={pos} rotation={rot}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

/** Axial fan wheel (blades in the y–z plane, turning about x). */
export function FanWheel({ rps, r = 0.2, blades = 6 }: { rps: () => number; r?: number; blades?: number }) {
  const list = useMemo(() => Array.from({ length: blades }, (_, i) => (i / blades) * Math.PI * 2), [blades]);
  return (
    <Spinner rps={rps} axis="x">
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r * 0.18, r * 0.18, 0.06, 20]} /><meshStandardMaterial color="#374151" metalness={0.6} roughness={0.35} /></mesh>
      {list.map((a) => (
        <group key={a} rotation={[-a, 0, 0]} position={[0, Math.sin(a) * r * 0.55, Math.cos(a) * r * 0.55]}>
          {/* blade lies along its radial (local z) axis, pitched about it so it would move air */}
          <mesh rotation={[0, 0, 0.5]}>
            <boxGeometry args={[0.012, r * 0.3, r * 0.75]} />
            <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.3} side={DoubleSide} />
          </mesh>
        </group>
      ))}
    </Spinner>
  );
}

/** Screw-conveyor flight (helix) along x, turning about x. */
export function Screw({ length, r, rps }: { length: number; r: number; rps: () => number }) {
  const curve = useMemo(() => {
    const pts: Vector3[] = [];
    const turns = Math.max(1, Math.round(length / (r * 1.6)));
    for (let i = 0; i <= turns * 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push(new Vector3(-length / 2 + (i / (turns * 24)) * length, Math.sin(a) * r, Math.cos(a) * r));
    }
    return new CatmullRomCurve3(pts);
  }, [length, r]);
  return (
    <Spinner rps={rps} axis="x">
      <mesh castShadow><tubeGeometry args={[curve, 400, r * 0.08, 6, false]} /><meshStandardMaterial color="#9aa3ad" metalness={0.8} roughness={0.3} /></mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r * 0.18, r * 0.18, length, 12]} /><meshStandardMaterial color="#6b7280" metalness={0.8} roughness={0.3} /></mesh>
    </Spinner>
  );
}

/** Belt surface whose texture slides at `speed()` m/s along +x. */
export function Belt({ length, width, speed, pos }: { length: number; width: number; speed: () => number; pos: [number, number, number] }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#1f2328'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#2f353d'; g.fillRect(0, 0, 10, 64);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(length / 0.25, 1);
    return t;
  }, [length]);
  useEffect(() => () => tex.dispose(), [tex]);
  useFrame((_, dt) => { tex.offset.x -= (speed() * Math.min(dt, 0.1)) / 0.25; });
  return (
    <mesh position={pos} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[length, width]} />
      <meshStandardMaterial map={tex} roughness={0.85} />
    </mesh>
  );
}

/** Photo-eye beam across a belt: bright when made, dim when something blocks it. */
export function Beam({ from, to, blocked }: { from: [number, number, number]; to: [number, number, number]; blocked: () => boolean }) {
  const m = useRef<MeshStandardMaterial>(null);
  useFrame(() => { if (m.current) m.current.opacity = blocked() ? 0.08 : 0.75; });
  const a = new Vector3(...from), b = new Vector3(...to);
  const len = a.distanceTo(b);
  return (
    <mesh position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.004, 0.004, len, 6]} />
      <meshStandardMaterial ref={m} color="#ff4d4d" emissive="#ff4d4d" emissiveIntensity={2} toneMapped={false} transparent opacity={0.75} />
    </mesh>
  );
}

/** Generic sheet-steel cabinet with a name plate on the front. */
export function Cabinet({ pos, size, label, color = PAINT.cabinet, children }: { pos: [number, number, number]; size: [number, number, number]; label?: string; color?: string; children?: ReactNode }) {
  return (
    <group position={pos}>
      <Box size={size} pos={[0, size[1] / 2, 0]} color={color} metal={0.45} rough={0.45} />
      {label && <Label text={label} pos={[0, size[1] - 0.06, size[2] / 2 + 0.002]} w={Math.min(size[0] * 0.8, label.length * 0.03 + 0.06)} h={0.055} fg="#e8f1ff" bg="#1e3a8a" />}
      {children}
    </group>
  );
}

/** Floor and back wall in the theme's colors. */
export function Room({ look, size = 12 }: { look: Look; size?: number }) {
  const floor = useMemo(() => floorTexture(), []);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial map={floor} color={look.floor} roughness={0.92} />
      </mesh>
      <mesh position={[0, size / 4, -2.2]} receiveShadow>
        <planeGeometry args={[size, size / 2]} />
        <meshStandardMaterial color={look.wall} roughness={1} />
      </mesh>
    </>
  );
}
