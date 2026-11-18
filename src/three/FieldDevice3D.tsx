/**
 * Field-device library 3D: one procedural model per device kind (src/content/devices.ts), on the shared Stage
 * with the material library and the baked ground shadow. Sizes are real-world meters; the camera frames each
 * model from its measured bounds, so every device fills the canvas on any screen. Generic shapes, no logos.
 */
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { Box3, type Group, type Mesh } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { DeviceKind, FieldDevice } from '../content/devices';
import { usePrefs } from '../state/prefs';
import { fitViewInsets, type V3 } from './fit';
import { GroundShadow } from './GroundShadow';
import { Box, ScrewHead } from './kit';
import { StudioLights } from './Lights';
import { lowDetail, surface, type Surface } from './materials';
import { Stage } from './Stage';
import { FRAME } from './poster/frames';

const X: [number, number, number] = [0, 0, Math.PI / 2];
const Z: [number, number, number] = [Math.PI / 2, 0, 0];

/** A cylinder with a library surface. Default axis is y; pass `rot` X or Z to lay it along x or z. */
function Cyl({ r, h, pos, rot, s, color, r2, seg = 24, opacity }: { r: number; h: number; pos: [number, number, number]; rot?: [number, number, number]; s: Surface; color?: string; r2?: number; seg?: number; opacity?: number }) {
  return <mesh position={pos} rotation={rot} material={surface(s, color, opacity)} castShadow><cylinderGeometry args={[r2 ?? r, r, h, seg]} /></mesh>;
}

/** Glowing part (LED, lens, beam). */
function Glow({ children, color, pos, rot, intensity = 1.6, opacity }: { children: ReactNode; color: string; pos: [number, number, number]; rot?: [number, number, number]; intensity?: number; opacity?: number }) {
  return <mesh position={pos} rotation={rot}>{children}<meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} toneMapped={false} transparent={opacity !== undefined} opacity={opacity ?? 1} /></mesh>;
}

/** DIN rail section (35 mm top hat), lying along x, mounted on a backplate at z = 0. */
function DinRail({ w, y }: { w: number; y: number }) {
  return (
    <group>
      <Box size={[w + 0.06, 0.035 + 0.04, 0.003]} pos={[0, y, -0.004]} color="#c9ced4" s="powderCoat" round={0} />
      <Box size={[w, 0.027, 0.0015]} pos={[0, y, 0.0035]} color="#b8bfc6" s="galvanized" round={0} />
      {[-1, 1].map((e) => <Box key={e} size={[w, 0.004, 0.0075]} pos={[0, y + e * 0.0155, 0.007]} color="#b8bfc6" s="galvanized" round={0} />)}
    </group>
  );
}

/** A row of terminal screws on a face, for contactors, relays and modules. */
function Terminals({ n, w, y, z }: { n: number; w: number; y: number; z: number }) {
  if (lowDetail()) return null;
  return <>{Array.from({ length: n }, (_, i) => <ScrewHead key={i} pos={[(i / Math.max(1, n - 1) - 0.5) * w, y, z]} r={0.0035} rot={[-Math.PI / 2, 0, 0]} />)}</>;
}

/** 22 mm panel operator mounted through a panel plate; `head` is what you see on the front. */
function Operator({ head, blocks = 2 }: { head: ReactNode; blocks?: number }) {
  return (
    <group>
      <Box size={[0.09, 0.09, 0.0025]} pos={[0, 0.045, 0]} color="#c9ced4" s="powderCoat" round={0} />
      <Cyl r={0.0145} h={0.006} pos={[0, 0.045, 0.004]} rot={Z} s="machinedSteel" />
      <group position={[0, 0.045, 0.008]}>{head}</group>
      {/* contact blocks behind the panel */}
      {Array.from({ length: blocks }, (_, i) => (
        <group key={i} position={[(i - (blocks - 1) / 2) * 0.012, 0.045, -0.026]}>
          <Box size={[0.011, 0.03, 0.038]} pos={[0, 0, 0]} color={i === 0 ? '#2e7d32' : '#c62828'} s="plasticMatte" round={0.001} />
          <ScrewHead pos={[0, 0.0155, -0.008]} r={0.0028} rot={[0, 0, 0]} />
        </group>
      ))}
    </group>
  );
}

