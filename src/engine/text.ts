/**
 * Rung text, in the style of Logix "neutral text":
 *   XIC(Start_PB)[XIC(Motor),XIC(Jog)]XIO(Stop_PB)OTE(Motor)
 * `[a,b]` is a branch with legs a and b. Used for content files, sharing and tests.
 */
import { OPS } from './ops';
import type { Elem, OpCode, Program, Rung, TagDecl } from './types';

let seq = 0;
export function uid(prefix = 'e'): string {
  seq = (seq + 1) % 1_000_000;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export class RungParseError extends Error {}

export function parseRung(text: string, idPrefix = 'e'): Elem[] {
  let i = 0;
  let n = 0;
  const src = text.replace(/;\s*$/, '');
  const id = () => `${idPrefix}${n++}`;

  function ws() {
    while (i < src.length && /\s/.test(src[i])) i++;
  }

  function series(stop: string[]): Elem[] {
    const out: Elem[] = [];
    ws();
    while (i < src.length && !stop.includes(src[i])) {
      if (src[i] === '[') {
        i++;
        const legs: Elem[][] = [series([',', ']'])];
        while (src[i] === ',') {
          i++;
          legs.push(series([',', ']']));
        }
        if (src[i] !== ']') throw new RungParseError('Branch is missing "]".');
        i++;
        out.push({ kind: 'branch', id: id(), legs });
      } else {
        const m = /^([A-Z_]+)\s*\(/.exec(src.slice(i));
        if (!m) throw new RungParseError(`Expected an instruction at "${src.slice(i, i + 12)}".`);
        const op = m[1] as OpCode;
        if (!OPS[op]) throw new RungParseError(`Unknown instruction ${op}.`);
        i += m[0].length;
        let depth = 1;
        const start = i;
        while (i < src.length && depth > 0) {
          if (src[i] === '(') depth++;
          else if (src[i] === ')') depth--;
          if (depth > 0) i++;
        }
        if (depth !== 0) throw new RungParseError(`${op} is missing ")".`);
        const inner = src.slice(start, i);
        i++;
        out.push({ kind: 'instr', id: id(), op, args: splitArgs(inner, op) });
      }
      ws();
    }
    return out;
  }

  const elems = series([]);
  if (i < src.length) throw new RungParseError(`Unexpected "${src[i]}".`);
  return elems;
}

function splitArgs(inner: string, op: OpCode): string[] {
  if (inner.trim() === '') return [];
  if (op === 'CPT') {
    const k = inner.indexOf(',');
    return [inner.slice(0, k).trim(), inner.slice(k + 1).trim()];
  }
  return inner.split(',').map((s) => s.trim());
}

export function rungToText(elems: Elem[]): string {
  return elems
    .map((e) => (e.kind === 'branch' ? `[${e.legs.map(rungToText).join(',')}]` : `${e.op}(${e.args.join(',')})`))
    .join('');
}

/** Build a program from compact rung text. Handy in content files and tests. */
export function program(
  name: string,
  tags: TagDecl[],
  rungs: (string | { text: string; comment?: string })[],
  extraRoutines: Record<string, string[]> = {},
): Program {
  const mk = (rs: (string | { text: string; comment?: string })[], rp: string): Rung[] =>
    rs.map((r, k) => {
      const text = typeof r === 'string' ? r : r.text;
      const comment = typeof r === 'string' ? undefined : r.comment;
      return { id: `${rp}r${k}`, comment, elems: parseRung(text, `${rp}r${k}e`) };
    });
  return {
    name,
    tags,
    main: 'MainRoutine',
    routines: [
      { name: 'MainRoutine', rungs: mk(rungs, '') },
      ...Object.entries(extraRoutines).map(([rn, rs]) => ({ name: rn, rungs: mk(rs, `${rn}_`) })),
    ],
  };
}

/** Walk every instruction in a list of elements. */
export function* walk(elems: Elem[]): Generator<Elem> {
  for (const e of elems) {
    yield e;
    if (e.kind === 'branch') for (const leg of e.legs) yield* walk(leg);
  }
}

/** Deep-copy elements with fresh ids (for paste / duplicate). */
export function cloneElems(elems: Elem[]): Elem[] {
  return elems.map((e) =>
    e.kind === 'branch'
      ? { kind: 'branch', id: uid('b'), legs: e.legs.map(cloneElems) }
      : { kind: 'instr', id: uid('i'), op: e.op, args: [...e.args] },
  );
}
