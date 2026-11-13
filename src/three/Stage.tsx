/**
 * The one way the app opens a 3D canvas. Every 3D view goes through <Stage> so they all share:
 * - quality tiers from the device test (src/three/support.ts),
 * - render-on-change: idle scenes draw only when invalidated; animation is capped per tier,
 * - pause when off-screen or the tab is hidden (frameloop "never"),
 * - context-loss fallback, and clean disposal on unmount (R3F disposes the scene and drops the context),
 * - a small registry the leak test reads (window.__ca3d).
 */
import { Canvas, useFrame, useThree, type CanvasProps, type RootState } from '@react-three/fiber';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box3, Quaternion, Vector3, type Mesh, type PerspectiveCamera, type WebGLRenderer } from 'three';
import { capped, probeDevice, pickTier, tierSettings, type Tier, type TierSettings } from './support';
import { textureCacheSize } from './textures';
import { useLook, type Look } from './look';

interface Live { id: number; gl: WebGLRenderer | null; state: RootState | null }
const live = new Map<number, Live>();
const counts = { opened: 0, closed: 0 };
let nextId = 1;

/** Read-only numbers for tests and debugging: open stages, GPU resources, cached textures. */
export function stageStats() {
  return {
    live: live.size,
    opened: counts.opened,
    closed: counts.closed,
    cachedTextures: textureCacheSize(),
    stages: [...live.values()].map((s) => ({
      geometries: s.gl?.info.memory.geometries ?? 0,
      textures: s.gl?.info.memory.textures ?? 0,
      programs: s.gl?.info.programs?.length ?? 0,
      frames: s.gl?.info.render.frame ?? 0,
      calls: s.gl?.info.render.calls ?? 0,
      triangles: s.gl?.info.render.triangles ?? 0,
    })),
  };
}

/**
 * Every solid mesh in each open stage as a box or cylinder (center, half-size, rotation) plus the camera.
 * `scripts/gen-posters.mjs` reads this to draw the poster stills, so posters always match the real scenes.
 */
export function stageDump() {
  return [...live.values()].filter((s) => s.state).map((s) => {
    const st = s.state!;
    const cam = st.camera as PerspectiveCamera;
    const look = new Vector3(0, 0, -1).applyQuaternion(cam.quaternion).add(cam.position);
    const prims: number[][] = [];
    const box = new Box3();
    const c = new Vector3();
    const h = new Vector3();
    const pos = new Vector3();
    const quat = new Quaternion();
    const scale = new Vector3();
    st.scene.updateMatrixWorld(true);
    st.scene.traverseVisible((o) => {
      const m = o as Mesh;
      if (!m.isMesh || !m.geometry || o.userData.noPoster) return;
      const type = m.geometry.type;
      if (/Plane|Shape|Ring|Circle/.test(type)) return;
      const mat = Array.isArray(m.material) ? m.material[0] : m.material;
      if (!mat || !mat.visible || (mat.transparent && mat.opacity < 0.08)) return;
      const glass = mat.transparent && mat.opacity < 0.7;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      box.copy(m.geometry.boundingBox!);
      box.getCenter(c);
      box.getSize(h).multiplyScalar(0.5);
      m.matrixWorld.decompose(pos, quat, scale);
      c.applyMatrix4(m.matrixWorld);
      h.multiply(scale);
      const mm = (v: number) => Math.round(v * 1000);
      const p = [mm(c.x), mm(c.y), mm(c.z), Math.abs(mm(h.x)), Math.abs(mm(h.y)), Math.abs(mm(h.z)), (/Cylinder|Capsule|Sphere|Cone/.test(type) ? 1 : 0) + (glass ? 2 : 0)];
      if (Math.abs(quat.w) < 0.9995) p.push(mm(quat.x), mm(quat.y), mm(quat.z), mm(quat.w));
      prims.push(p);
    });
    return { fov: cam.fov, aspect: cam.aspect, pos: cam.position.toArray(), look: look.toArray(), prims };
  });
}
if (typeof window !== 'undefined') {
  Object.defineProperty(window, '__ca3d', { value: { stats: stageStats, dump: stageDump }, configurable: true });
}

