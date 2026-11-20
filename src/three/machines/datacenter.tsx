import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import type { DcState } from '../../plant/datacenter';
import { Box, Label } from '../kit';
import { Cabinet, Display, FanWheel, Lamp, Pick, Pipe, Valve } from './parts';
import type { MachineSceneDef, MachineSceneProps } from './types';
import { lowDetail, surface } from '../materials';
import { rackFrontTexture } from '../textures';

/** ATS position pointer: left = Normal (utility), center = open (moving), right = Emergency (generator). */
function AtsPointer({ pos }: { pos: () => DcState['ats'] }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => {
    const p = pos();
    const goal = p === 'N' ? 0.7 : p === 'E' ? -0.7 : 0;
    if (g.current) g.current.rotation.z += (goal - g.current.rotation.z) * Math.min(1, dt * 6);
  });
  return (
    <group ref={g}>
      <mesh position={[0, 0.09, 0]}><boxGeometry args={[0.025, 0.18, 0.02]} /><meshStandardMaterial color="#111827" /></mesh>
    </group>
  );
}

function Scene(p: MachineSceneProps) {
  const s = () => p.rt.scene.state as DcState;
  const sel = (id: string) => p.selected === id;
  const fine = !lowDetail();
  const rack = useMemo(() => rackFrontTexture(), []);
  // A start request isn't a running engine: with a dead battery (dc-gen) it never turns over.
  const genRunning = () => s().genTime >= 0 && p.rt.scene.activeFault !== 'dc-gen';
  return (
    <group>
      {/* utility transformer (pad-mount) */}
      {/* Utility transformer sits right of the generator, so the camera sees it (it was hidden behind). */}
      <group position={[0.7, 0, -0.1]}>
      <Pick id="util" label="Utility sensing" size={[0.9, 0.9, 0.8]} pos={[-2.6, 0.45, -0.3]} selected={sel('util')} onPick={p.onPick}>
        <Box size={[0.8, 0.8, 0.7]} pos={[-2.6, 0.4, -0.3]} color="#3f6b4f" s="enamel" />
        {/* pad-mount transformer: concrete pad, cooling fins down both sides, three bushings on top */}
        {fine && <Box size={[1.1, 0.06, 1.0]} pos={[-2.6, 0.03, -0.3]} color="#8a9099" s="plasticMatte" />}
        {fine && [-1, 1].flatMap((side) => [-0.24, -0.12, 0, 0.12, 0.24].map((z) => (
          <Box key={`${side}${z}`} size={[0.07, 0.6, 0.02]} pos={[-2.6 + side * 0.43, 0.42, -0.3 + z]} color="#35594a" s="enamel" round={0} />
        )))}
        {fine && [-0.2, 0, 0.2].map((x) => (
          <mesh key={x} position={[-2.6 + x, 0.87, -0.3]} material={surface('plasticGloss', '#7c5a3a')}><cylinderGeometry args={[0.03, 0.045, 0.14, 12]} /></mesh>
        ))}
        <Label text="UTILITY" pos={[-2.6, 0.65, 0.052]} w={0.3} h={0.07} fg="#fff" bg="#1f2937" />
        <Lamp pos={[-2.6, 0.5, 0.06]} color="#3ddc97" on={() => s().utility} r={0.03} />
      </Pick>
      </group>
      {/* generator */}
      <Pick id="gen" label="Generator" size={[1.4, 0.9, 0.8]} pos={[-2.4, 0.45, 1.2]} selected={sel('gen')} onPick={p.onPick}>
        <Box size={[1.3, 0.8, 0.7]} pos={[-2.4, 0.44, 1.2]} color="#d4a017" s="enamel" />
        {/* generator set: steel skid, access-door seams, radiator louvers at the fan end */}
        {fine && <Box size={[1.4, 0.06, 0.8]} pos={[-2.4, 0.03, 1.2]} color="#2a313b" s="castIron" />}
        {fine && [-2.75, -2.3].map((x) => <Box key={x} size={[0.008, 0.66, 0.004]} pos={[x, 0.44, 1.552]} color="#1b1e22" s="rubber" round={0} />)}
        {fine && [0.2, 0.32, 0.44, 0.56, 0.68].map((y) => <Box key={y} size={[0.3, 0.035, 0.012]} pos={[-1.95, y, 1.556]} color="#a8820f" s="enamel" round={0} />)}
        <Label text="GENERATOR" pos={[-2.4, 0.66, 1.557]} w={0.5} h={0.1} fg="#111" bg="#fde68a" />
        <Label text="MAY START AUTOMATICALLY" pos={[-2.42, 0.3, 1.557]} w={0.6} h={0.085} fg="#fff" bg="#b91c1c" />
        {/* radiator at the fan end: a dark finned core in a frame, the fan blows through it */}
        <Box size={[0.03, 0.66, 0.6]} pos={[-1.765, 0.44, 1.2]} color="#1c1f24" s="castIron" round={0} />
        {fine && [-0.24, -0.12, 0, 0.12, 0.24].map((dz) => <Box key={`r${dz}`} size={[0.012, 0.62, 0.012]} pos={[-1.748, 0.44, 1.2 + dz]} color="#4b5563" s="castIron" round={0} />)}
        <group position={[-1.72, 0.42, 1.2]}><FanWheel rps={() => (genRunning() ? 30 : 0)} r={0.26} /></group>
        <Lamp pos={[-2.7, 0.5, 1.56]} color="#3ddc97" on={() => s().genReady} r={0.03} />
        {/* roof: a darker cap with a drip lip, lifting eyes at the corners, and the exhaust: a muffler on the roof
            feeding a stack with a hinged rain cap (closes when the engine stops so rain can't get in) */}
        <Box size={[1.34, 0.035, 0.74]} pos={[-2.4, 0.857, 1.2]} color="#b8890f" s="enamel" />
        {fine && [[-2.98, 0.94], [-1.82, 0.94], [-2.98, 1.46], [-1.82, 1.46]].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.9, z]} rotation={[0, Math.PI / 4, 0]}><torusGeometry args={[0.03, 0.009, 8, 16]} /><meshStandardMaterial color="#9aa3ad" metalness={0.8} roughness={0.35} /></mesh>
        ))}
        <mesh position={[-2.55, 0.94, 1.1]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.075, 0.075, 0.5, 20]} /><meshStandardMaterial color="#3b4048" metalness={0.6} roughness={0.55} /></mesh>
        {fine && [-2.79, -2.31].map((x) => <mesh key={x} position={[x, 0.94, 1.1]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.079, 0.079, 0.012, 20]} /><meshStandardMaterial color="#2a2e34" metalness={0.6} roughness={0.5} /></mesh>)}
        {[-2.7, -2.4].map((x) => <Box key={x} size={[0.06, 0.07, 0.17]} pos={[x, 0.905, 1.1]} color="#2a2e34" s="castIron" round={0} />)}
        <Pipe from={[-2.8, 0.94, 1.1]} to={[-2.8, 1.25, 1.1]} r={0.04} color="#374151" />
        <mesh position={[-2.8, 1.262, 1.115]} rotation={[0.35, 0, 0]}><cylinderGeometry args={[0.046, 0.046, 0.008, 18]} /><meshStandardMaterial color="#2a2e34" metalness={0.6} roughness={0.5} /></mesh>
        {/* door handles beside the access-door seams */}
        {fine && [-2.8, -2.35].map((x) => <Box key={`h${x}`} size={[0.018, 0.09, 0.02]} pos={[x, 0.44, 1.56]} color="#c7ccd2" s="brushedSteel" round={0.004} />)}
      </Pick>
      <Pick id="genstart" label="Gen start signal" size={[0.12, 0.12, 0.1]} pos={[-2.1, 0.55, 1.57]} selected={sel('genstart')} onPick={p.onPick}>
        <Lamp pos={[-2.1, 0.55, 1.56]} color="#22d3ee" on={() => p.rt.io.DO[0]} r={0.02} />
      </Pick>
      {/* ATS */}
      <Cabinet pos={[-0.9, 0, 0]} size={[0.8, 1.6, 0.4]} label="ATS">
        <Box size={[0.4, 0.3, 0.02]} pos={[0, 0.95, 0.21]} color="#f1f5f9" rough={0.5} />
        <Label text="TWO SOURCES — LOCK OUT BOTH" pos={[0, 0.3, 0.202]} w={0.6} h={0.06} fg="#fff" bg="#b91c1c" />
        <Label text="lamp colors vary by site" pos={[0, 0.2, 0.202]} w={0.4} h={0.04} fg="#e5e7eb" bg="#1f2937" />
        <Label text="N" pos={[-0.14, 1.05, 0.222]} w={0.06} h={0.06} />
        <Label text="E" pos={[0.14, 1.05, 0.222]} w={0.06} h={0.06} />
        <group position={[0, 0.88, 0.225]}><AtsPointer pos={() => s().ats} /></group>
        <Pick id="atsn" label="ATS normal switch" size={[0.08, 0.08, 0.06]} pos={[-0.2, 0.6, 0.21]} selected={sel('atsn')} onPick={p.onPick}>
          <Lamp pos={[-0.2, 0.6, 0.21]} color="#3ddc97" on={() => p.rt.io.DI[2]} r={0.025} />
        </Pick>
        <Pick id="atse" label="ATS emergency switch" size={[0.08, 0.08, 0.06]} pos={[0.2, 0.6, 0.21]} selected={sel('atse')} onPick={p.onPick}>
          <Lamp pos={[0.2, 0.6, 0.21]} color="#ffb547" on={() => p.rt.io.DI[3]} r={0.025} />
        </Pick>
        <Pick id="faillt" label="Gen/ATS fail light" size={[0.08, 0.08, 0.06]} pos={[0, 0.45, 0.21]} selected={sel('faillt')} onPick={p.onPick}>
          <Lamp pos={[0, 0.45, 0.21]} color="#ff4d4d" on={() => p.rt.io.DO[3]} r={0.025} />
        </Pick>
      </Cabinet>
      {/* feeders */}
      {/* Power runs in conduit along the floor, rising into each cabinet (they used to hang in mid-air). */}
      {([
        // utility transformer → ATS normal side
        [[-1.47, 0.45, -0.4], [-1.47, 0.03, -0.4], [-1.36, 0.03, -0.4], [-1.36, 0.03, -0.1], [-1.36, 0.3, -0.1]],
        // generator → ATS emergency side
        [[-2.1, 0.4, 0.83], [-2.1, 0.03, 0.83], [-1.36, 0.03, 0.83], [-1.36, 0.03, 0.1], [-1.36, 0.3, 0.1]],
        // ATS load side → CRAH
        [[-0.46, 0.3, 0], [-0.46, 0.03, 0], [0.62, 0.03, 0], [0.62, 0.3, 0]],
      ] as [number, number, number][][]).flatMap((run, r) => run.slice(1).map((to, i) => (
        <Pipe key={`${r}-${i}`} from={run[i]} to={to} r={0.03} color="#1f2937" />
      )))}
      {/* CRAH unit */}
      <Cabinet pos={[1.1, 0, 0]} size={[0.9, 1.9, 0.6]} label="CRAH-1">
        <group position={[0, 1.45, 0.31]} rotation={[0, Math.PI / 2, 0]}><FanWheel rps={() => s().fanSpin * 18} r={0.3} /></group>
        <mesh position={[0, 1.45, 0.305]}><ringGeometry args={[0.3, 0.34, 40]} /><meshStandardMaterial color="#334155" /></mesh>
        {/* the unit's display shows its own sensor, so a failed transmitter shows here too */}
        <Display pos={[0, 0.95, 0.302]} w={0.36} h={0.14} text={() => (p.rt.io.AI[0] > 20.5 || p.rt.io.AI[0] < 3.5 ? 'SUPPLY  SENSOR FAULT' : `SUPPLY ${(((p.rt.io.AI[0] - 4) / 16) * 40).toFixed(1)} °C`) + `\nVALVE ${Math.round(s().valve)} %`} />
        <Pick id="air" label="Airflow switch" size={[0.1, 0.1, 0.08]} pos={[0.3, 0.95, 0.31]} selected={sel('air')} onPick={p.onPick}>
          <Lamp pos={[0.3, 0.95, 0.31]} color="#3ddc97" on={() => p.rt.io.DI[4]} r={0.02} />
        </Pick>
        <Pick id="hitemp" label="High temp light" size={[0.1, 0.1, 0.08]} pos={[-0.3, 0.95, 0.31]} selected={sel('hitemp')} onPick={p.onPick}>
          <Lamp pos={[-0.3, 0.95, 0.31]} color="#ffb547" on={() => p.rt.io.DO[4]} r={0.02} />
        </Pick>
      </Cabinet>
      {/* chilled-water valve, tagged FO (fails open) */}
      <Pipe from={[1.55, 0.3, 0]} to={[2.7, 0.3, 0]} r={0.05} color="#2563eb" />
      <Pick id="valve" label="CHW valve" size={[0.3, 0.45, 0.3]} pos={[2.2, 0.5, 0]} selected={sel('valve')} onPick={p.onPick}>
        <Valve pos={[2.2, 0.3, 0]} open={() => s().valve / 100} failOpen />
      </Pick>
      {/* server racks being cooled */}
      {[0, 1, 2].map((i) => (
        <group key={i}>
          <Box size={[0.6, 2.0, 1.0]} pos={[0.6 + i * 0.7, 1.0, -1.4]} color="#111827" metal={0.4} rough={0.5} />
          {/* front door: rows of servers with status lights, so the racks read as racks */}
          <mesh position={[0.6 + i * 0.7, 1.0, -0.897]}><planeGeometry args={[0.54, 1.9]} /><meshBasicMaterial map={rack} toneMapped={false} /></mesh>
        </group>
      ))}
      <Pick id="sat" label="Supply-air temp" size={[0.12, 0.12, 0.12]} pos={[1.1, 0.25, 0.4]} selected={sel('sat')} onPick={p.onPick}>
        <Box size={[0.08, 0.08, 0.06]} pos={[1.1, 0.25, 0.33]} color="#1e40af" rough={0.45} />
      </Pick>
    </group>
  );
}

export const datacenterScene: MachineSceneDef = {
  id: 'datacenter',
  Scene,
  camera: { pos: [0.6, 3.0, 5.6], target: [-0.3, 0.9, 0] },
  radius: 3.6,
  moving: (rt) => {
    const s = rt.scene.state as DcState;
    return s.fanSpin > 0.01 || (s.genTime >= 0 && rt.scene.activeFault !== 'dc-gen') || s.ats.startsWith('moving');
  },
  readout: (rt) => {
    const s = rt.scene.state as DcState;
    const src = s.ats === 'N' ? 'utility' : s.ats === 'E' ? 'generator' : 'transferring';
    return `${src} · air ${s.temp.toFixed(1)} °C (actual) · valve ${Math.round(s.valve)} %`;
  },
  views: [{ label: 'Generator', ids: ['gen', 'genstart', 'util'] }, { label: 'ATS', ids: ['atsn', 'atse', 'faillt'] }, { label: 'CRAH', ids: ['air', 'hitemp', 'valve', 'sat'] }],
  describe: 'a utility transformer and a standby generator feeding an automatic transfer switch (its pointer shows Normal, Emergency or moving), which feeds a CRAH cooling unit with a chilled-water valve that fails open, beside a row of server racks.',
};
