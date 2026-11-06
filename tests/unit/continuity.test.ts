import { describe, expect, it } from 'vitest';
import { LESSONS } from '../../src/content';
import { continuityGaps } from '../../src/content/continuity';
import { ancestors, buildGraph, skillState } from '../../src/content/graph';

const g = buildGraph(LESSONS);

describe('prerequisite graph', () => {
  it('has no cycles and every prerequisite comes earlier in the course', () => {
    const order = LESSONS.map((l) => l.id);
    for (const l of LESSONS) for (const p of l.prereqs) expect(order.indexOf(p), `${l.id} ← ${p}`).toBeLessThan(order.indexOf(l.id));
    expect(g.depth.size).toBe(LESSONS.length);
  });

  it('every lesson traces back to "What electricity is" (one root, no orphans)', () => {
    const roots = LESSONS.filter((l) => l.prereqs.length === 0).map((l) => l.id);
    expect(roots).toEqual(['z-electricity']);
    for (const l of LESSONS.slice(1)) expect(ancestors(g, l.id).has('z-electricity'), l.id).toBe(true);
  });

  it('skill states: locked until prerequisites are done, mastered on a perfect check', () => {
    expect(skillState('z-electricity', g, {})).toBe('unlocked');
    expect(skillState('z-ohms-power', g, {})).toBe('locked');
    expect(skillState('z-ohms-power', g, { 'z-electricity': { score: 3, total: 4 } })).toBe('unlocked');
    expect(skillState('z-electricity', g, { 'z-electricity': { score: 3, total: 4 } })).toBe('done');
    expect(skillState('z-electricity', g, { 'z-electricity': { score: 4, total: 4 } })).toBe('mastered');
  });

  it('detects a cycle', () => {
    expect(() => buildGraph([{ id: 'a', prereqs: ['b'] }, { id: 'b', prereqs: ['a'] }])).toThrow(/cycle/);
  });
});

describe('continuity: no term used before it is taught', () => {
  it('every glossary term a lesson mentions is linked there or in an earlier lesson', () => {
    expect(continuityGaps(LESSONS)).toEqual([]);
  });

  it('the check catches a lesson that uses a term nobody taught yet', () => {
    const fake = { ...LESSONS[0], id: 'fake', blocks: [{ t: 'p' as const, text: 'The PLC reads the input card.' }], quiz: [], mistakes: [], realWorld: { site: 'mill' as const, text: '' }, why: '', safety: { na: 'x' }, summary: '', title: '' };
    expect(continuityGaps([fake]).map((x) => x.term)).toEqual(expect.arrayContaining(['plc', 'input']));
  });
});
