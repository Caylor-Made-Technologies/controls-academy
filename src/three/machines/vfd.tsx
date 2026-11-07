import type { VfdState } from '../../plant/vfd';
import { Box, Label } from '../kit';
import { Cabinet, Display, FanWheel, Lamp, Motor, PAINT, Pick, Pipe } from './parts';
import type { MachineSceneDef, MachineSceneProps } from './types';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';

const st = (p: { rt: MachineSceneProps['rt'] }) => p.rt.scene.state as VfdState;

/** The drive keypad text, built only from the simulation (no real product's codes or menus). */
export function keypadText(s: VfdState): string {
  if (s.fault) return `FAULT\n${s.fault}`;
  if (!s.stoClosed) return `SAFE TORQUE OFF\n${s.hz.toFixed(1)} Hz`;
  if (s.running || s.hz > 0.05) return `${s.hz.toFixed(1)} Hz  ${s.running ? 'RUN' : 'STOP'}\n${s.amps.toFixed(1)} A  ${Math.round(s.bus)} V`;
  return `READY  0.0 Hz\nBUS ${Math.round(s.bus)} V`;
}

function Knob({ value }: { value: () => number }) {
  const g = useRef<Group>(null);
  useFrame(() => { if (g.current) g.current.rotation.z = (0.5 - value() / 100) * Math.PI * 1.5; });
  return (
    <group ref={g}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035, 0.035, 0.03, 24]} /><meshStandardMaterial color="#1f2937" roughness={0.4} /></mesh>
      <mesh position={[0, 0.024, 0.016]}><boxGeometry args={[0.006, 0.02, 0.004]} /><meshStandardMaterial color="#f8fafc" /></mesh>
    </group>
  );
}

function Scene(p: MachineSceneProps) {
  const s = () => st(p);
  const rps = () => s().rpm / 60;
  const sel = (id: string) => p.selected === id;
  return (
    <group>
      {/* drive in its own enclosure */}
      <Pick id="drive" label="VFD" size={[0.56, 1.05, 0.36]} pos={[-1.3, 0.55, 0]} selected={sel('drive')} onPick={p.onPick}>
        <Cabinet pos={[-1.3, 0.02, 0]} size={[0.5, 1, 0.3]} label="VFD-1  FAN DRIVE" color="#d4d9de">
          <Box size={[0.3, 0.2, 0.03]} pos={[0, 0.72, 0.16]} color="#20262e" rough={0.4} />
          <Display pos={[0, 0.76, 0.176]} w={0.26} h={0.09} text={() => keypadText(s())} />
          {/* keypad keys (generic, unlabeled except arrows/run/stop) */}
          {[-0.09, -0.03, 0.03, 0.09].map((x, i) => (
            <mesh key={x} position={[x, 0.66, 0.178]}><boxGeometry args={[0.04, 0.025, 0.008]} /><meshStandardMaterial color={i === 0 ? '#15803d' : i === 3 ? '#b91c1c' : '#475569'} roughness={0.5} /></mesh>
          ))}
          <Lamp pos={[0.2, 0.86, 0.16]} color="#3ddc97" on={() => s().running} r={0.012} />
          <Lamp pos={[0.2, 0.82, 0.16]} color="#ffb547" on={() => Boolean(s().fault)} r={0.012} />
          <Label text="DC BUS: WAIT, THEN TEST BEFORE TOUCH" pos={[0, 0.45, 0.153]} w={0.4} h={0.04} fg="#111" bg="#f5c400" />
          {/* braking resistor on top when fitted */}
        </Cabinet>
      </Pick>
      <BrakeResistor on={() => s().brakeResistor} />
      {/* safety relay feeding STO */}
      <Pick id="sto" label="STO circuit" size={[0.14, 0.2, 0.12]} pos={[-0.95, 0.75, 0]} selected={sel('sto')} onPick={p.onPick}>
        <Box size={[0.1, 0.16, 0.09]} pos={[-0.95, 0.75, 0]} color="#facc15" rough={0.5} />
        <Lamp pos={[-0.95, 0.8, 0.048]} color="#3ddc97" on={() => s().stoClosed} r={0.01} />
      </Pick>
      {/* motor cable in conduit */}
      <Pipe from={[-1.05, 0.12, 0]} to={[0.2, 0.12, 0]} r={0.02} color="#6b7280" />
      {/* motor on a base, coupled to the fan shaft (both at 0.45 m) */}
      <Box size={[0.5, 0.3, 0.36]} pos={[0.45, 0.15, 0]} color="#4b5563" metal={0.4} rough={0.6} />
      <Pick id="motor" label="Fan motor" size={[0.7, 0.4, 0.4]} pos={[0.5, 0.45, 0]} selected={sel('motor')} onPick={p.onPick}>
        <Motor pos={[0.45, 0.45, 0]} rps={rps} scale={0.9} />
      </Pick>
      <mesh position={[0.74, 0.45, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.045, 0.045, 0.08, 20]} /><meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} /></mesh>
      <mesh position={[0.86, 0.45, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.022, 0.022, 0.18, 12]} /><meshStandardMaterial color="#d1d5db" metalness={0.9} roughness={0.25} /></mesh>
      <group position={[1.0, 0.45, 0]}>
        <FanWheel rps={rps} r={0.32} />
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.36, 0.36, 0.08, 40, 1, true]} />
          <meshStandardMaterial color={PAINT.galv} metalness={0.7} roughness={0.35} side={2} />
        </mesh>
        <Box size={[0.12, 0.09, 0.5]} pos={[0, -0.405, 0]} color="#4b5563" metal={0.4} rough={0.6} />
      </group>
      <CoastWarning show={() => !s().stoClosed && s().rpm > 1} />
      {/* guard (STO interlocked) */}
      <group position={[1.08, 0.45, 0]}>
        <GuardScreen closed={() => s().stoClosed} />
      </group>
      {/* operator station */}
      <group position={[-0.35, 0, 0.75]}>
        <mesh position={[0, 0.45, 0]} castShadow><cylinderGeometry args={[0.025, 0.025, 0.9, 12]} /><meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.4} /></mesh>
        <Box size={[0.36, 0.3, 0.1]} pos={[0, 1.0, 0]} color="#d6dbe0" metal={0.4} rough={0.45} />
        <Pick id="start" label="Start" size={[0.08, 0.08, 0.06]} pos={[-0.1, 1.06, 0.06]} selected={sel('start')} onPick={p.onPick}>
          <mesh position={[-0.1, 1.06, 0.06]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 0.02, 20]} /><meshStandardMaterial color="#16a34a" roughness={0.4} /></mesh>
        </Pick>
        <Pick id="stop" label="Stop" size={[0.08, 0.08, 0.06]} pos={[0, 1.06, 0.06]} selected={sel('stop')} onPick={p.onPick}>
          <mesh position={[0, 1.06, 0.06]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 0.02, 20]} /><meshStandardMaterial color="#dc2626" roughness={0.4} /></mesh>
        </Pick>
        <Pick id="reset" label="Reset" size={[0.08, 0.08, 0.06]} pos={[0.1, 1.06, 0.06]} selected={sel('reset')} onPick={p.onPick}>
          <mesh position={[0.1, 1.06, 0.06]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 0.02, 20]} /><meshStandardMaterial color="#e5e7eb" roughness={0.4} /></mesh>
        </Pick>
        <Pick id="pot" label="Speed pot" size={[0.09, 0.09, 0.06]} pos={[-0.08, 0.94, 0.06]} selected={sel('pot')} onPick={p.onPick}>
          <group position={[-0.08, 0.94, 0.065]}><Knob value={() => s().speedPot} /></group>
        </Pick>
        <Pick id="sto" label="E-stop (in the STO safety circuit)" size={[0.09, 0.09, 0.06]} pos={[0.13, 1.21, 0.0]} selected={sel('sto')} onPick={p.onPick}>
          <Box size={[0.1, 0.1, 0.06]} pos={[0.13, 1.21, 0]} color="#facc15" rough={0.5} />
          <mesh position={[0.13, 1.21, 0.045]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035, 0.03, 0.03, 24]} /><meshStandardMaterial color="#dc2626" roughness={0.35} /></mesh>
        </Pick>
        <Pick id="runlt" label="Running light" size={[0.06, 0.06, 0.05]} pos={[0.05, 0.94, 0.06]} selected={sel('runlt')} onPick={p.onPick}>
          <Lamp pos={[0.05, 0.94, 0.055]} color="#3ddc97" on={() => p.rt.io.DO[2]} r={0.018} />
        </Pick>
        <Pick id="faultlt" label="Fault light" size={[0.06, 0.06, 0.05]} pos={[0.12, 0.94, 0.06]} selected={sel('faultlt')} onPick={p.onPick}>
          <Lamp pos={[0.12, 0.94, 0.055]} color="#ffb547" on={() => p.rt.io.DO[3]} r={0.018} />
        </Pick>
      </group>
    </group>
  );
}

