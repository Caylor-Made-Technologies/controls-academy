import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh } from 'three';
import type { MixerState } from '../../plant/mixer';
import { Box, Label } from '../kit';
import { Belt, Cabinet, Display, FanWheel, Lamp, PAINT, Pick, Pipe, Screw, Spinner } from './parts';
import type { MachineSceneDef, MachineSceneProps } from './types';

const FULL_LB = 2000;
const VY = 1.15; // weigh-mixer vessel bottom
const VH = 0.8; // vessel height

/** Flour inside the weigh-mixer, from the TRUE weight (what is really in the vessel). */
function Fill({ weight }: { weight: () => number }) {
  const m = useRef<Mesh>(null);
  useFrame(() => {
    const f = Math.max(0.001, Math.min(1, weight() / FULL_LB));
    if (m.current) { m.current.scale.y = f; m.current.position.y = VY + (f * VH) / 2; }
  });
  return <mesh ref={m} position={[0, VY, 0]}><cylinderGeometry args={[0.44, 0.44, VH, 32]} /><meshStandardMaterial color={PAINT.flour} roughness={1} /></mesh>;
}

/** Slide gate under the vessel outlet. */
function Gate({ open }: { open: () => number }) {
  const g = useRef<Group>(null);
  useFrame(() => { if (g.current) g.current.position.x = Math.max(0, Math.min(1, open())) * 0.28; });
  return <group ref={g}><Box size={[0.3, 0.03, 0.3]} pos={[0, VY - 0.2, 0]} color="#64748b" metal={0.6} rough={0.4} /></group>;
}

/** What the PLC thinks: the scaled Weight tag and the step number (901–906 = fault code). */
export function batchPanelText(weight: number, step: number): string {
  return `${Math.round(weight)} lb\nSTEP ${step}`;
}

