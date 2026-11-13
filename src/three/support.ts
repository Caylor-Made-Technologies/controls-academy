/**
 * Device checks and quality tiers for the 3D layer. No three.js import, so this is safe in the main
 * bundle: it decides *whether* to load 3D before any 3D code is downloaded.
 */

export type Tier = 'low' | 'medium' | 'high';

/** What we learned about the device. Gathered once by `probeDevice()`; a plain object so it's testable. */
export interface DeviceProbe {
  webgl: boolean;
  /** GPU renderer string when the browser exposes it ('' if hidden). */
  renderer: string;
  cores: number;
  /** navigator.deviceMemory in GB (Chromium only; 0 when unknown). */
  memoryGB: number;
  coarse: boolean;
  dpr: number;
  reducedMotion: boolean;
}

/** Everything a 3D canvas needs to know about how hard to work. */
export interface TierSettings {
  tier: Tier;
  dpr: number;
  antialias: boolean;
  shadows: boolean;
  /** Environment-map resolution (0 = no environment map). */
  envRes: number;
  /** Contact-shadow resolution (0 = none). */
  contactRes: number;
  /** Frame-rate cap while something animates. Idle scenes render only on change. */
  maxFps: number;
}

/** A software rasterizer (no GPU): 3D works but costs a lot of CPU. */
export function isSoftwareRenderer(renderer: string): boolean {
  return /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(renderer);
}

/** Pick a tier from an explicit preference or, on "auto", from the device test. */
export function pickTier(quality: string, d: DeviceProbe): Tier {
  if (quality === 'low' || quality === 'medium' || quality === 'high') return quality;
  if (isSoftwareRenderer(d.renderer)) return 'low';
  if ((d.memoryGB > 0 && d.memoryGB <= 2) || (d.cores > 0 && d.cores <= 2)) return 'low';
  if (d.coarse || (d.memoryGB > 0 && d.memoryGB <= 4) || (d.cores > 0 && d.cores <= 4)) return 'medium';
  return 'high';
}

const ORDER: Tier[] = ['low', 'medium', 'high'];

/** The tier after a runtime cap (the performance monitor saw dropped frames). */
export function capped(t: Tier, cap?: Tier): Tier {
  return cap && ORDER.indexOf(cap) < ORDER.indexOf(t) ? cap : t;
}

export function tierSettings(tier: Tier, d: Pick<DeviceProbe, 'dpr'>): TierSettings {
  const dpr = Math.max(1, d.dpr || 1);
  switch (tier) {
    case 'high': return { tier, dpr: Math.min(2, dpr), antialias: true, shadows: false, envRes: 128, contactRes: 512, maxFps: 60 };
    case 'medium': return { tier, dpr: Math.min(1.5, dpr), antialias: true, shadows: false, envRes: 64, contactRes: 256, maxFps: 60 };
    default: return { tier, dpr: 1, antialias: false, shadows: false, envRes: 0, contactRes: 0, maxFps: 30 };
  }
}

/** Should 3D open by default? Respects "2D only", reduced motion and GPU-less devices on "auto". */
export function shouldOpen3D(quality: string, d: DeviceProbe): boolean {
  if (quality === '2d' || !d.webgl) return false;
  if (quality !== 'auto') return true;
  return !d.reducedMotion && !isSoftwareRenderer(d.renderer);
}

let cached: DeviceProbe | null = null;

/** Test the device once per page load. The probe context is released straight away. */
export function probeDevice(): DeviceProbe {
  if (cached) return cached;
  let webgl = false;
  let renderer = '';
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (gl) {
      webgl = true;
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      renderer = String((info && gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    webgl = false;
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  cached = {
    webgl,
    renderer,
    cores: nav.hardwareConcurrency || 0,
    memoryGB: nav.deviceMemory || 0,
    coarse: Boolean(window.matchMedia?.('(pointer: coarse)').matches),
    dpr: window.devicePixelRatio || 1,
    reducedMotion: Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  };
  return cached;
}

export function hasWebGL(): boolean {
  return probeDevice().webgl;
}

export function prefer3D(quality: string): boolean {
  return shouldOpen3D(quality, probeDevice());
}
