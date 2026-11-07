import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { DoubleSide, type Mesh } from 'three';
import type { FwdRevState } from '../../plant/fwdrev';
import { Box, Label } from '../kit';
import { Cabinet, Lamp, Motor, PAINT, Pick, Screw } from './parts';
import type { MachineSceneDef, MachineSceneProps } from './types';

/** A contactor whose armature (front face) pulls in when energized. */
export function Contactor({ pos, on, label }: { pos: [number, number, number]; on: () => boolean; label: string }) {
  const a = useRef<Mesh>(null);
  useFrame((_, dt) => { if (a.current) a.current.position.z += ((on() ? 0.045 : 0.06) - a.current.position.z) * Math.min(1, dt * 30); });
  return (
    <group position={pos}>
      <Box size={[0.1, 0.14, 0.08]} pos={[0, 0, 0.04]} color="#2b3240" rough={0.5} />
      <mesh ref={a} position={[0, 0, 0.06]}><boxGeometry args={[0.07, 0.05, 0.05]} /><meshStandardMaterial color="#e5e7eb" roughness={0.5} /></mesh>
      <Label text={label} pos={[0, 0.055, 0.0805]} w={0.06} h={0.02} fg="#e8f1ff" bg="#1a2230" />
    </group>
  );
}

function Scene(p: MachineSceneProps) {
  const s = () => p.rt.scene.state as FwdRevState;
  const motorRps = () => s().motor.rpm / 60;
  const rps = () => motorRps() / 20; // ~20:1 gearbox
  const sel = (id: string) => p.selected === id;
  return (
    <group>
      {/* U-trough with the screw inside */}
      <group position={[0.2, 0.55, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.2, 0.2, 2.4, 32, 1, true, Math.PI, Math.PI]} />
          <meshStandardMaterial color={PAINT.galv} metalness={0.7} roughness={0.35} side={DoubleSide} />
        </mesh>
        <Screw length={2.3} r={0.17} rps={rps} />
        <ChokeFill on={() => s().choked} />
        {/* bolted cover: a turning screw is an amputation hazard */}
        <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.4, 0.42]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.4} transparent opacity={0.3} side={DoubleSide} depthWrite={false} />
        </mesh>
        <Label text="COVER ON — LOCK OUT BEFORE OPENING" pos={[0.4, 0.205, 0.1]} rot={[-Math.PI / 2, 0, 0]} w={0.7} h={0.07} fg="#111" bg="#f5c400" />
        {[-1, 1].map((x) => <Box key={x} size={[0.06, 0.55, 0.06]} pos={[x, -0.3, 0]} color="#4b5563" metal={0.5} rough={0.5} />)}
      </group>
      {/* motor + gearbox at the drive end */}
      <Pick id="motor" label="Screw motor" size={[0.6, 0.4, 0.4]} pos={[-1.35, 0.55, 0]} selected={sel('motor')} onPick={p.onPick}>
        <Motor pos={[-1.45, 0.55, 0]} rps={motorRps} scale={0.85} />
        <Box size={[0.2, 0.26, 0.24]} pos={[-1.12, 0.55, 0]} color={PAINT.motor} metal={0.35} rough={0.5} />
      </Pick>
      {/* zero-speed switch on the tail shaft */}
      <Pick id="zss" label="Zero-speed switch" size={[0.16, 0.16, 0.16]} pos={[1.48, 0.55, 0]} selected={sel('zss')} onPick={p.onPick}>
        <Box size={[0.1, 0.1, 0.1]} pos={[1.48, 0.55, 0]} color="#facc15" rough={0.5} />
        <Lamp pos={[1.48, 0.62, 0.05]} color="#3ddc97" on={() => p.rt.io.DI[6]} r={0.012} />
      </Pick>
      {/* starter panel: F and R contactors, overload, pilot lights */}
      <Cabinet pos={[-0.6, 0, -0.9]} size={[0.8, 1.2, 0.25]} label="F/R STARTER">
        <StarterDoorNote y={1.25} />
        <Pick id="fcoil" label="Forward contactor" size={[0.14, 0.18, 0.12]} pos={[-0.16, 0.8, 0.17]} selected={sel('fcoil')} onPick={p.onPick}>
          <Contactor pos={[-0.16, 0.8, 0.125]} on={() => s().f} label="F" />
        </Pick>
        <Pick id="rcoil" label="Reverse contactor" size={[0.14, 0.18, 0.12]} pos={[0.0, 0.8, 0.17]} selected={sel('rcoil')} onPick={p.onPick}>
          <Contactor pos={[0.0, 0.8, 0.125]} on={() => s().r} label="R" />
        </Pick>
        <Pick id="ol" label="Overload" size={[0.14, 0.1, 0.1]} pos={[-0.08, 0.66, 0.17]} selected={sel('ol')} onPick={p.onPick}>
          <Box size={[0.18, 0.06, 0.07]} pos={[-0.08, 0.66, 0.16]} color="#334155" rough={0.5} />
          <Lamp pos={[0.0, 0.66, 0.2]} color="#ff6b6b" on={() => s().motor.tripped} r={0.01} />
        </Pick>
        {/* mechanical interlock bar between F and R */}
        <Box size={[0.04, 0.02, 0.02]} pos={[-0.08, 0.8, 0.2]} color="#f97316" />
        <Pick id="fwdlt" label="Fwd light" size={[0.06, 0.06, 0.05]} pos={[0.22, 0.95, 0.13]} selected={sel('fwdlt')} onPick={p.onPick}>
          <Lamp pos={[0.22, 0.95, 0.13]} color="#3ddc97" on={() => p.rt.io.DO[2]} r={0.022} />
        </Pick>
        <Pick id="revlt" label="Rev light" size={[0.06, 0.06, 0.05]} pos={[0.3, 0.95, 0.13]} selected={sel('revlt')} onPick={p.onPick}>
          <Lamp pos={[0.3, 0.95, 0.13]} color="#3ddc97" on={() => p.rt.io.DO[3]} r={0.022} />
        </Pick>
        <Pick id="fwd" label="Forward" size={[0.06, 0.06, 0.05]} pos={[0.22, 0.85, 0.13]} selected={sel('fwd')} onPick={p.onPick}>
          <mesh position={[0.22, 0.85, 0.13]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.02, 0.02, 0.02, 20]} /><meshStandardMaterial color="#16a34a" /></mesh>
        </Pick>
        <Pick id="rev" label="Reverse" size={[0.06, 0.06, 0.05]} pos={[0.3, 0.85, 0.13]} selected={sel('rev')} onPick={p.onPick}>
          <mesh position={[0.3, 0.85, 0.13]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.02, 0.02, 0.02, 20]} /><meshStandardMaterial color="#16a34a" /></mesh>
        </Pick>
        <Pick id="stop" label="Stop" size={[0.06, 0.06, 0.05]} pos={[0.26, 0.75, 0.13]} selected={sel('stop')} onPick={p.onPick}>
          <mesh position={[0.26, 0.75, 0.13]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.022, 0.022, 0.02, 20]} /><meshStandardMaterial color="#dc2626" /></mesh>
        </Pick>
      </Cabinet>
    </group>
  );
}

