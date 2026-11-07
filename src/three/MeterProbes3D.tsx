/**
 * Fault Hunt in 3D: the machine's test points on a terminal strip, a meter with a mode dial, and a red
 * probe you drag onto a terminal. For voltage points the black lead stays on common (0 V / neutral), matching
 * how the points are labeled ("across" points say so). Current points are read in series or with a clamp;
 * the page says so next to the meter. The reading updates live while the probe is on a terminal.
 * The select list next to it does the same thing without 3D (keyboard / screen reader path).
 * Touch scrolling is off over this canvas so a probe drag isn't taken for a page scroll (scroll beside it).
 */
import { QuadraticBezierLine } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import { PerspectiveCamera, Plane, Vector3, type Group } from 'three';
import type { MeterMode } from '../features/troubleshoot/scoring';
import { usePrefs } from '../state/prefs';
import { Box, Label } from './kit';
import { StudioLights } from './Lights';
import { Display } from './machines/parts';
import { Stage } from './Stage';

export interface ProbePoint { id: string; label: string }

const DX = 0.5;
const DY = 0.17;
const MODES: MeterMode[] = ['OHM', 'VDC', 'VAC', 'mA', 'A'];
const MODE_ANGLE: Record<MeterMode, number> = { OHM: 0.9, VDC: 0.45, VAC: 0, mA: -0.45, A: -0.9 };
const MODE_TEXT: Record<MeterMode, string> = { OHM: 'Ω', VDC: 'V⎓', VAC: 'V~', mA: 'mA', A: 'A' };

/** Terminals in a grid (2 columns on a portrait phone, 3 otherwise), the meter centered underneath. */
export function benchLayout(n: number, aspect: number) {
  const cols = aspect < 0.9 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const spots = Array.from({ length: n }, (_, i) => new Vector3(((i % cols) - (cols - 1) / 2) * DX, -Math.floor(i / cols) * DY, 0));
  const termBottom = -(rows - 1) * DY - 0.09;
  const meterAt = new Vector3(0.08, termBottom - 0.26, 0.02);
  const home = new Vector3(-0.32, termBottom - 0.2, 0.06);
  return { cols, spots, width: cols * DX + 0.06, top: 0.1, bottom: meterAt.y - 0.25, termBottom, meterAt, home };
}

function Probe({ spots, ids, home, onLand, onLift, at, meterJack }: { spots: Vector3[]; ids: string[]; home: Vector3; onLand: (id: string | null) => void; onLift: () => void; at: string | null; meterJack: Vector3 }) {
  const g = useRef<Group>(null);
  const line = useRef<React.ElementRef<typeof QuadraticBezierLine>>(null);
  const dragging = useRef(false);
  const plane = useMemo(() => new Plane(new Vector3(0, 0, 1), -0.06), []);
  const hit = useMemo(() => new Vector3(), []);
  const invalidate = useThree((s) => s.invalidate);
  const target = at ? spots[ids.indexOf(at)] : null;
  const rest = useMemo(() => (target ? new Vector3(target.x, target.y, 0.06) : home.clone()), [target, home]);

  useFrame(() => {
    if (!g.current) return;
    if (!dragging.current) g.current.position.lerp(rest, 0.35);
    const p = g.current.position;
    line.current?.setPoints(meterJack, [p.x, p.y + 0.04, p.z + 0.02], [(meterJack.x + p.x) / 2, Math.min(meterJack.y, p.y) - 0.15, 0.12]);
    if (!dragging.current && p.distanceTo(rest) > 0.001) invalidate();
  });

  const down = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); dragging.current = true; onLift(); (e.target as Element).setPointerCapture?.(e.pointerId); };
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current || !g.current) return;
    if (e.ray.intersectPlane(plane, hit)) { g.current.position.set(hit.x, hit.y, 0.06); invalidate(); }
  };
  // A cancelled gesture (e.g. the browser took it for a scroll) sends the probe home; it never lands it.
  const cancel = () => { if (!dragging.current) return; dragging.current = false; onLand(null); invalidate(); };
  const up = () => {
    if (!dragging.current || !g.current) return;
    dragging.current = false;
    const p = g.current.position;
    let best = -1;
    let bd = 0.09;
    spots.forEach((s, i) => { const d = Math.hypot(s.x - p.x, s.y - p.y); if (d < bd) { bd = d; best = i; } });
    onLand(best >= 0 ? ids[best] : null);
    invalidate();
  };

  return (
    <>
      <QuadraticBezierLine ref={line} start={meterJack} end={rest} mid={[0, -0.2, 0.12]} color="#dc2626" lineWidth={3} />
      <group ref={g} position={home} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
        {/* tip, guard, handle */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.006, 0.03, 10]} /><meshStandardMaterial color="#d1d5db" metalness={0.9} roughness={0.2} /></mesh>
        <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.016, 0.016, 0.008, 16]} /><meshStandardMaterial color="#991b1b" /></mesh>
        <mesh position={[0, 0, 0.075]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.012, 0.012, 0.08, 16]} /><meshStandardMaterial color="#dc2626" roughness={0.45} /></mesh>
        {/* generous invisible grab target (44 px-ish at phone scale) */}
        <mesh position={[0, 0, 0.05]}><sphereGeometry args={[0.075, 8, 6]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      </group>
    </>
  );
}

