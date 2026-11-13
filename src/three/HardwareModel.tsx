/**
 * Builds a PLC / remote I/O / logic-module look-alike from a parametric shape in
 * src/content/hardware.ts. Generic, simplified hardware: neutral colors, no logos.
 * LEDs read a `live` source every frame (the engine in the simulator, a demo pattern in the library).
 */
import { Billboard, Edges, Instance, Instances } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { MathUtils, type Group } from 'three';
import { BODY_COLORS, UNIT_INFO, type HwShape, type HwUnit } from '../content/hardware';
import { Box, Led } from './kit';
import { doorLabelTexture, hmiTexture, labelTexture } from './textures';

export interface HwLive {
  di(i: number): boolean;
  do(i: number): boolean;
  run(): boolean;
  force(): boolean;
  fault(): boolean;
  power(): boolean;
}

const MM = 0.001;
const PX_PER_M = 14000;
const C = { screw: '#b8c0c8', term: '#1f242b', door: '#5b6573', rail: '#9aa3ad', lcd: '#9fb5a0', port: '#0b0f14', select: '#3d8bff', white: '#eef1f4' };

/** Canvas label sized in meters. */
function HLabel({ text, pos, w, h, fg, bg }: { text: string; pos: [number, number, number]; w: number; h: number; fg: string; bg: string }) {
  const tex = useMemo(() => labelTexture(text, { fg, bg, w: Math.max(32, Math.round(w * PX_PER_M)), h: Math.max(12, Math.round(h * PX_PER_M)), size: Math.round(h * PX_PER_M * 0.64) }), [text, fg, bg, w, h]);
  return (
    <mesh position={pos} raycast={() => null}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

interface Layout { u: HwUnit; i: number; x: number; w: number; h: number; d: number }

export function layoutShape(shape: HwShape): { items: Layout[]; width: number; height: number; depth: number } {
  let x = 0;
  const items = shape.units.map((u, i) => {
    const w = u.w * MM;
    const it = { u, i, x: x + w / 2, w, h: (u.h ?? shape.h) * MM, d: (u.kind === 'end' ? shape.d * 0.9 : u.kind === 'hmi' ? shape.d : shape.d) * MM };
    x += w + 0.0004;
    return it;
  });
  return { items, width: x, height: shape.h * MM, depth: shape.d * MM };
}

export function HardwareModel({ shape, live, selected, onSelect, fit, maxScale = Infinity, labelText, spread = false, tags = false }: {
  shape: HwShape;
  live: HwLive;
  selected?: number | null;
  onSelect?: (unit: number) => void;
  /** Scale uniformly to fit this [width, height] in meters, centered on the origin. */
  fit?: [number, number];
  /** Never scale above this (keeps small PLCs life-size in the panel). */
  maxScale?: number;
  /** Slide the modules apart so each one stands alone. */
  spread?: boolean;
  /** Floating name tag over the hovered / selected module. */
  tags?: boolean;
  /** Optional override for the CPU label (e.g. the platform name in the simulator). */
  labelText?: string;
}) {
  const col = BODY_COLORS[shape.body];
  const { items, width, height, depth } = useMemo(() => layoutShape(shape), [shape]);
  const [hover, setHover] = useState<number | null>(null);
  const doorTex = useMemo(() => doorLabelTexture(), []);
  const chassis = shape.mount === 'chassis';
  const zFront = (d: number) => (chassis ? 0.006 : 0) + d;
  const scale = fit ? Math.min(maxScale, fit[0] / (width + (chassis ? 0.012 : 0.02)), fit[1] / (height + (chassis ? 0.024 : 0))) : 1;

  // Collect screws and I/O LED indices for the whole model.
  const { screws, ioIndex } = useMemo(() => {
    const all: [number, number, number][][] = [];
    let s: [number, number, number][] = [];
    const idx: { di: number[]; do: number[] }[] = [];
    let nIn = 0;
    let nOut = 0;
    for (const it of items) {
      const { u, x, w, h, d } = it;
      s = [];
      all.push(s);
      const z = zFront(d) + 0.001;
      const nI = u.inputs ?? 0;
      const nO = u.outputs ?? 0;
      idx.push({ di: Array.from({ length: nI }, () => nIn++), do: Array.from({ length: nO }, () => nOut++) });
      if (u.term === 'top-bottom' && !u.door) {
        const n = Math.max(2, Math.floor(w / 0.0068));
        for (let k = 0; k < n; k++) {
          const sx = x - w / 2 + (k + 0.5) * (w / n);
          s.push([sx, h / 2 - 0.0062, z + 0.002], [sx, -h / 2 + 0.0062, z + 0.002]);
        }
      } else if (u.term === 'front' && !u.door) {
        const rows = Math.max(4, Math.floor((h * 0.4) / 0.0065));
        const cols = w >= 0.03 ? 2 : 1;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) s.push([x + (cols === 2 ? (c - 0.5) * w * 0.42 : 0), -h * 0.06 - r * 0.0065, z + 0.006]);
      }
    }
    return { screws: all, ioIndex: idx };
    // zFront depends only on chassis, which is part of shape
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, chassis]);

  // Spread: each module eases to its own offset (module i moves i × gap, then the whole row re-centers).
  const unitRefs = useRef<(Group | null)[]>([]);
  const gap = 0.012;
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 7);
    const n = items.length;
    unitRefs.current.forEach((g, i) => {
      if (!g) return;
      g.position.x = MathUtils.lerp(g.position.x, spread ? i * gap - ((n - 1) * gap) / 2 : 0, k);
      // In a chassis the modules also slide forward, as if pulled half out of their slots.
      if (chassis) g.position.z = MathUtils.lerp(g.position.z, spread ? 0.045 : 0, k);
    });
  });

  // Vent slots on the top of every module (one instanced mesh for the whole model).
  const vents = useMemo(() => {
    return items.map((it) => {
      const v: [number, number, number][] = [];
      if (it.u.kind === 'blank' || it.u.kind === 'end' || it.u.kind === 'hmi') return v;
      const n = Math.max(1, Math.floor((it.w - 0.004) / 0.0042));
      const z0 = (chassis ? 0.006 : 0);
      for (let r = 0; r < 2; r++) for (let k = 0; k < n; k++) v.push([it.x - ((n - 1) * 0.0042) / 2 + k * 0.0042, it.h / 2 + 0.0002, z0 + it.d * (0.35 + r * 0.28)]);
      return v;
    });
  }, [items, chassis]);

  const click = (i: number) => (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect?.(i); };

  return (
    <group scale={scale} position={[-(width / 2) * scale, 0, 0]}>
      {/* mounting: DIN rail or chassis */}
      {shape.mount === 'plate' && (
        <Box size={[width + 0.12, height + 0.08, 0.002]} pos={[width / 2, 0, -0.002]} color="#9fa8b2" s="galvanized" round={0} />
      )}
      {shape.mount === 'panel' && (
        <Box size={[width + 0.07, height + 0.07, 0.002]} pos={[width / 2, 0, depth - 0.007]} color="#b9c0c7" metal={0.2} rough={0.55} round={0} />
      )}
      {shape.mount === 'din' && (
        <group>
          <Box size={[width + 0.03, 0.027, 0.0012]} pos={[width / 2, 0, -0.0075]} color={C.rail} metal={0.85} rough={0.32} round={0} />
          {[1, -1].map((sg) => <Box key={sg} size={[width + 0.03, 0.005, 0.0075]} pos={[width / 2, sg * 0.0155, -0.004]} color={C.rail} metal={0.85} rough={0.28} round={0} />)}
        </group>
      )}
      {chassis && (
        <group>
          <Box size={[width + 0.012, height + 0.024, 0.008]} pos={[width / 2, 0, 0.002]} color="#3b414b" metal={0.5} rough={0.5} round={0} />
          {[-1, 1].map((s) => <Box key={s} size={[0.004, height + 0.024, depth * 0.9]} pos={[width / 2 + s * (width / 2 + 0.004), 0, depth * 0.45]} color="#59616c" metal={0.6} rough={0.4} round={0} />)}
          {[-1, 1].map((s) => <Box key={`r${s}`} size={[width + 0.012, 0.006, depth * 0.35]} pos={[width / 2, s * (height / 2 + 0.009), depth * 0.17]} color="#59616c" metal={0.6} rough={0.4} round={0} />)}
        </group>
      )}

      {items.map((it) => {
        const { u, i, x, w, h, d } = it;
        const z = zFront(d);
        const zc = (chassis ? 0.006 : 0) + d / 2;
        const isSel = selected === i || hover === i;
        const slim = w < 0.02;
        const text = u.kind === 'cpu' && labelText ? labelText : u.label;
        const io = ioIndex[i];
        const status = ['cpu', 'safety', 'psu', 'comm', 'coupler', 'pc', 'brick', 'logic', 'bas'].includes(u.kind);
        return (
          <group
            key={i}
            ref={(g) => { unitRefs.current[i] = g; }}
            onClick={onSelect ? click(i) : undefined}
            onPointerOver={onSelect ? (e) => { e.stopPropagation(); setHover(i); document.body.style.cursor = 'pointer'; } : undefined}
            onPointerOut={onSelect ? () => { setHover(null); document.body.style.cursor = ''; } : undefined}
          >
            {u.kind === 'hmi' ? (
              <>
                <Box size={[w, h, 0.012]} pos={[x, 0, d]} color={col.body} />
                <Box size={[w * 0.82, h * 0.66, d * 0.7]} pos={[x, 0, d * 0.4]} color={col.face} />
                <HmiScreen w={w * 0.86} h={h * 0.76} pos={[x, 0.004, d + 0.0062]} />
                {/* glass reflection strip */}
                <mesh position={[x - w * 0.18, h * 0.1, d + 0.0066]} rotation={[0, 0, -0.5]} raycast={() => null}>
                  <planeGeometry args={[w * 0.08, h * 1.1]} />
                  <meshBasicMaterial color="#ffffff" transparent opacity={0.04} depthWrite={false} />
                </mesh>
              </>
            ) : (
              <>
                <Box size={[w - 0.0004, h, u.kind === 'blank' ? d * 0.96 : d]} pos={[x, 0, zc]} color={u.kind === 'blank' ? col.face : col.body} />
                {/* molded front face plate, slightly proud, catches the key light */}
                {u.kind === 'drive' && <DriveFace x={x} w={w} h={h} d={d} z={z} live={live} />}
                {u.kind === 'relay' && <RelayFace x={x} w={w} h={h} z={z} live={live} />}
                {u.kind !== 'blank' && u.kind !== 'end' && u.kind !== 'drive' && (
                  <Box size={[w - 0.0026, h - 0.004, 0.0012]} pos={[x, 0, z - 0.0004]} color={col.face} rough={0.45} round={Math.min(0.0006, w * 0.03)} />
                )}
              </>
            )}

            {/* top label */}
            {text && u.kind !== 'hmi' && (
              <HLabel text={slim ? text.split(' ')[0] : text} pos={[x, h / 2 - (u.term === 'top-bottom' ? 0.017 : 0.008), z + 0.0008]} w={Math.min(w * 0.86, 0.05)} h={slim ? 0.0045 : 0.0058} fg={u.kind === 'safety' ? '#ffffff' : col.text} bg={u.kind === 'safety' ? '#b42318' : col.face} />
            )}

            {/* status LEDs */}
            {status && u.kind !== 'hmi' && (
              <group>
                <Led pos={[x - Math.min(w * 0.3, 0.012), h / 2 - (u.term === 'top-bottom' ? 0.025 : 0.016), z + 0.001]} color="#3ddc97" read={u.kind === 'psu' || u.kind === 'coupler' ? live.power : live.run} size={0.0028} halo={0.014} />
                {u.kind !== 'psu' && <Led pos={[x, h / 2 - (u.term === 'top-bottom' ? 0.025 : 0.016), z + 0.001]} color="#ffb547" read={u.kind === 'coupler' || u.kind === 'comm' ? live.run : live.force} size={0.0028} halo={0.014} />}
                {u.kind !== 'psu' && <Led pos={[x + Math.min(w * 0.3, 0.012), h / 2 - (u.term === 'top-bottom' ? 0.025 : 0.016), z + 0.001]} color="#ff6b6b" read={live.fault} size={0.0028} halo={0.014} />}
              </group>
            )}

            {/* displays */}
            {u.screen === 'status' && (
              <HLabel text="RUN  OK" pos={[x, h / 2 - 0.028, z + 0.0009]} w={Math.min(w * 0.7, 0.03)} h={0.0065} fg="#3ddc97" bg="#071018" />
            )}
            {u.screen === 'lcd' && u.kind !== 'drive' && (
              <group>
                <mesh position={[x - (u.kind === 'brick' ? w * 0.22 : 0), h * 0.05, z + 0.0009]} raycast={() => null}>
                  <planeGeometry args={[Math.min(w * 0.42, 0.04), 0.016]} />
                  <meshStandardMaterial color={C.lcd} emissive="#7fa080" emissiveIntensity={0.25} roughness={0.4} />
                </mesh>
                {u.keys && [0, 1, 2, 3].map((k) => (
                  <Box key={k} size={[0.004, 0.004, 0.002]} pos={[x - 0.009 + k * 0.006, h * 0.05 - 0.014, z + 0.001]} color="#6b7280" round={0} />
                ))}
              </group>
            )}
            {u.screen === 'touch' && (
              <group>
                <mesh position={[x, h * 0.12, z + 0.0009]} raycast={() => null}>
                  <planeGeometry args={[w * 0.78, 0.03]} />
                  <meshStandardMaterial color="#0c1a2a" emissive="#1e6fff" emissiveIntensity={0.35} roughness={0.2} />
                </mesh>
                <HLabel text="SYSTEM OK" pos={[x, h * 0.12, z + 0.0012]} w={w * 0.5} h={0.007} fg="#3ddc97" bg="#0c1a2a" />
              </group>
            )}

            {/* key / mode switch, memory card, ports */}
            {u.key && (
              <mesh position={[x, h * 0.12, z + 0.002]} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
                <cylinderGeometry args={[0.0035, 0.0035, 0.004, 14]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.25} />
              </mesh>
            )}
            {u.sd && <Box size={[Math.min(w * 0.5, 0.016), 0.0018, 0.002]} pos={[x, h * 0.12 - 0.008, z + 0.0008]} color={C.port} round={0} />}
            {u.kind !== 'drive' && (u.ports ?? 0) > 0 && Array.from({ length: u.ports ?? 0 }, (_, k) => {
              const px = x + (k - ((u.ports ?? 1) - 1) / 2) * 0.011 * (slim ? 0 : 1);
              const py = -h / 2 + (u.term === 'top-bottom' ? 0.024 : 0.012) + (slim ? k * 0.011 : 0);
              return (
                <group key={k}>
                  <Box size={[0.0095, 0.008, 0.0035]} pos={[px, py, z + 0.0012]} color="#9aa3ad" metal={0.8} rough={0.3} round={0} />
                  <Box size={[0.0075, 0.0058, 0.0012]} pos={[px, py - 0.0003, z + 0.0031]} color={C.port} round={0} />
                  <Led pos={[px - 0.0034, py + 0.0047, z + 0.0031]} color="#3ddc97" read={live.run} size={0.0014} halo={0.006} />
                  <Led pos={[px + 0.0034, py + 0.0047, z + 0.0031]} color="#ffb547" read={() => live.run() && Math.floor(performance.now() / (90 + k * 37)) % 3 === 0} size={0.0014} halo={0.006} />
                </group>
              );
            })}

            {/* I/O LEDs */}
            {io.di.length + io.do.length > 0 && (() => {
              const brick = u.kind === 'brick' || u.kind === 'logic' || u.kind === 'bas';
              const pts = [...io.di.map((n) => ({ n, out: false })), ...io.do.map((n) => ({ n, out: true }))];
              if (brick) {
                return pts.map((p, k) => {
                  const row = p.out ? io.do : io.di;
                  const j = row.indexOf(p.n);
                  const span = Math.min(w * 0.4, row.length * 0.0042);
                  const lx = x + w * 0.22 - span / 2 + (j + 0.5) * (span / row.length);
                  return <Led key={k} pos={[lx, p.out ? -h / 2 + 0.03 : h / 2 - 0.03, z + 0.001]} color={p.out ? '#3ddc97' : '#ffb547'} read={p.out ? () => live.do(p.n) : () => live.di(p.n)} size={0.0024} halo={0.01} />;
                });
              }
              const cols = w >= 0.03 ? 2 : 1;
              return pts.map((p, k) => (
                <Led key={k} pos={[x + (cols === 2 ? ((k % 2) - 0.5) * 0.007 : 0), h / 2 - 0.016 - Math.floor(k / cols) * 0.0042 - (u.term === 'top-bottom' ? 0.01 : 0), z + 0.001]} color={p.out ? '#3ddc97' : '#ffb547'} read={p.out ? () => live.do(p.n) : () => live.di(p.n)} size={0.0024} halo={0.01} />
              ));
            })()}

            {/* terminals */}
            {u.term === 'top-bottom' && [1, -1].map((s) => (
              <group key={s}>
                <Box size={[w * 0.96, 0.011, 0.006]} pos={[x, s * (h / 2 - 0.0062), z + 0.0005]} color={u.door ? C.door : C.term} round={0} opacity={u.door ? 0.92 : undefined} />
              </group>
            ))}
            {u.term === 'front' && !u.door && (
              <Box size={[w * 0.9, h * 0.46, 0.008]} pos={[x, -h * 0.25, z + 0.002]} color={C.term} round={0} />
            )}
            {u.term === 'spring' && Array.from({ length: Math.max(4, Math.floor((h * 0.55) / 0.007)) }, (_, r) => (
              <Box key={r} size={[Math.min(w * 0.55, 0.008), 0.0035, 0.0015]} pos={[x, -h * 0.02 - r * 0.007, z + 0.0006]} color={C.white} round={0} />
            ))}
            {u.door && u.term !== 'top-bottom' && (
              <group>
                <Box size={[w * 0.9, h * 0.62, 0.006]} pos={[x, -h * 0.13, z + 0.003]} color={col.face} round={0.001} />
                <mesh position={[x, -h * 0.13, z + 0.0062]} raycast={() => null}>
                  <planeGeometry args={[w * 0.6, h * 0.42]} />
                  <meshStandardMaterial map={doorTex} color="#c3cad2" roughness={0.85} />
                </mesh>
              </group>
            )}

            {vents[i].length > 0 && (
              <Instances limit={vents[i].length}>
                <boxGeometry args={[0.0022, 0.0006, 0.009]} />
                <meshStandardMaterial color="#0b0e12" roughness={0.9} />
                {vents[i].map((p, k) => <Instance key={k} position={p} />)}
              </Instances>
            )}
            {screws[i].length > 0 && (
              <Instances limit={screws[i].length} castShadow>
                <cylinderGeometry args={[0.0018, 0.0018, 0.0015, 10]} />
                <meshStandardMaterial color={C.screw} metalness={0.9} roughness={0.3} />
                {screws[i].map((p, k) => <Instance key={k} position={p} rotation={[Math.PI / 2, 0, 0]} />)}
              </Instances>
            )}
            {tags && isSel && (
              <Billboard position={[x, h / 2 + 0.014, (chassis ? 0.006 : 0) + d]}>
                <HLabel text={UNIT_INFO[u.kind].title} pos={[0, 0, 0]} w={Math.max(0.05, UNIT_INFO[u.kind].title.length * 0.0042)} h={0.011} fg="#ffffff" bg={selected === i ? '#1b63eb' : '#1a2230'} />
              </Billboard>
            )}
            {/* hover / selection outline */}
            {isSel && (
              <mesh position={[x, 0, (chassis ? 0.006 : 0) + d / 2 + 0.002]} raycast={() => null}>
                <boxGeometry args={[w + 0.002, h + 0.004, d + 0.008]} />
                <meshBasicMaterial color={C.select} transparent opacity={selected === i ? 0.12 : 0.05} depthWrite={false} />
                <Edges color={C.select} lineWidth={selected === i ? 2 : 1} />
              </mesh>
            )}
          </group>
        );
      })}

    </group>
  );
}

