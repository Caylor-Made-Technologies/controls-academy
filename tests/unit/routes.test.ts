import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import routes from '../../src/routes.json';
import { ROUTE_HEADS, headFor } from '../../src/content/heads';

const app = readFileSync(new URL('../../src/App.tsx', import.meta.url), 'utf8');

describe('route manifest (src/routes.json)', () => {
  it('names the page component App.tsx renders for every route', () => {
    for (const [seg, r] of Object.entries(routes)) {
      expect(app, `App.tsx PAGES.${seg}`).toMatch(new RegExp(`\\b${seg}: \\([^)]*\\) => <${r.page}\\b`));
      expect(r.samples.length, `${seg} needs at least one sample URL for the e2e gate and screenshots`).toBeGreaterThan(0);
      for (const s of r.samples) expect(s.split(/[/?]/)[0]).toBe(seg);
    }
  });
  it('has no page in App.tsx that the manifest misses', () => {
    const block = app.slice(app.indexOf('const PAGES'), app.indexOf('function RouteFallback'));
    const segs = [...block.matchAll(/^ {2}(\w+): \(/gm)].map((m) => m[1]).sort();
    expect(segs).toEqual(Object.keys(routes).sort());
  });
});

describe('top-level headings (src/content/heads.ts)', () => {
  it('every heading belongs to a real route and is plain text', () => {
    for (const [seg, h] of Object.entries(ROUTE_HEADS)) {
      expect(Object.keys(routes)).toContain(seg);
      for (const t of [h.eyebrow, h.title, h.body ?? '']) expect(t).not.toMatch(/[<>]/);
      expect(h.title.length).toBeGreaterThan(3);
    }
  });
  it('only top-level paths get a static heading', () => {
    expect(headFor([])?.title).toBe(ROUTE_HEADS.learn.title);
    expect(headFor(['sim'])?.title).toBe('PLC workbench');
    expect(headFor(['lesson', 'timers'])).toBeUndefined();
    expect(headFor(['reference', 'hardware'])).toBeUndefined();
  });
});

import { isChunkError } from '../../src/components/ErrorBoundary';

describe('error boundary', () => {
  it('tells a failed download from an app bug', () => {
    expect(isChunkError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/ReferencePage-abc.js'))).toBe(true);
    expect(isChunkError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isChunkError(new TypeError("Cannot read properties of undefined (reading 'title')"))).toBe(false);
  });
});
