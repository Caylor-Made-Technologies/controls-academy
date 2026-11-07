/**
 * Lazy-loaded 3D view of the motor-station control panel, synced to the live engine.
 * Quality tiers adapt to the device; render loop runs on demand when nothing moves.
 */
import { ContactShadows, OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Icon } from '../components/Icon';
import { Rich } from '../components/RichText';
import { Sheet } from '../components/Sheet';
import type { SimRuntime } from '../features/simulator/runtime';
import { href } from '../lib/router';
import { usePrefs } from '../state/prefs';
import { SKINS } from '../skins';
import { BRAND_GUIDES } from '../content/brands';
import { DEFAULT_HW, HARDWARE, categoryOf } from '../content/hardware';

const SIM_HW = HARDWARE.filter((m) => categoryOf(m) === 'plc' || categoryOf(m) === 'logic');
import { PARTS, TOURS, type PartId } from './info';
import { PanelScene } from './PanelScene';
import { panelSignature } from './signature';
import { Stage } from './Stage';
import { StudioLights } from './Lights';
import { capped, pickTier, probeDevice, type Tier } from './support';
import { retainTextures } from './textures';

/**
 * Draw a frame only when something visible changed (B-001). After a change, keep drawing for half a
 * second so eased motion (armature pull-in, overload flag) can settle, then go quiet.
 */
