/**
 * Safe arithmetic expression evaluator for CPT (compute). No eval(): a small recursive-descent
 * parser over + − × ÷, MOD, ** (power), parentheses, unary minus and a few functions.
 */
import { MajorFaultError } from './tags';

type Tok = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

const FUNCS: Record<string, (x: number) => number> = {
  ABS: Math.abs,
  SQR: Math.sqrt, // Logix-style name for square root
  SQRT: Math.sqrt,
  TRN: Math.trunc,
};

export function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/.exec(src.slice(i));
      if (!m) throw new MajorFaultError(`Bad number in expression at "${src.slice(i)}".`);
      out.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*(\[[A-Za-z0-9_]+\])?(\.[A-Za-z0-9_]+)?/.exec(src.slice(i))!;
      const word = m[0];
      if (word.toUpperCase() === 'MOD') out.push({ t: 'op', v: 'MOD' });
      else out.push({ t: 'id', v: word });
      i += word.length;
      continue;
    }
    if (src.startsWith('**', i)) { out.push({ t: 'op', v: '**' }); i += 2; continue; }
    if ('+-*/()'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    throw new MajorFaultError(`Unexpected "${c}" in expression.`);
  }
  return out;
}

export function evaluate(src: string, read: (ref: string) => number): number {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === 'op' && peek()!.v === v;

  function primary(): number {
    const tk = toks[p++];
    if (!tk) throw new MajorFaultError('Expression ended early.');
    if (tk.t === 'num') return tk.v;
    if (tk.t === 'id') {
      const fn = FUNCS[tk.v.toUpperCase()];
      if (fn && isOp('(')) {
        p++;
        const v = expr();
        if (!isOp(')')) throw new MajorFaultError('Missing ")".');
        p++;
        return fn(v);
      }
      return read(tk.v);
    }
    if (tk.v === '(') {
      const v = expr();
      if (!isOp(')')) throw new MajorFaultError('Missing ")".');
      p++;
      return v;
    }
    if (tk.v === '-') return -unary();
    if (tk.v === '+') return unary();
    throw new MajorFaultError(`Unexpected "${tk.v}".`);
  }
  function unary(): number {
    return power();
  }
  function power(): number {
    const base = primary();
    if (isOp('**')) { p++; return base ** unary(); }
    return base;
  }
  function term(): number {
    let v = unary();
    while (isOp('*') || isOp('/') || isOp('MOD')) {
      const op = toks[p++].v;
      const r = unary();
      if (op === '*') v *= r;
      else if (op === '/') v /= r;
      else v = v % r;
    }
    return v;
  }
  function expr(): number {
    let v = term();
    while (isOp('+') || isOp('-')) {
      const op = toks[p++].v;
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  const v = expr();
  if (p !== toks.length) throw new MajorFaultError('Extra text at end of expression.');
  return v;
}

/** Tag references used in an expression (for the verifier and cross-reference). */
export function exprRefs(src: string): string[] {
  try {
    return tokenize(src)
      .filter((t): t is { t: 'id'; v: string } => t.t === 'id' && !FUNCS[t.v.toUpperCase()])
      .map((t) => t.v);
  } catch {
    return [];
  }
}
