/**
 * The 3D "look": one color grade per app theme, shared by every scene so the panel and the hardware
 * library feel like the same studio. No three.js import (plain values + a theme hook).
 */
import { useEffect, useState } from 'react';

export interface Look {
  theme: 'dark' | 'light';
  /** Canvas clear color and fog (matches the CSS backdrop behind the canvas). */
  bg: string;
  fog: [near: number, far: number];
  exposure: number;
  ambient: number;
  hemi: [sky: string, ground: string, intensity: number];
  key: [color: string, intensity: number];
  rim: [color: string, intensity: number];
  fill: [color: string, intensity: number];
  /** Strength of the room reflections (image-based light). */
  envIntensity: number;
  /** Room surfaces. */
  wall: string;
  floor: string;
  /** Darkness of the baked contact shadows (ambient-occlusion feel). */
  ao: number;
}

export const LOOKS: Record<'dark' | 'light', Look> = {
  dark: {
    theme: 'dark', bg: '#0d131b', fog: [3.2, 6.5], exposure: 1.0, ambient: 0.08,
    hemi: ['#cfe3ff', '#1a1f28', 0.22], key: ['#fff6ea', 1.55], rim: ['#3d8bff', 0.9], fill: ['#ffd9a8', 0.2],
    envIntensity: 0.32, wall: '#1b222c', floor: '#8a94a3', ao: 0.6,
  },
  light: {
    // Daylight plant room: brighter, cooler fill, softer rim; same key direction so shadows match.
    theme: 'light', bg: '#dfe5ec', fog: [3.6, 8], exposure: 0.98, ambient: 0.16,
    hemi: ['#ffffff', '#b8c0ca', 0.32], key: ['#fffaf2', 1.7], rim: ['#7fb2ff', 0.5], fill: ['#ffe4c2', 0.25],
    envIntensity: 0.5, wall: '#c3ccd6', floor: '#a7b0bb', ao: 0.45,
  },
};

function current(): 'dark' | 'light' {
  return typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** The app theme as the 3D scenes should grade it; follows live theme switches. */
export function useLook(): Look {
  const [t, setT] = useState(current);
  useEffect(() => {
    const mo = new MutationObserver(() => setT(current()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return LOOKS[t];
}
