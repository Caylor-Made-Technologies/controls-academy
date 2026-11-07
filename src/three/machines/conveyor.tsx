import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh } from 'three';
import { MOTOR_RPM } from '../../plant/motor';
import { BAG_M, BELT_M, BELT_SPEED, PE1_AT, PE2_AT, blocks, type ConveyorState } from '../../plant/conveyor';
import { Box, Label } from '../kit';
import { Beam, Belt, Cabinet, Lamp, Motor, PAINT, Pick } from './parts';
import { Contactor, StarterDoorNote } from './fwdrev';
import type { MachineSceneDef, MachineSceneProps } from './types';

const X0 = -BELT_M / 2; // belt starts here (scene x)
const H = 0.75; // belt top height
const POOL = 16;

/** Bags drawn from the simulation's bag list (a fixed pool of meshes, no per-frame allocation). */
function Bags({ s }: { s: () => ConveyorState }) {
  const refs = useRef<(Group | null)[]>([]);
  useFrame(() => {
    const bags = s().bags;
    for (let i = 0; i < POOL; i++) {
      const g = refs.current[i];
      if (!g) continue;
      const b = bags[i];
      g.visible = Boolean(b);
      if (b) { g.position.x = X0 + b.x + BAG_M / 2; g.rotation.y = b.stuck ? 0.25 : 0; }
    }
  });
  return (
    <>
      {Array.from({ length: POOL }, (_, i) => (
        <group key={i} ref={(g) => { refs.current[i] = g; }} position={[0, H + 0.09, 0]} visible={false}>
          <mesh castShadow><boxGeometry args={[BAG_M * 0.92, 0.16, 0.3]} /><meshStandardMaterial color={PAINT.flour} roughness={0.95} /></mesh>
          <mesh position={[0, 0.081, 0]}><boxGeometry args={[BAG_M * 0.5, 0.002, 0.18]} /><meshStandardMaterial color="#b45309" roughness={0.9} /></mesh>
        </group>
      ))}
    </>
  );
}

/**
 * A retroreflective eye. The beam and the eye's own LED show what the SENSOR sees (a bag in the beam, or a
 * dirty lens) — not what the PLC input receives. With a broken signal wire the LED still lights but I4 stays off.
 */
function Eye({ at, id, label, sees, dirty, p }: { at: number; id: string; label: string; sees: () => boolean; dirty?: () => boolean; p: MachineSceneProps }) {
  const x = X0 + at;
  return (
    <Pick id={id} label={label} size={[0.14, 0.4, 0.75]} pos={[x, H + 0.15, 0]} selected={p.selected === id} onPick={p.onPick}>
      <Box size={[0.05, 0.06, 0.05]} pos={[x, H + 0.1, -0.3]} color="#facc15" rough={0.5} />
      <Box size={[0.05, 0.05, 0.01]} pos={[x, H + 0.1, 0.3]} color="#ef4444" rough={0.3} />
      {[-0.3, 0.3].map((z) => <Box key={z} size={[0.025, H + 0.1, 0.025]} pos={[x, (H + 0.1) / 2, z]} color="#4b5563" metal={0.6} rough={0.4} />)}
      <Beam from={[x, H + 0.1, -0.27]} to={[x, H + 0.1, 0.295]} blocked={sees} />
      <Lamp pos={[x, H + 0.14, -0.3]} color="#ffb547" on={sees} r={0.008} rot={[0, 0, 0]} />
      {dirty && <DustFilm x={x} on={dirty} />}
    </Pick>
  );
}