type BenchProps = { points: ProbePoint[]; mode: MeterMode; at: string | null; reading: string; onMode: (m: MeterMode) => void; onLand: (id: string | null) => void; onLift: () => void };

function Bench({ points, mode, at, reading, onMode, onLand, onLift }: BenchProps) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(1, size.height);
  const L = useMemo(() => benchLayout(points.length, aspect), [points.length, aspect]);
  const ids = useMemo(() => points.map((p) => p.id), [points]);
  // Fit the whole bench in view whatever the canvas shape.
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const h = L.top - L.bottom;
    const d = Math.max(h / 2 / t, L.width / 2 / (t * aspect)) * 1.04;
    const cy = (L.top + L.bottom) / 2;
    camera.position.set(0, cy, d);
    camera.lookAt(0, cy, 0);
  }, [camera, aspect, L]);
  const jack = useMemo(() => new Vector3(L.meterAt.x - 0.11, L.meterAt.y - 0.12, 0.04), [L]);
  return (
    <group>
      <Box size={[L.width, L.top - L.termBottom + 0.04, 0.01]} pos={[0, (L.top + L.termBottom) / 2, -0.03]} color="#d9dde2" metal={0.3} rough={0.6} />
      {points.map((p, i) => {
        const sp = L.spots[i];
        const on = at === p.id;
        return (
          <group key={p.id} position={[sp.x, sp.y, 0]}>
            <Box size={[0.08, 0.055, 0.04]} pos={[0, 0, -0.005]} color={p.id === 'psu' ? '#2563eb' : '#64748b'} rough={0.5} />
            <mesh position={[0, 0, 0.017]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.014, 0.014, 0.004, 16]} /><meshStandardMaterial color={on ? '#facc15' : '#cbd5e1'} metalness={0.9} roughness={0.25} /></mesh>
            <Label text={p.label} pos={[0, -0.058, 0.002]} w={0.47} h={0.05} fg="#11161d" bg="#f2f4f7" />
          </group>
        );
      })}
      {/* meter: body, live display, rotary dial (tap a mode), black lead on common */}
      <group position={L.meterAt} scale={1.35}>
        <Box size={[0.26, 0.24, 0.05]} pos={[0, 0, 0]} color="#f59e0b" rough={0.55} round={0.012} />
        <Display pos={[0, 0.065, 0.027]} w={0.21} h={0.065} text={() => reading} />
        <group position={[0, -0.035, 0.027]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.012, 24]} /><meshStandardMaterial color="#1f2937" roughness={0.4} /></mesh>
          <group rotation={[0, 0, MODE_ANGLE[mode]]}><mesh position={[0, 0.026, 0.008]}><boxGeometry args={[0.008, 0.03, 0.004]} /><meshStandardMaterial color="#f8fafc" /></mesh></group>
          {MODES.map((m) => {
            const a = MODE_ANGLE[m] + Math.PI / 2;
            return (
              <group key={m} position={[Math.cos(a) * 0.07, Math.sin(a) * 0.07 - 0.004, 0.004]} onClick={(e) => { e.stopPropagation(); onMode(m); }}>
                <Label text={MODE_TEXT[m]} pos={[0, 0, 0]} w={0.036} h={0.022} fg={mode === m ? '#111' : '#e5e7eb'} bg={mode === m ? '#facc15' : '#1f2937'} />
              </group>
            );
          })}
        </group>
        <Label text="black lead: COM / 0 V (volts)" pos={[0, -0.1, 0.027]} w={0.22} h={0.026} fg="#e5e7eb" bg="#111827" />
      </group>
      <Probe spots={L.spots} ids={ids} home={L.home} onLand={onLand} onLift={onLift} at={at} meterJack={jack} />
    </group>
  );
}

function MeterProbes3D({ points, mode, at, reading, onMode, onLand, onLift }: BenchProps) {
  const quality = usePrefs((s) => s.quality);
  return (
    <div className="relative h-[clamp(360px,62svh,520px)] panel3d-bg rounded-xl overflow-hidden" style={{ touchAction: 'none' }}>
      <Stage
        quality={quality}
        animate={false}
        camera={{ position: [0, 0, 1.4], fov: 42, near: 0.02, far: 10 }}
        aria-label="3D meter: drag the red probe onto a test terminal. The test-point list next to it does the same."
        role="img"
        lostFallback={<p className="p-3 text-sm m-0" role="status">3D isn't available right now. Use the test-point list.</p>}
      >
        {(q, look) => <>
          <StudioLights look={look} q={q} keyPos={[0.6, 1.0, 1.6]} shadowBox={{ left: -0.8, right: 0.8, top: 0.8, bottom: -0.8 }} mapSize={512} fog={[3, 8]} />
          <Bench points={points} mode={mode} at={at} reading={reading} onMode={onMode} onLand={onLand} onLift={onLift} />
        </>}
      </Stage>
    </div>
  );
}

export default memo(MeterProbes3D);
