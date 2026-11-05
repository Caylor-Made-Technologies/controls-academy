/**
 * Lazy-loaded 3D viewer for one hardware-library model. Orbit, pinch, tap a module to learn
 * what it is. LEDs run a demo pattern (inputs flicker, outputs follow) so the hardware looks alive.
 */
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';
import type { HwModel } from '../content/hardware';
import { usePrefs } from '../state/prefs';
import { HardwareModel, layoutShape, type HwLive } from './HardwareModel';
import { disposeTextures } from './textures';

const now = () => performance.now();
/** Deterministic "plant running" pattern: each input toggles on its own rhythm. */
export const DEMO_LIVE: HwLive = {
  di: (i) => ((now() / (900 + i * 170) + i * 0.37) % 1) < 0.45,
  do: (i) => ((now() / (1300 + i * 210) + i * 0.21) % 1) < 0.55,
  run: () => true,
  force: () => false,
  fault: () => false,
  power: () => true,
};
const STATIC_LIVE: HwLive = { di: (i) => i % 3 === 0, do: (i) => i % 2 === 0, run: () => true, force: () => false, fault: () => false, power: () => true };

/** Back the camera off until the whole model fits the canvas, on any screen shape. */
function Frame({ w, h }: { w: number; h: number }) {
  const camera = useThree((st) => st.camera);
  const size = useThree((st) => st.size);
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const aspect = size.width / Math.max(1, size.height);
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max((h / 2 + 0.05) / t, (w / 2 + 0.05) / (t * aspect)) + 0.08;
    const dir = new Vector3(0.3, 0.12, 0.95).normalize();
    camera.position.copy(dir.multiplyScalar(dist)).add(new Vector3(0, 0, 0.04));
    camera.updateProjectionMatrix();
  }, [camera, size, w, h]);
  return null;
}

export default function Hardware3D({ model, selected, onSelect }: { model: HwModel; selected: number | null; onSelect: (i: number | null) => void }) {
  const quality = usePrefs((s) => s.quality);
  const reduce = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const coarse = useMemo(() => window.matchMedia?.('(pointer: coarse)').matches, []);
  const tier = quality === 'low' || quality === 'medium' || quality === 'high' ? quality : coarse ? 'medium' : 'high';
  const [dpr] = useState(() => Math.min(tier === 'high' ? 2 : tier === 'medium' ? 1.5 : 1, window.devicePixelRatio || 1));
  useEffect(() => () => disposeTextures(), []);

  const { width, height } = useMemo(() => layoutShape(model.shape), [model]);
  // Fit inside a 0.5 m × 0.3 m box so every model frames the same way.
  const fit: [number, number] = [0.46, 0.24];
  const s = Math.min(0.46 / (width + 0.02), 0.24 / (height + 0.024));
  const h = (height + 0.024) * s;

  return (
    <div className="relative h-[clamp(300px,52svh,460px)] panel3d-bg">
      <Canvas
        dpr={dpr}
        frameloop={reduce ? 'demand' : 'always'}
        camera={{ position: [0.26, 0.1, 0.8], fov: 36, near: 0.02, far: 10 }}
        gl={{ antialias: tier !== 'low', powerPreference: 'high-performance' }}
        onPointerMissed={() => onSelect(null)}
        aria-label={`3D model of ${model.name}. Drag to turn it, tap a module to learn what it does. The module list below has the same information.`}
        role="img"
      >
        <color attach="background" args={['#0d131b']} />
        <Frame w={Math.min(fit[0], (width + 0.02) * s)} h={h} />
        <ambientLight intensity={0.45} />
        <hemisphereLight args={['#cfe3ff', '#1a1f28', 0.6]} />
        <directionalLight position={[0.8, 1.2, 1.4]} intensity={1.7} color="#fff6ea" />
        <directionalLight position={[-1.4, 0.6, -0.4]} intensity={0.8} color="#3d8bff" />
        <directionalLight position={[0.6, -0.4, 1]} intensity={0.3} color="#ffd9a8" />
        {tier !== 'low' && (
          <Environment resolution={64} frames={1}>
            <Lightformer form="rect" intensity={2} color="#dbe8ff" position={[0, 2, 2]} scale={[3, 1, 1]} />
            <Lightformer form="rect" intensity={1} color="#22d3ee" position={[3, 0.2, 1]} rotation-y={-Math.PI / 2} scale={[2, 1, 1]} />
          </Environment>
        )}
        <HardwareModel shape={model.shape} live={reduce ? STATIC_LIVE : DEMO_LIVE} selected={selected} onSelect={onSelect} fit={fit} />
        {tier !== 'low' && <ContactShadows position={[0, -h / 2 - 0.01, 0.08]} opacity={0.5} scale={1.2} blur={2.2} far={0.4} resolution={256} frames={1} />}
        <OrbitControls makeDefault target={[0, 0, 0.04]} enableDamping dampingFactor={0.12} minDistance={0.25} maxDistance={2.2} maxPolarAngle={Math.PI * 0.7} minAzimuthAngle={-1.3} maxAzimuthAngle={1.3} />
      </Canvas>
    </div>
  );
}