function Model({ kind }: { kind: DeviceKind }) {
  const fine = !lowDetail();
  switch (kind) {
    case 'prox-inductive':
    case 'prox-capacitive': {
      const cap = kind === 'prox-capacitive';
      const r = cap ? 0.015 : 0.009;
      return (
        <group position={[0, 0.03, 0]}>
          {/* threaded barrel along z with two lock nuts on a bracket */}
          <Cyl r={r} h={0.07} pos={[0, 0, 0]} rot={Z} s={cap ? 'plasticMatte' : 'brushedSteel'} color={cap ? '#3a4049' : undefined} />
          {fine && Array.from({ length: 14 }, (_, i) => <mesh key={i} position={[0, 0, -0.03 + i * 0.0045]} material={surface(cap ? 'plasticMatte' : 'brushedSteel', cap ? '#2f343b' : undefined)}><torusGeometry args={[r, 0.0007, 4, 20]} /></mesh>)}
          <Cyl r={r * 0.96} h={0.004} pos={[0, 0, 0.037]} rot={Z} s="plasticMatte" color={cap ? '#e0d4b0' : '#2f6fdd'} />
          {[-0.006, 0.008].map((z) => <Cyl key={z} r={r * 1.45} h={0.004} pos={[0, 0, z]} rot={Z} s="machinedSteel" seg={6} />)}
          <Box size={[0.05, 0.005, 0.04]} pos={[0, -r * 1.5 - 0.002, 0.001]} color="#9aa3ad" s="galvanized" round={0} />
          <Box size={[0.05, 0.03, 0.004]} pos={[0, -r * 1.5 + 0.013, 0.001]} color="#9aa3ad" s="galvanized" round={0} />
          <Glow color="#ffb547" pos={[0, r * 0.98, -0.03]} rot={[0, 0, 0]}><boxGeometry args={[0.004, 0.0015, 0.004]} /></Glow>
          {cap && fine && <Cyl r={0.003} h={0.003} pos={[0, 0, -0.037]} rot={Z} s="brass" />}
          {/* M12 connector and cable */}
          <Cyl r={r * 0.7} h={0.012} pos={[0, 0, -0.041]} rot={Z} s="machinedSteel" />
          <Cyl r={0.003} h={0.06} pos={[0, 0, -0.077]} rot={Z} s="rubber" color="#1f242b" />
        </group>
      );
    }
    case 'eye-through':
    case 'eye-retro':
    case 'eye-diffuse': {
      const sensor = (x: number, face: number) => (
        <group position={[x, 0.025, 0]} rotation={[0, face * Math.PI / 2, 0]}>
          <Box size={[0.03, 0.045, 0.02]} pos={[0, 0, 0]} color="#3a4049" s="plasticGloss" round={0.002} />
          <Box size={[0.02, 0.02, 0.002]} pos={[0, 0.004, 0.011]} color="#11161d" s="plasticGloss" round={0} />
          <Glow color="#ffb547" pos={[0.009, 0.019, 0.011]}><boxGeometry args={[0.003, 0.003, 0.001]} /></Glow>
          <Glow color="#3ddc97" pos={[-0.009, 0.019, 0.011]}><boxGeometry args={[0.003, 0.003, 0.001]} /></Glow>
          <Box size={[0.034, 0.003, 0.026]} pos={[0, -0.024, 0]} color="#9aa3ad" s="galvanized" round={0} />
          <Cyl r={0.003} h={0.04} pos={[0, -0.03, -0.02]} rot={Z} s="rubber" color="#1f242b" />
        </group>
      );
      const beam = (len: number) => <Glow color="#ff4d4d" pos={[0, 0.029, 0]} rot={X} intensity={1.2} opacity={0.5}><cylinderGeometry args={[0.0012, 0.0012, len, 6]} /></Glow>;
      if (kind === 'eye-through') return <group>{sensor(-0.09, 1)}{sensor(0.09, -1)}{beam(0.15)}</group>;
      if (kind === 'eye-retro') return (
        <group>{sensor(-0.09, 1)}{beam(0.15)}
          <group position={[0.09, 0.029, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <Box size={[0.05, 0.05, 0.004]} pos={[0, 0, 0]} color="#d32f2f" s="plasticGloss" round={0.003} />
            {fine && Array.from({ length: 16 }, (_, i) => <mesh key={i} position={[((i % 4) - 1.5) * 0.011, (Math.floor(i / 4) - 1.5) * 0.011, 0.0025]} material={surface('plasticGloss', '#e53935')}><cylinderGeometry args={[0.005, 0.005, 0.001, 6]} /></mesh>)}
          </group>
        </group>
      );
      return <group>{sensor(-0.07, 1)}{beam(0.1)}<Box size={[0.06, 0.06, 0.08]} pos={[0.02, 0.03, 0]} color="#b08a5a" s="plasticMatte" round={0.002} /></group>;
    }
    case 'pushbutton':
      return <Operator head={<Cyl r={0.012} h={0.012} pos={[0, 0, 0.004]} rot={Z} s="plasticGloss" color="#2e9d4f" />} />;
    case 'selector':
      return <Operator head={<group><Cyl r={0.013} h={0.008} pos={[0, 0, 0.002]} rot={Z} s="plasticGloss" color="#1f242b" /><Box size={[0.006, 0.024, 0.01]} pos={[0, 0, 0.009]} color="#1f242b" s="plasticGloss" round={0.002} /></group>} />;
    case 'pilot':
      return <Operator blocks={1} head={<Glow color="#3ddc97" pos={[0, 0, 0.004]} rot={Z} intensity={1.2}><cylinderGeometry args={[0.011, 0.012, 0.01, 24]} /></Glow>} />;
    case 'estop':
      return (
        <Operator head={<group>
          <Cyl r={0.03} h={0.002} pos={[0, 0, -0.004]} rot={Z} s="plasticMatte" color="#f5c400" />
          <Cyl r={0.006} h={0.014} pos={[0, 0, 0.004]} rot={Z} s="plasticMatte" color="#7f1d1d" />
          <mesh position={[0, 0, 0.011]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.45, 1]} material={surface('plasticGloss', '#d32f2f')} castShadow><sphereGeometry args={[0.02, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        </group>} />
      );
    case 'contactor':
    case 'starter':
    case 'overload': {
      const contactor = (
        <group position={[0, 0.1, 0.034]}>
          <Box size={[0.045, 0.075, 0.068]} pos={[0, 0, 0]} color="#5b6470" s="plasticMatte" round={0.003} />
          <Box size={[0.04, 0.03, 0.012]} pos={[0, 0.006, 0.039]} color="#3a4049" s="plasticMatte" round={0.002} />
          <Box size={[0.012, 0.012, 0.004]} pos={[0, 0.006, 0.046]} color="#e0e0e0" s="plasticMatte" round={0.001} />
          <Terminals n={3} w={0.03} y={0.038} z={0.02} />
          <Terminals n={3} w={0.03} y={-0.038} z={0.02} />
          {!lowDetail() && [-0.017, 0.017].map((x) => <ScrewHead key={x} pos={[x, 0.03, 0.035]} r={0.003} />)}
        </group>
      );
      const overload = (y: number) => (
        <group position={[0, y, 0.03]}>
          <Box size={[0.045, 0.045, 0.06]} pos={[0, 0, 0]} color="#4a525c" s="plasticMatte" round={0.003} />
          <Cyl r={0.008} h={0.004} pos={[-0.008, 0.004, 0.032]} rot={Z} s="plasticGloss" color="#1e5aa8" />
          <Box size={[0.008, 0.008, 0.006]} pos={[0.012, 0.006, 0.033]} color="#1e88e5" s="plasticGloss" round={0.001} />
          <Box size={[0.008, 0.006, 0.006]} pos={[0.012, -0.008, 0.033]} color="#c62828" s="plasticGloss" round={0.001} />
          <Terminals n={3} w={0.03} y={-0.023} z={0.018} />
        </group>
      );
      return (
        <group>
          <DinRail w={0.08} y={0.1} />
          {kind !== 'overload' && contactor}
          {kind === 'overload' ? <><DinRail w={0.08} y={0.05} />{overload(0.05)}</> : kind === 'starter' ? overload(0.04) : null}
          <Box size={[0.14, 0.17, 0.003]} pos={[0, 0.085, -0.007]} color="#e1e5e9" s="powderCoat" round={0} />
        </group>
      );
    }
    case 'mcc-bucket':
      return (
        <group position={[0, 0.2, 0]}>
          <Box size={[0.5, 0.36, 0.4]} pos={[0, 0, -0.2]} color="#9aa3ad" s="powderCoat" round={0.004} />
          <Box size={[0.48, 0.34, 0.012]} pos={[0, 0, 0.006]} color="#b8c0c8" s="powderCoat" round={0.003} />
          {/* disconnect handle, pilot lights, pushbuttons, nameplate */}
          <Box size={[0.05, 0.12, 0.03]} pos={[-0.17, 0, 0.03]} color="#1f242b" s="plasticMatte" round={0.004} />
          <Box size={[0.02, 0.07, 0.03]} pos={[-0.17, 0.02, 0.055]} color="#d32f2f" s="plasticGloss" round={0.004} />
          {[-0.02, 0.04].map((x, i) => <Glow key={x} color={i ? '#ff4d4d' : '#3ddc97'} pos={[x, 0.09, 0.016]} rot={Z} intensity={0.8}><cylinderGeometry args={[0.012, 0.012, 0.012, 20]} /></Glow>)}
          {[-0.02, 0.04].map((x, i) => <Cyl key={x} r={0.012} h={0.012} pos={[x, 0.02, 0.016]} rot={Z} s="plasticGloss" color={i ? '#c62828' : '#2e9d4f'} />)}
          <Box size={[0.16, 0.04, 0.002]} pos={[0.05, -0.1, 0.013]} color="#11161d" s="plasticMatte" round={0} />
          {fine && [0.21, -0.21].flatMap((x) => [0.13, -0.13].map((y) => <ScrewHead key={`${x}${y}`} pos={[x, y, 0.013]} r={0.006} />))}
        </group>
      );
    case 'safety-relay':
      return (
        <group>
          <DinRail w={0.06} y={0.06} />
          <Box size={[0.0225, 0.1, 0.115]} pos={[0, 0.06, 0.058]} color="#4a525c" s="plasticMatte" round={0.002} />
          <Box size={[0.021, 0.07, 0.003]} pos={[0, 0.06, 0.116]} color="#f5c400" s="plasticMatte" round={0} />
          {[0.085, 0.077, 0.069, 0.061].map((y, i) => <Glow key={y} color={i === 0 ? '#3ddc97' : '#ffb547'} pos={[0, y, 0.118]}><boxGeometry args={[0.004, 0.003, 0.001]} /></Glow>)}
          {[0.112, 0.008].map((y) => <Terminals key={y} n={2} w={0.012} y={y} z={0.09} />)}
          <Box size={[0.14, 0.13, 0.003]} pos={[0, 0.06, -0.007]} color="#e1e5e9" s="powderCoat" round={0} />
        </group>
      );
    case 'light-curtain': {
      const post = (x: number, face: number) => (
        <group position={[x, 0, 0]} rotation={[0, face * Math.PI / 2, 0]}>
          <Box size={[0.03, 0.5, 0.035]} pos={[0, 0.27, 0]} color="#f5c400" s="powderCoat" round={0.003} />
          <Box size={[0.012, 0.46, 0.002]} pos={[0, 0.27, 0.018]} color="#1b1e22" s="plasticGloss" round={0} />
          <Box size={[0.08, 0.01, 0.08]} pos={[0, 0.005, 0]} color="#3a4049" s="castIron" round={0.002} />
        </group>
      );
      return (
        <group>
          {post(-0.25, 1)}{post(0.25, -1)}
          {Array.from({ length: 12 }, (_, i) => <Glow key={i} color="#ff4d4d" pos={[0, 0.06 + i * 0.038, 0]} rot={X} intensity={1} opacity={0.35}><cylinderGeometry args={[0.0008, 0.0008, 0.46, 4]} /></Glow>)}
        </group>
      );
    }
    case 'xmtr-pressure':
    case 'xmtr-level':
    case 'xmtr-temp': {
      const head = (y: number) => (
        <group position={[0, y, 0]}>
          <Cyl r={0.045} h={0.07} pos={[0, 0, 0]} rot={Z} s="castIron" color="#5b6470" />
          <Cyl r={0.038} h={0.004} pos={[0, 0, 0.037]} rot={Z} s="glass" />
          <Box size={[0.04, 0.016, 0.001]} pos={[0, 0.002, 0.036]} color="#0f2a1d" s="plasticGloss" round={0} />
          <Glow color="#3ddc97" pos={[0, 0.002, 0.0368]} intensity={0.5}><boxGeometry args={[0.03, 0.008, 0.0005]} /></Glow>
          <Cyl r={0.012} h={0.025} pos={[0.055, 0, 0]} rot={X} s="machinedSteel" />
        </group>
      );
      if (kind === 'xmtr-pressure') return (
        <group>
          <Cyl r={0.025} h={0.4} pos={[0, 0.025, 0]} rot={X} s="galvanized" />
          <Cyl r={0.012} h={0.06} pos={[0, 0.075, 0]} s="brass" />
          <Box size={[0.05, 0.03, 0.04]} pos={[0, 0.115, 0]} color="#c9ced4" s="machinedSteel" round={0.002} />
          <Cyl r={0.006} h={0.03} pos={[0.03, 0.115, 0]} rot={X} s="machinedSteel" />
          <Cyl r={0.018} h={0.04} pos={[0, 0.15, 0]} s="brushedSteel" />
          {head(0.2)}
        </group>
      );
      if (kind === 'xmtr-level') return (
        <group>
          <Cyl r={0.2} h={0.02} pos={[0, 0.01, 0]} s="powderCoat" color="#9aa3ad" />
          <Cyl r={0.06} h={0.03} pos={[0, 0.035, 0]} s="machinedSteel" />
          {fine && Array.from({ length: 8 }, (_, i) => <ScrewHead key={i} pos={[Math.cos(i * Math.PI / 4) * 0.05, 0.051, Math.sin(i * Math.PI / 4) * 0.05]} r={0.004} rot={[-Math.PI / 2, 0, 0]} />)}
          <Cyl r={0.02} h={0.06} pos={[0, 0.08, 0]} s="brushedSteel" />
          {head(0.15)}
        </group>
      );
      return (
        <group>
          <Cyl r={0.03} h={0.4} pos={[0, 0.03, 0]} rot={X} s="galvanized" />
          <Cyl r={0.008} h={0.09} pos={[0, 0.09, 0]} s="brushedSteel" />
          <Cyl r={0.03} h={0.035} pos={[0, 0.15, 0]} s="castIron" color="#9aa3ad" />
          <Cyl r={0.032} h={0.01} pos={[0, 0.172, 0]} s="castIron" color="#7b8591" />
          <Cyl r={0.008} h={0.025} pos={[0.035, 0.15, 0]} rot={X} s="machinedSteel" />
        </group>
      );
    }
    case 'solenoid-valve':
      return (
        <group>
          <Box size={[0.08, 0.012, 0.05]} pos={[0, 0.006, 0]} color="#9aa3ad" s="galvanized" round={0.002} />
          <Box size={[0.06, 0.035, 0.03]} pos={[0, 0.03, 0]} color="#c9ced4" s="machinedSteel" round={0.003} />
          {[-0.02, 0, 0.02].map((x) => <Cyl key={x} r={0.005} h={0.012} pos={[x, 0.03, 0.02]} rot={Z} s="brass" />)}
          {[-0.02, 0.02].map((x) => <Cyl key={x} r={0.004} h={0.08} pos={[x, 0.03, 0.065]} rot={Z} s="plasticMatte" color="#1e88e5" />)}
          <Box size={[0.03, 0.035, 0.03]} pos={[-0.042, 0.03, 0]} color="#1b1e22" s="plasticMatte" round={0.002} />
          <Box size={[0.026, 0.026, 0.018]} pos={[-0.042, 0.06, 0]} color="#3a4049" s="plasticMatte" round={0.002} />
          <Glow color="#ffb547" pos={[-0.042, 0.06, 0.0095]} intensity={1}><boxGeometry args={[0.004, 0.004, 0.001]} /></Glow>
          <Cyl r={0.003} h={0.02} pos={[0.035, 0.03, 0.016]} rot={Z} s="plasticGloss" color="#f5c400" />
        </group>
      );
  }
}

/** Frames the model from its measured outline (after it mounts), for this canvas shape. */
function FitDevice({ group, onBounds }: { group: React.RefObject<Group | null>; onBounds: (b: { min: V3; max: V3 }) => void }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const g = group.current;
    if (!g || !controls) return;
    g.updateWorldMatrix(true, true);
    const box = new Box3();
    const part = new Box3();
    g.traverseVisible((o) => { const m = o as Mesh; if (!m.isMesh || !m.geometry) return; if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); part.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld); box.union(part); });
    if (box.isEmpty()) return;
    const min = box.min.toArray() as V3;
    const max = box.max.toArray() as V3;
    onBounds({ min, max });
    const v = fitViewInsets(min, max, [0.55, 0.42, 1], [0, 0, 0], 36, size.width / Math.max(1, size.height), { top: 0.06, bottom: 0.06, left: 0.04, right: 0.04 }, 1.12);
    camera.position.set(...v.pos);
    controls.target.set(...v.target);
    controls.update();
    invalidate();
  }, [group, controls, size, camera, invalidate, onBounds]);
  return null;
}