function Scene(p: MachineSceneProps) {
  const s = () => p.rt.scene.state as MixerState;
  const sel = (id: string) => p.selected === id;
  const io = () => p.rt.io;
  const tag = (n: string) => { try { return p.rt.plc.tags.readNum(n); } catch { return 0; } };
  return (
    <group>
      {/* feed screws A and B into the top of the weigh-mixer (A doesn't turn when jammed) */}
      <Pick id="screwa" label="Feed screw A" size={[1.4, 0.3, 0.3]} pos={[-1.05, VY + VH + 0.35, -0.18]} selected={sel('screwa')} onPick={p.onPick}>
        <group position={[-1.05, VY + VH + 0.35, -0.18]}>
          <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.13, 0.13, 1.3, 24, 1, true]} /><meshStandardMaterial color={PAINT.galv} metalness={0.7} roughness={0.35} transparent opacity={0.45} side={2} /></mesh>
          <Screw length={1.25} r={0.11} rps={() => (io().DO[1] && p.rt.scene.activeFault !== 'mx-screw' ? 2 : 0)} />
        </group>
      </Pick>
      <Pick id="screwb" label="Feed screw B" size={[1.4, 0.3, 0.3]} pos={[-1.05, VY + VH + 0.35, 0.22]} selected={sel('screwb')} onPick={p.onPick}>
        <group position={[-1.05, VY + VH + 0.35, 0.22]}>
          <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.13, 0.13, 1.3, 24, 1, true]} /><meshStandardMaterial color={PAINT.galv} metalness={0.7} roughness={0.35} transparent opacity={0.45} side={2} /></mesh>
          <Screw length={1.25} r={0.11} rps={() => (io().DO[2] ? 2 : 0)} />
        </group>
      </Pick>
      {/* weigh-mixer: the vessel sits on load cells; the agitator mixes in it; the gate at its outlet discharges */}
      <Pick id="wt" label="Weigh-mixer on load cells" size={[1.05, VH + 0.2, 1.05]} pos={[0, VY + VH / 2, 0]} selected={sel('wt')} onPick={p.onPick}>
        <mesh position={[0, VY + VH / 2, 0]}><cylinderGeometry args={[0.47, 0.47, VH, 40, 1, true]} /><meshStandardMaterial color="#e2e8f0" metalness={0.75} roughness={0.25} transparent opacity={0.35} side={2} depthWrite={false} /></mesh>
        <mesh position={[0, VY - 0.08, 0]}><coneGeometry args={[0.47, 0.16, 40, 1, true]} /><meshStandardMaterial color="#e2e8f0" metalness={0.75} roughness={0.25} side={2} /></mesh>
        <Fill weight={() => s().weight} />
        {[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z]) => (
          <group key={`${x}${z}`}>
            <Box size={[0.06, VY - 0.08, 0.06]} pos={[x * 1.05, (VY - 0.08) / 2, z * 1.05]} color="#4b5563" metal={0.5} rough={0.5} />
            <Box size={[0.09, 0.05, 0.09]} pos={[x * 1.05, VY + 0.03, z * 1.05]} color="#1e40af" rough={0.4} />
          </group>
        ))}
      </Pick>
      <Pick id="mixer" label="Mixer (agitator)" size={[0.9, VH, 0.9]} pos={[0, VY + VH / 2, 0]} selected={sel('mixer')} onPick={p.onPick}>
        <group position={[0, VY + VH / 2, 0]}>
          <Spinner rps={() => s().mixerSpin * 6} axis="y">
            {[-0.2, 0.15].map((y, i) => <mesh key={y} position={[0, y, 0]} rotation={[0, i * Math.PI / 2, 0]}><boxGeometry args={[0.8, 0.05, 0.06]} /><meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} /></mesh>)}
            <mesh><cylinderGeometry args={[0.03, 0.03, VH + 0.2, 12]} /><meshStandardMaterial color="#64748b" metalness={0.8} /></mesh>
          </Spinner>
        </group>
        {/* gearmotor on the cover */}
        <Box size={[0.22, 0.2, 0.22]} pos={[0, VY + VH + 0.12, 0]} color={PAINT.motor} metal={0.35} rough={0.5} />
      </Pick>
      {/* interlocked cover */}
      <mesh position={[0, VY + VH, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.47, 40]} /><meshStandardMaterial color="#cbd5e1" transparent opacity={0.3} depthWrite={false} /></mesh>
      <Label text="COVER INTERLOCKED — LOCK OUT BEFORE OPENING" pos={[0, VY + VH + 0.03, 0.5]} w={0.8} h={0.06} fg="#111" bg="#f5c400" />
      {/* discharge gate (slides open) with its limit switches */}
      <Pick id="gate" label="Discharge gate" size={[0.5, 0.15, 0.4]} pos={[0.1, VY - 0.2, 0]} selected={sel('gate')} onPick={p.onPick}>
        <Gate open={() => s().gate} />
      </Pick>
      <Pick id="gatecl" label="Gate closed LS" size={[0.08, 0.08, 0.08]} pos={[-0.22, VY - 0.2, 0.2]} selected={sel('gatecl')} onPick={p.onPick}>
        <Lamp pos={[-0.22, VY - 0.2, 0.2]} color="#3ddc97" on={() => io().DI[3]} r={0.02} rot={[0, 0, 0]} />
      </Pick>
      <Pick id="gateop" label="Gate open LS" size={[0.08, 0.08, 0.08]} pos={[0.5, VY - 0.2, 0.2]} selected={sel('gateop')} onPick={p.onPick}>
        <Lamp pos={[0.5, VY - 0.2, 0.2]} color="#3ddc97" on={() => io().DI[4]} r={0.02} rot={[0, 0, 0]} />
      </Pick>
      {/* discharge conveyor under the gate */}
      <Pick id="conv" label="Discharge conveyor" size={[2.6, 0.3, 0.5]} pos={[0.8, 0.45, 0]} selected={sel('conv')} onPick={p.onPick}>
        <Box size={[2.6, 0.08, 0.5]} pos={[0.8, 0.38, 0]} color={PAINT.steel} metal={0.6} rough={0.4} />
        <Belt length={2.5} width={0.42} speed={() => s().convSpin * 0.6} pos={[0.8, 0.425, 0]} />
        {[-0.3, 1.9].map((x) => <Box key={x} size={[0.06, 0.38, 0.4]} pos={[x, 0.19, 0]} color="#4b5563" />)}
      </Pick>
      <Pick id="convaux" label="Conveyor aux contact" size={[0.08, 0.08, 0.08]} pos={[2.1, 0.5, 0.3]} selected={sel('convaux')} onPick={p.onPick}>
        <Lamp pos={[2.1, 0.5, 0.3]} color="#3ddc97" on={() => io().DI[5]} r={0.02} rot={[0, 0, 0]} />
      </Pick>
      {/* dust collector: fan turns with the real airflow; the DP switch light is its own proof */}
      <Pick id="dcrun" label="Dust collector" size={[0.8, 2.4, 0.8]} pos={[2.1, 1.2, -0.9]} selected={sel('dcrun')} onPick={p.onPick}>
        <mesh position={[2.1, 1.3, -0.9]} castShadow><cylinderGeometry args={[0.35, 0.35, 1.6, 32]} /><meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.4} /></mesh>
        <mesh position={[2.1, 0.3, -0.9]} castShadow><coneGeometry args={[0.35, 0.5, 32]} /><meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.4} /></mesh>
        <group position={[2.1, 2.2, -0.9]} rotation={[0, 0, Math.PI / 2]}><FanWheel rps={() => (io().DO[0] ? 20 : 0)} r={0.22} /></group>
        <Lamp pos={[2.4, 1.6, -0.62]} color="#3ddc97" on={() => io().DO[0]} r={0.02} />
        <Pipe from={[0.3, VY + VH + 0.05, -0.2]} to={[2.1, VY + VH + 0.05, -0.9]} r={0.06} />
        <Pipe from={[2.1, VY + VH + 0.05, -0.9]} to={[2.1, 2.1, -0.9]} r={0.06} />
      </Pick>
      <Pick id="dc" label="Dust collector DP switch" size={[0.1, 0.1, 0.1]} pos={[2.1, 1.3, -0.52]} selected={sel('dc')} onPick={p.onPick}>
        <Lamp pos={[2.1, 1.3, -0.53]} color="#3ddc97" on={() => io().DI[2]} r={0.025} />
      </Pick>
      {/* batch panel: shows what the PLC sees (scaled Weight tag) and the step number */}
      <Cabinet pos={[-1.9, 0, 0.9]} size={[0.7, 1.4, 0.25]} label="BATCH">
        <Display pos={[0, 1.08, 0.127]} w={0.5} h={0.18} text={() => batchPanelText(tag('Weight'), tag('Step'))} />
        <Pick id="runlt" label="Batch running light" size={[0.07, 0.07, 0.05]} pos={[-0.12, 0.92, 0.13]} selected={sel('runlt')} onPick={p.onPick}>
          <Lamp pos={[-0.12, 0.92, 0.13]} color="#3ddc97" on={() => io().DO[7]} r={0.022} />
        </Pick>
        <Pick id="faultlt" label="Fault light" size={[0.07, 0.07, 0.05]} pos={[0.12, 0.92, 0.13]} selected={sel('faultlt')} onPick={p.onPick}>
          <Lamp pos={[0.12, 0.92, 0.13]} color="#ffb547" on={() => io().DO[6]} r={0.022} />
        </Pick>
        {(['start', 'stop', 'reset'] as const).map((id, i) => (
          <Pick key={id} id={id} label={id === 'start' ? 'Start batch' : id[0].toUpperCase() + id.slice(1)} size={[0.07, 0.07, 0.05]} pos={[-0.15 + i * 0.15, 0.78, 0.13]} selected={sel(id)} onPick={p.onPick}>
            <mesh position={[-0.15 + i * 0.15, 0.78, 0.13]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.024, 0.024, 0.02, 20]} /><meshStandardMaterial color={id === 'start' ? '#16a34a' : id === 'stop' ? '#dc2626' : '#e5e7eb'} /></mesh>
          </Pick>
        ))}
        {/* E-stop drawn for realism; it's a separate hardwired circuit not modeled here */}
        <Box size={[0.1, 0.1, 0.03]} pos={[0, 0.6, 0.135]} color="#facc15" rough={0.5} />
        <mesh position={[0, 0.6, 0.16]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035, 0.03, 0.03, 24]} /><meshStandardMaterial color="#dc2626" roughness={0.35} /></mesh>
        <Label text="E-STOP: SEPARATE HARDWIRED CIRCUIT (not modeled)" pos={[0, 0.48, 0.127]} w={0.62} h={0.05} fg="#111" bg="#f5c400" />
      </Cabinet>
    </group>
  );
}

export const mixerScene: MachineSceneDef = {
  id: 'mixer',
  Scene,
  camera: { pos: [1.3, 3.25, 5.0], target: [0.2, 1.3, 0] },
  radius: 3.2,
  moving: (rt) => {
    const s = rt.scene.state as MixerState;
    return rt.io.DO[0] || rt.io.DO[1] || rt.io.DO[2] || s.mixerSpin > 0.01 || s.convSpin > 0.01 || (s.gate > 0.001 && s.gate < 0.999);
  },
  readout: (rt) => {
    const s = rt.scene.state as MixerState;
    return `${Math.round(s.weight)} lb (actual) · gate ${Math.round(s.gate * 100)} % · ${s.batches} batches`;
  },
  describe: 'a flour weigh-mixer: two feed screws fill the vessel on load cells (the flour level is the true weight), the agitator mixes in it, and a slide gate with open and closed limit switches discharges onto a conveyor. The batch panel shows what the PLC reads and the step number; the dust collector fan and its airflow switch are on the right.',
};