function ChokeFill({ on }: { on: () => boolean }) {
  const m = useRef<Mesh>(null);
  useFrame(() => { if (m.current) m.current.visible = on(); });
  return (
    <mesh ref={m} position={[0.7, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.18, 0.18, 0.7, 20, 1, false, Math.PI, Math.PI]} />
      <meshStandardMaterial color={PAINT.flour} roughness={1} />
    </mesh>
  );
}

/** Shown on starter panels drawn with the door open so you can see inside. */
export function StarterDoorNote({ y }: { y: number }) {
  return <Label text="DOOR SHOWN OPEN · 480 V INSIDE · NFPA 70E / LOCK OUT" pos={[0, y, 0.13]} w={0.78} h={0.06} fg="#111" bg="#f5c400" />;
}

export const fwdrevScene: MachineSceneDef = {
  id: 'fwdrev',
  Scene,
  camera: { pos: [1.2, 1.9, 2.6], target: [0, 0.55, -0.2] },
  radius: 1.8,
  moving: (rt) => Math.abs((rt.scene.state as FwdRevState).motor.rpm) > 1,
  signature: (rt) => String((rt.scene.state as FwdRevState).choked),
  readout: (rt) => {
    const s = rt.scene.state as FwdRevState;
    const rpm = s.motor.rpm;
    return `${Math.abs(rpm) < 1 ? 'Stopped' : rpm > 0 ? 'Forward' : 'Reverse'} · motor ${Math.round(Math.abs(rpm) / 10) * 10} rpm · ${s.motor.amps.toFixed(1)} A`;
  },
  describe: 'a covered screw conveyor in a U-trough, driven by a motor and a 20:1 gearbox through forward and reverse contactors (shown with the starter door open), with a zero-speed switch on the tail shaft.',
};
