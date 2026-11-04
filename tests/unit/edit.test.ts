import { describe, expect, it } from 'vitest';
import { program, rungToText } from '../../src/engine';
import {
  History, addParallel, addRung, decodeProgram, duplicateRung, encodeProgram, insert, move, newInstr, remove, setComment, updateInstr, validateProgram,
} from '../../src/features/simulator/edit';

const base = () => program('t', [{ name: 'A', type: 'BOOL' }, { name: 'B', type: 'BOOL' }, { name: 'Q', type: 'BOOL' }], ['XIC(A)OTE(Q)']);
const text = (p: ReturnType<typeof base>, i = 0) => rungToText(p.routines[0].rungs[i].elems);

describe('ladder edits', () => {
  it('inserts inputs before outputs when only a rung is selected', () => {
    const p = insert(base(), { rungId: 'r0' }, newInstr('XIO', ['B']));
    expect(text(p)).toBe('XIC(A)XIO(B)OTE(Q)');
  });
  it('inserts after a selected element and appends outputs', () => {
    let p = insert(base(), { rungId: 'r0', elemId: 'r0e0' }, newInstr('XIC', ['B']));
    expect(text(p)).toBe('XIC(A)XIC(B)OTE(Q)');
    p = insert(p, { rungId: 'r0' }, newInstr('OTL', ['B']));
    expect(text(p)).toBe('XIC(A)XIC(B)OTE(Q)OTL(B)');
  });
  it('adds a parallel branch (seal-in) and removing a leg collapses it', () => {
    let p = addParallel(base(), { rungId: 'r0', elemId: 'r0e0' }, newInstr('XIC', ['Q']));
    expect(text(p)).toBe('[XIC(A),XIC(Q)]OTE(Q)');
    const br = p.routines[0].rungs[0].elems[0];
    expect(br.kind).toBe('branch');
    const leg2 = br.kind === 'branch' ? br.legs[1][0].id : '';
    p = addParallel(p, { rungId: 'r0', elemId: br.id }, newInstr('XIC', ['B']));
    expect(text(p)).toBe('[XIC(A),XIC(Q),XIC(B)]OTE(Q)');
    p = remove(p, { rungId: 'r0', elemId: leg2 });
    expect(text(p)).toBe('[XIC(A),XIC(B)]OTE(Q)');
  });
  it('changes an op and keeps compatible operands', () => {
    let p = updateInstr(base(), { rungId: 'r0', elemId: 'r0e0' }, { op: 'XIO' });
    expect(text(p)).toBe('XIO(A)OTE(Q)');
    p = updateInstr(p, { rungId: 'r0', elemId: 'r0e0' }, { op: 'TON' });
    expect(text(p)).toBe('TON()OTE(Q)');
    p = updateInstr(p, { rungId: 'r0', elemId: 'r0e0' }, { args: ['T1'] });
    expect(text(p)).toBe('TON(T1)OTE(Q)');
  });
  it('moves elements and rungs, adds, duplicates, comments and deletes rungs', () => {
    let p = move(base(), { rungId: 'r0', elemId: 'r0e0' }, 1);
    expect(text(p)).toBe('OTE(Q)XIC(A)');
    const added = addRung(p, 'r0');
    p = added.program;
    expect(p.routines[0].rungs.length).toBe(2);
    p = move(p, { rungId: added.rungId }, -1);
    expect(p.routines[0].rungs[0].id).toBe(added.rungId);
    p = setComment(p, added.rungId, 'hello');
    expect(p.routines[0].rungs[0].comment).toBe('hello');
    const dup = duplicateRung(p, 'r0');
    expect(dup.program.routines[0].rungs.length).toBe(3);
    p = remove(dup.program, { rungId: added.rungId });
    expect(p.routines[0].rungs.length).toBe(2);
  });
  it('does not mutate the input program', () => {
    const p = base();
    const before = JSON.stringify(p);
    insert(p, { rungId: 'r0' }, newInstr('XIC', ['B']));
    remove(p, { rungId: 'r0', elemId: 'r0e0' });
    expect(JSON.stringify(p)).toBe(before);
  });
  it('history undo/redo', () => {
    const h = new History(1);
    h.push(2);
    h.push(3);
    expect(h.undo()).toBe(2);
    expect(h.undo()).toBe(1);
    expect(h.canUndo).toBe(false);
    expect(h.redo()).toBe(2);
    h.push(9);
    expect(h.canRedo).toBe(false);
  });
  it('share links round-trip and reject tampering', () => {
    const p = base();
    expect(decodeProgram(encodeProgram(p))).toEqual(JSON.parse(JSON.stringify({ ...p, tags: p.tags.map((t) => ({ ...t })) })));
    expect(decodeProgram('not-base64!!')).toBeNull();
    expect(validateProgram({ ...p, main: 'Nope' })).toBeNull();
    expect(validateProgram({ ...p, tags: [{ name: '<img>', type: 'BOOL' }] })).toBeNull();
    const bad = structuredClone(p) as unknown as { routines: { rungs: { elems: unknown[] }[] }[] };
    bad.routines[0].rungs[0].elems.push({ kind: 'instr', op: 'EVAL', args: [] });
    expect(validateProgram(bad)).toBeNull();
  });
});
