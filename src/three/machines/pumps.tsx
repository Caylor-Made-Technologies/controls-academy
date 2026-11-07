import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { DoubleSide, type Mesh } from 'three';
import { FLOAT_AT, LOW_CUTOUT, WELL_AREA, WELL_DEPTH, type PumpsState } from '../../plant/pumps';
import { Box, Label } from '../kit';
import { Cabinet, Lamp, PAINT, Pick, Pipe, Spinner } from './parts';
import type { MachineSceneDef, MachineSceneProps } from './types';

const W = Math.sqrt(WELL_AREA); // 2 m square well

/** Water in the well: a box scaled to the live level. */
function Water({ level }: { level: () => number }) {
  const m = useRef<Mesh>(null);
  useFrame(() => {
    const f = Math.max(0.002, Math.min(1, level() / WELL_DEPTH));
    if (m.current) { m.current.scale.y = f; m.current.position.y = (f * WELL_DEPTH) / 2; }
  });
  return (
    <mesh ref={m}>
      <boxGeometry args={[W * 0.98, WELL_DEPTH, W * 0.98]} />
      <meshStandardMaterial color="#3f6b5a" roughness={0.2} transparent opacity={0.82} />
    </mesh>
  );
}

/** A tethered float: rides the water between its tether limits. */
function Float({ x, z, at, swing, level, color, stuck }: { x: number; z: number; at: number; swing: number; level: () => number; color: string; stuck?: () => boolean }) {
  const m = useRef<Mesh>(null);
  // Rides the water between its tether limits — unless debris holds it up (then it stays tipped high).
  useFrame(() => { if (m.current) m.current.position.y = stuck?.() ? at + swing * 0.5 : Math.max(at - swing, Math.min(at + swing * 0.5, level())); });
  return (
    <>
      <mesh ref={m} position={[x, at, z]} castShadow><sphereGeometry args={[0.08, 20, 14]} /><meshStandardMaterial color={color} roughness={0.4} /></mesh>
      <Pipe from={[x, WELL_DEPTH + 0.05, z]} to={[x, at + 0.1, z]} r={0.006} color="#111827" />
    </>
  );
}

/** Submersible pump. Running is shown by flow in its discharge (a spinning sight-flow wheel), not by a lamp:
 * lights and overload flags live in the panel, where they are in real stations. */
function Pump({ x, rps }: { x: number; rps: () => number }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.35, 0]} castShadow><cylinderGeometry args={[0.16, 0.18, 0.6, 24]} /><meshStandardMaterial color="#1d4ed8" metalness={0.4} roughness={0.45} /></mesh>
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.24, 0.24, 0.12, 24]} /><meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} /></mesh>
      <Pipe from={[0, 0.65, 0]} to={[0, WELL_DEPTH + 0.4, 0]} r={0.06} />
      {/* guide rail */}
      <Pipe from={[0.2, 0.1, -0.1]} to={[0.2, WELL_DEPTH + 0.1, -0.1]} r={0.012} color="#9ca3af" />
      {/* sight-flow indicator in the discharge */}
      <group position={[0, WELL_DEPTH + 0.2, 0.065]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 0.02, 24]} /><meshStandardMaterial color="#cbd5e1" transparent opacity={0.5} /></mesh>
        <Spinner rps={rps} axis="z">
          {[0, 1, 2].map((i) => <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]} position={[0, 0, 0.012]}><boxGeometry args={[0.01, 0.1, 0.004]} /><meshStandardMaterial color="#f97316" /></mesh>)}
        </Spinner>
      </group>
    </group>
  );
}

/** Overload relay block with a trip flag that pops out when tripped. */
function Overload({ x, tripped }: { x: number; tripped: () => boolean }) {
  const f = useRef<Mesh>(null);
  useFrame(() => { if (f.current) f.current.position.z = tripped() ? 0.2 : 0.17; });
  return (
    <>
      <Box size={[0.12, 0.06, 0.06]} pos={[x, 0.75, 0.15]} color="#334155" rough={0.5} />
      <mesh ref={f} position={[x + 0.04, 0.75, 0.17]}><boxGeometry args={[0.02, 0.02, 0.03]} /><meshStandardMaterial color="#f97316" /></mesh>
    </>
  );
}

