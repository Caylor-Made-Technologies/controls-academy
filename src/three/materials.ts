/**
 * The material library: one physically based recipe per real surface, shared by every 3D scene so steel
 * looks like the same steel in the panel, the machines and the hardware library.
 *
 * Use `<Surf s="powderCoat" color="#c9ced4" />` as a mesh child in place of an inline material, or
 * `surface('copper')` for the object. Materials are cached by (surface, color, opacity) and shared between
 * meshes, which also keeps the number of shader programs down.
 *
 * Values are tuned by eye against the studio lighting in Lights.tsx (neutral room reflections, ACES tone
 * mapping). Colors are the surface's base color in sRGB.
 */
import { createElement } from 'react';
import { DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, type Material } from 'three';
import { brushedTexture } from './textures';

export type Surface =
  | 'brushedSteel' | 'machinedSteel' | 'galvanized' | 'castIron' | 'copper' | 'tinned' | 'brass'
  | 'powderCoat' | 'enamel' | 'plasticMatte' | 'plasticGloss' | 'rubber' | 'glass' | 'acrylic' | 'label';

interface Recipe {
  color: string;
  metalness: number;
  roughness: number;
  /** Strength of room reflections (1 = physically plain). */
  env?: number;
  /** Lacquer layer for paint and glossy plastic (uses the physical material). */
  clearcoat?: number;
  clearcoatRoughness?: number;
  opacity?: number;
  brushed?: boolean;
}

export const SURFACES: Record<Surface, Recipe> = {
  // Metals: fully metallic; the look comes from roughness and the reflected room.
  brushedSteel: { color: '#c9cfd6', metalness: 1, roughness: 0.42, env: 1.1, brushed: true },
  machinedSteel: { color: '#d5dade', metalness: 1, roughness: 0.22, env: 1.2 },
  galvanized: { color: '#a9b1ba', metalness: 0.9, roughness: 0.55, env: 0.9 },
  castIron: { color: '#3a4049', metalness: 0.6, roughness: 0.78, env: 0.7 },
  copper: { color: '#c97b4a', metalness: 1, roughness: 0.28, env: 1.2 },
  tinned: { color: '#d9dde1', metalness: 1, roughness: 0.32, env: 1.1 },
  brass: { color: '#c9a24a', metalness: 1, roughness: 0.3, env: 1.1 },
  // Coatings: not metallic; a clear layer gives paint its soft highlight.
  powderCoat: { color: '#c9ced4', metalness: 0, roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.55, env: 0.8 },
  enamel: { color: '#2f5d8a', metalness: 0, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25, env: 0.9 },
  // Plastics and rubber.
  plasticMatte: { color: '#2b3038', metalness: 0, roughness: 0.72, env: 0.6 },
  plasticGloss: { color: '#1f242b', metalness: 0, roughness: 0.28, clearcoat: 0.5, clearcoatRoughness: 0.15, env: 0.9 },
  rubber: { color: '#1b1e22', metalness: 0, roughness: 0.92, env: 0.35 },
  // See-through covers. Kept simple (alpha, no refraction) so they cost nothing on a phone.
  glass: { color: '#cfe6ff', metalness: 0, roughness: 0.06, opacity: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, env: 1.4 },
  acrylic: { color: '#dfe7ef', metalness: 0, roughness: 0.2, opacity: 0.35, env: 1.1 },
  // Printed labels and nameplates (a texture is set by the caller).
  label: { color: '#ffffff', metalness: 0, roughness: 0.7, env: 0.4 },
};

const cache = new Map<string, Material>();

/** The shared material for a surface, optionally recolored (paint, plastic) or made see-through. */
export function surface(s: Surface, color?: string, opacity?: number): MeshStandardMaterial {
  const r = SURFACES[s];
  const a = opacity ?? r.opacity;
  const key = `${s}|${color ?? ''}|${a ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit as MeshStandardMaterial;
  const base = { color: color ?? r.color, metalness: r.metalness, roughness: r.roughness, envMapIntensity: r.env ?? 1, transparent: a !== undefined, opacity: a ?? 1, ...(a !== undefined ? { depthWrite: false, side: DoubleSide } : {}) };
  const m = r.clearcoat ? new MeshPhysicalMaterial({ ...base, clearcoat: r.clearcoat, clearcoatRoughness: r.clearcoatRoughness ?? 0.3 }) : new MeshStandardMaterial(base);
  if (r.brushed && typeof document !== 'undefined') { m.roughnessMap = brushedTexture(); m.roughnessMap.repeat.set(2, 2); }
  m.name = key;
  cache.set(key, m);
  return m;
}

/** Pick the closest recipe for legacy call sites that only know a color, a metalness and a roughness. */
export function surfaceFor(metal: number, rough: number): Surface {
  if (metal >= 0.75) return rough <= 0.28 ? 'machinedSteel' : rough <= 0.5 ? 'brushedSteel' : 'galvanized';
  if (metal >= 0.35) return rough >= 0.7 ? 'castIron' : 'enamel';
  if (rough >= 0.85) return 'rubber';
  if (rough <= 0.35) return 'plasticGloss';
  return rough >= 0.68 ? 'plasticMatte' : 'powderCoat';
}

/** Mesh child: `<Surf s="copper" />`. Attaches the shared material (never disposed with the mesh). */
export function Surf({ s, color, opacity }: { s: Surface; color?: string; opacity?: number }) {
  return createElement('primitive', { object: surface(s, color, opacity), attach: 'material' });
}

/** For tests and debugging. */
export function materialCacheSize(): number {
  return cache.size;
}

/** Free every cached material (called when the last 3D view closes, with the texture cache). */
export function disposeMaterials(): void {
  for (const m of cache.values()) m.dispose();
  cache.clear();
}
