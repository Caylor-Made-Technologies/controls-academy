/**
 * "Verify" — catches the mistakes that bite real technicians before they download.
 */
import { exprRefs } from './expr';
import { OPS } from './ops';
import { TagStore, isLiteral, parseRef } from './tags';
import { walk } from './text';
import type { Instr, Program } from './types';

export type IssueLevel = 'error' | 'warning';

export interface Issue {
  level: IssueLevel;
  code:
    | 'bad-operand' | 'unknown-routine' | 'duplicate-coil' | 'unused-tag' | 'zero-preset'
    | 'unconditional-output' | 'no-seal-in' | 'missing-args' | 'empty-rung' | 'input-written' | 'afi';
  message: string;
  routine?: string;
  rungId?: string;
  rungIndex?: number;
  tag?: string;
}

const DESTRUCTIVE = new Set(['OTE']);

export function verifyProgram(p: Program): Issue[] {
  const issues: Issue[] = [];
  const tags = new TagStore(p.tags);
  const used = new Set<string>();
  const coilWrites = new Map<string, { routine: string; rungIndex: number; rungId: string }[]>();
  const routineNames = new Set(p.routines.map((r) => r.name));

  const markUsed = (ref: string) => {
    const r = parseRef(ref);
    if (r) {
      used.add(r.base);
      if (r.index && !/^\d+$/.test(r.index)) used.add(r.index);
    }
  };

  for (const routine of p.routines) {
    routine.rungs.forEach((rung, rungIndex) => {
      const at = { routine: routine.name, rungId: rung.id, rungIndex };
      if (rung.elems.length === 0) {
        issues.push({ level: 'warning', code: 'empty-rung', message: `Rung ${rungIndex} is empty.`, ...at });
        return;
      }
      const instrs = [...walk(rung.elems)].filter((e): e is Instr => e.kind === 'instr');
      const hasOutput = instrs.some((i) => OPS[i.op].role === 'output');

      // An output with no input conditions in front of it is on every scan.
      const first = rung.elems[0];
      if (first.kind === 'instr' && OPS[first.op].role === 'output' && !['MCR', 'JSR'].includes(first.op)) {
        issues.push({
          level: 'warning', code: 'unconditional-output',
          message: `Rung ${rungIndex}: ${first.op} has no conditions, so it runs every scan. Intended?`, ...at,
        });
      }
      if (!hasOutput) {
        issues.push({ level: 'error', code: 'missing-args', message: `Rung ${rungIndex} has no output instruction at the end.`, ...at });
      }

      for (const ins of instrs) {
        const spec = OPS[ins.op];
        if (ins.op === 'AFI') {
          issues.push({ level: 'warning', code: 'afi', message: `Rung ${rungIndex} is disabled with AFI. Remove it when testing is done.`, ...at });
        }
        if (ins.args.length !== spec.args.length) {
          issues.push({ level: 'error', code: 'missing-args', message: `Rung ${rungIndex}: ${ins.op} needs ${spec.args.length} operand(s).`, ...at });
          continue;
        }
        spec.args.forEach((as, k) => {
          const v = ins.args[k];
          if (as.kind === 'routine') {
            if (!routineNames.has(v)) issues.push({ level: 'error', code: 'unknown-routine', message: `Rung ${rungIndex}: JSR to "${v}", which doesn't exist.`, ...at });
            return;
          }
          if (as.kind === 'expr') {
            for (const r of exprRefs(v)) {
              markUsed(r);
              if (!tags.isValidRef(r)) issues.push({ level: 'error', code: 'bad-operand', message: `Rung ${rungIndex}: "${r}" isn't a tag.`, ...at, tag: r });
            }
            return;
          }
          if (v === '' || !tags.isValidRef(v)) {
            issues.push({ level: 'error', code: 'bad-operand', message: `Rung ${rungIndex}: ${ins.op} operand "${v || '?'}" isn't a defined tag or number.`, ...at, tag: v });
            return;
          }
          if (!isLiteral(v)) markUsed(v);
          const isWrite = ['dest', 'storage'].includes(as.kind) || (as.kind === 'array' && k === 1);
          if (isWrite) {
            const r = parseRef(v);
            const decl = r && tags.decls.get(r.base);
            if (decl?.io?.kind === 'DI' || decl?.io?.kind === 'AI') {
              issues.push({ level: 'warning', code: 'input-written', message: `Rung ${rungIndex}: writes to input "${v}". The next input scan will overwrite it.`, ...at, tag: v });
            }
          }
        });
        if (DESTRUCTIVE.has(ins.op)) {
          const key = ins.args[0];
          const list = coilWrites.get(key) ?? [];
          list.push(at);
          coilWrites.set(key, list);
        }
        if (['TON', 'TOF', 'RTO'].includes(ins.op)) {
          const d = tags.decls.get(ins.args[0]);
          if (d && Number(d.initial ?? 0) === 0) {
            issues.push({ level: 'warning', code: 'zero-preset', message: `Timer ${ins.args[0]} has a preset of 0 — it will be done instantly.`, ...at, tag: ins.args[0] });
          }
        }
      }

      // 3-wire start/stop heuristic: an OTE driven by a momentary "start" input with no seal-in branch.
      for (const ins of instrs) {
        if (ins.op !== 'OTE') continue;
        const coil = ins.args[0];
        const startContact = instrs.find(
          (c) => c.op === 'XIC' && /start/i.test(c.args[0]) && tags.decls.get(parseRef(c.args[0])?.base ?? '')?.io?.kind === 'DI',
        );
        const sealed = instrs.some((c) => c.op === 'XIC' && (c.args[0] === coil || /aux|seal|run/i.test(c.args[0])) && c !== startContact);
        if (startContact && !sealed) {
          issues.push({
            level: 'warning', code: 'no-seal-in',
            message: `Rung ${rungIndex}: ${coil} is driven by momentary "${startContact.args[0]}" with no seal-in. It will drop out when the button is released.`,
            ...at, tag: coil,
          });
        }
      }
    });
  }

  for (const [tag, list] of coilWrites) {
    if (list.length > 1) {
      issues.push({
        level: 'warning', code: 'duplicate-coil',
        message: `"${tag}" has ${list.length} output coils (rungs ${list.map((l) => l.rungIndex).join(', ')}). The last one solved wins every scan.`,
        tag, routine: list[0].routine, rungId: list[list.length - 1].rungId, rungIndex: list[list.length - 1].rungIndex,
      });
    }
  }

  for (const d of p.tags) {
    if (!used.has(d.name)) {
      issues.push({ level: 'warning', code: 'unused-tag', message: `Tag "${d.name}" isn't used in any rung.`, tag: d.name });
    }
  }
  return issues;
}

/** Cross-reference: every rung that touches a tag (like "Go To Cross Reference"). */
export function crossReference(p: Program, tag: string): { routine: string; rungIndex: number; op: string; write: boolean }[] {
  const out: { routine: string; rungIndex: number; op: string; write: boolean }[] = [];
  for (const routine of p.routines) {
    routine.rungs.forEach((rung, rungIndex) => {
      for (const e of walk(rung.elems)) {
        if (e.kind !== 'instr') continue;
        e.args.forEach((a, k) => {
          const refs = OPS[e.op].args[k]?.kind === 'expr' ? exprRefs(a) : [a];
          for (const r of refs) {
            if (parseRef(r)?.base === tag) {
              const kind = OPS[e.op].args[k]?.kind;
              out.push({ routine: routine.name, rungIndex, op: e.op, write: kind === 'dest' || kind === 'storage' || OPS[e.op].role === 'output' });
            }
          }
        });
      }
    });
  }
  return out;
}
