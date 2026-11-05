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
    const saved = await load<Partial<Prefs>>('prefs');
    setState({ ...DEFAULT_PREFS, ...(saved ?? {}), hydrated: true });
  },
}));

export function applyTheme(theme: ThemePref): void {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0f14' : '#f4f7fb');
}