function Scene(p: MachineSceneProps) {
  const s = () => p.rt.scene.state as PumpsState;
  const level = () => s().level;
  const sel = (id: string) => p.selected === id;
  return (
    <group>
      {/* concrete well, front wall cut away so you can see inside */}
      <group>
        <Box size={[W + 0.2, WELL_DEPTH, 0.1]} pos={[0, WELL_DEPTH / 2, -W / 2 - 0.05]} color="#9ca3af" rough={0.95} />
        <Box size={[0.1, WELL_DEPTH, W]} pos={[-W / 2 - 0.05, WELL_DEPTH / 2, 0]} color="#9ca3af" rough={0.95} />
        <Box size={[0.1, WELL_DEPTH, W]} pos={[W / 2 + 0.05, WELL_DEPTH / 2, 0]} color="#9ca3af" rough={0.95} />
        <mesh position={[0, WELL_DEPTH / 2, W / 2 + 0.05]}>
          <planeGeometry args={[W + 0.2, WELL_DEPTH]} />
          <meshStandardMaterial color="#cbd5e1" transparent opacity={0.12} side={DoubleSide} depthWrite={false} />
        </mesh>
        {[1, 2, 3, 4].map((m) => <Label key={m} text={`${m} m`} pos={[-W / 2 + 0.12, m, -W / 2 + 0.002]} w={0.16} h={0.06} />)}
      </group>
      <Water level={level} />
      {/* access hatch frame and confined-space sign */}
      <mesh position={[0, WELL_DEPTH + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.55, 0.62, 4, 1, Math.PI / 4]} /><meshStandardMaterial color="#facc15" side={DoubleSide} /></mesh>
      <Label text="DANGER — PERMIT-REQUIRED CONFINED SPACE · H2S" pos={[W / 2 + 0.11, 1.9, 0.2]} rot={[0, Math.PI / 2, 0]} w={0.9} h={0.09} fg="#fff" bg="#b91c1c" />
      <Pick id="p1" label="Pump 1" size={[0.5, 0.8, 0.5]} pos={[-0.45, 0.4, 0]} selected={sel('p1')} onPick={p.onPick}>
        <Pump x={-0.45} rps={() => s().p1.rpm / 60} />
      </Pick>
      <Pick id="p2" label="Pump 2" size={[0.5, 0.8, 0.5]} pos={[0.45, 0.4, 0]} selected={sel('p2')} onPick={p.onPick}>
        <Pump x={0.45} rps={() => s().p2.rpm / 60} />
      </Pick>
      <Pick id="hh" label="Backup high float" size={[0.25, 0.4, 0.25]} pos={[-0.75, FLOAT_AT, 0.6]} selected={sel('hh')} onPick={p.onPick}>
        <Float x={-0.75} z={0.6} at={FLOAT_AT} swing={0.25} level={level} color="#dc2626" stuck={() => p.rt.scene.activeFault === 'pp-float'} />
      </Pick>
      <Pick id="low" label="Low cutout float" size={[0.25, 0.4, 0.25]} pos={[0.75, LOW_CUTOUT + 0.1, 0.6]} selected={sel('low')} onPick={p.onPick}>
        <Float x={0.75} z={0.6} at={LOW_CUTOUT + 0.1} swing={0.2} level={level} color="#f59e0b" />
      </Pick>
      <Pick id="lt" label="Level transmitter" size={[0.2, 0.3, 0.2]} pos={[0, 0.25, 0.7]} selected={sel('lt')} onPick={p.onPick}>
        <mesh position={[0, 0.2, 0.7]}><cylinderGeometry args={[0.04, 0.04, 0.2, 16]} /><meshStandardMaterial color="#e5e7eb" metalness={0.7} roughness={0.3} /></mesh>
        <Pipe from={[0, 0.3, 0.7]} to={[0, WELL_DEPTH + 0.05, 0.7]} r={0.008} color="#111827" />
      </Pick>
      {/* discharge header */}
      <Pipe from={[-0.45, WELL_DEPTH + 0.4, 0]} to={[2.0, WELL_DEPTH + 0.4, 0]} r={0.07} color={PAINT.pipe} />
      {/* control panel beside the well */}
      <Cabinet pos={[2.0, 0, -0.6]} size={[0.8, 1.4, 0.28]} label="LIFT STATION">
        <Pick id="hialm" label="High level alarm" size={[0.08, 0.08, 0.06]} pos={[-0.2, 1.1, 0.15]} selected={sel('hialm')} onPick={p.onPick}>
          <Lamp pos={[-0.2, 1.1, 0.15]} color="#ff4d4d" on={() => p.rt.io.DO[2]} r={0.028} />
        </Pick>
        <Pick id="faillt" label="Pump fail light" size={[0.08, 0.08, 0.06]} pos={[-0.08, 1.1, 0.15]} selected={sel('faillt')} onPick={p.onPick}>
          <Lamp pos={[-0.08, 1.1, 0.15]} color="#ffb547" on={() => p.rt.io.DO[3]} r={0.028} />
        </Pick>
        <Pick id="reset" label="Fail reset" size={[0.08, 0.08, 0.06]} pos={[0.06, 1.1, 0.15]} selected={sel('reset')} onPick={p.onPick}>
          <mesh position={[0.06, 1.1, 0.15]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.024, 0.024, 0.02, 20]} /><meshStandardMaterial color="#e5e7eb" /></mesh>
        </Pick>
        <Pick id="p1ol" label="P1 overload" size={[0.14, 0.1, 0.08]} pos={[-0.14, 0.75, 0.15]} selected={sel('p1ol')} onPick={p.onPick}>
          <Overload x={-0.14} tripped={() => s().p1.tripped} />
        </Pick>
        <Pick id="p2ol" label="P2 overload" size={[0.14, 0.1, 0.08]} pos={[0.1, 0.75, 0.15]} selected={sel('p2ol')} onPick={p.onPick}>
          <Overload x={0.1} tripped={() => s().p2.tripped} />
        </Pick>
        {/* running lights wired from each starter's aux contact (same as the PLC sees) */}
        <Pick id="p1aux" label="P1 running (aux)" size={[0.08, 0.08, 0.06]} pos={[-0.2, 0.95, 0.15]} selected={sel('p1aux')} onPick={p.onPick}>
          <Lamp pos={[-0.2, 0.95, 0.15]} color="#3ddc97" on={() => p.rt.io.DI[0]} r={0.025} />
        </Pick>
        <Pick id="p2aux" label="P2 running (aux)" size={[0.08, 0.08, 0.06]} pos={[-0.08, 0.95, 0.15]} selected={sel('p2aux')} onPick={p.onPick}>
          <Lamp pos={[-0.08, 0.95, 0.15]} color="#3ddc97" on={() => p.rt.io.DI[1]} r={0.025} />
        </Pick>
        <StarterNote />
      </Cabinet>
    </group>
  );
}

