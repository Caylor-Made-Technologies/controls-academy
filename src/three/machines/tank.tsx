import { LSHH_AT, LSL_AT, TANK_AREA, TANK_H, type TankState } from '../../plant/tank';
import { Box, Label } from '../kit';
import { Cabinet, Lamp, Motor, Pick, Pipe, Tank, Valve } from './parts';
import type { MachineSceneDef, MachineSceneProps } from './types';

const R = Math.sqrt(TANK_AREA / Math.PI); // ≈ 0.69 m

function Scene(p: MachineSceneProps) {
  const s = () => p.rt.scene.state as TankState;
  const sel = (id: string) => p.selected === id;
  const pumpOn = () => p.rt.io.DO[2];
  return (
    <group>
      <Tank pos={[0, 0.3, 0]} r={R} h={TANK_H} level={() => s().level / TANK_H} />
      {/* stand */}
      {[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z]) => <Box key={`${x}${z}`} size={[0.08, 0.3, 0.08]} pos={[x * R * 1.2, 0.15, z * R * 1.2]} color="#4b5563" metal={0.5} rough={0.5} />)}
      {/* inlet: supply pipe → FV-101 → over the top */}
      <Pipe from={[-2.2, TANK_H + 0.5, 0]} to={[-0.2, TANK_H + 0.5, 0]} r={0.05} />
      <Pipe from={[-0.2, TANK_H + 0.5, 0]} to={[-0.2, TANK_H + 0.2, 0]} r={0.05} />
      <Pick id="fv" label="FV-101 fill valve" size={[0.3, 0.45, 0.3]} pos={[-1.3, TANK_H + 0.65, 0]} selected={sel('fv')} onPick={p.onPick}>
        <Valve pos={[-1.3, TANK_H + 0.5, 0]} open={() => s().valve / 100} />
      </Pick>
      {/* level transmitter on the roof */}
      <Pick id="lt" label="LT-101 level transmitter" size={[0.22, 0.3, 0.22]} pos={[0.35, TANK_H + 0.45, 0]} selected={sel('lt')} onPick={p.onPick}>
        <Box size={[0.12, 0.14, 0.12]} pos={[0.35, TANK_H + 0.42, 0]} color="#1e40af" rough={0.45} />
        <mesh position={[0.35, TANK_H + 0.32, 0]}><cylinderGeometry args={[0.03, 0.03, 0.08, 12]} /><meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.3} /></mesh>
      </Pick>
      {/* float switches on the side (lit while their contact is closed) */}
      <Pick id="lshh" label="LSHH high-high float" size={[0.2, 0.15, 0.2]} pos={[R + 0.1, 0.3 + LSHH_AT, 0]} selected={sel('lshh')} onPick={p.onPick}>
        <Box size={[0.14, 0.08, 0.1]} pos={[R + 0.1, 0.3 + LSHH_AT, 0]} color="#dc2626" rough={0.5} />
        <Lamp pos={[R + 0.18, 0.3 + LSHH_AT, 0]} color="#3ddc97" on={() => p.rt.io.DI[1]} r={0.02} rot={[0, 0, Math.PI / 2]} />
        <Label text="LSHH 3.8 m" pos={[R + 0.1, 0.3 + LSHH_AT + 0.09, 0.051]} w={0.2} h={0.05} />
      </Pick>
      <Pick id="lsl" label="LSL low float" size={[0.2, 0.15, 0.2]} pos={[R + 0.1, 0.3 + LSL_AT, 0]} selected={sel('lsl')} onPick={p.onPick}>
        <Box size={[0.14, 0.08, 0.1]} pos={[R + 0.1, 0.3 + LSL_AT, 0]} color="#f59e0b" rough={0.5} />
        <Lamp pos={[R + 0.18, 0.3 + LSL_AT, 0]} color="#3ddc97" on={() => p.rt.io.DI[0]} r={0.02} rot={[0, 0, Math.PI / 2]} />
        <Label text="LSL 0.3 m" pos={[R + 0.1, 0.3 + LSL_AT + 0.09, 0.051]} w={0.2} h={0.05} />
      </Pick>
      {/* outlet → transfer pump */}
      <Pipe from={[0, 0.2, R * 0.6]} to={[0, 0.2, 1.4]} r={0.05} />
      <Pipe from={[0, 0.2, 1.4]} to={[0.84, 0.2, 1.4]} r={0.05} />
      <Pick id="pump" label="Transfer pump" size={[0.8, 0.45, 0.45]} pos={[1.22, 0.22, 1.4]} selected={sel('pump')} onPick={p.onPick}>
        {/* suction enters the casing eye; the motor sits behind the casing; discharge leaves the top */}
        <mesh position={[0.92, 0.2, 1.4]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.14, 0.14, 0.12, 24]} /><meshStandardMaterial color="#1d4ed8" metalness={0.4} roughness={0.45} /></mesh>
        <Motor pos={[1.27, 0.2, 1.4]} rot={[0, Math.PI, 0]} rps={() => (pumpOn() ? 29.5 : 0)} scale={0.7} />
        <Pipe from={[0.92, 0.34, 1.4]} to={[0.92, 0.75, 1.4]} r={0.04} />
      </Pick>
      {/* control panel with alarm lights */}
      <Cabinet pos={[-1.8, 0, -1.0]} size={[0.7, 1.2, 0.25]} label="LEVEL CONTROL">
        <Pick id="badlt" label="Bad signal light" size={[0.07, 0.07, 0.05]} pos={[-0.12, 0.9, 0.13]} selected={sel('badlt')} onPick={p.onPick}>
          <Lamp pos={[-0.12, 0.9, 0.13]} color="#ffb547" on={() => p.rt.io.DO[0]} r={0.025} />
        </Pick>
        <Pick id="hhlt" label="High-high light" size={[0.07, 0.07, 0.05]} pos={[0.0, 0.9, 0.13]} selected={sel('hhlt')} onPick={p.onPick}>
          <Lamp pos={[0.0, 0.9, 0.13]} color="#ff4d4d" on={() => p.rt.io.DO[1]} r={0.025} />
        </Pick>
        <Lamp pos={[0.12, 0.9, 0.13]} color="#3ddc97" on={pumpOn} r={0.025} />
      </Cabinet>
    </group>
  );
}

export const tankScene: MachineSceneDef = {
  id: 'tank',
  Scene,
  camera: { pos: [4.4, 4.0, 7.4], target: [-0.3, 2.2, 0] },
  radius: 3.4,
  moving: (rt) => {
    const s = rt.scene.state as TankState;
    return s.valve > 0.5 || rt.io.DO[2];
  },
  readout: (rt) => {
    const s = rt.scene.state as TankState;
    return `Level ${s.level.toFixed(2)} m · valve ${Math.round(s.valve)} % · ${(rt.io.AI[0] ?? 0).toFixed(1)} mA`;
  },
  describe: 'a 4 m water tank with a see-through shell showing the live level, the FV-101 fill valve (its yellow stem marker shows position), the LT-101 level transmitter, high-high and low float switches, and the transfer pump.',
};
