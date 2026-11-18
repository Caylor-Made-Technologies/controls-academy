import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DEVICES } from '../../src/content/devices';
import { LESSONS } from '../../src/content';

const texts = (d: (typeof DEVICES)[number]) => [d.what, d.symbol, d.safety ?? '', ...d.wiring, ...d.fails, ...d.test];

describe('field-device library', () => {
  it('covers the planned devices with unique ids and every section filled', () => {
    expect(DEVICES.length).toBeGreaterThanOrEqual(19);
    expect(new Set(DEVICES.map((d) => d.id)).size).toBe(DEVICES.length);
    for (const d of DEVICES) {
      expect(d.wiring.length && d.fails.length && d.test.length, d.id).toBeTruthy();
      expect(d.what.length, d.id).toBeGreaterThan(40);
    }
  });
  it('links only to lessons that exist', () => {
    for (const d of DEVICES) for (const l of d.lessons) expect(LESSONS.some((x) => x.id === l), `${d.id} → ${l}`).toBe(true);
  });
  it('every safety device carries a safety note', () => {
    for (const d of DEVICES.filter((x) => x.group === 'safety')) expect(d.safety, d.id).toBeTruthy();
  });
  it('"check your manual" markers are last in their text and listed in docs/VERIFY.md', () => {
    const flagged = DEVICES.flatMap(texts).filter((t) => t.includes('// VERIFY'));
    for (const t of flagged) expect(t.split('// VERIFY')[1], t.slice(0, 50)).not.toMatch(/\. [A-Z]/);
    const doc = readFileSync('docs/VERIFY.md', 'utf8').split('## Field devices')[1]?.split('\n## ')[0] ?? '';
    expect(doc.split('\n').filter((l) => l.startsWith('- ')).length).toBe(flagged.length);
  });
});
