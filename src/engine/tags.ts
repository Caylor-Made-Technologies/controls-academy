import type { CounterValue, DataType, PidValue, TagDecl, TagValue, TimerValue } from './types';

/** Raised for problems that stop a real controller (major faults). */
export class MajorFaultError extends Error {}

export const INT_MIN = -32768;
export const INT_MAX = 32767;
export const DINT_MIN = -2147483648;
export const DINT_MAX = 2147483647;

export function newTimer(preMs = 0): TimerValue {
  return { PRE: preMs, ACC: 0, EN: false, TT: false, DN: false };
}
export function newCounter(pre = 0): CounterValue {
  return { PRE: pre, ACC: 0, CU: false, CD: false, DN: false, OV: false, UN: false };
}
export function newPid(): PidValue {
  return {
    SP: 0, PV: 0, CV: 0, KP: 1, KI: 0.1, KD: 0, CVMIN: 0, CVMAX: 100,
    DIRECT: false, MAN: false, MANCV: 0, I: 0, PE: 0,
  };
}

export function defaultValue(decl: TagDecl): TagValue {
  if (decl.dim && decl.dim > 0) {
    return decl.type === 'BOOL' ? new Array<boolean>(decl.dim).fill(false) : new Array<number>(decl.dim).fill(0);
  }
  switch (decl.type) {
    case 'BOOL':
      return Boolean(decl.initial ?? false);
    case 'INT':
    case 'DINT':
    case 'REAL':
      return Number(decl.initial ?? 0);
    case 'TIMER':
      return newTimer(Number(decl.initial ?? 0));
    case 'COUNTER':
      return newCounter(Number(decl.initial ?? 0));
    case 'PID':
      return newPid();
  }
}

/** Round half to even, the conversion Logix uses when a REAL lands in an integer. // VERIFY: per-platform rounding */
export function roundHalfEven(x: number): number {
  const r = Math.round(x);
  if (Math.abs(x % 1) === 0.5) return r % 2 === 0 ? r : r - 1;
  return r;
}

/** Wrap into a two's-complement range, reporting overflow. */
export function wrap(x: number, bits: 16 | 32): { value: number; overflow: boolean } {
  const min = bits === 16 ? INT_MIN : DINT_MIN;
  const max = bits === 16 ? INT_MAX : DINT_MAX;
  if (x >= min && x <= max) return { value: x, overflow: false };
  const span = 2 ** bits;
  let v = ((x - min) % span + span) % span + min;
  if (Object.is(v, -0)) v = 0;
  return { value: v, overflow: true };
}

export interface ParsedRef {
  base: string;
  index?: string;
  member?: string;
}

const REF_RE = /^([A-Za-z_][A-Za-z0-9_]*)(?:\[([A-Za-z0-9_]+)\])?(?:\.([A-Za-z0-9_]+))?$/;

export function isLiteral(s: string): boolean {
  return /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s.trim());
}

export function parseRef(s: string): ParsedRef | null {
  const m = REF_RE.exec(s.trim());
  if (!m) return null;
  return { base: m[1], index: m[2], member: m[3] };
}

const STRUCT_MEMBERS: Record<string, string[]> = {
  TIMER: ['PRE', 'ACC', 'EN', 'TT', 'DN'],
  COUNTER: ['PRE', 'ACC', 'CU', 'CD', 'DN', 'OV', 'UN'],
  PID: ['SP', 'PV', 'CV', 'KP', 'KI', 'KD', 'CVMIN', 'CVMAX', 'DIRECT', 'MAN', 'MANCV'],
};

export function structMembers(type: DataType): string[] {
  return STRUCT_MEMBERS[type] ?? [];
}

/**
 * Tag database. Holds every tag's value and applies data-type rules on writes
 * (integer wrap + overflow flag, REAL → integer rounding).
 */
export class TagStore {
  readonly decls = new Map<string, TagDecl>();
  readonly values = new Map<string, TagValue>();
  /** Set when a math result overflowed an integer destination (like the S:V / OV status flag). */
  overflow = false;

  constructor(decls: TagDecl[]) {
    for (const d of decls) this.declare(d);
  }

  declare(d: TagDecl): void {
    this.decls.set(d.name, d);
    this.values.set(d.name, defaultValue(d));
  }

  has(name: string): boolean {
    return this.decls.has(name);
  }

  /** Is this operand something the program can read? (used by the verifier/editor) */
  isValidRef(s: string): boolean {
    if (isLiteral(s)) return true;
    const r = parseRef(s);
    if (!r) return false;
    const d = this.decls.get(r.base);
    if (!d) return false;
    if (r.index !== undefined) {
      if (!d.dim) return false;
      if (!/^\d+$/.test(r.index) && !this.has(r.index)) return false;
    } else if (d.dim && r.member === undefined) {
      return true; // whole array (COP / CLR)
    }
    if (r.member !== undefined) {
      const members = structMembers(d.type);
      if (members.length) return members.includes(r.member);
      // bit-of-word access on INT/DINT: Word.5
      if ((d.type === 'INT' || d.type === 'DINT') && /^\d+$/.test(r.member)) {
        return Number(r.member) < (d.type === 'INT' ? 16 : 32);
      }
      return false;
    }
    return true;
  }

