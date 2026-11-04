import { useState, type ReactNode } from 'react';
import { GLOSSARY_BY_ID } from '../content/glossary';
import { href } from '../lib/router';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

/** Pull a trailing "// VERIFY ..." marker out of content text. */
export function splitVerify(text: string): { text: string; verify: string | null } {
  const i = text.indexOf('// VERIFY');
  if (i < 0) return { text, verify: null };
  return { text: text.slice(0, i).trimEnd(), verify: text.slice(i + 9).replace(/^[:\s]+/, '').trim() || 'details vary' };
}

export function VerifyFlag({ note }: { note: string }) {
  return (
    <span className="chip chip-warn ml-1 align-middle !min-h-[22px] !text-[0.68rem]" title={`Check your platform's manual: ${note}`}>
      <Icon name="flag" size={12} /> check your manual
    </span>
  );
}

export function Term({ id, children }: { id: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const g = GLOSSARY_BY_ID.get(id);
  if (!g) return <>{children}</>;
  return (
    <>
      <button type="button" className="term" onClick={() => setOpen(true)} aria-haspopup="dialog">
        {children ?? g.term}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={g.term}>
        <p className="mt-0 text-body">{g.def}</p>
        {g.aka && <p className="text-muted text-sm">Also called: {g.aka.join(', ')}</p>}
        <a className="btn btn-sm mt-2" href={href(`reference/glossary?t=${g.id}`)} onClick={() => setOpen(false)}>
          Open glossary <Icon name="chevron" size={16} />
        </a>
      </Sheet>
    </>
  );
}

/** Inline markup: **bold**, [[term]] / [[term|label]]. */
export function Rich({ text }: { text: string }) {
  const { text: t, verify } = splitVerify(text);
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let last = 0;
  let k = 0;
  for (const m of t.matchAll(re)) {
    if (m.index! > last) out.push(t.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={k++} className="text-heading">{renderTerms(m[1], k++)}</strong>);
    else out.push(<Term key={k++} id={m[2]}>{m[3]}</Term>);
    last = m.index! + m[0].length;
  }
  if (last < t.length) out.push(t.slice(last));
  return (
    <>
      {out}
      {verify && <VerifyFlag note={verify} />}
    </>
  );
}

function renderTerms(s: string, key: number): ReactNode {
  const m = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/.exec(s);
  if (m) return <Term key={key} id={m[1]}>{m[2]}</Term>;
  if (s.includes('[[')) return <Rich text={s} />;
  return s;
}
