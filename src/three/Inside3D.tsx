/**
 * Exploded view of one device (src/content/inside.ts). Parts glide apart along their own directions;
 * tap a part (or pick it in the list beside) to read what it does.
 */
import { Billboard, OrbitControls } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Vector3, type Group } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { fitViewInsets, type V3 } from './fit';
import type { InsideDevice, InsidePart } from '../content/inside';
import { usePrefs } from '../state/prefs';
import { Label } from './kit';
import { StudioLights } from './Lights';
import { Stage } from './Stage';
import { Box, ScrewHead } from './kit';
import { lowDetail, surface, surfaceFor } from './materials';
import { Poster } from './poster/Poster';
import { FRAME } from './poster/frames';
import { POSTERS } from './poster/inside.gen';

/** How far a part travels when the device is fully pulled apart, as a fraction of the device size. */
export const reachOf = (d: InsideDevice) => d.reach ?? 0.45;

function Part({ p, spread, size, reach, selected, onPick, reduce }: { p: InsidePart; spread: number; size: number; reach: number; selected: boolean; onPick: (id: string) => void; reduce: boolean }) {
  const g = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const home = useMemo(() => new Vector3(...p.pos), [p]);
  const away = useMemo(() => new Vector3(...p.dir).normalize().multiplyScalar(size * reach).add(home), [p, size, reach, home]);
  const goal = useMemo(() => home.clone().lerp(away, spread), [home, away, spread]);
  useFrame((_, dt) => {
    const o = g.current;
    if (!o) return;
    if (reduce) { o.position.copy(goal); return; }
    o.position.lerp(goal, Math.min(1, dt * 5));
    if (o.position.distanceTo(goal) > 0.0005) invalidate();
  });
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onPick(p.id); };
  // On a portrait phone the whole device is drawn smaller, so the name tags grow to stay readable.
  const narrow = useThree((s) => s.size.width < s.size.height * 1.1);
  const tag = (selected ? 1.25 : 1) * (narrow ? 1.4 : 1);
  const label = shortName(p.name);
  const top = p.shape.kind === 'box' ? p.shape.size[1] / 2 : p.shape.axis === 'y' || !p.shape.axis ? p.shape.h / 2 : p.shape.r;
  return (
    <group ref={g} position={home} onClick={click}>
      <PartBody p={p} selected={selected} />
      {/* Every part carries its name once the device is pulled apart; the selected one is highlighted. */}
      {/* A see-through enclosure is obvious and its label would sit on top of what is inside it. */}
      {(selected || (spread > 0.3 && p.opacity === undefined)) && (
        <Billboard position={[0, top + size * 0.028, 0]}>
          <Label overlay text={label} pos={[0, 0, 0]} w={tag * (label.length * size * 0.0105 + size * 0.03)} h={tag * size * 0.03} fg="#ffffff" bg={selected ? '#1b63eb' : '#1f2937'} />
        </Billboard>
      )}
    </group>
  );
}

