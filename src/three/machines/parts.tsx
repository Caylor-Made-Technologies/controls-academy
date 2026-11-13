/**
 * Procedural building blocks for the machine scenes. Every moving part reads the live engine through a
 * `read` function polled in useFrame, so the picture is the simulation, not a canned animation.
 * Sizes are meters. Spin speeds are shown slowed down (a 1,780 rpm shaft would just look still).
 */
import { Billboard, Edges } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AdditiveBlending, CanvasTexture, CatmullRomCurve3, DoubleSide, Quaternion, RepeatWrapping, SRGBColorSpace, Vector3,
  type Group, type Mesh, type MeshStandardMaterial, type Sprite, type Texture,
} from 'three';
import { Box, Label, Nameplate, ScrewHead } from '../kit';
import { surface } from '../materials';
import { haloTexture } from '../textures';
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
  const fins = useMemo(() => Array.from({ length: 14 }, (_, i) => (i / 14) * Math.PI * 2), []);
  const paint = surface('enamel', color);
  return (
    <group position={pos} rotation={rot} scale={scale}>
      {/* frame with cooling fins */}
      <mesh rotation={[0, 0, Math.PI / 2]} material={paint}><cylinderGeometry args={[0.13, 0.13, 0.34, 28]} /></mesh>
      {fins.map((a) => (
        <mesh key={a} position={[0, Math.sin(a) * 0.136, Math.cos(a) * 0.136]} rotation={[-a, 0, 0]} material={paint}>
          <boxGeometry args={[0.3, 0.014, 0.012]} />
        </mesh>
      ))}
      {/* end bells: drive end (shaft side) and the fan cowl at the back */}
      <mesh position={[0.185, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={paint}><cylinderGeometry args={[0.105, 0.138, 0.04, 28]} /></mesh>
      <mesh position={[0.21, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={surface('castIron')}><cylinderGeometry args={[0.05, 0.06, 0.02, 20]} /></mesh>
      <mesh position={[-0.215, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={surface('plasticMatte', '#2a313b')}><cylinderGeometry args={[0.136, 0.13, 0.1, 28]} /></mesh>
      <mesh position={[-0.268, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={surface('castIron')}><cylinderGeometry args={[0.09, 0.09, 0.006, 20]} /></mesh>
      {/* conduit box with its cover screws, and the nameplate */}
      <Box size={[0.12, 0.07, 0.11]} pos={[0.02, 0.165, 0]} color={color} s="enamel" />
      <Box size={[0.105, 0.008, 0.095]} pos={[0.02, 0.204, 0]} color="#3a4049" s="castIron" />
      {[[-0.04, -0.035], [0.04, -0.035], [-0.04, 0.035], [0.04, 0.035]].map(([x, z]) => <ScrewHead key={`${x}${z}`} pos={[0.02 + x, 0.209, z]} r={0.006} rot={[-Math.PI / 2, 0, 0]} />)}
      <Nameplate text="3~ MOTOR" pos={[-0.02, 0.02, 0.133]} w={0.11} h={0.045} />
      {/* feet, bolted down */}
      <Box size={[0.3, 0.022, 0.28]} pos={[0, -0.148, 0]} color="#2a313b" s="castIron" />
      {[[-0.11, -0.115], [0.11, -0.115], [-0.11, 0.115], [0.11, 0.115]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, -0.13, z]} material={surface('galvanized')}><cylinderGeometry args={[0.012, 0.012, 0.016, 6]} /></mesh>
      ))}
      {/* lifting eye */}
      <mesh position={[-0.08, 0.15, 0]} rotation={[0, Math.PI / 2, 0]} material={surface('galvanized')}><torusGeometry args={[0.018, 0.005, 6, 14]} /></mesh>
      {/* shaft with a painted key so you can see it turn */}
      <group position={[0.25, 0, 0]}>
        <Spinner rps={rps} axis="x">
          <mesh rotation={[0, 0, Math.PI / 2]} material={surface('machinedSteel')}><cylinderGeometry args={[0.025, 0.025, 0.1, 18]} /></mesh>
          <mesh position={[0.02, 0.026, 0]} material={surface('enamel', PAINT.safety)}><boxGeometry args={[0.05, 0.008, 0.012]} /></mesh>
        </Spinner>
      </group>
    </group>
  );
}

/** A pilot light (or stack-light segment): emissive when `on()`. */
export function Lamp({ pos, color, on, r = 0.03, rot = [Math.PI / 2, 0, 0] }: { pos: [number, number, number]; color: string; on: () => boolean; r?: number; rot?: [number, number, number] }) {
  const m = useRef<MeshStandardMaterial>(null);
  const glow = useRef<Sprite>(null);
  const halo = useMemo(() => haloTexture(), []);
  // Lit: the lens itself is bright and a soft sprite stands in for bloom (no post-processing pass needed).
  useFrame(() => {
    const lit = on();
    if (m.current) m.current.emissiveIntensity = lit ? 2.6 : 0.04;
    if (glow.current) glow.current.visible = lit;
  });
  return (
    <group position={pos}>
      <mesh rotation={rot} material={surface('machinedSteel')}><cylinderGeometry args={[r * 1.18, r * 1.18, r * 0.35, 24]} /></mesh>
      <mesh rotation={rot}>
        <cylinderGeometry args={[r, r * 0.96, r * 0.7, 24]} />
        <meshStandardMaterial ref={m} color="#2a2f36" emissive={color} emissiveIntensity={0} toneMapped={false} roughness={0.25} />
      </mesh>
      <sprite ref={glow} scale={[r * 7, r * 7, 1]} visible={false}>
        <spriteMaterial map={halo} color={color} blending={AdditiveBlending} depthWrite={false} transparent opacity={0.7} />
      </sprite>
    </group>
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
  // Flanges at both ends, so a run of pipe reads as fitted sections.
  return (
    <group position={mid} quaternion={quat}>
      <mesh material={surface('enamel', color)}><cylinderGeometry args={[r, r, len, 16]} /></mesh>
      {len > r * 6 && [-1, 1].map((e) => (
        <mesh key={e} position={[0, e * (len / 2 - r * 0.25), 0]} material={surface('galvanized')}><cylinderGeometry args={[r * 1.45, r * 1.45, r * 0.5, 16]} /></mesh>
      ))}
    </group>
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
      <mesh position={[0, h / 2, 0]} material={surface('glass', shell, 0.26)}>
        <cylinderGeometry args={[r, r, h, 40, 1, true]} />
      </mesh>
      {/* rolled steel rims top and bottom, and a base ring */}
      <mesh position={[0, h + 0.012, 0]} material={surface('brushedSteel')}><cylinderGeometry args={[r * 1.03, r * 1.03, 0.03, 40]} /></mesh>
      <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]} material={surface('brushedSteel')}><torusGeometry args={[r * 1.01, 0.012, 8, 48]} /></mesh>
      <mesh position={[0, 0.015, 0]} material={surface('castIron')}><cylinderGeometry args={[r * 1.05, r * 1.08, 0.03, 40]} /></mesh>
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
      {/* cast body with a flange each side, polished stem, yoke and a painted diaphragm actuator */}
      <mesh material={surface('castIron', '#4a5360')}><sphereGeometry args={[0.07, 20, 14]} /></mesh>
      {[-1, 1].map((e) => <mesh key={e} position={[e * 0.085, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={surface('galvanized')}><cylinderGeometry args={[0.062, 0.062, 0.02, 18]} /></mesh>)}
      <mesh position={[0, 0.12, 0]} material={surface('machinedSteel')}><cylinderGeometry args={[0.012, 0.012, 0.12, 10]} /></mesh>
      {[-1, 1].map((e) => <mesh key={e} position={[e * 0.04, 0.15, 0]} material={surface('castIron', '#4a5360')}><boxGeometry args={[0.012, 0.17, 0.02]} /></mesh>)}
      <mesh position={[0, 0.27, 0]} material={surface('enamel', '#5b6b80')}><cylinderGeometry args={[0.1, 0.105, 0.05, 28]} /></mesh>
      <mesh position={[0, 0.305, 0]} material={surface('enamel', '#5b6b80')}><cylinderGeometry args={[0.07, 0.1, 0.025, 28]} /></mesh>
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
  const [w, h, d] = size;
  const z = d / 2;
  const big = h > 0.5;
  return (
    <group position={pos}>
      <Box size={size} pos={[0, h / 2, 0]} color={color} s="powderCoat" />
      {/* door seam: a dark hairline gap around the door (scene parts mounted on the face stay in front of it);
          hinges on the left, a handle or a quarter-turn latch on the right */}
      {[[0, h * 0.97, w * 0.94, 0.004], [0, h * 0.03, w * 0.94, 0.004], [-w * 0.47, h / 2, 0.004, h * 0.94], [w * 0.47, h / 2, 0.004, h * 0.94]].map(([x, y, sw, sh], i) => (
        <mesh key={i} position={[x, y, z + 0.0008]} material={surface('rubber')}><boxGeometry args={[sw, sh, 0.001]} /></mesh>
      ))}
      {big && [0.22, 0.78].map((f) => <mesh key={f} position={[-w * 0.47 - 0.006, h * f, z + 0.004]} material={surface('galvanized')}><cylinderGeometry args={[0.008, 0.008, 0.06, 8]} /></mesh>)}
      {big && <Box size={[0.018, 0.09, 0.016]} pos={[w * 0.43, h * 0.5, z + 0.01]} color="#1f2328" s="plasticGloss" />}
      {!big && <ScrewHead pos={[w * 0.43, h * 0.5, z + 0.002]} r={Math.min(0.012, w * 0.04)} />}
      {label && <Nameplate text={label} pos={[0, h - Math.max(0.05, h * 0.12), z + 0.002]} w={Math.min(w * 0.8, label.length * 0.03 + 0.08)} h={0.055} fg="#e8f1ff" bg="#1e3a8a" />}
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
