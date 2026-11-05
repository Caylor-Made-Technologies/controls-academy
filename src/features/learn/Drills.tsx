import { useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Rich } from '../../components/RichText';
import { buzz } from '../../lib/sound';

/** Stable shuffle (same order every visit, never the answer order) so drills don't jump around. */
export function stableShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rand = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const idx = items.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  if (idx.length > 1 && idx.every((v, i) => v === i)) idx.push(idx.shift()!);
  return idx.map((i) => items[i]);
}

/** Tap the steps in order. A wrong tap is explained, not punished. */
export function OrderDrill({ prompt, steps, why }: { prompt: string; steps: string[]; why?: string }) {
  const shuffled = useMemo(() => stableShuffle(steps.map((s, i) => ({ s, i })), prompt), [steps, prompt]);
  const [done, setDone] = useState<number[]>([]);
  const [miss, setMiss] = useState<number | null>(null);
  const finished = done.length === steps.length;
  const tap = (i: number) => {
    if (done.includes(i) || finished) return;
    if (i === done.length) { setDone([...done, i]); setMiss(null); buzz(8); } else { setMiss(i); buzz(30); }
  };
  return (
    <div className="card card-pad my-4 drill" data-drill="order">
      <p className="eyebrow m-0 flex items-center gap-1.5"><Icon name="sim" size={14} /> Try it</p>
      <p className="font-semibold text-heading mt-1"><Rich text={prompt} /></p>
      {done.length > 0 && (
        <ol className="pl-5 list-decimal space-y-1 mb-3 text-sm" aria-label="Your order so far">
          {done.map((i) => <li key={i} className="text-live"><Rich text={steps[i]} /></li>)}
        </ol>
      )}
      {!finished && (
        <div className="grid gap-2" role="group" aria-label={`Pick step ${done.length + 1} of ${steps.length}`}>
          {shuffled.filter((x) => !done.includes(x.i)).map((x) => (
            <button key={x.i} type="button" className="btn !justify-start text-left !h-auto py-2.5 !font-medium" onClick={() => tap(x.i)}
              style={miss === x.i ? { borderColor: 'var(--alarm)', background: 'var(--alarm-soft)' } : undefined}>
              <Rich text={x.s} />
            </button>
          ))}
        </div>
      )}
      <p className="text-sm mt-3 mb-0" role="status">
        {finished ? <><strong className="text-live">All in order.</strong> {why && <Rich text={why} />}</>
          : miss !== null ? <span className="text-warn">Not yet — something has to happen before that. Pick step {done.length + 1}.</span>
          : <span className="text-muted">Tap step {done.length + 1} of {steps.length}.</span>}
      </p>
      {(finished || done.length > 0) && <button type="button" className="btn btn-sm btn-ghost mt-2" onClick={() => { setDone([]); setMiss(null); }}><Icon name="back" size={14} /> Start over</button>}
    </div>
  );
}

/** Put each item in the right bin. Feedback (with the reason) on every pick. */
export function SortDrill({ prompt, bins, items }: { prompt: string; bins: string[]; items: { text: string; bin: number; why?: string }[] }) {
  const order = useMemo(() => stableShuffle(items.map((it, i) => ({ ...it, i })), prompt), [items, prompt]);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const right = Object.entries(picks).filter(([i, b]) => items[Number(i)].bin === b).length;
  const all = Object.keys(picks).length === items.length;
  return (
    <div className="card card-pad my-4 drill" data-drill="sort">
      <p className="eyebrow m-0 flex items-center gap-1.5"><Icon name="sim" size={14} /> Try it</p>
      <p className="font-semibold text-heading mt-1"><Rich text={prompt} /></p>
      <ul className="space-y-3 p-0 m-0 list-none">
        {order.map((it) => {
          const p = picks[it.i];
          const ok = p === it.bin;
          return (
            <li key={it.i} className="border-t border-line pt-3 first:border-0 first:pt-0">
              <p className="m-0 mb-2 text-sm font-medium" id={`sort-${it.i}`}><Rich text={it.text} /></p>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`sort-${it.i}`}>
                {bins.map((b, bi) => (
                  <button key={bi} type="button" className="btn" aria-pressed={p === bi} disabled={p !== undefined}
                    onClick={() => { setPicks({ ...picks, [it.i]: bi }); buzz(bi === it.bin ? 8 : 30); }}
                    style={p === undefined ? undefined : bi === it.bin ? { borderColor: 'var(--live)', background: 'var(--live-soft)' } : bi === p ? { borderColor: 'var(--alarm)', background: 'var(--alarm-soft)' } : { opacity: 0.55 }}>
                    {b}
                  </button>
                ))}
              </div>
              {p !== undefined && (
                <p className="text-sm m-0 mt-1.5" role="status">
                  <strong className={ok ? 'text-live' : 'text-warn'}>{ok ? 'Right.' : `It's "${bins[it.bin]}".`}</strong> {it.why && <Rich text={it.why} />}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {all && (
        <div className="flex items-center gap-3 mt-3">
          <p className="m-0 text-sm font-semibold" role="status">{right} of {items.length} right.</p>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPicks({})}><Icon name="back" size={14} /> Try again</button>
        </div>
      )}
    </div>
  );
}
