/**
 * Lazy-loaded 3D view of the motor-station control panel, synced to the live engine.
 * Quality tiers adapt to the device; render loop runs on demand when nothing moves.
 */
import { ContactShadows, Environment, Lightformer, OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Icon } from '../components/Icon';
import { Rich } from '../components/RichText';
import { Sheet } from '../components/Sheet';
import type { SimRuntime } from '../features/simulator/runtime';
import { href } from '../lib/router';
import { usePrefs } from '../state/prefs';
import { SKINS } from '../skins';
import { PARTS, TOURS, type PartId } from './info';
import { PanelScene } from './PanelScene';
import { disposeTextures } from './textures';

type Tier = 'low' | 'medium' | 'high';

function tierFromPref(q: string): Tier {
  if (q === 'low' || q === 'medium' || q === 'high') return q;
  const mobile = window.matchMedia?.('(pointer: coarse)').matches;
  return mobile ? 'medium' : 'high';
}

/** Re-render the canvas whenever the simulation ticks (frameloop="demand"). */
function Invalidator({ rt }: { rt: SimRuntime }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const off = rt.subscribe(() => invalidate());
    return () => { off(); };
  }, [rt, invalidate]);
  return null;
}

function CameraRig({ goal, controls, onArrive }: { goal: { pos: Vector3; target: Vector3 } | null; controls: React.RefObject<OrbitControlsImpl | null>; onArrive: () => void }) {
  const camera = useThree((s) => s.camera);
  useFrame((_, dt) => {
    const c = controls.current;
    if (!goal || !c) return;
    const k = 1 - Math.pow(0.0015, dt);
    camera.position.lerp(goal.pos, k);
    c.target.lerp(goal.target, k);
    c.update();
    if (camera.position.distanceTo(goal.pos) < 0.004 && c.target.distanceTo(goal.target) < 0.004) onArrive();
  });
  return null;
}

