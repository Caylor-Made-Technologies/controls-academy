/**
 * Design-token rules (docs/DESIGN-SYSTEM.md → "What the tests enforce").
 * Colors and sizes come from src/styles/tokens.css; text on every surface meets WCAG AA in both themes.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = new URL('../../src/', import.meta.url).pathname;
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const walk = (dir: string): string[] => readdirSync(join(root, dir)).flatMap((f) => {
  const p = join(dir, f);
  return statSync(join(root, p)).isDirectory() ? walk(p) : [p];
});
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Files that may hold raw colors:
 * - the token file;
 * - the 3D layer and the two data files that describe 3D models (material colors of real surfaces);
 * - the certificate image export, which draws on a canvas outside the page's CSS.
 * Lesson and glossary text is prose ("transmitter #101"), not styling, and is skipped.
 */
const COLOR_HOMES = (p: string) => p === 'styles/tokens.css' || p.startsWith('three/') || p === 'content/hardware.ts' || p === 'content/inside.ts'
  || p === 'features/profile/certificate.ts' || /^content\/(lessons-|glossary|bank|brands|summaries)/.test(p) || p === 'skins/index.ts';
const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const RGB = /rgba?\(\s*\d/g;

describe('colors come from tokens', () => {
  const files = walk('.').filter((p) => /\.(css|tsx?|json)$/.test(p) && !COLOR_HOMES(p) && !p.endsWith('.gen.ts'));
  it('no raw hex or rgb() colors outside tokens.css and the 3D material layer', () => {
    const hits: string[] = [];
    for (const p of files) {
      const text = p.endsWith('.css') ? stripComments(read(p)) : read(p);
      text.split('\n').forEach((line, i) => {
        // Only a hex value inside a string or CSS value counts ("#/route" links and "&#39;" entities do not).
        const hex = [...line.matchAll(HEX)].filter((m) => /['"`:(,\s]/.test(line[m.index! - 1] ?? ' ') && line[m.index! + 1] !== '/');
        if (hex.length || RGB.test(line)) hits.push(`${p}:${i + 1}: ${line.trim().slice(0, 110)}`);
        RGB.lastIndex = 0;
      });
    }
    expect(hits, `raw colors found:\n${hits.slice(0, 40).join('\n')}`).toEqual([]);
  });
});

describe('sizes come from tokens', () => {
  it('stylesheets use px only for hairlines (0–3 px) and media-query breakpoints', () => {
    const hits: string[] = [];
    for (const p of ['styles/app.css', 'styles/motion.css', 'styles/kit.css']) {
      stripComments(read(p)).split('\n').forEach((line, i) => {
        if (/^\s*@media/.test(line)) return;
        const body = line.replace(/@media[^{]*\{/g, '');
        for (const m of body.matchAll(/(\d*\.?\d+)px/g)) if (Number(m[1]) > 3) hits.push(`${p}:${i + 1}: ${m[0]} in "${line.trim().slice(0, 90)}"`);
      });
    }
    expect(hits, `raw px sizes found:\n${hits.slice(0, 40).join('\n')}`).toEqual([]);
  });
  it('components use the type scale, not one-off font sizes or pixel boxes', () => {
    const hits: string[] = [];
    for (const p of walk('.').filter((f) => f.endsWith('.tsx'))) {
      read(p).split('\n').forEach((line, i) => {
        if (/text-\[\d*\.?\d+(rem|px|em)\]/.test(line) || /[\w-]-\[\d*\.?\d+px\]/.test(line)) hits.push(`${p}:${i + 1}: ${line.trim().slice(0, 110)}`);
      });
    }
    expect(hits, `one-off sizes found:\n${hits.slice(0, 40).join('\n')}`).toEqual([]);
  });
});

// ---------- contrast ----------
function parseTheme(css: string, selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`tokens.css: no block for ${selector}`);
  const open = css.indexOf('{', start);
  const block = css.slice(open + 1, css.indexOf('\n}', open));
  for (const m of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) as [number, number, number];
}
function luminance([r, g, b]: [number, number, number]): number {
  const c = [r, g, b].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(rgb(a)), luminance(rgb(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe('contrast (WCAG AA) in both themes', () => {
  const css = stripComments(read('styles/tokens.css'));
  const dark = parseTheme(css, ':root, .theme-dark');
  const light = { ...dark, ...parseTheme(css, ":root[data-theme='light'], .theme-light") };
  const SURFACES = ['--bg', '--bg-2', '--surface', '--surface-raised', '--surface-sunk'];
  // [foreground, minimum ratio]: body-size text needs 4.5; state colors are also used for text labels.
  const TEXT: [string, number][] = [['--text-heading', 4.5], ['--text-body', 4.5], ['--text-muted', 4.5], ['--text-link', 4.5], ['--live', 4.5], ['--warn', 4.5], ['--alarm', 4.5], ['--safety', 4.5], ['--blue-glow', 4.5]];
  // Fixed pairs: text on a filled control.
  const PAIRS: [string, string, number][] = [['--on-blue', '--blue-button', 4.5], ['--on-live', '--live', 4.5], ['--on-safety', '--safety', 4.5], ['--on-alarm', '--alarm-fill', 4.5], ['--border-strong', '--surface', 1.3]];

  for (const [name, t] of [['dark', dark], ['light', light]] as const) {
    it(`${name}: text and state colors on every surface`, () => {
      const bad: string[] = [];
      for (const s of SURFACES) for (const [fg, min] of TEXT) {
        expect(t[fg], `${fg} missing`).toMatch(/^#/);
        const r = contrast(t[fg], t[s]);
        if (r < min) bad.push(`${fg} ${t[fg]} on ${s} ${t[s]} = ${r.toFixed(2)} (needs ${min})`);
      }
      for (const [fg, bg, min] of PAIRS) {
        expect(t[fg], `${fg} missing`).toMatch(/^#/);
        expect(t[bg], `${bg} missing`).toMatch(/^#/);
        const r = contrast(t[fg], t[bg]);
        if (r < min) bad.push(`${fg} ${t[fg]} on ${bg} ${t[bg]} = ${r.toFixed(2)} (needs ${min})`);
      }
      expect(bad, bad.join('\n')).toEqual([]);
    });
    it(`${name}: state text on its own soft tint (chips, callouts)`, () => {
      const bad: string[] = [];
      for (const [fg, soft] of [['--live', '--live-soft'], ['--warn', '--warn-soft'], ['--alarm', '--alarm-soft'], ['--safety', '--safety-soft'], ['--blue-glow', '--blue-soft']]) {
        const m = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(t[soft]);
        expect(m, `${soft} should be an rgba() tint`).toBeTruthy();
        const [r, g, b, a] = m!.slice(1).map(Number);
        // Tinted chips and callouts sit on the page or on a card (not on raised controls): see DESIGN-SYSTEM.md.
        for (const s of ['--bg', '--surface']) {
          const base = rgb(t[s]);
          const mix = '#' + [r, g, b].map((c, i) => Math.round(c * a + base[i] * (1 - a)).toString(16).padStart(2, '0')).join('');
          const ratio = contrast(t[fg], mix);
          if (ratio < 4.5) bad.push(`${fg} ${t[fg]} on ${soft} over ${s} (${mix}) = ${ratio.toFixed(2)}`);
        }
      }
      expect(bad, bad.join('\n')).toEqual([]);
    });
  }
  it('knows a failing pair when it sees one', () => {
    expect(contrast('#777777', '#ffffff')).toBeLessThan(4.5);
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });
});