function BrakeResistor({ on }: { on: () => boolean }) {
  const g = useRef<Group>(null);
  useFrame(() => { if (g.current) g.current.visible = on(); });
  return (
    <group ref={g} position={[-1.3, 1.08, 0]}>
      <Box size={[0.36, 0.08, 0.14]} pos={[0, 0, 0]} color="#6b7280" metal={0.6} rough={0.4} />
      <Label text="BRAKING RESISTOR — HOT" pos={[0, 0, 0.072]} w={0.3} h={0.035} fg="#111" bg="#f5c400" />
    </group>
  );
}

/** Opening the guard drops torque (STO), but a heavy fan keeps turning for a long time. */
function CoastWarning({ show }: { show: () => boolean }) {
  const g = useRef<Group>(null);
  useFrame(() => { if (g.current) g.current.visible = show(); });
  return (
    <group ref={g} position={[1.0, 1.0, 0.2]} visible={false}>
      <Label text="FAN STILL COASTING — KEEP CLEAR" pos={[0, 0, 0]} w={0.6} h={0.07} fg="#111" bg="#f5c400" />
    </group>
  );
}

function GuardScreen({ closed }: { closed: () => boolean }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += ((closed() ? 0 : -1.2) - g.current.rotation.y) * Math.min(1, dt * 8); });
  return (
    <group ref={g} position={[0, 0, 0.37]}>
      <mesh position={[0, 0, -0.37]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.37, 40]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.4} transparent opacity={0.55} wireframe />
      </mesh>
    </group>
  );
}

export const vfdScene: MachineSceneDef = {
  id: 'vfd',
  Scene,
  camera: { pos: [0.4, 1.6, 3.0], target: [-0.15, 0.6, 0] },
  radius: 1.8,
  moving: (rt) => { const s = rt.scene.state as VfdState; return s.rpm > 1 || s.hz > 0.05; },
  signature: (rt) => { const s = rt.scene.state as VfdState; return `${s.brakeResistor}|${s.stoClosed}|${s.fault}|${Math.round(s.speedPot)}`; },
  readout: (rt) => { const s = rt.scene.state as VfdState; return `${s.hz.toFixed(1)} Hz · ${Math.round(s.rpm / 10) * 10} rpm · ${s.amps.toFixed(1)} A`; },
  describe: 'a fan driven by a variable frequency drive, with the drive keypad showing live frequency, current and DC bus voltage, a Safe Torque Off relay and E-stop, the fan guard (a warning shows while the fan coasts down with the guard open) and an operator station.',
};
