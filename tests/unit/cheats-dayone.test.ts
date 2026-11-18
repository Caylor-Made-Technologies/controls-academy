import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SHEETS } from '../../src/content/cheatsheets';
import { DAY_ONE, DAY_ONE_COUNT, dayOneText } from '../../src/content/dayone';
import { LESSONS } from '../../src/content';

const texts = () => SHEETS.flatMap((s) => [s.intro, s.note ?? '', ...(s.lines ?? []), ...(s.tables ?? []).flatMap((t) => t.rows.flat())]);

describe('cheat sheets', () => {
  it('link only to lessons that exist; tables are rectangular', () => {
    for (const s of SHEETS) {
      if (s.lesson) expect(LESSONS.some((l) => l.id === s.lesson), s.id).toBe(true);
      for (const t of s.tables ?? []) for (const r of t.rows) expect(r.length, `${s.id}: ${r[0]}`).toBe(t.head.length);
    }
  });
  it('the 4–20 mA examples are right', () => {
    const v = (mA: number, lo: number, hi: number) => lo + ((mA - 4) / 16) * (hi - lo);
    const ma = (x: number, lo: number, hi: number) => 4 + (16 * (x - lo)) / (hi - lo);
    expect(v(12, 0, 5)).toBeCloseTo(2.5);
    expect(ma(50, 0, 150)).toBeCloseTo(9.33, 2);
    expect(ma(0.25 * 100, 0, 100)).toBe(8);
  });
  it('the power examples are right', () => {
    expect(24 / 1200).toBeCloseTo(0.02);
    expect((Math.sqrt(3) * 480 * 10 * 0.85) / 1000).toBeCloseTo(7.07, 1);
  });
  it('"check your manual" markers are last in their text and listed in docs/VERIFY.md', () => {
    const doc = readFileSync('docs/VERIFY.md', 'utf8').split('## Cheat sheets')[1]?.split('\n## ')[0] ?? '';
    const flagged = texts().filter((t) => t.includes('// VERIFY'));
    for (const t of flagged) expect(t.split('// VERIFY')[1]).not.toMatch(/\. [A-Z]/);
    expect(doc.split('\n').filter((l) => l.startsWith('- ')).length).toBe(flagged.length);
  });
});

describe('day one checklist', () => {
  it('has unique ids and exports every item with its state', () => {
    const ids = DAY_ONE.flatMap((g) => g.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(DAY_ONE_COUNT);
    const txt = dayOneText({ [ids[0]]: true }, '2026-11-18');
    expect(txt).toContain('2026-11-18');
    expect(txt.match(/\[x\]/g)?.length).toBe(1);
    expect(txt.match(/\[ \]/g)?.length).toBe(ids.length - 1);
  });
  it('starts with safety', () => {
    expect(DAY_ONE[0].id).toBe('safety');
  });
});
