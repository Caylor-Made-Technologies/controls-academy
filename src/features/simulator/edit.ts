/**
 * Pure program-editing operations for the ladder editor. Every function returns a new Program.
 */
import { OPS } from '../../engine/ops';
import { cloneElems, uid } from '../../engine/text';
import type { Branch, Elem, Instr, OpCode, Program, Rung } from '../../engine/types';

export interface Sel {
  rungId: string;
  elemId?: string;
}

function clone(p: Program): Program {
  return structuredClone(p);
}

function routineOf(p: Program) {
  return p.routines.find((r) => r.name === p.main)!;
}

/** Find the series array containing elemId, and its index. */
function locate(elems: Elem[], id: string): { list: Elem[]; index: number } | null {
  for (let i = 0; i < elems.length; i++) {
    const e = elems[i];
    if (e.id === id) return { list: elems, index: i };
    if (e.kind === 'branch') {
      for (const leg of e.legs) {
        const f = locate(leg, id);
        if (f) return f;
      }
    }
  }
  return null;
}

export function findElem(elems: Elem[], id: string): Elem | null {
  const f = locate(elems, id);
  return f ? f.list[f.index] : null;
}

function rung(p: Program, rungId: string): Rung {
  const r = routineOf(p).rungs.find((x) => x.id === rungId);
  if (!r) throw new Error('rung not found');
  return r;
}

export function defaultArgs(op: OpCode): string[] {
  return OPS[op].args.map((a) => (a.kind === 'const' ? '1' : ''));
}

export function newInstr(op: OpCode, args?: string[]): Instr {
  return { kind: 'instr', id: uid('i'), op, args: args ?? defaultArgs(op) };
}

/** Insert after the selected element (or at the end of the inputs, before the first output, when only a rung is selected). */
export function insert(p: Program, sel: Sel, ins: Elem): Program {
  const q = clone(p);
  const r = rung(q, sel.rungId);
  if (sel.elemId) {
    const f = locate(r.elems, sel.elemId);
    if (f) {
      f.list.splice(f.index + 1, 0, ins);
      return q;
    }
  }
  if (ins.kind === 'instr' && OPS[ins.op].role === 'output') r.elems.push(ins);
  else {
    const firstOut = r.elems.findIndex((e) => e.kind === 'instr' && OPS[e.op].role === 'output');
    r.elems.splice(firstOut < 0 ? r.elems.length : firstOut, 0, ins);
  }
  return q;
}

export function remove(p: Program, sel: Sel): Program {
  const q = clone(p);
  if (!sel.elemId) {
    const rs = routineOf(q).rungs;
    const i = rs.findIndex((x) => x.id === sel.rungId);
    if (i >= 0) rs.splice(i, 1);
    return q;
  }
  const r = rung(q, sel.rungId);
  const f = locate(r.elems, sel.elemId);
  if (!f) return q;
  f.list.splice(f.index, 1);
  cleanup(r.elems);
  return q;
}

/** Collapse empty legs and single-leg branches. */
function cleanup(list: Elem[]) {
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e.kind !== 'branch') continue;
    e.legs.forEach(cleanup);
    e.legs = e.legs.filter((l) => l.length > 0);
    if (e.legs.length === 0) {
      list.splice(i, 1);
      i--;
    } else if (e.legs.length === 1) {
      list.splice(i, 1, ...e.legs[0]);
      i--;
    }
  }
}

export function updateInstr(p: Program, sel: Sel, patch: Partial<Pick<Instr, 'op' | 'args'>>): Program {
  const q = clone(p);
  if (!sel.elemId) return q;
  const e = findElem(rung(q, sel.rungId).elems, sel.elemId);
  if (!e || e.kind !== 'instr') return q;
  if (patch.op && patch.op !== e.op) {
    const keep = OPS[patch.op].args.length === OPS[e.op].args.length && OPS[patch.op].args.every((a, i) => a.kind === OPS[e.op].args[i]?.kind || (['bool', 'dest'].includes(a.kind) && ['bool', 'dest'].includes(OPS[e.op].args[i]?.kind)));
    e.op = patch.op;
    e.args = keep ? e.args : defaultArgs(patch.op);
  }
  if (patch.args) e.args = [...patch.args];
  return q;
}

/** Wrap the selected element in a branch, adding a new parallel leg holding `legElem`. */
export function addParallel(p: Program, sel: Sel, legElem: Elem): Program {
  const q = clone(p);
  if (!sel.elemId) return q;
  const r = rung(q, sel.rungId);
  const f = locate(r.elems, sel.elemId);
  if (!f) return q;
  const target = f.list[f.index];
  if (target.kind === 'branch') {
    target.legs.push([legElem]);
    return q;
  }
  const br: Branch = { kind: 'branch', id: uid('b'), legs: [[target], [legElem]] };
  f.list.splice(f.index, 1, br);
  return q;
}

export function move(p: Program, sel: Sel, dir: -1 | 1): Program {
  const q = clone(p);
  if (!sel.elemId) {
    const rs = routineOf(q).rungs;
    const i = rs.findIndex((x) => x.id === sel.rungId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= rs.length) return q;
    [rs[i], rs[j]] = [rs[j], rs[i]];
    return q;
  }
  const f = locate(rung(q, sel.rungId).elems, sel.elemId);
  if (!f) return q;
  const j = f.index + dir;
  if (j < 0 || j >= f.list.length) return q;
  [f.list[f.index], f.list[j]] = [f.list[j], f.list[f.index]];
  return q;
}

