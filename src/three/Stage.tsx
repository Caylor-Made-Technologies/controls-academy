/**
 * The one way the app opens a 3D canvas. Every 3D view goes through <Stage> so they all share:
 * - quality tiers from the device test (src/three/support.ts),
 * - render-on-change: idle scenes draw only when invalidated; animation is capped per tier,
 * - pause when off-screen or the tab is hidden (frameloop "never"),
 * - context-loss fallback, and clean disposal on unmount (R3F disposes the scene and drops the context),
 * - a small registry the leak test reads (window.__ca3d).
 */
import { Canvas, useThree, type CanvasProps, type RootState } from '@react-three/fiber';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { WebGLRenderer } from 'three';
import { capped, probeDevice, pickTier, tierSettings, type Tier, type TierSettings } from './support';
import { textureCacheSize } from './textures';
import { useLook, type Look } from './look';

interface Live { id: number; gl: WebGLRenderer | null }
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
    })),
  };
}
if (typeof window !== 'undefined') {
  Object.defineProperty(window, '__ca3d', { value: { stats: stageStats }, configurable: true });
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
  children: (s: TierSettings, look: Look) => ReactNode;
}

export function Stage({ quality, animate, lostFallback, capTier, children, onCreated, ...rest }: StageProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(wrap);
  const [lost, setLost] = useState(false);
  const probe = probeDevice();
  const tier = capped(pickTier(quality, probe), capTier);
  const s = tierSettings(tier, probe);
  const look = useLook();
  const id = useRef(0);

  useEffect(() => {
    const me = nextId++;
    id.current = me;
    live.set(me, { id: me, gl: null });
    counts.opened++;
    return () => { live.delete(me); counts.closed++; };
  }, []);

  if (lost) return <>{lostFallback}</>;

  const throttled = animate && s.maxFps < 60;
  const frameloop = !onScreen ? 'never' : animate && !throttled ? 'always' : 'demand';
  return (
    <div ref={wrap} className="absolute inset-0" data-frameloop={frameloop}>
      <Canvas
        {...rest}
        dpr={s.dpr}
        shadows={s.shadows ? 'soft' : false}
        frameloop={frameloop}
        gl={{ antialias: s.antialias, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
        onCreated={(st: RootState) => {
          const entry = live.get(id.current);
          if (entry) entry.gl = st.gl;
          st.gl.domElement.addEventListener('webglcontextlost', (e) => {
            // Our own unmount also drops the context; only show the fallback for a real loss.
            if (live.has(id.current)) { e.preventDefault(); setLost(true); }
          });
          onCreated?.(st);
        }}
      >
        {throttled && onScreen && <Throttle fps={s.maxFps} />}
        <Grade exposure={look.exposure} />
        {children(s, look)}
      </Canvas>
    </div>
  );
}