/** Is this element on screen and the tab visible? */
function useOnScreen(ref: React.RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((e) => setInView(e.some((x) => x.isIntersecting)), { rootMargin: '64px' });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  useEffect(() => {
    const on = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return inView && visible;
}

/** Tone-mapping exposure follows the theme's grade (and redraws once when it changes). */
function Grade({ exposure }: { exposure: number }) {
  const gl = useThree((st) => st.gl);
  const invalidate = useThree((st) => st.invalidate);
  useEffect(() => { gl.toneMappingExposure = exposure; invalidate(); }, [gl, exposure, invalidate]);
  return null;
}

/** Tells the host once the first frame is on screen (the poster still can fade out). */
function FirstFrame({ onDone }: { onDone: () => void }) {
  const done = useRef(false);
  useFrame(() => { if (!done.current) { done.current = true; requestAnimationFrame(onDone); } });
  return null;
}

/** While animating under a frame cap, ask for a frame at most `fps` times a second. */
function Throttle({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const gap = 1000 / fps - 1;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last >= gap) { last = t; invalidate(); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fps, invalidate]);
  return null;
}

export interface StageProps extends Omit<CanvasProps, 'children' | 'frameloop' | 'dpr' | 'gl' | 'shadows'> {
  /** The user's 3D quality preference ('auto' runs the device test). */
  quality: string;
  /** True while something moves (a spinning shaft, a camera glide). Otherwise frames are drawn only on invalidate(). */
  animate: boolean;
  /** Shown instead of the canvas if the GPU drops the context. */
  lostFallback: ReactNode;
  /** Lowest tier we've been told to use (PerformanceMonitor decline). */
  capTier?: Tier;
  /** Called once, right after the first frame is drawn. */
  onFirstFrame?: () => void;
  children: (s: TierSettings, look: Look) => ReactNode;
}

export function Stage({ quality, animate, lostFallback, capTier, children, onCreated, onFirstFrame, ...rest }: StageProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(wrap);
  const [lost, setLost] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const probe = probeDevice();
  const tier = capped(pickTier(quality, probe), capTier);
  const s = tierSettings(tier, probe);
  const look = useLook();
  const id = useRef(0);

  useEffect(() => {
    const me = nextId++;
    id.current = me;
    live.set(me, { id: me, gl: null, state: null });
    counts.opened++;
    return () => { live.delete(me); counts.closed++; };
  }, []);

  if (lost) return <>{lostFallback}</>;

  const throttled = animate && s.maxFps < 60;
  const frameloop = !onScreen ? 'never' : animate && !throttled ? 'always' : 'demand';
  return (
    <div ref={wrap} className="absolute inset-0 stage-canvas" data-drawn={drawn} data-frameloop={frameloop}>
      <Canvas
        {...rest}
        dpr={s.dpr}
        shadows={s.shadows ? 'soft' : false}
        frameloop={frameloop}
        gl={{ antialias: s.antialias, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
        onCreated={(st: RootState) => {
          const entry = live.get(id.current);
          if (entry) { entry.gl = st.gl; entry.state = st; }
          st.gl.domElement.addEventListener('webglcontextlost', (e) => {
            // Our own unmount also drops the context; only show the fallback for a real loss.
            if (live.has(id.current)) { e.preventDefault(); setLost(true); }
          });
          onCreated?.(st);
        }}
      >
        {throttled && onScreen && <Throttle fps={s.maxFps} />}
        <FirstFrame onDone={() => { setDrawn(true); onFirstFrame?.(); }} />
        <Grade exposure={look.exposure} />
        {children(s, look)}
      </Canvas>
    </div>
  );
}
