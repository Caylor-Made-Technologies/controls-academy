import { useState } from 'react';
import { PageHead } from '../../components/Brand';
import { Rich } from '../../components/RichText';
import { Button, Chip } from '../../components/ui';
import { SHEETS } from '../../content/cheatsheets';
import { href } from '../../lib/router';

/**
 * Printable cheat sheets. Pick one sheet or show all, then print (or save as PDF). Print styles drop the app
 * chrome and use black on white; each sheet starts on its own page when printing more than one.
 */
export default function CheatPage() {
  const [only, setOnly] = useState<string>('all');
  const shown = only === 'all' ? SHEETS : SHEETS.filter((s) => s.id === only);
  return (
    <div className="cheats">
      <div className="no-print">
        <Button href={href('reference')} variant="ghost" size="sm" icon="back" className="-ml-2 mb-2">Reference</Button>
      </div>
      <PageHead eyebrow="Reference" title="Cheat sheets">Wire colors, contact numbers, symbols and the math you use on the floor. Print them or save as PDF; they work offline.</PageHead>
      <div className="no-print mb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 chip-scroll" role="group" aria-label="Which sheet">
          <Chip onClick={() => setOnly('all')} pressed={only === 'all'} className="whitespace-nowrap">All sheets</Chip>
          {SHEETS.map((s) => <Chip key={s.id} onClick={() => setOnly(s.id)} pressed={only === s.id} className="whitespace-nowrap">{s.title}</Chip>)}
        </div>
        <Button variant="primary" icon="download" className="mt-2" onClick={() => window.print()}>Print or save as PDF</Button>
      </div>

      <div className="space-y-3">
        {shown.map((s) => (
          <section key={s.id} className="card card-pad cheat-sheet" aria-labelledby={`sheet-${s.id}`}>
            <h2 id={`sheet-${s.id}`} className="text-lg font-bold m-0">{s.title}</h2>
            <p className="text-sm m-0 mt-1"><Rich text={s.intro} /></p>
            {s.tables?.map((t) => (
              <div key={t.caption} className="overflow-x-auto scroll-cue mt-3" tabIndex={0} role="region" aria-label={t.caption}>
                <table className="cheat-table">
                  <caption>{t.caption}</caption>
                  <thead><tr>{t.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
                  <tbody>{t.rows.map((r) => <tr key={r[0]}>{r.map((c, i) => (i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}><Rich text={c} /></td>))}</tr>)}</tbody>
                </table>
              </div>
            ))}
            {s.lines && (
              <ul className="cheat-lines">
                {s.lines.map((l) => { const [k, ...v] = l.split(': '); return <li key={l}>{v.length ? <><strong className="text-heading">{k}:</strong> <code>{v.join(': ')}</code></> : l}</li>; })}
              </ul>
            )}
            {s.note && <p className="text-sm text-muted m-0 mt-3"><Rich text={s.note} /></p>}
            {s.lesson && <p className="no-print m-0 mt-2"><a href={href(`lesson/${s.lesson}`)} className="text-sm">Related lesson</a></p>}
          </section>
        ))}
      </div>
      <p className="text-xs text-muted mt-3">Training material, not site procedure. Your site's specifications, the print and the electrical code in force always come first. Controls Academy · Caylor Made Technologies.</p>
    </div>
  );
}