export default function Panel3D({ rt, onDevice }: { rt: SimRuntime; onDevice?: (id: string) => void }) {
  const quality = usePrefs((s) => s.quality);
  const skin = SKINS[usePrefs((s) => s.skin)];
  const [tier, setTier] = useState<Tier>(() => tierFromPref(quality));
  const [dpr, setDpr] = useState(() => Math.min(tierFromPref(quality) === 'high' ? 2 : tierFromPref(quality) === 'medium' ? 1.5 : 1, window.devicePixelRatio || 1));
  const [selected, setSelected] = useState<PartId | null>(null);
  const [info, setInfo] = useState<PartId | null>(null);
  const [xray, setXray] = useState(false);
  const [explode, setExplode] = useState(false);
  const [goal, setGoal] = useState<{ pos: Vector3; target: Vector3 } | null>(null);
  const [tourId, setTourId] = useState<string>('overview');
  const [lost, setLost] = useState(false);
  const controls = useRef<OrbitControlsImpl | null>(null);
  const spinning = useSyncExternalStore(rt.subscribe, () => rt.scene.state.rpm > 1 || Boolean(rt.plc.fault));

  useEffect(() => () => disposeTextures(), []);
  useEffect(() => { setTier(tierFromPref(quality)); }, [quality]);

  const animating = spinning || xray || Boolean(goal) || explode;

  const fly = useCallback((id: string) => {
    const t = TOURS.find((x) => x.id === id);
    if (!t) return;
    setTourId(id);
    setGoal({ pos: new Vector3(...t.pos), target: new Vector3(...t.target) });
    if (id !== 'overview') setSelected(t.part);
  }, []);

  const onSelect = useCallback((p: PartId) => {
    setSelected(p);
    setInfo(p);
    if (p === 'contactor') onDevice?.('coil');
  }, [onDevice]);

  const part = info ? PARTS[info] : null;
  const shadows = tier === 'high';
  const initial = TOURS[0];
  const reduceMotion = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  // Fly-in on open: start wide and high, glide to the overview (skipped with reduced motion).
  const camera = useMemo(() => ({ position: (reduceMotion ? initial.pos : [2.1, 1.25, 3.6]) as [number, number, number], fov: 38, near: 0.02, far: 20 }), [initial.pos, reduceMotion]);
  useEffect(() => {
    if (!reduceMotion) setGoal({ pos: new Vector3(...initial.pos), target: new Vector3(...initial.target) });
  }, [reduceMotion, initial]);

  if (lost) {
    return (
      <div className="card card-pad text-sm" role="status">
        The 3D view lost its graphics context (the device may be low on memory). Switch to 2D, or reload to try again.
      </div>
    );
  }

  return (
    <section className="card overflow-hidden relative" aria-label="3D control panel">
      <div className="relative h-[clamp(380px,68svh,560px)] lg:h-[540px] panel3d-bg">
        <Canvas
          dpr={dpr}
          shadows={shadows ? 'percentage' : false}
          frameloop={animating ? 'always' : 'demand'}
          camera={camera}
          gl={{ antialias: tier !== 'low', powerPreference: 'high-performance', preserveDrawingBuffer: false }}
          onCreated={({ gl }) => {
            gl.toneMappingExposure = 1.08;
            gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setLost(true); });
          }}
          onPointerMissed={() => setSelected(null)}
          aria-label="Interactive 3D control panel. Tap a component to learn about it. Use the 2D view for full keyboard control."
          role="img"
        >
          <Invalidator rt={rt} />
          <PerformanceMonitor
            onDecline={() => { setDpr(1); if (quality === 'auto') setTier('low'); }}
            onIncline={() => { if (quality === 'auto') { setDpr(Math.min(1.5, window.devicePixelRatio)); setTier('medium'); } }}
          />
          <color attach="background" args={['#0d131b']} />
          <fog attach="fog" args={['#0d131b', 3.2, 6.5]} />
          <ambientLight intensity={0.35} />
          <hemisphereLight args={['#cfe3ff', '#1a1f28', 0.55]} />
          <directionalLight
            position={[1.6, 2.2, 2.4]}
            intensity={1.7}
            color="#fff6ea"
            castShadow={shadows}
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-1.5}
            shadow-camera-right={1.8}
            shadow-camera-top={1.2}
            shadow-camera-bottom={-1.2}
            shadow-bias={-0.0004}
          />
          <pointLight position={[0, 0.3, 0.6]} intensity={0.6} distance={2} color="#e8f1ff" />
          {/* rim light in brand blue, warm fill from the floor side */}
          <directionalLight position={[-2.2, 1.4, -0.6]} intensity={0.9} color="#3d8bff" />
          <directionalLight position={[1.5, -0.6, 1.8]} intensity={0.25} color="#ffd9a8" />
          {tier !== 'low' && (
            <Environment resolution={128} frames={1}>
              <Lightformer form="rect" intensity={2.2} color="#dbe8ff" position={[0, 2, 2]} scale={[3, 1, 1]} />
              <Lightformer form="rect" intensity={1.2} color="#3d8bff" position={[-3, 0.5, 1]} rotation-y={Math.PI / 2} scale={[2, 1, 1]} />
              <Lightformer form="rect" intensity={1.0} color="#22d3ee" position={[3, 0.2, 1]} rotation-y={-Math.PI / 2} scale={[2, 1, 1]} />
            </Environment>
          )}
          <PanelScene rt={rt} skin={skin} selected={selected} onSelect={onSelect} xray={xray} explode={explode} shadows={shadows} />
          {tier !== 'low' && <ContactShadows position={[0.3, -0.748, 0.4]} opacity={0.55} scale={4} blur={2.4} far={1.2} resolution={tier === 'high' ? 512 : 256} frames={1} />}
          <OrbitControls
            ref={controls}
            makeDefault
            target={initial.target}
            enableDamping
            dampingFactor={0.12}
            minDistance={0.25}
            maxDistance={3.2}
            maxPolarAngle={Math.PI * 0.62}
            minAzimuthAngle={-1.1}
            maxAzimuthAngle={1.2}
            onStart={() => setGoal(null)}
          />
          <CameraRig goal={goal} controls={controls} onArrive={() => setGoal(null)} />
        </Canvas>

        {/* overlay HUD */}
        <div className="absolute top-2 left-2 right-2 flex gap-1.5 overflow-x-auto pointer-events-auto hud-row" role="toolbar" aria-label="Camera tours">
          {TOURS.map((t) => (
            <button key={t.id} type="button" className="hud-chip" aria-pressed={tourId === t.id} onClick={() => fly(t.id)}>
              {t.id === 'overview' ? <Icon name="layers" size={14} /> : <Icon name="search" size={14} />} {t.label}
            </button>
          ))}
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex gap-1.5 flex-wrap items-end">
          <button type="button" className="hud-chip" aria-pressed={xray} onClick={() => setXray(!xray)}><Icon name="bolt" size={14} /> X-ray current</button>
          <button type="button" className="hud-chip" aria-pressed={explode} onClick={() => { setExplode(!explode); if (!explode) fly('contactor'); }}><Icon name="layers" size={14} /> Explode contactor</button>
          <span role="note" className="hud-chip hud-platform !cursor-default" aria-label={`Hardware labeled in ${skin.brand} style, ${skin.family}`}>
            <span className="hud-maker">{skin.maker.replace(/\s*\(.*\)$/, '')}</span> {skin.family}
          </span>
          <span role="note" className="ml-auto hud-chip !cursor-default" aria-label={`3D quality ${tier}`}>{tier.toUpperCase()}</span>
        </div>
        {xray && (
          <div className="absolute top-12 right-2 hud-legend text-[0.68rem] space-y-0.5" role="note" aria-label="Current flow legend">
            <p className="m-0"><span className="dot" style={{ background: '#3ddc97' }} /> 120 VAC coil circuit</p>
            <p className="m-0"><span className="dot" style={{ background: '#22d3ee' }} /> 480 VAC motor power</p>
            <p className="m-0"><span className="dot" style={{ background: '#ffb547' }} /> 24 VDC inputs</p>
          </div>
        )}
      </div>
      <p className="text-xs text-muted px-3 py-2 m-0 border-t border-line">
        Drag to orbit, pinch to zoom. Tap any part to learn about it; tap the buttons on the operator station to run the motor. Generic hardware labeled in the {skin.brand} style ({skin.family}) — change it with the platform bar. Wire colors are examples; they vary by site and code.
      </p>

      <Sheet open={Boolean(part)} onClose={() => setInfo(null)} title={part?.title ?? ''}>
        {part && (
          <div className="space-y-3">
            <p className="m-0"><Rich text={part.what} /></p>
            <div className="callout callout-tip">
              <p className="m-0 font-bold text-heading flex items-center gap-2"><Icon name="meter" size={16} /> How to test it</p>
              <p className="m-0 mt-1 text-sm"><Rich text={part.test} /></p>
            </div>
            {part.safety && (
              <div className="callout callout-safety">
                <p className="m-0 font-bold text-heading flex items-center gap-2"><Icon name="shield" size={16} /> Safety</p>
                <p className="m-0 mt-1 text-sm">{part.safety}</p>
              </div>
            )}
            {part.lesson && <a className="btn btn-sm" href={href(`lesson/${part.lesson}`)}>Open the lesson <Icon name="chevron" size={16} /></a>}
          </div>
        )}
      </Sheet>
    </section>
  );
}