/** "Heaters and bimetal strips (one per phase)" → "Heaters and bimetal strips". Keeps on-model labels short. */
export function shortName(name: string): string {
  const base = name.split(/ \(|: |, /)[0];
  return base.length > 26 ? `${base.slice(0, 25).trimEnd()}…` : base;
}

type Kind = 'caps' | 'fins' | 'terminals' | 'coil' | 'leds' | 'board' | 'module' | 'keypad' | 'strips' | 'plain';
/** What a part should look like, from what it is. Generic shapes become recognizable hardware. */
export function partKind(p: InsidePart): Kind {
  const k = `${p.id} ${p.name}`.toLowerCase();
  if (p.opacity !== undefined) return 'plain';
  if (/capacitor|\bcaps\b/.test(k)) return 'caps';
  if (/heatsink|heat sink/.test(k)) return 'fins';
  if (/\bcoil\b/.test(k)) return 'coil';
  if (/\bleds?\b/.test(k)) return 'leds';
  if (/bimetal|heater/.test(k)) return 'strips';
  if (/igbt|rectifier|diode/.test(k)) return 'module';
  if (/keypad/.test(k)) return 'keypad';
  if (/terminal|\brtb\b|backplane|contacts/.test(k)) return 'terminals';
  if (/board|circuit|rectifier|igbt|inverter|opto|oscillator|logic|output stage/.test(k)) return 'board';
  return 'plain';
}

const SELECT = '#3d8bff';

function PartBody({ p, selected }: { p: InsidePart; selected: boolean }) {
  const s = p.shape;
  const kind = partKind(p);
  const color = selected ? SELECT : p.color;
  if (s.kind === 'cyl') {
    const rot: [number, number, number] = s.axis === 'x' ? [0, 0, Math.PI / 2] : s.axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0];
    if (kind === 'coil') {
      // Copper windings on a dark former.
      const turns = 7;
      return (
        <group rotation={rot}>
          <mesh material={surface('plasticMatte', '#1f2328')}><cylinderGeometry args={[s.r * 0.55, s.r * 0.55, s.h, 20]} /></mesh>
          {Array.from({ length: turns }, (_, i) => (
            <mesh key={i} position={[0, (i / (turns - 1) - 0.5) * s.h * 0.86, 0]} rotation={[Math.PI / 2, 0, 0]} material={surface('copper', selected ? SELECT : undefined)}><torusGeometry args={[s.r * 0.82, s.h / turns / 2.4, 8, 24]} /></mesh>
          ))}
        </group>
      );
    }
    return (
      <mesh rotation={rot} material={surface(p.opacity !== undefined ? 'acrylic' : surfaceFor(p.metal ?? 0.2, 0.45), color, p.opacity)}>
        <cylinderGeometry args={[s.r, s.r, s.h, 28]} />
      </mesh>
    );
  }
  const [w, h, d] = s.size;
  if (kind === 'caps') {
    // A bank of electrolytic capacitor cans standing on a board.
    const n = Math.max(2, Math.min(4, Math.round(w / Math.max(d, 0.001))));
    const r = Math.min(w / n, d) * 0.42;
    return (
      <group>
        <Box size={[w, h * 0.08, d]} pos={[0, -h * 0.46, 0]} color="#1e5a3c" s="plasticMatte" />
        {Array.from({ length: n }, (_, i) => (
          <group key={i} position={[(i - (n - 1) / 2) * (w / n), 0, 0]}>
            <mesh material={surface('plasticGloss', selected ? SELECT : '#1f3b6b')}><cylinderGeometry args={[r, r, h * 0.84, 20]} /></mesh>
            <mesh position={[0, h * 0.43, 0]} material={surface('brushedSteel')}><cylinderGeometry args={[r * 0.92, r * 0.92, h * 0.02, 20]} /></mesh>
          </group>
        ))}
      </group>
    );
  }
  if (kind === 'fins') {
    const n = 9;
    return (
      <group>
        <Box size={[w, h, d * 0.25]} pos={[0, 0, d * 0.375]} color={selected ? SELECT : '#aab2bb'} s="brushedSteel" />
        {Array.from({ length: n }, (_, i) => (
          <mesh key={i} position={[(i / (n - 1) - 0.5) * w * 0.94, 0, -d * 0.125]} material={surface('brushedSteel', selected ? SELECT : '#aab2bb')}><boxGeometry args={[w / n / 2.4, h, d * 0.75]} /></mesh>
        ))}
      </group>
    );
  }
  if (kind === 'strips') {
    // One heater + bimetal strip per phase, side by side.
    return (
      <group>
        {[-1, 0, 1].map((i) => (
          <group key={i} position={[i * w * 0.33, 0, 0]}>
            <mesh material={surface('copper', selected ? SELECT : undefined)}><boxGeometry args={[w * 0.2, h, d * 0.45]} /></mesh>
            <mesh position={[0, 0, d * 0.4]} material={surface('brushedSteel')}><boxGeometry args={[w * 0.12, h * 0.9, d * 0.2]} /></mesh>
          </group>
        ))}
      </group>
    );
  }
  const front = d / 2;
  if (kind === 'module') {
    // A power semiconductor module: grey plastic case on a copper base plate, three screw terminals with
    // copper tabs on top, and small gate pins along one edge.
    return (
      <group>
        <Box size={[w, h * 0.16, d * 1.08]} pos={[0, -h * 0.42, 0]} color={selected ? SELECT : '#b87a4b'} s="copper" />
        <Box size={[w * 0.96, h * 0.7, d]} pos={[0, 0.02 * h, 0]} color={selected ? SELECT : '#5b6470'} s="plasticMatte" />
        {[-1, 0, 1].map((i) => (
          <group key={i} position={[i * w * 0.3, h * 0.37, 0]}>
            <mesh material={surface('copper')}><boxGeometry args={[w * 0.18, h * 0.06, d * 0.5]} /></mesh>
            <ScrewHead pos={[0, h * 0.035, 0]} r={Math.min(w * 0.05, d * 0.18)} rot={[-Math.PI / 2, 0, 0]} />
          </group>
        ))}
        {!lowDetail() && [0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[(i / 3 - 0.5) * w * 0.5, h * 0.4, -d * 0.38]} material={surface('tinned')}><cylinderGeometry args={[w * 0.01, w * 0.01, h * 0.12, 6]} /></mesh>
        ))}
      </group>
    );
  }
  if (kind === 'keypad') {
    // Control board with the keypad on its face: a small LCD, arrow keys, and green run / red stop keys.
    return (
      <group>
        <Box size={s.size} pos={[0, 0, 0]} color={selected ? SELECT : '#1e5a3c'} s="plasticMatte" />
        <Box size={[w * 0.56, h * 0.62, 0.003]} pos={[-w * 0.16, 0, front + 0.0015]} color="#1f242b" s="plasticGloss" />
        <mesh position={[-w * 0.16, h * 0.12, front + 0.0034]}><boxGeometry args={[w * 0.44, h * 0.26, 0.001]} /><meshStandardMaterial color="#0f2a1d" emissive="#3ddc97" emissiveIntensity={0.35} toneMapped={false} /></mesh>
        {[[-0.32, -0.17, '#9aa3ad'], [-0.16, -0.17, '#9aa3ad'], [0, -0.17, '#9aa3ad'], [0.24, 0.12, '#22c55e'], [0.24, -0.15, '#ef4444']].map(([x, y, c], i) => (
          <mesh key={i} position={[(x as number) * w, (y as number) * h, front + 0.004]} rotation={[Math.PI / 2, 0, 0]} material={surface('plasticGloss', c as string)}><cylinderGeometry args={[w * 0.045, w * 0.045, 0.004, 16]} /></mesh>
        ))}
      </group>
    );
  }
  const screws = Math.max(3, Math.min(8, Math.round(w / 0.012)));
  return (
    <group>
      <Box size={s.size} pos={[0, 0, 0]} color={kind === 'board' && !selected ? '#1e5a3c' : color} s={p.opacity !== undefined ? 'acrylic' : kind === 'board' ? 'plasticMatte' : surfaceFor(p.metal ?? 0.2, 0.45)} opacity={p.opacity} />
      {kind === 'terminals' && Array.from({ length: screws }, (_, i) => (
        <ScrewHead key={i} pos={[(i / (screws - 1) - 0.5) * w * 0.84, 0, front + 0.0004]} r={Math.min(h * 0.3, w / screws / 3)} />
      ))}
      {kind === 'board' && [[-0.25, 0.15, 0.3, 0.3], [0.2, -0.1, 0.22, 0.4], [-0.1, -0.28, 0.4, 0.16]].map(([x, y, cw, ch], i) => (
        <mesh key={i} position={[x * w, y * h, front + 0.0012]} material={surface('plasticGloss', '#14181d')}><boxGeometry args={[cw * w, ch * h, 0.002]} /></mesh>
      ))}
      {kind === 'leds' && Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[(i / 5 - 0.5) * w * 0.8, 0, front + 0.0008]}>
          <boxGeometry args={[w * 0.08, Math.min(h * 0.5, w * 0.08), 0.0012]} />
          <meshStandardMaterial color="#ffb547" emissive="#ffb547" emissiveIntensity={i % 3 === 0 ? 2.2 : 0.15} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The box every part can reach, together and fully pulled apart (labels included), so the camera never has
 * to move when the learner drags the spread slider. Pure; unit-tested.
 */
export function insideBounds(device: InsideDevice): { min: V3; max: V3 } {
  const d = device.size;
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of device.parts) {
    const s = p.shape;
    const half: V3 = s.kind === 'box' ? [s.size[0] / 2, s.size[1] / 2, s.size[2] / 2] : s.axis === 'x' ? [s.h / 2, s.r, s.r] : s.axis === 'z' ? [s.r, s.r, s.h / 2] : [s.r, s.h / 2, s.r];
    const l = Math.hypot(...p.dir) || 1;
    for (const k of [0, 1]) {
      const c = p.pos.map((v, i) => v + (p.dir[i] / l) * d * reachOf(device) * k);
      // Room above for the name tag, which is about as wide as the name.
      const tagW = (shortName(p.name).length * d * 0.0105 + d * 0.03) * 0.7; // half the widest (phone) tag
      // Tags turn to face the camera, so they can stick out in depth as well as sideways.
      const lo: V3 = [c[0] - Math.max(half[0], tagW), c[1] - half[1], c[2] - Math.max(half[2], tagW)];
      const hi: V3 = [c[0] + Math.max(half[0], tagW), c[1] + half[1] + d * 0.075, c[2] + Math.max(half[2], tagW)];
      for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], lo[i]); max[i] = Math.max(max[i], hi[i]); }
    }
  }
  return { min, max };
}

