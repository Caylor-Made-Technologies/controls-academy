import { describe, expect, it } from 'vitest';
import { LESSONS, TRACKS } from '../../src/content';
import { GLOSSARY, GLOSSARY_BY_ID } from '../../src/content/glossary';
import { BRAND_GUIDES } from '../../src/content/brands';
import { parseRung, TagStore, walk } from '../../src/engine';
import { SKINS } from '../../src/skins';
import { createMotorScene } from '../../src/plant/motor';

const allText = (l: (typeof LESSONS)[number]) =>
  l.blocks
    .flatMap((b) => {
      switch (b.t) {
        case 'p': case 'h': return [b.text];
        case 'list': return b.items;
        case 'callout': return [b.text, b.title ?? ''];
        case 'table': return [...b.head, ...b.rows.flat()];
        case 'brands': return b.rows.map((r) => r.text);
        default: return [];
      }
    })
    .join('\n');

describe('content', () => {
  it('lesson ids and question ids are unique', () => {
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    const qs = LESSONS.flatMap((l) => l.quiz.map((q) => q.id));
    expect(new Set(qs).size).toBe(qs.length);
  });

  it('every lesson has 2–5 questions with a valid answer and explanation', () => {
    for (const l of LESSONS) {
      expect(l.quiz.length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.quiz.length, l.id).toBeLessThanOrEqual(5);
      for (const q of l.quiz) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.choices.length);
        expect(q.why.length).toBeGreaterThan(5);
      }
    }
  });

  it('every [[term]] link points at a glossary entry', () => {
    for (const l of LESSONS) {
      for (const m of allText(l).matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
        expect(GLOSSARY_BY_ID.has(m[1]), `${l.id}: ${m[1]}`).toBe(true);
      }
    }
    expect(new Set(GLOSSARY.map((g) => g.id)).size).toBe(GLOSSARY.length);
  });

  it('every track lists only real lessons and every lesson is in a track', () => {
    const inTracks = TRACKS.flatMap((t) => t.lessons);
    expect(inTracks.sort()).toEqual(LESSONS.map((l) => l.id).sort());
  });

  it('lesson rungs and task rungs parse and use declared tags', () => {
    const motorTags = createMotorScene().program().tags;
    for (const l of LESSONS) {
      for (const b of l.blocks) {
        if (b.t !== 'rung') continue;
        const store = new TagStore(b.tags);
        for (const e of walk(parseRung(b.text))) if (e.kind === 'instr') for (const a of e.args) expect(store.isValidRef(a), `${l.id} ${a}`).toBe(true);
      }
      if (l.task?.rungs) {
        const store = new TagStore([...motorTags, ...(l.task.extraTags ?? [])]);
        for (const r of l.task.rungs) for (const e of walk(parseRung(r.text))) if (e.kind === 'instr') for (const a of e.args) expect(store.isValidRef(a), `${l.id} ${a}`).toBe(true);
      }
    }
  });

  it('safety lessons carry a safety callout', () => {
    for (const id of ['meter', 'lototo', 'hardwired-safety', 'forcing']) {
      const l = LESSONS.find((x) => x.id === id)!;
      expect(l.blocks.some((b) => b.t === 'callout' && b.tone === 'safety'), id).toBe(true);
    }
  });

  it('brand guides reference real skins and say nothing about prices', () => {
    for (const g of BRAND_GUIDES) {
      expect(SKINS[g.skin]).toBeTruthy();
      expect(JSON.stringify(g)).not.toMatch(/\$\d/);
    }
  });
});