function FieldDevice3D({ device }: { device: FieldDevice }) {
  const quality = usePrefs((s) => s.quality);
  const g = useRef<Group>(null);
  const [b, setB] = useState<{ min: V3; max: V3 } | null>(null);
  const span = b ? Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2], 0.05) : 0.2;
  return (
    <div className={FRAME.inside}>
      <Stage
        quality={quality}
        animate={false}
        camera={{ position: [0.3, 0.25, 0.55], fov: 36, near: 0.005, far: 20 }}
        aria-label={`3D model of a ${device.name.toLowerCase()} (generic, no brand). Drag to turn it.`}
        role="img"
        lostFallback={<p className="p-3 text-sm m-0" role="status">3D isn't available right now. Everything about this device is in the text below.</p>}
      >
        {(q, look) => <>
          <StudioLights look={look} q={q} keyPos={[span * 2, span * 3, span * 3]} shadowBox={{ left: -span, right: span, top: span, bottom: -span }} mapSize={512} fog={[span * 8, span * 20]} />
          <group ref={g}><Model kind={device.kind} /></group>
          {q.contactRes > 0 && b && <GroundShadow size={[span * 3, span * 3]} at={b.min[1] - 0.0005} reach={Math.max(0.02, span * 0.2)} opacity={look.ao} res={256} />}
          <OrbitControls makeDefault enableDamping dampingFactor={0.12} minDistance={0.02} maxDistance={4} />
          <FitDevice group={g} onBounds={setB} />
        </>}
      </Stage>
    </div>
  );
}

export default memo(FieldDevice3D);