/** Frames the whole device (exploded included) for this canvas shape, from the default viewing direction. */
function FitInside({ device }: { device: InsideDevice }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const aspect = size.width / Math.max(1, size.height);
  useEffect(() => {
    if (!controls) return;
    const d = device.size;
    const b = insideBounds(device);
    const v = fitViewInsets(b.min, b.max, [d * 0.75, d * 0.5, d * 1.45], [0, 0, 0], 38, aspect);
    camera.position.set(...v.pos);
    controls.target.set(...v.target);
    controls.update();
    invalidate();
  }, [camera, controls, aspect, device, invalidate]);
  return null;
}

function Inside3D({ device, spread, selected, onPick }: { device: InsideDevice; spread: number; selected: string | null; onPick: (id: string | null) => void }) {
  const quality = usePrefs((s) => s.quality);
  const [drawn, setDrawn] = useState(false);
  const reduce = useMemo(() => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches), []);
  const d = device.size;
  return (
    <div className={FRAME.inside}>
      {POSTERS[device.id] && <Poster spec={POSTERS[device.id]} fade={drawn} />}
      <Stage
        onFirstFrame={() => setDrawn(true)}
        quality={quality}
        animate={false}
        camera={{ position: [d * 0.75, d * 0.5, d * 1.45], fov: 38, near: 0.005, far: 20 }}
        onPointerMissed={() => onPick(null)}
        aria-label={`Exploded 3D view of a ${device.title.toLowerCase()}. Drag to turn it; tap a part to read about it. The parts list has the same information.`}
        role="img"
        lostFallback={<p className="p-3 text-sm m-0" role="status">3D isn't available right now. The parts list has everything.</p>}
      >
        {(q, look) => <>
          <StudioLights look={look} q={q} keyPos={[d * 2, d * 3, d * 3]} shadowBox={{ left: -d, right: d, top: d, bottom: -d }} mapSize={512} fog={[d * 6, d * 14]} />
          {device.parts.map((p) => <Part key={p.id} p={p} spread={spread} size={d} reach={reachOf(device)} selected={selected === p.id} onPick={onPick} reduce={reduce} />)}
          <OrbitControls makeDefault enableDamping dampingFactor={0.12} minDistance={d * 0.5} maxDistance={d * 5} />
          <FitInside device={device} />
        </>}
      </Stage>
    </div>
  );
}

export default memo(Inside3D);