function Scene(p: MachineSceneProps) {
  const s = () => p.rt.scene.state as ConveyorState;
  const rps = () => s().motor.rpm / 60;
  const speed = () => (BELT_SPEED * Math.max(0, s().motor.rpm)) / MOTOR_RPM;
  const sel = (id: string) => p.selected === id;
  return (
    <group>
      {/* frame, rollers, belt */}
      <Box size={[BELT_M + 0.2, 0.12, 0.5]} pos={[0, H - 0.07, 0]} color={PAINT.steel} metal={0.6} rough={0.4} />
      {[-2.8, -1.4, 0, 1.4, 2.8].map((x) => <Box key={x} size={[0.06, H - 0.13, 0.4]} pos={[x, (H - 0.13) / 2, 0]} color="#4b5563" metal={0.5} rough={0.5} />)}
      <Belt length={BELT_M} width={0.42} speed={speed} pos={[0, H + 0.002, 0]} />
      <Bags s={s} />
      <Eye at={PE1_AT} id="pe1" label="PE1 entry eye" sees={() => blocks(s().bags, PE1_AT) || p.rt.scene.activeFault === 'cv-pe1-dirty'} dirty={() => p.rt.scene.activeFault === 'cv-pe1-dirty'} p={p} />
      <Eye at={PE2_AT} id="pe2" label="PE2 exit eye" sees={() => blocks(s().bags, PE2_AT)} p={p} />
      {/* head-end motor */}
      <Pick id="motor" label="Conveyor motor" size={[0.5, 0.4, 0.4]} pos={[X0 + BELT_M + 0.05, 0.45, 0.45]} selected={sel('motor')} onPick={p.onPick}>
        <Motor pos={[X0 + BELT_M + 0.05, 0.5, 0.48]} rot={[0, Math.PI / 2, 0]} rps={rps} scale={0.7} />
      </Pick>
      {/* E-stop cue (not wired in this model) */}
      <group position={[X0 + 0.3, 0, 0.55]}>
        <Box size={[0.03, 0.9, 0.03]} pos={[0, 0.45, 0]} color="#4b5563" metal={0.6} rough={0.4} />
        <Box size={[0.1, 0.1, 0.05]} pos={[0, 0.95, 0]} color="#facc15" rough={0.5} />
        <mesh position={[0, 0.95, 0.04]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035, 0.03, 0.03, 24]} /><meshStandardMaterial color="#dc2626" roughness={0.35} /></mesh>
        <Label text="E-STOP — not modeled here; real conveyors have E-stops / pull-cords" pos={[0, 1.07, 0]} w={0.7} h={0.05} fg="#111" bg="#f5c400" />
      </group>
      {/* pallet at discharge */}
      <Box size={[1.0, 0.12, 1.0]} pos={[X0 + BELT_M + 0.7, 0.06, 0]} color="#a16207" rough={0.9} />
      {/* starter + stack light */}
      <Cabinet pos={[-1.6, 0, -1.0]} size={[0.7, 1.1, 0.25]} label="CONVEYOR STARTER">
        <StarterDoorNote y={1.15} />
        <Pick id="coil" label="Conveyor contactor" size={[0.14, 0.18, 0.12]} pos={[-0.15, 0.75, 0.17]} selected={sel('coil')} onPick={p.onPick}>
          <Contactor pos={[-0.15, 0.75, 0.125]} on={() => s().contactor} label="M" />
        </Pick>
        <Pick id="ol" label="Overload" size={[0.14, 0.1, 0.1]} pos={[-0.15, 0.6, 0.17]} selected={sel('ol')} onPick={p.onPick}>
          <Box size={[0.11, 0.06, 0.07]} pos={[-0.15, 0.6, 0.16]} color="#334155" rough={0.5} />
          <Lamp pos={[-0.12, 0.6, 0.2]} color="#ff6b6b" on={() => s().motor.tripped} r={0.01} />
        </Pick>
        {(['start', 'stop', 'reset'] as const).map((id, i) => (
          <Pick key={id} id={id} label={id[0].toUpperCase() + id.slice(1)} size={[0.06, 0.06, 0.05]} pos={[0.18, 0.85 - i * 0.1, 0.13]} selected={sel(id)} onPick={p.onPick}>
            <mesh position={[0.18, 0.85 - i * 0.1, 0.13]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.02, 0.02, 0.02, 20]} /><meshStandardMaterial color={id === 'start' ? '#16a34a' : id === 'stop' ? '#dc2626' : '#e5e7eb'} /></mesh>
          </Pick>
        ))}
      </Cabinet>
      <group position={[-0.6, 0, -1.0]}>
        <Box size={[0.03, 1.4, 0.03]} pos={[0, 0.7, 0]} color="#4b5563" metal={0.6} rough={0.4} />
        <Pick id="jamlt" label="Jam" size={[0.1, 0.1, 0.1]} pos={[0, 1.66, 0]} selected={sel('jamlt')} onPick={p.onPick}><Lamp pos={[0, 1.66, 0]} color="#ffb547" on={() => p.rt.io.DO[2]} r={0.05} rot={[0, 0, 0]} /></Pick>
        <Pick id="runlt" label="Running" size={[0.1, 0.1, 0.1]} pos={[0, 1.6, 0]} selected={sel('runlt')} onPick={p.onPick}><Lamp pos={[0, 1.6, 0]} color="#3ddc97" on={() => p.rt.io.DO[1]} r={0.05} rot={[0, 0, 0]} /></Pick>
        <Pick id="fulllt" label="Pallet full" size={[0.1, 0.1, 0.1]} pos={[0, 1.54, 0]} selected={sel('fulllt')} onPick={p.onPick}><Lamp pos={[0, 1.54, 0]} color="#3ddc97" on={() => p.rt.io.DO[3]} r={0.05} rot={[0, 0, 0]} /></Pick>
      </group>
    </group>
  );
}

function DustFilm({ x, on }: { x: number; on: () => boolean }) {
  const m = useRef<Mesh>(null);
  useFrame(() => { if (m.current) m.current.visible = on(); });
  return <mesh ref={m} position={[x, H + 0.1, -0.272]} visible={false}><planeGeometry args={[0.05, 0.05]} /><meshStandardMaterial color="#d6c7a1" transparent opacity={0.85} roughness={1} /></mesh>;
}

export const conveyorScene: MachineSceneDef = {
  id: 'conveyor',
  Scene,
  camera: { pos: [1.2, 2.6, 4.6], target: [0.2, 0.6, -0.2] },
  radius: 3.6,
  moving: (rt) => (rt.scene.state as ConveyorState).motor.rpm > 1,
  readout: (rt) => {
    const s = rt.scene.state as ConveyorState;
    return `${((BELT_SPEED * Math.max(0, s.motor.rpm)) / MOTOR_RPM).toFixed(2)} m/s · ${s.bags.length} on belt · ${s.delivered} delivered`;
  },
  describe: 'a 6 m bag conveyor with an entry and an exit photo-eye (beam and eye LED show what each sensor sees), a head-end motor, the starter panel with its door shown open, and a stack light.',
};
