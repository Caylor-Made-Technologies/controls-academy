/**
 * Lazy-loaded 3D viewer for one hardware-library model. Orbit, pinch, tap a module to learn
 * what it is. LEDs run a demo pattern (inputs flicker, outputs follow) so the hardware looks alive.
 */
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MathUtils, PerspectiveCamera, Vector3, type Group } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Icon } from '../components/Icon';
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

type View = 'angle' | 'front' | 'top' | 'side';
const VIEWS: Record<View, [number, number, number]> = { angle: [0.3, 0.12, 0.95], front: [0, 0.02, 1], top: [0.05, 0.95, 0.45], side: [0.95, 0.12, 0.35] };

/** Glide the camera to a view direction, backed off until the whole model fits the canvas. */
function CameraRig({ w, h, view, nonce, controls }: { w: number; h: number; view: View; nonce: number; controls: React.RefObject<OrbitControlsImpl | null> }) {
  const camera = useThree((st) => st.camera);
  const size = useThree((st) => st.size);
  const goal = useRef<Vector3 | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const aspect = size.width / Math.max(1, size.height);
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max((h / 2 + 0.06) / t, (w / 2 + 0.05) / (t * aspect)) * 1.12 + 0.08;
    const g = new Vector3(...VIEWS[view]).normalize().multiplyScalar(dist).add(new Vector3(0, 0, 0.04));
    if (first.current) { camera.position.copy(g); first.current = false; goal.current = null; } else goal.current = g;
    controls.current?.target.set(0, 0, 0.04);
  }, [camera, size, w, h, view, nonce, controls]);
  useFrame((_, dt) => {
    const g = goal.current;
    const c = controls.current;
    if (!g) return;
    camera.position.lerp(g, 1 - Math.pow(0.002, dt));
    c?.update();
    if (camera.position.distanceTo(g) < 0.002) goal.current = null;
  });
  return null;
}

/** The model swings in from an angle once, so it reads as a solid object (skipped with reduced motion). */
function TurnIn({ children, still }: { children: ReactNode; still: boolean }) {
  const g = useRef<Group>(null);
  const done = useRef(still);
  useEffect(() => { if (g.current && !still) g.current.rotation.y = -0.75; }, [still]);
  useFrame((_, dt) => {
    if (done.current || !g.current) return;
    g.current.rotation.y = MathUtils.lerp(g.current.rotation.y, 0, Math.min(1, dt * 2.6));
    if (Math.abs(g.current.rotation.y) < 0.001) { g.current.rotation.y = 0; done.current = true; }
  });
  return <group ref={g}>{children}</group>;
}

export default function Hardware3D({ model, selected, onSelect }: { model: HwModel; selected: number | null; onSelect: (i: number | null) => void }) {
  const quality = usePrefs((s) => s.quality);
  const reduce = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const coarse = useMemo(() => window.matchMedia?.('(pointer: coarse)').matches, []);
  const tier = quality === 'low' || quality === 'medium' || quality === 'high' ? quality : coarse ? 'medium' : 'high';
  const [dpr] = useState(() => Math.min(tier === 'high' ? 2 : tier === 'medium' ? 1.5 : 1, window.devicePixelRatio || 1));
  useEffect(() => () => disposeTextures(), []);

  const [view, setView] = useState<View>('angle');
  const [nonce, setNonce] = useState(0);
  const [spread, setSpread] = useState(false);
  const controls = useRef<OrbitControlsImpl | null>(null);
  const pick = (v: View) => { setView(v); setNonce((n) => n + 1); };
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
        <CameraRig w={Math.min(fit[0], (width + 0.02) * s) + (spread ? model.shape.units.length * 0.012 * s : 0)} h={h} view={view} nonce={nonce} controls={controls} />
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
        <TurnIn key={model.id} still={reduce}>
          <HardwareModel shape={model.shape} live={reduce ? STATIC_LIVE : DEMO_LIVE} selected={selected} onSelect={onSelect} fit={fit} spread={spread} tags />
        </TurnIn>
        {tier !== 'low' && <ContactShadows position={[0, -h / 2 - 0.01, 0.08]} opacity={0.5} scale={1.2} blur={2.2} far={0.4} resolution={256} frames={1} />}
        <OrbitControls ref={controls} makeDefault target={[0, 0, 0.04]} enableDamping dampingFactor={0.12} minDistance={0.25} maxDistance={2.2} maxPolarAngle={Math.PI * 0.7} minAzimuthAngle={-1.3} maxAzimuthAngle={1.3} />
      </Canvas>
      <div className="absolute top-2 left-2 right-2 flex gap-1.5 overflow-x-auto hud-row" role="toolbar" aria-label="3D views">
        {(['angle', 'front', 'side', 'top'] as View[]).map((v) => (
          <button key={v} type="button" className="hud-chip" aria-pressed={view === v} onClick={() => pick(v)}>
            <Icon name={v === 'angle' ? 'layers' : 'search'} size={14} /> {v === 'angle' ? '3/4 view' : v[0].toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
      <div className="absolute bottom-2 left-2 right-2 flex gap-1.5 flex-wrap items-end">
        <button type="button" className="hud-chip" aria-pressed={spread} onClick={() => setSpread(!spread)}><Icon name="layers" size={14} /> Spread modules</button>
        <button type="button" className="hud-chip" onClick={() => { setSpread(false); onSelect(null); pick('angle'); }}><Icon name="reset" size={14} /> Reset</button>
      </div>
    </div>
  );
}
