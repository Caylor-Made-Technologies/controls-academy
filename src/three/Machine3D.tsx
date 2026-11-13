/**
 * Lazy-loaded 3D view for any machine except the motor station (which has its own detailed panel).
 * The scene reads the live engine every frame it draws; the host draws only when the I/O image changes
 * or the scene says something is moving. Tap a part to open its device card (wiring, I/O point).
 */
import { OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Icon } from '../components/Icon';
import type { SimRuntime } from '../features/simulator/runtime';
import { usePrefs } from '../state/prefs';
import { StudioLights } from './Lights';
import { MACHINE_SCENES } from './machines';
import { Room } from './machines/parts';
import { machineSignature } from './signature';
import { Stage } from './Stage';
import { GroundShadow } from './GroundShadow';
import { capped, pickTier, probeDevice, type Tier } from './support';
import { retainTextures } from './textures';
import { Poster } from './poster/Poster';
import { CAPTION, FRAME, MACHINE_CAPTION } from './poster/frames';
import { POSTERS } from './poster/sim.gen';

function Invalidator({ rt, extra }: { rt: SimRuntime; extra?: (rt: SimRuntime) => string }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let sig = '';
    let until = 0;
    const off = rt.subscribe(() => {
      const next = machineSignature(rt) + (extra ? `#${extra(rt)}` : '');
      const t = performance.now();
      if (next !== sig) { sig = next; until = t + 500; }
      if (t < until) invalidate();
    });
    return () => { off(); };
  }, [rt, invalidate, extra]);
  return null;
}

/** HUD readout in its own component: its text changes every scan; nothing else should re-render. */
function HudReadout({ rt, read }: { rt: SimRuntime; read: (rt: SimRuntime) => string }) {
  const text = useSyncExternalStore(rt.subscribe, () => read(rt));
  return <span role="status" className="ml-auto hud-chip !cursor-default tabular-nums max-sm:!text-2xs max-sm:!px-2.5" aria-live="off">{text}</span>;
}

/** Back the camera off on narrow (portrait) canvases so the whole machine fits a phone. */
export function framed(pos: [number, number, number], target: [number, number, number], aspect: number): Vector3 {
  const k = Math.max(1, 1.1 / Math.max(0.3, aspect));
  const t = new Vector3(...target);
  return new Vector3(...pos).sub(t).multiplyScalar(k).add(t);
}

function FitOnResize({ def, controls }: { def: { camera: { pos: [number, number, number]; target: [number, number, number] } }; controls: React.RefObject<OrbitControlsImpl | null> }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(1, size.height);
  useEffect(() => {
    camera.position.copy(framed(def.camera.pos, def.camera.target, aspect));
    controls.current?.target.set(...def.camera.target);
    controls.current?.update();
  }, [camera, aspect, def, controls]);
  return null;
}

function Glide({ goal, controls, onArrive }: { goal: { pos: Vector3; target: Vector3 } | null; controls: React.RefObject<OrbitControlsImpl | null>; onArrive: () => void }) {
  const camera = useThree((s) => s.camera);
  useFrame((_, dt) => {
    const c = controls.current;
    if (!goal || !c) return;
    const k = 1 - Math.pow(0.002, Math.min(dt, 0.1));
    camera.position.lerp(goal.pos, k);
    c.target.lerp(goal.target, k);
    c.update();
    if (camera.position.distanceTo(goal.pos) < 0.01 && c.target.distanceTo(goal.target) < 0.01) onArrive();
  });
  return null;
}

/** Ground patch that receives the baked contact shadows (meters), from the scene radius. Stable per radius. */
const sizes = new Map<number, [number, number]>();
const SHADOW_SIZE = (r: number): [number, number] => { if (!sizes.has(r)) sizes.set(r, [r * 3.2, r * 3.2]); return sizes.get(r)!; };

type ViewId = 'overview' | 'front' | 'side' | 'above';
const VIEWS: { id: ViewId; label: string }[] = [{ id: 'overview', label: 'Reset view' }, { id: 'front', label: 'Front' }, { id: 'side', label: 'Side' }, { id: 'above', label: 'Above' }];

