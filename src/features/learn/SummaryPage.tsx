import { PageHead } from '../../components/Brand';
import { useMemo } from 'react';
import { Icon } from '../../components/Icon';
import { Rich } from '../../components/RichText';
import { LESSON_BY_ID, TRACK_BY_ID, TRACKS } from '../../content';
import { GLOSSARY_BY_ID } from '../../content/glossary';
import { FORMULAS } from '../../content/summaries';
import { lessonText } from '../../content/quality';
import type { Track, TrackId } from '../../content/types';
import { BUSINESS } from '../../lib/business';
import { href } from '../../lib/router';

/** Plain text from inline markup: [[id|label]] → label, **x** → x. */
export const plain = (t: string) => t.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, (_, id) => GLOSSARY_BY_ID.get(id)?.term ?? id).replace(/\*\*/g, '').replace(/\s*\/\/ VERIFY.*$/, '');

export function trackSummary(t: Track) {
  const lessons = t.lessons.map((id) => LESSON_BY_ID.get(id)!);
  const termIds: string[] = [];
  for (const l of lessons) for (const m of lessonText(l).matchAll(/\[\[([^\]|]+)/g)) if (!termIds.includes(m[1]) && GLOSSARY_BY_ID.has(m[1])) termIds.push(m[1]);
  const terms = termIds.map((id) => GLOSSARY_BY_ID.get(id)!).sort((a, b) => a.term.localeCompare(b.term));
  const safety = lessons.flatMap((l) => ('note' in l.safety ? [{ lesson: l.title, text: l.safety.note }] : []));
  const mistakes = lessons.flatMap((l) => l.mistakes.map((m) => ({ lesson: l.title, text: m })));
  return { lessons, terms, safety, mistakes, formulas: FORMULAS[t.id] ?? [] };
}

export function summaryMarkdown(t: Track): string {
  const s = trackSummary(t);
  const out = [`# Track ${t.n}: ${t.title} — study summary`, '', `Controls Academy by ${BUSINESS.name}. Training material, not site procedure.`, ''];
  out.push('## Why each lesson matters', ...s.lessons.map((l) => `- **${l.title}:** ${plain(l.why)}`), '');
  if (s.formulas.length) out.push('## Formulas', ...s.formulas.map((f) => `- **${f.name}:** ${f.formula}${f.example ? ` (e.g. ${f.example})` : ''}`), '');
  out.push('## Key terms', ...s.terms.map((g) => `- **${g.term}:** ${g.def}`), '');
  out.push('## Safety points', ...s.safety.map((x) => `- ${plain(x.text)} _(${x.lesson})_`), '');
  out.push('## Common mistakes', ...s.mistakes.map((x) => `- ${plain(x.text)} _(${x.lesson})_`), '');
  return out.join('\n');
}

function download(t: Track) {
  const blob = new Blob([summaryMarkdown(t)], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `controls-academy-track-${t.n}-summary.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function SummaryPage({ track }: { track?: string }) {
  const t = TRACK_BY_ID.get(track as TrackId);
  const s = useMemo(() => (t ? trackSummary(t) : null), [t]);
  if (!t || !s) {
    return (
      <div>
        <a href={href('learn')} className="btn btn-ghost btn-sm -ml-2 mb-2"><Icon name="back" size={16} /> Learn</a>
        <PageHead eyebrow="Learn" title="Study summaries">One printable page per track: key terms, formulas, safety points and common mistakes.</PageHead>
        <ul className="list-none p-0 m-0 grid gap-2 sm:grid-cols-2">
          {TRACKS.map((x) => <li key={x.id}><a className="card card-link card-pad block" href={href(`summary/${x.id}`)}><span className="eyebrow">Track {x.n}</span><span className="block font-bold text-heading mt-1">{x.title}</span></a></li>)}
        </ul>
      </div>
    );
  }
  return (
    <article className="summary max-w-[78ch]">
      <div className="no-print flex flex-wrap gap-2 mb-3">
        <a href={href('summary')} className="btn btn-ghost btn-sm -ml-2"><Icon name="back" size={16} /> All summaries</a>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => window.print()}><Icon name="download" size={16} /> Print / save as PDF</button>
        <button type="button" className="btn btn-sm" onClick={() => download(t)}><Icon name="download" size={16} /> Download (.md)</button>
      </div>
      <header className="mb-4">
        <p className="eyebrow m-0">Study summary · Track {t.n} · {t.level}</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">{t.title}</h1>
        <p className="text-muted m-0">{t.blurb}</p>
        <p className="text-xs text-muted m-0 mt-1">Controls Academy by {BUSINESS.name}. Training material, not site procedure — your site's procedures and training come first.</p>
      </header>

      <section className="summary-sec">
        <h2>Why each lesson matters</h2>
        <ul>{s.lessons.map((l) => <li key={l.id}><strong>{l.title}:</strong> <Rich text={l.why} /></li>)}</ul>
      </section>

      {s.formulas.length > 0 && (
        <section className="summary-sec">
          <h2>Formulas</h2>
          <table className="summary-table"><tbody>{s.formulas.map((f) => <tr key={f.name}><th scope="row">{f.name}</th><td><code>{f.formula}</code>{f.example && <span className="block text-xs text-muted">e.g. {f.example}</span>}</td></tr>)}</tbody></table>
        </section>
      )}

      <section className="summary-sec">
        <h2>Key terms ({s.terms.length})</h2>
        <dl className="summary-terms">{s.terms.map((g) => <div key={g.id}><dt>{g.term}</dt><dd>{g.def}</dd></div>)}</dl>
      </section>

      <section className="summary-sec">
        <h2>Safety points</h2>
        <ul>{s.safety.map((x, i) => <li key={i}><Rich text={x.text} /> <span className="text-xs text-muted">({x.lesson})</span></li>)}</ul>
      </section>

      <section className="summary-sec">
        <h2>Common mistakes</h2>
        <ul>{s.mistakes.map((x, i) => <li key={i}><Rich text={x.text} /> <span className="text-xs text-muted">({x.lesson})</span></li>)}</ul>
      </section>
    </article>
  );
}