function StarterNote() {
  return <Label text="DOOR SHOWN OPEN · 480 V INSIDE · NFPA 70E / LOCK OUT" pos={[0, 1.45, 0.15]} w={0.78} h={0.06} fg="#111" bg="#f5c400" />;
}

export const pumpsScene: MachineSceneDef = {
  id: 'pumps',
  Scene,
  camera: { pos: [3.4, 6.2, 6.4], target: [0.4, 2.2, 0] },
  radius: 3.8,
  moving: (rt) => {
    const s = rt.scene.state as PumpsState;
    return s.inflow > 0 || s.p1.rpm > 1 || s.p2.rpm > 1;
  },
  readout: (rt) => {
    const s = rt.scene.state as PumpsState;
    const run = [s.p1.rpm > 100 ? 'P1' : '', s.p2.rpm > 100 ? 'P2' : ''].filter(Boolean).join('+') || 'none';
    return `Level ${s.level.toFixed(2)} m · running ${run} · starts ${s.starts[0]}/${s.starts[1]}`;
  },
  describe: 'a 5 m wet well (a permit-required confined space) with the front wall cut away: live water level, two submersible pumps whose discharge sight-flow wheels turn while pumping, the backup high float and low cutout float riding the water, the level transmitter, and the station panel with running lights from the starter aux contacts and overload trip flags.',
};