function HmiScreen({ w, h, pos }: { w: number; h: number; pos: [number, number, number] }) {
  const tex = useMemo(() => hmiTexture(w / h), [w, h]);
  return (
    <mesh position={pos} raycast={() => null}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

/** Drive front: keypad with an LCD that alternates speed and current, run/stop keys, terminal cover, side heatsink fins. */
function DriveFace({ x, w, h, d, z, live }: { x: number; w: number; h: number; d: number; z: number; live: HwLive }) {
  const hz = useRef<Group>(null);
  const amps = useRef<Group>(null);
  useFrame(() => {
    const a = Math.floor(performance.now() / 2200) % 2 === 1;
    if (hz.current) hz.current.visible = !a;
    if (amps.current) amps.current.visible = a;
  });
  const kw = Math.min(w * 0.62, 0.075);
  const ky = h * 0.24;
  const fins = Math.max(4, Math.floor((d * 0.55) / 0.006));
  return (
    <group>
      {/* keypad */}
      <Box size={[kw, Math.min(h * 0.3, 0.09), 0.004]} pos={[x, ky, z + 0.002]} color="#15181d" round={0.0015} />
      <group ref={hz}>
        <HLabel text={live.run() ? '60.0 Hz  RUN' : '0.0 Hz  STOP'} pos={[x, ky + Math.min(h * 0.07, 0.022), z + 0.0043]} w={kw * 0.82} h={0.011} fg="#11261a" bg="#9fc4a6" />
      </group>
      <group ref={amps} visible={false}>
        <HLabel text="11.6 A   37 °C" pos={[x, ky + Math.min(h * 0.07, 0.022), z + 0.0043]} w={kw * 0.82} h={0.011} fg="#11261a" bg="#9fc4a6" />
      </group>
      {[-1, 0, 1].map((c) => [0, 1].map((r) => (
        <Box key={`${c}${r}`} size={[0.007, 0.0045, 0.002]} pos={[x + c * 0.011, ky - 0.002 - r * 0.0075, z + 0.0045]} color="#4b5563" round={0} />
      )))}
      <mesh position={[x - kw * 0.3, ky - Math.min(h * 0.11, 0.03), z + 0.0048]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.0042, 0.0042, 0.002, 18]} /><meshStandardMaterial color="#16a34a" roughness={0.4} /></mesh>
      <mesh position={[x + kw * 0.3, ky - Math.min(h * 0.11, 0.03), z + 0.0048]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.0042, 0.0042, 0.002, 18]} /><meshStandardMaterial color="#c0392b" roughness={0.4} /></mesh>
      <Led pos={[x + kw * 0.42, ky + Math.min(h * 0.12, 0.036), z + 0.0043]} color="#3ddc97" read={live.run} size={0.0022} halo={0.01} />
      {/* warning label + terminal cover */}
      <HLabel text="WAIT 5 MIN — DC BUS" pos={[x, -h * 0.02, z + 0.0006]} w={Math.min(w * 0.7, 0.07)} h={0.007} fg="#1a1a1a" bg="#f5c400" />
      <Box size={[w * 0.9, h * 0.34, 0.003]} pos={[x, -h * 0.29, z + 0.0012]} color="#2a2f37" round={0.001} />
      {[-0.3, 0, 0.3].map((k) => (
        <mesh key={k} position={[x + k * w, -h / 2 - 0.0004, d * 0.55]} raycast={() => null}><cylinderGeometry args={[Math.min(0.009, w * 0.09), Math.min(0.009, w * 0.09), 0.001, 20]} /><meshStandardMaterial color="#0d1014" /></mesh>
      ))}
      {/* heatsink fins on both sides, toward the back */}
      <Instances limit={fins * 2}>
        <boxGeometry args={[0.006, h * 0.86, 0.0014]} />
        <meshStandardMaterial color="#9aa3ad" metalness={0.75} roughness={0.35} />
        {Array.from({ length: fins }, (_, k) => [-1, 1].map((sg) => <Instance key={`${k}${sg}`} position={[x + sg * (w / 2 + 0.003), 0, d * 0.08 + k * 0.006]} />))}
      </Instances>
    </group>
  );
}

