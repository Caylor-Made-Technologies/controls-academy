import { create } from 'zustand';
import type { SkinId } from '../skins';
import { debouncedSaver, load } from './persist';

export type ThemePref = 'dark' | 'light' | 'system';
export type Goal = 'maintenance' | 'new-tech' | 'bas' | 'curious';
export type Quality = 'auto' | 'low' | 'medium' | 'high' | '2d';

export interface Prefs {
  theme: ThemePref;
  skin: SkinId;
  sound: boolean;
  onboarded: boolean;
  goal: Goal | null;
  quality: Quality;
  textScale: number;
  name: string;
  /** Hardware model shown in the 3D panel ('' = match the platform). */
  hwModel: string;
}

export const DEFAULT_PREFS: Prefs = {
  theme: 'dark', skin: 'ab-logix', sound: false, onboarded: false, goal: null, quality: 'auto', textScale: 1, name: '', hwModel: '',
};

const THEMES: readonly ThemePref[] = ['dark', 'light', 'system'];
const GOALS: readonly Goal[] = ['maintenance', 'new-tech', 'bas', 'curious'];
const QUALITIES: readonly Quality[] = ['auto', 'low', 'medium', 'high', '2d'];
/** The text sizes Profile offers. */
export const TEXT_SCALES = [0.9, 1, 1.15, 1.3] as const;
// Kept here (not imported from ../skins) so the main bundle stays small; tests/unit/prefs.test.ts checks it
// against the skin list.
const SKIN_IDS: readonly SkinId[] = ['iec', 'ab-logix', 'ab-slc', 'ab-micro800', 'siemens-tia', 'siemens-classic', 'modicon', 'mitsubishi', 'automationdirect', 'omron'];
/** Same limit as the name field on Profile. */
export const NAME_MAX = 30;

/**
 * Saved settings, field by field: anything missing or of the wrong type falls back to its default (B-014: a bad
 * value from an old version, an import or an extension crashed Learn, lessons and the simulator).
 */
export function validatePrefs(d: unknown): Prefs {
  const o = d && typeof d === 'object' && !Array.isArray(d) ? (d as Record<string, unknown>) : {};
  const one = <T,>(v: unknown, list: readonly T[], dflt: T): T => (list.includes(v as T) ? (v as T) : dflt);
  const D = DEFAULT_PREFS;
  return {
    theme: one(o.theme, THEMES, D.theme),
    skin: one(o.skin, SKIN_IDS, D.skin),
    sound: typeof o.sound === 'boolean' ? o.sound : D.sound,
    onboarded: typeof o.onboarded === 'boolean' ? o.onboarded : D.onboarded,
    goal: o.goal === null ? null : one(o.goal, GOALS, D.goal),
    quality: one(o.quality, QUALITIES, D.quality),
    textScale: one(o.textScale, TEXT_SCALES as readonly number[], D.textScale),
    name: typeof o.name === 'string' ? o.name.slice(0, NAME_MAX) : D.name,
    hwModel: typeof o.hwModel === 'string' ? o.hwModel : D.hwModel,
  };
}

interface PrefsStore extends Prefs {
  hydrated: boolean;
  setPrefs(p: Partial<Prefs>): void;
  hydrate(): Promise<void>;
}

const saver = debouncedSaver<Prefs>('prefs');

function pick(s: PrefsStore): Prefs {
  const { theme, skin, sound, onboarded, goal, quality, textScale, name, hwModel } = s;
  return { theme, skin, sound, onboarded, goal, quality, textScale, name, hwModel };
}

export const usePrefs = create<PrefsStore>((setState, getState) => ({
  ...DEFAULT_PREFS,
  hydrated: false,
  setPrefs(p) {
    setState(p);
    saver(pick(getState()));
  },
  async hydrate() {
    setState({ ...validatePrefs(await load('prefs')), hydrated: true });
  },
}));

export function applyTheme(theme: ThemePref): void {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  // The browser bar takes the page color (the --bg token of the theme just applied).
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
}