  private resolveIndex(r: ParsedRef, d: TagDecl): number {
    if (r.index === undefined) return -1;
    const i = /^\d+$/.test(r.index) ? Number(r.index) : Number(this.read(r.index));
    if (!Number.isInteger(i) || i < 0 || i >= (d.dim ?? 0)) {
      throw new MajorFaultError(`Array subscript out of range: ${r.base}[${i}] (size ${d.dim}).`);
    }
    return i;
  }

  read(s: string): number | boolean {
    if (isLiteral(s)) return Number(s);
    const r = parseRef(s);
    if (!r) throw new MajorFaultError(`Bad operand "${s}".`);
    const d = this.decls.get(r.base);
    if (!d) throw new MajorFaultError(`Unknown tag "${r.base}".`);
    let v = this.values.get(r.base) as TagValue;
    if (d.dim) {
      const i = this.resolveIndex(r, d);
      if (i < 0) throw new MajorFaultError(`"${r.base}" is an array; give an index like ${r.base}[0].`);
      v = (v as (number | boolean)[])[i];
    }
    if (r.member !== undefined) {
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        const mv = (v as unknown as Record<string, number | boolean>)[r.member];
        if (mv === undefined) throw new MajorFaultError(`"${s}" has no member ${r.member}.`);
        return mv;
      }
      if (typeof v === 'number') return ((v >> Number(r.member)) & 1) === 1;
      throw new MajorFaultError(`"${s}" has no member ${r.member}.`);
    }
    if (typeof v === 'object') throw new MajorFaultError(`"${s}" is a structure; pick a member like ${s}.DN.`);
    return v as number | boolean;
  }

  readBool(s: string): boolean {
    const v = this.read(s);
    return typeof v === 'boolean' ? v : v !== 0;
  }

  readNum(s: string): number {
    const v = this.read(s);
    return typeof v === 'boolean' ? (v ? 1 : 0) : v;
  }

  /** The data type that a write to `s` lands in. */
  destType(s: string): DataType | 'BOOL' {
    const r = parseRef(s);
    if (!r) return 'REAL';
    const d = this.decls.get(r.base);
    if (!d) return 'REAL';
    if (r.member !== undefined) {
      if (d.type === 'TIMER' || d.type === 'COUNTER') {
        return ['PRE', 'ACC'].includes(r.member) ? 'DINT' : 'BOOL';
      }
      if (d.type === 'PID') return ['DIRECT', 'MAN'].includes(r.member) ? 'BOOL' : 'REAL';
      return 'BOOL';
    }
    return d.type;
  }

  /** Coerce a value for a destination type, applying rounding and wrap. */
  coerce(type: DataType | 'BOOL', x: number | boolean): number | boolean {
    if (type === 'BOOL') return typeof x === 'boolean' ? x : x !== 0;
    const n = typeof x === 'boolean' ? (x ? 1 : 0) : x;
    if (type === 'REAL') return n;
    const bits = type === 'INT' ? 16 : 32;
    const w = wrap(roundHalfEven(n), bits);
    if (w.overflow) this.overflow = true;
    return w.value;
  }

  write(s: string, x: number | boolean): void {
    const r = parseRef(s);
    if (!r) throw new MajorFaultError(`Can't write to "${s}".`);
    const d = this.decls.get(r.base);
    if (!d) throw new MajorFaultError(`Unknown tag "${r.base}".`);
    const val = this.coerce(this.destType(s), x);
    if (d.dim) {
      const i = this.resolveIndex(r, d);
      if (i < 0) throw new MajorFaultError(`"${r.base}" is an array; give an index.`);
      const arr = this.values.get(r.base) as (number | boolean)[];
      arr[i] = d.type === 'BOOL' ? Boolean(val) : (this.coerce(d.type, val) as number);
      return;
    }
    if (r.member !== undefined) {
      const v = this.values.get(r.base);
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        (v as unknown as Record<string, number | boolean>)[r.member] = val;
        return;
      }
      if (typeof v === 'number') {
        const bit = Number(r.member);
        const mask = 1 << bit;
        let nv = val ? v | mask : v & ~mask;
        if (d.type === 'INT') nv = wrap(nv, 16).value;
        this.values.set(r.base, nv);
        return;
      }
      throw new MajorFaultError(`"${s}" has no member ${r.member}.`);
    }
    this.values.set(r.base, val);
  }

  /** Get the raw structure (timer, counter, PID) behind a tag. */
  struct<T extends object>(s: string, type: DataType): T {
    const r = parseRef(s);
    const d = r && this.decls.get(r.base);
    if (!r || !d || d.type !== type || r.member !== undefined) {
      throw new MajorFaultError(`"${s}" must be a ${type} tag.`);
    }
    if (d.dim) {
      throw new MajorFaultError(`Arrays of ${type} aren't supported here.`);
    }
    return this.values.get(r.base) as T;
  }

  array(s: string): (number | boolean)[] {
    const r = parseRef(s);
    const d = r && this.decls.get(r.base);
    if (!r || !d || !d.dim) throw new MajorFaultError(`"${s}" must be an array tag.`);
    return this.values.get(r.base) as (number | boolean)[];
  }

  snapshot(): Record<string, TagValue> {
    const out: Record<string, TagValue> = {};
    for (const [k, v] of this.values) out[k] = structuredClone(v);
    return out;
  }

  restore(snap: Record<string, TagValue>): void {
    for (const [k, v] of Object.entries(snap)) if (this.values.has(k)) this.values.set(k, structuredClone(v));
  }
}