function Machine3D({ rt, onDevice }: { rt: SimRuntime; onDevice?: (id: string) => void }) {
  const def = MACHINE_SCENES[rt.scene.id];
  const quality = usePrefs((s) => s.quality);
  const [capTier, setCapTier] = useState<Tier | undefined>(undefined);
  const tier = capped(pickTier(quality, probeDevice()), capTier);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<ViewId | null>('overview');
  const [goal, setGoal] = useState<{ pos: Vector3; target: Vector3 } | null>(null);
  const [drawn, setDrawn] = useState(false);
  const controls = useRef<OrbitControlsImpl | null>(null);
  const moving = useSyncExternalStore(rt.subscribe, () => def.moving(rt));
  useEffect(() => retainTextures(), []);
  const reduce = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const camera = useMemo(() => ({ position: def.camera.pos, fov: 40, near: 0.05, far: 60 }), [def]);
  const r = def.radius;
  const dist = Math.hypot(...def.camera.pos.map((v, i) => v - def.camera.target[i]));
  const pick = useCallback((id: string, at?: [number, number, number]) => {
    setSelected(id);
    setView(null);
    onDevice?.(id);
    // Focus: glide toward the tapped part, keeping the current viewing direction.
    const c = controls.current;
    if (!at || !c) return;
    const target = new Vector3(...at);
    const dir = c.object.position.clone().sub(c.target).normalize();
    const pos = target.clone().add(dir.multiplyScalar(def.radius * 0.75));
    if (reduce) { c.object.position.copy(pos); c.target.copy(target); c.update(); } else setGoal({ pos, target });
  }, [onDevice, def, reduce]);
  const SceneC = useMemo(() => memo(def.Scene), [def]);
  const wrap = useRef<HTMLDivElement>(null);
  // Named camera views. The camera eases to each one (instant with reduced motion); dragging takes over at once.
  const goTo = (id: ViewId) => {
    const el = wrap.current;
    const aspect = el ? el.clientWidth / Math.max(1, el.clientHeight) : 1.5;
    const target = new Vector3(...def.camera.target);
    const home = framed(def.camera.pos, def.camera.target, aspect);
    const d = home.distanceTo(target);
    const pos = id === 'front' ? target.clone().add(new Vector3(0, d * 0.12, d)) : id === 'side' ? target.clone().add(new Vector3(d, d * 0.12, d * 0.08)) : id === 'above' ? target.clone().add(new Vector3(d * 0.02, d * 0.98, d * 0.2)) : home;
    setView(id);
    setSelected(null);
    if (reduce && controls.current) { controls.current.object.position.copy(pos); controls.current.target.copy(target); controls.current.update(); } else setGoal({ pos, target });
  };

  return (
    <section className="card overflow-hidden relative" aria-label="3D machine view">
      <div ref={wrap} className={FRAME.machine}>
        {POSTERS[def.id] && <Poster spec={POSTERS[def.id]} fade={drawn} />}
        <Stage
          onFirstFrame={() => setDrawn(true)}
          quality={quality}
          animate={moving || Boolean(goal)}
          capTier={capTier}
          camera={camera}
          onPointerMissed={() => setSelected(null)}
          aria-label={`Interactive 3D view: ${def.describe} Tap a part for its wiring card. The 2D panel below has every control.`}
          role="img"
          lostFallback={<div className="card-pad text-sm" role="status">The 3D view lost its graphics context (the device may be low on memory). Switch to 2D, or reload to try again.</div>}
        >
          {(q, look) => <>
            <Invalidator rt={rt} extra={def.signature} />
            <PerformanceMonitor onDecline={() => { if (quality === 'auto') setCapTier('low'); }} />
            <StudioLights look={look} q={q} keyPos={[r * 0.8, r * 1.4, r * 1.2]} shadowBox={{ left: -r, right: r, top: r, bottom: -r }} fog={[dist * 1.3, dist * 3.2]} />
            <Room look={look} size={Math.max(12, r * 6)} />
            <SceneC rt={rt} selected={selected} onPick={pick} />
            {/* Not on the low tier: a floor-sized blended layer costs a weak GPU a third of its frame rate. */}
            {q.contactRes > 0 && <GroundShadow size={SHADOW_SIZE(r)} opacity={look.ao} res={512} reach={Math.max(0.5, r * 0.25)} />}
            <OrbitControls
              ref={controls}
              makeDefault
              target={def.camera.target}
              enableDamping
              dampingFactor={0.12}
              minDistance={r * 0.4}
              maxDistance={r * 4.5}
              maxPolarAngle={Math.PI * 0.49}
              onStart={() => { setGoal(null); setView(null); }}
            />
            <FitOnResize def={def} controls={controls} />
            <Glide goal={goal} controls={controls} onArrive={() => setGoal(null)} />
          </>}
        </Stage>
        <div className="absolute bottom-2 left-2 right-2 flex gap-1.5 items-end overflow-x-auto hud-row" role="toolbar" aria-label="3D tools">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" className="hud-chip" aria-pressed={view === v.id} onClick={() => goTo(v.id)} aria-label={v.id === 'overview' ? 'Reset view' : `${v.label} view`}>
              {v.id === 'overview' && <Icon name="reset" size={14} />} <span className={v.id === 'overview' ? 'max-sm:hidden' : undefined}>{v.label}</span>
            </button>
          ))}
          <HudReadout rt={rt} read={def.readout} />
          <span role="note" className="hud-chip !cursor-default max-sm:!hidden" aria-label={`3D quality ${tier}`}>{tier.toUpperCase()}</span>
        </div>
      </div>
      <p className={CAPTION}>{MACHINE_CAPTION}</p>
    </section>
  );
}

/** Memoized: the workbench re-renders every scan; this must not (each re-render would draw a frame). */
export default memo(Machine3D);