function Invalidator({ rt }: { rt: SimRuntime }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let sig = '';
    let until = 0;
    const off = rt.subscribe(() => {
      const next = panelSignature(rt);
      const t = performance.now();
      if (next !== sig) { sig = next; until = t + 500; }
      if (t < until) invalidate();
    });
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

function Panel3D({ rt, onDevice }: { rt: SimRuntime; onDevice?: (id: string) => void }) {
  const quality = usePrefs((s) => s.quality);
  const skin = SKINS[usePrefs((s) => s.skin)];
  const hwModel = usePrefs((s) => s.hwModel);
  const setPrefs = usePrefs((s) => s.setPrefs);
  const hwId = hwModel || DEFAULT_HW[skin.id];
  const hw = SIM_HW.find((m) => m.id === hwId) ?? null;
  const [capTier, setCapTier] = useState<Tier | undefined>(undefined);
  const [selected, setSelected] = useState<PartId | null>(null);
  const [info, setInfo] = useState<PartId | null>(null);
  const [xray, setXray] = useState(false);
  const [explode, setExplode] = useState(false);
  const [goal, setGoal] = useState<{ pos: Vector3; target: Vector3 } | null>(null);
  const [tourId, setTourId] = useState<string>('overview');
  const controls = useRef<OrbitControlsImpl | null>(null);
  // Live motor readout for the HUD; rounded so steady running doesn't re-render every tick.
  const readout = useSyncExternalStore(rt.subscribe, () => {
    const st = rt.scene.state;
    return st.rpm < 1 && st.amps < 0.05 ? 'Motor stopped' : `${Math.round(st.rpm / 5) * 5} rpm · ${st.amps.toFixed(st.amps < 10 ? 1 : 0)} A`;
  });
  const spinning = useSyncExternalStore(rt.subscribe, () => rt.scene.state.rpm > 1 || Boolean(rt.plc.fault));

  useEffect(() => retainTextures(), []);
  useEffect(() => { setCapTier(undefined); }, [quality]);
  const tier = capped(pickTier(quality, probeDevice()), capTier);

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
  const initial = TOURS[0];
  const reduceMotion = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  // Fly-in on open: start wide and high, glide to the overview (skipped with reduced motion).
  const camera = useMemo(() => ({ position: (reduceMotion ? initial.pos : [2.1, 1.25, 3.6]) as [number, number, number], fov: 38, near: 0.02, far: 20 }), [initial.pos, reduceMotion]);
  useEffect(() => {
    if (!reduceMotion) setGoal({ pos: new Vector3(...initial.pos), target: new Vector3(...initial.target) });
  }, [reduceMotion, initial]);

  return (
    <section className="card overflow-hidden relative" aria-label="3D control panel">
      <div className="relative h-[clamp(380px,68svh,560px)] lg:h-[540px] panel3d-bg">
        <Stage
          quality={quality}
          animate={animating}
          capTier={capTier}
          camera={camera}
                    onPointerMissed={() => setSelected(null)}
          aria-label="Interactive 3D control panel. Tap a component to learn about it. Use the 2D view for full keyboard control."
          role="img"
          lostFallback={(
            <div className="card-pad text-sm" role="status">
              The 3D view lost its graphics context (the device may be low on memory). Switch to 2D, or reload to try again.
            </div>
          )}
        >
          {(q, look) => <>
          <Invalidator rt={rt} />
          <PerformanceMonitor
            onDecline={() => { if (quality === 'auto') setCapTier('low'); }}
          />
          <StudioLights look={look} q={q} keyPos={[1.6, 2.2, 2.4]} shadowBox={{ left: -1.5, right: 1.8, top: 1.2, bottom: -1.2 }} />
          <pointLight position={[0, 0.3, 0.6]} intensity={0.6} distance={2} color="#e8f1ff" />
          <PanelScene rt={rt} skin={skin} selected={selected} onSelect={onSelect} xray={xray} explode={explode} shadows={q.shadows} hw={hw} look={look} aoRes={q.contactRes} />
          {q.contactRes > 0 && <ContactShadows position={[0.3, -0.748, 0.4]} opacity={look.ao} scale={4} blur={2.4} far={1.2} resolution={q.contactRes} frames={1} />}
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
          </>}
        </Stage>

        {/* overlay HUD */}
        <div className="absolute top-2 left-2 right-2 flex gap-1.5 overflow-x-auto pointer-events-auto hud-row" role="toolbar" aria-label="Camera tours">
          {TOURS.map((t) => (
            <button key={t.id} type="button" className="hud-chip" aria-pressed={tourId === t.id} onClick={() => fly(t.id)}>
              {t.id === 'overview' ? <Icon name="layers" size={14} /> : <Icon name="search" size={14} />} {t.label}
            </button>
          ))}
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex gap-1.5 items-end overflow-x-auto hud-row" role="toolbar" aria-label="3D tools">
          <button type="button" className="hud-chip" aria-pressed={xray} onClick={() => setXray(!xray)}><Icon name="bolt" size={14} /> X-ray current</button>
          <button type="button" className="hud-chip" aria-pressed={explode} onClick={() => { setExplode(!explode); if (!explode) fly('contactor'); }}><Icon name="layers" size={14} /> Explode contactor</button>
          <label className="hud-chip hud-platform">
            <span className="sr-only">PLC hardware shown in 3D</span>
            <Icon name="sim" size={14} />
            <select className="hud-select" value={hw ? hw.id : 'generic'} onChange={(e) => setPrefs({ hwModel: e.target.value })} aria-label="PLC hardware shown in 3D">
              <option value="generic">Generic rack ({skin.family})</option>
              {BRAND_GUIDES.filter((b) => SIM_HW.some((m) => m.brand === b.id)).map((b) => (
                <optgroup key={b.id} label={b.name}>
                  {SIM_HW.filter((m) => m.brand === b.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <span role="status" className="ml-auto hud-chip !cursor-default tabular-nums" aria-live="off">{readout}</span>
          <span role="note" className="hud-chip !cursor-default" aria-label={`3D quality ${tier}`}>{tier.toUpperCase()}</span>
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
        Drag to orbit, pinch to zoom. Tap any part to learn about it; tap the buttons on the operator station to run the motor. PLC hardware: {hw ? `${hw.name}, a simplified look-alike (no logos)` : 'a generic rack'}, labeled in the {skin.brand} style ({skin.family}). Pick another model with the hardware menu, or browse the <a className="underline" href={href('reference/hardware')}>hardware library</a>. Wire colors are examples; they vary by site and code.
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

/** Memoized: the workbench re-renders every scan; the 3D panel must not (each re-render would draw a frame). */
export default memo(Panel3D);
