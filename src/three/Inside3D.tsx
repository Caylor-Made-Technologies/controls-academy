/**
 * Exploded view of one device (src/content/inside.ts). Parts glide apart along their own directions;
 * tap a part (or pick it in the list beside) to read what it does.
 */
import { Billboard, OrbitControls } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import { DoubleSide, Vector3, type Group } from 'three';
import type { InsideDevice, InsidePart } from '../content/inside';
import { usePrefs } from '../state/prefs';
import { Label } from './kit';
import { StudioLights } from './Lights';
import { Stage } from './Stage';

function Part({ p, spread, size, selected, onPick, reduce }: { p: InsidePart; spread: number; size: number; selected: boolean; onPick: (id: string) => void; reduce: boolean }) {
  const g = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const home = useMemo(() => new Vector3(...p.pos), [p]);
  const away = useMemo(() => new Vector3(...p.dir).normalize().multiplyScalar(size * 0.45).add(home), [p, size, home]);
  const goal = useMemo(() => home.clone().lerp(away, spread), [home, away, spread]);
  useFrame((_, dt) => {
    const o = g.current;
    if (!o) return;
    if (reduce) { o.position.copy(goal); return; }
    o.position.lerp(goal, Math.min(1, dt * 5));
    if (o.position.distanceTo(goal) > 0.0005) invalidate();
  });
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onPick(p.id); };
  const s = p.shape;
  const rot: [number, number, number] = s.kind === 'cyl' ? (s.axis === 'x' ? [0, 0, Math.PI / 2] : s.axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0]) : [0, 0, 0];
  return (
    <group ref={g} position={home} onClick={click}>
      <mesh rotation={rot} castShadow>
        {s.kind === 'box' ? <boxGeometry args={s.size} /> : <cylinderGeometry args={[s.r, s.r, s.h, 28]} />}
        <meshStandardMaterial color={selected ? '#3d8bff' : p.color} metalness={p.metal ?? 0.2} roughness={0.45} transparent={p.opacity !== undefined} opacity={p.opacity ?? 1} side={p.opacity ? DoubleSide : undefined} depthWrite={p.opacity === undefined} emissive={selected ? '#1b63eb' : '#000'} emissiveIntensity={selected ? 0.35 : 0} />
      </mesh>
      {selected && (
        <Billboard position={[0, size * 0.12, 0]}>
          <Label text={p.name} pos={[0, 0, 0]} w={Math.min(size * 0.9, p.name.length * size * 0.018 + size * 0.05)} h={size * 0.05} fg="#fff" bg="#1b63eb" />
        </Billboard>
      )}
    </group>
  );
}

function Inside3D({ device, spread, selected, onPick }: { device: InsideDevice; spread: number; selected: string | null; onPick: (id: string | null) => void }) {
  const quality = usePrefs((s) => s.quality);
  const reduce = useMemo(() => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches), []);
  const d = device.size;
  return (
    <div className="relative h-[clamp(300px,52svh,460px)] panel3d-bg rounded-xl overflow-hidden">
      <Stage
        quality={quality}
        animate={false}
        camera={{ position: [d * 0.75, d * 0.5, d * 1.45], fov: 38, near: 0.005, far: 20 }}
        onPointerMissed={() => onPick(null)}
        aria-label={`Exploded 3D view of a ${device.title.toLowerCase()}. Drag to turn it; tap a part to read about it. The parts list has the same information.`}
        role="img"
        lostFallback={<p className="p-3 text-sm m-0" role="status">3D isn't available right now. The parts list has everything.</p>}
      >
        {(q, look) => <>
          <StudioLights look={look} q={q} keyPos={[d * 2, d * 3, d * 3]} shadowBox={{ left: -d, right: d, top: d, bottom: -d }} mapSize={512} fog={[d * 6, d * 14]} />
          {device.parts.map((p) => <Part key={p.id} p={p} spread={spread} size={d} selected={selected === p.id} onPick={onPick} reduce={reduce} />)}
          <OrbitControls makeDefault enableDamping dampingFactor={0.12} minDistance={d * 0.5} maxDistance={d * 4} />
        </>}
      </Stage>
    </div>
  );
}

export default memo(Inside3D);
