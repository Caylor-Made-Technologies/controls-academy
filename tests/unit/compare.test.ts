import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PLATFORMS, TOPICS } from '../../src/content/compare';
import { BRAND_GUIDES } from '../../src/content/brands';

describe('brands side by side', () => {
  it('every platform covers every topic with real text', () => {
    for (const p of PLATFORMS) for (const t of TOPICS) expect(p.cells[t.id]?.replace(/\/\/ VERIFY.*/, '').trim().length, `${p.id} ${t.id}`).toBeGreaterThan(20);
  });
  it('links only to brand guides that exist', () => {
    const ids = new Set(BRAND_GUIDES.map((b) => b.id));
    for (const p of PLATFORMS) if (p.guide) expect(ids.has(p.guide), p.id).toBe(true);
  });
  it('every uncertain detail is listed in docs/VERIFY.md', () => {
    const doc = readFileSync('docs/VERIFY.md', 'utf8');
    const n = PLATFORMS.flatMap((p) => Object.values(p.cells)).filter((c) => c.includes('// VERIFY')).length;
    const listed = doc.split('## Brands side by side')[1]?.split('\n## ')[0].split('\n').filter((l) => l.startsWith('- ')).length ?? 0;
    expect(listed).toBe(n);
  });
  it('a 5-second timer is stated consistently with the engine units', () => {
    expect(PLATFORMS.find((p) => p.id === 'logix')!.cells.timers).toContain('PRE 5000');
  });
});