/** Safety relay front: power and channel LEDs, rotary dials. */
function RelayFace({ x, w, h, z, live }: { x: number; w: number; h: number; z: number; live: HwLive }) {
  const r = Math.min(w * 0.22, 0.0045);
  return (
    <group>
      {[0, 1, 2, 3].map((k) => <Led key={k} pos={[x - w * 0.18, h / 2 - 0.028 - k * 0.006, z + 0.001]} color={k === 0 ? '#3ddc97' : '#3ddc97'} read={k === 0 ? live.power : live.run} size={0.0024} halo={0.01} />)}
      {['PWR', 'CH1', 'CH2', 'OUT'].map((t, k) => <HLabel key={t} text={t} pos={[x + w * 0.14, h / 2 - 0.028 - k * 0.006, z + 0.0008]} w={Math.min(w * 0.45, 0.012)} h={0.0036} fg="#334155" bg="#e6e8ea" />)}
      {[0, 1].map((k) => (
        <group key={k} position={[x, -h * 0.08 - k * 0.014, z + 0.0015]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[r, r, 0.003, 20]} /><meshStandardMaterial color="#9aa3ad" metalness={0.5} roughness={0.4} /></mesh>
          <Box size={[r * 1.6, 0.0007, 0.001]} pos={[0, 0, 0.0016]} color="#1f2630" round={0} />
        </group>
      ))}
    </group>
  );
}

/** Text for the tap-to-learn sheet. */
export function unitInfo(u: HwUnit): { title: string; what: string } {
  return UNIT_INFO[u.kind];
}
