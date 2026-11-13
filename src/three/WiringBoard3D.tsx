/**
 * The wiring exercise on a 3D DIN-rail board: each device is a block with screw terminals; wires are drawn
 * as drooping leads between them. Tap a terminal, then another, to run a wire (same as the terminal list).
 */
import { QuadraticBezierLine } from '@react-three/drei';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { memo, useEffect, useMemo, useState } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';
import { WIRE_COLORS, type Exercise, type Wire } from '../lib/wiring';
import { usePrefs } from '../state/prefs';
import { Box, Label } from './kit';
import { StudioLights } from './Lights';
import { Stage } from './Stage';
import { Poster } from './poster/Poster';
import { FRAME } from './poster/frames';
import { POSTERS } from './poster/wiring.gen';

const TW = 0.11; // terminal spacing
const DEV_GAP = 0.06;

/** Devices in rows that fit the canvas shape; returns each terminal's position. */
export function boardLayout(ex: Exercise, aspect: number) {
  const maxW = aspect < 0.9 ? 0.75 : 1.5;
  const blocks: { id: string; name: string; x: number; y: number; w: number }[] = [];
  const at = new Map<string, Vector3>();
  let x = 0, y = 0, rowW = 0, width = 0;
  const rows: typeof blocks[] = [[]];
  for (const d of ex.devices) {
    const w = Math.max(0.24, d.terminals.length * TW + 0.04);
    if (x > 0 && x + w > maxW) { width = Math.max(width, rowW); x = 0; y -= 0.34; rows.push([]); }
    const b = { id: d.id, name: d.name, x: x + w / 2, y, w };
    rows[rows.length - 1].push(b);
    blocks.push(b);
    x += w + DEV_GAP;
    rowW = x - DEV_GAP;
  }
  width = Math.max(width, rowW);
  // center each row
  for (const r of rows) {
    const rw = r.length ? r[r.length - 1].x + r[r.length - 1].w / 2 : 0;
    for (const b of r) b.x -= rw / 2;
  }
  for (const d of ex.devices) {
    const b = blocks.find((k) => k.id === d.id)!;
    d.terminals.forEach((t, i) => at.set(t.id, new Vector3(b.x - b.w / 2 + 0.02 + TW / 2 + i * TW, b.y + 0.05, 0.035)));
  }
  return { blocks, at, width: width + 0.1, top: 0.2, bottom: y - 0.2 };
}

function Board({ ex, wires, colors, armed, onTap }: { ex: Exercise; wires: Wire[]; colors: string[]; armed: string | null; onTap: (id: string) => void }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(1, size.height);
  const L = useMemo(() => boardLayout(ex, aspect), [ex, aspect]);
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const h = L.top - L.bottom;
    const cy = (L.top + L.bottom) / 2;
    const d = Math.max(h / 2 / t, L.width / 2 / (t * aspect)) * 1.08;
    camera.position.set(0, cy - d * 0.1, d);
    camera.lookAt(0, cy, 0);
  }, [camera, aspect, L]);
  const tap = (id: string) => (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onTap(id); };
  return (
    <group>
      <Box size={[L.width + 0.1, L.top - L.bottom + 0.1, 0.01]} pos={[0, (L.top + L.bottom) / 2, -0.04]} color="#d9dde2" metal={0.3} rough={0.6} />
      {ex.devices.map((d) => {
        const b = L.blocks.find((k) => k.id === d.id)!;
        return (
          <group key={d.id}>
            <Box size={[b.w, 0.16, 0.06]} pos={[b.x, b.y, 0]} color="#334155" rough={0.5} />
            <Label text={d.name} pos={[b.x, b.y - 0.11, 0.002]} w={Math.min(b.w + 0.1, 0.5)} h={0.04} fg="#11161d" bg="#f2f4f7" />
            {d.terminals.map((t) => {
              const p = L.at.get(t.id)!;
              const on = armed === t.id;
              return (
                <group key={t.id} position={p} onClick={tap(t.id)}>
                  <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.022, 0.022, 0.01, 20]} /><meshStandardMaterial color={on ? '#facc15' : '#cbd5e1'} metalness={0.85} roughness={0.25} emissive={on ? '#facc15' : '#000'} emissiveIntensity={on ? 0.6 : 0} /></mesh>
                  <mesh position={[0, 0, 0.006]}><boxGeometry args={[0.03, 0.004, 0.002]} /><meshStandardMaterial color="#475569" /></mesh>
                  {/* generous invisible tap target */}
                  <mesh><sphereGeometry args={[0.055, 8, 6]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
                  <Label text={t.label} pos={[0, -0.048, 0.002]} w={0.105} h={0.032} fg="#e5e7eb" bg="#1f2937" />
                </group>
              );
            })}
          </group>
        );
      })}
      {wires.map(([a, b], i) => {
        const pa = L.at.get(a), pb = L.at.get(b);
        if (!pa || !pb) return null;
        const mid: [number, number, number] = [(pa.x + pb.x) / 2, (pa.y + pb.y) / 2 - 0.05 - Math.abs(pa.x - pb.x) * 0.08, 0.1 + (i % 3) * 0.02];
        return <QuadraticBezierLine key={`${a}-${b}`} start={[pa.x, pa.y, 0.045]} end={[pb.x, pb.y, 0.045]} mid={mid} color={colors[i] ?? WIRE_COLORS[i % WIRE_COLORS.length]} lineWidth={4} />;
      })}
    </group>
  );
}

function WiringBoard3D({ ex, wires, colors, armed, onTap }: { ex: Exercise; wires: Wire[]; colors: string[]; armed: string | null; onTap: (id: string) => void }) {
  const quality = usePrefs((s) => s.quality);
  const [drawn, setDrawn] = useState(false);
  return (
    <div className={FRAME.wiring}>
      {POSTERS[ex.id] && <Poster spec={POSTERS[ex.id]} fade={drawn} />}
      <Stage
        onFirstFrame={() => setDrawn(true)}
        quality={quality}
        animate={false}
        camera={{ position: [0, 0, 1.6], fov: 40, near: 0.02, far: 10 }}
        aria-label="3D wiring board. Tap a terminal, then another, to run a wire. The terminal list below does the same."
        role="img"
        lostFallback={<p className="p-3 text-sm m-0" role="status">3D isn't available right now. Use the terminal list.</p>}
      >
        {(q, look) => <>
          <StudioLights look={look} q={q} keyPos={[0.6, 1.0, 1.8]} shadowBox={{ left: -1, right: 1, top: 1, bottom: -1 }} mapSize={512} fog={[4, 10]} />
          <Board ex={ex} wires={wires} colors={colors} armed={armed} onTap={onTap} />
        </>}
      </Stage>
    </div>
  );
}

export default memo(WiringBoard3D);