export function addRung(p: Program, afterRungId?: string, elems?: Elem[]): { program: Program; rungId: string } {
  const q = clone(p);
  const rs = routineOf(q).rungs;
  const id = uid('r');
  const r: Rung = { id, elems: elems ?? [newInstr('XIC'), newInstr('OTE')] };
  const i = afterRungId ? rs.findIndex((x) => x.id === afterRungId) : rs.length - 1;
  rs.splice(i + 1, 0, r);
  return { program: q, rungId: id };
}

export function duplicateRung(p: Program, rungId: string): { program: Program; rungId: string } {
  const src = rung(p, rungId);
  return addRung(p, rungId, cloneElems(src.elems));
}

export function setComment(p: Program, rungId: string, comment: string): Program {
  const q = clone(p);
  rung(q, rungId).comment = comment || undefined;
  return q;
}

/** Undo/redo history with a cap. */
export class History<T> {
  private past: T[] = [];
  private future: T[] = [];
  constructor(public present: T, private cap = 100) {}
  push(next: T) {
    this.past.push(this.present);
    if (this.past.length > this.cap) this.past.shift();
    this.present = next;
    this.future = [];
  }
  undo(): T {
    const prev = this.past.pop();
    if (prev !== undefined) {
      this.future.push(this.present);
      this.present = prev;
    }
    return this.present;
  }
  redo(): T {
    const next = this.future.pop();
    if (next !== undefined) {
      this.past.push(this.present);
      this.present = next;
    }
    return this.present;
  }
  get canUndo() {
    return this.past.length > 0;
  }
  get canRedo() {
    return this.future.length > 0;
  }
}

/** Share a program in a URL hash: base64url(JSON). */
export function encodeProgram(p: Program): string {
  const json = JSON.stringify(p);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeProgram(s: string): Program | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return validateProgram(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

const NAME = /^[A-Za-z_][A-Za-z0-9_]{0,39}$/;
const TYPES = new Set(['BOOL', 'INT', 'DINT', 'REAL', 'TIMER', 'COUNTER', 'PID']);

/** Validate an untrusted program (imported file or shared link). Returns a clean copy or null. */
export function validateProgram(d: unknown): Program | null {
  if (!d || typeof d !== 'object') return null;
  const o = d as Record<string, unknown>;
  if (!Array.isArray(o.tags) || !Array.isArray(o.routines) || typeof o.main !== 'string') return null;
  if (o.tags.length > 200 || o.routines.length > 20) return null;
  const tags = [];
  for (const t of o.tags as Record<string, unknown>[]) {
    if (!t || typeof t.name !== 'string' || !NAME.test(t.name) || !TYPES.has(String(t.type))) return null;
    const io = t.io as Record<string, unknown> | undefined;
    tags.push({
      name: t.name,
      type: t.type as Program['tags'][number]['type'],
      dim: typeof t.dim === 'number' && t.dim > 0 && t.dim <= 256 ? Math.floor(t.dim) : undefined,
      initial: typeof t.initial === 'number' || typeof t.initial === 'boolean' ? t.initial : undefined,
      description: typeof t.description === 'string' ? t.description.slice(0, 200) : undefined,
      io: io && ['DI', 'DO', 'AI', 'AO'].includes(String(io.kind)) && Number.isInteger(io.point) && (io.point as number) >= 0 && (io.point as number) < 16
        ? { kind: io.kind as 'DI', point: io.point as number } : undefined,
    });
  }
  let count = 0;
  const elems = (list: unknown, depth: number): Elem[] | null => {
    if (!Array.isArray(list) || depth > 6) return null;
    const out: Elem[] = [];
    for (const e of list as Record<string, unknown>[]) {
      if (++count > 2000 || !e) return null;
      const id = typeof e.id === 'string' && e.id.length < 60 ? e.id : uid('i');
      if (e.kind === 'branch') {
        const legs = (Array.isArray(e.legs) ? e.legs : []).map((l: unknown) => elems(l, depth + 1));
        if (legs.some((l) => l === null)) return null;
        out.push({ kind: 'branch', id, legs: legs as Elem[][] });
      } else if (e.kind === 'instr' && typeof e.op === 'string' && e.op in OPS && Array.isArray(e.args)) {
        out.push({ kind: 'instr', id, op: e.op as OpCode, args: (e.args as unknown[]).map((a) => String(a).slice(0, 120)) });
      } else return null;
    }
    return out;
  };
  const routines = [];
  for (const r of o.routines as Record<string, unknown>[]) {
    if (!r || typeof r.name !== 'string' || !NAME.test(r.name) || !Array.isArray(r.rungs) || r.rungs.length > 200) return null;
    const rungs: Rung[] = [];
    for (const rg of r.rungs as Record<string, unknown>[]) {
      const es = elems(rg?.elems, 0);
      if (!es) return null;
      rungs.push({ id: typeof rg.id === 'string' && rg.id.length < 60 ? rg.id : uid('r'), comment: typeof rg.comment === 'string' ? rg.comment.slice(0, 300) : undefined, elems: es });
    }
    routines.push({ name: r.name, rungs });
  }
  if (!routines.some((r) => r.name === o.main)) return null;
  return { name: typeof o.name === 'string' ? o.name.slice(0, 80) : 'Imported', tags, routines, main: o.main };
}
