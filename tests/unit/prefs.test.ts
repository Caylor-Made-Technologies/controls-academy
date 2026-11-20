import { expect, test } from 'vitest';
import { DEFAULT_PREFS, validatePrefs } from '../../src/state/prefs';
import { SKIN_LIST } from '../../src/skins';

// B-014: a saved setting with the wrong type (old version, bad import, extension) crashed Learn, lessons and the simulator.
test('wrong-typed saved settings fall back to defaults, field by field', () => {
  const p = validatePrefs({ onboarded: true, theme: 5, skin: 'nope', quality: 7, textScale: 'huge', name: 42, goal: 'x', hwModel: 3, sound: 'yes' });
  expect(p).toEqual({ ...DEFAULT_PREFS, onboarded: true });
});

test('valid saved settings are kept', () => {
  const ok = { theme: 'light', skin: 'siemens-tia', sound: true, onboarded: true, goal: 'bas', quality: 'low', textScale: 1.15, name: 'Sam', hwModel: 'controllogix' } as const;
  expect(validatePrefs(ok)).toEqual(ok);
});

test('non-objects give the defaults; text size stays in the offered range; long names are trimmed', () => {
  for (const bad of [null, undefined, 'x', 5, [1, 2]]) expect(validatePrefs(bad)).toEqual(DEFAULT_PREFS);
  expect(validatePrefs({ textScale: 9 }).textScale).toBe(DEFAULT_PREFS.textScale);
  expect(validatePrefs({ name: "x".repeat(500) }).name.length).toBe(30);
});

test('every skin in the simulator is accepted', () => {
  for (const s of SKIN_LIST) expect(validatePrefs({ skin: s.id }).skin).toBe(s.id);
});
