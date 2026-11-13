import { lazy, Suspense, useMemo, useState } from 'react';
import { PageHead, RouteHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { useAfterPaint } from '../../lib/afterPaint';
import { PosterFrame } from '../../three/poster/frames';
import { POSTERS } from '../../three/poster/wiring.gen';
import { href } from '../../lib/router';
import { EXERCISES, EXERCISE_BY_ID, WIRE_COLORS, checkWiring, type CheckResult, type Exercise, type Wire } from '../../lib/wiring';
import { usePrefs } from '../../state/prefs';
import { hasWebGL, prefer3D } from '../../three/support';
import { Callout } from '../../components/ui';

const WiringBoard3D = lazy(() => import('../../three/WiringBoard3D'));

function Trainer({ ex }: { ex: Exercise }) {
  const [wires, setWires] = useState<Wire[]>([]);
  // Each wire keeps the color it got when it was run (removing one doesn't recolor the rest).
  const [colors, setColors] = useState<string[]>([]);
  const [nextColor, setNextColor] = useState(0);
  const [armed, setArmed] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [shown, setShown] = useState(false);
  const quality = usePrefs((s) => s.quality);
  const can3d = useMemo(() => hasWebGL() && quality !== '2d', [quality]);
  const [view3d, setView3d] = useState(() => prefer3D(quality));
  const painted = useAfterPaint();
  const label = useMemo(() => new Map(ex.devices.flatMap((d) => d.terminals.map((t) => [t.id, t.label] as const))), [ex]);

  const tap = (id: string) => {
    setResult(null);
    setShown(false);
    if (!armed) { setArmed(id); return; }
    if (armed === id) { setArmed(null); return; }
    const exists = wires.some(([a, b]) => (a === armed && b === id) || (a === id && b === armed));
    if (!exists) {
      setWires([...wires, [armed, id]]);
      setColors([...colors, WIRE_COLORS[nextColor % WIRE_COLORS.length]]);
      setNextColor(nextColor + 1);
    }
    setArmed(null);
  };
  const remove = (i: number) => { setWires(wires.filter((_, k) => k !== i)); setColors(colors.filter((_, k) => k !== i)); setResult(null); setShown(false); };
  const check = () => setResult(checkWiring(ex.id, wires));

  return (
    <div>
      <a href={href('wiring')} className="btn btn-ghost btn-sm -ml-2 mb-2"><Icon name="back" size={16} /> Wiring trainer</a>
      <PageHead eyebrow="Wiring trainer" title={ex.title}>{ex.goal}</PageHead>
      <Callout tone="safety" className="mb-3 text-sm">{ex.safety}</Callout>

      {can3d && (
        <div className="seg mb-2" role="group" aria-label="Board view">
          <button type="button" aria-pressed={!view3d} onClick={() => setView3d(false)}>Terminals</button>
          <button type="button" aria-pressed={view3d} onClick={() => setView3d(true)}>3D board</button>
        </div>
      )}
      {can3d && view3d && (
        painted ? (
          <Suspense fallback={<div className="mb-3"><PosterFrame kind="wiring" spec={POSTERS[ex.id]} label="Loading 3D board" /></div>}>
            <div className="mb-3"><WiringBoard3D ex={ex} wires={wires} colors={colors} armed={armed} onTap={tap} /></div>
          </Suspense>
        ) : <div className="mb-3"><PosterFrame kind="wiring" spec={POSTERS[ex.id]} label="Loading 3D board" /></div>
      )}

      <p className="text-sm m-0 mb-2" role="status" aria-live="polite">
        {armed ? <>Wire from <strong className="text-heading">{label.get(armed)}</strong> — now tap the other end (tap it again to cancel).</> : 'Tap a terminal, then another, to run a wire between them.'}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 mb-3">
        {ex.devices.map((d) => (
          <section key={d.id} className="card card-pad" aria-label={d.name}>
            <h2 className="text-base font-bold m-0">{d.name}</h2>
            <p className="text-xs text-muted m-0 mt-0.5">{d.note}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {d.terminals.map((t) => {
                const n = wires.filter(([a, b]) => a === t.id || b === t.id).length;
                return (
                  <button key={t.id} type="button" className={`btn btn-sm ${armed === t.id ? 'btn-primary' : ''} !min-h-11`} aria-pressed={armed === t.id} onClick={() => tap(t.id)}>
                    {t.label}{n > 0 && <span className="chip !text-2xs !min-h-0 !py-0 ml-1"><span aria-hidden="true">{n}</span><span className="sr-only">({n} wire{n > 1 ? 's' : ''})</span></span>}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="card card-pad mb-3" aria-label="Wires">
        <h2 className="text-base font-bold m-0">Wires ({wires.length})</h2>
        {wires.length === 0 ? <p className="text-sm text-muted m-0 mt-1">None yet.</p> : (
          <ul className="m-0 mt-2 p-0 list-none space-y-1">
            {wires.map(([a, b], i) => (
              <li key={`${a}-${b}`} className="flex items-center gap-2 text-sm">
                <span className="inline-block w-3 h-3 rounded-full flex-none" style={{ background: colors[i] }} aria-hidden="true" />
                <span className="flex-1">{label.get(a)} → {label.get(b)}</span>
                <button type="button" className="btn btn-ghost btn-sm !min-h-11" onClick={() => remove(i)} aria-label={`Remove wire ${label.get(a)} to ${label.get(b)}`}><Icon name="x" size={16} /></button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted m-0 mt-2">Wire colors here only tell the wires apart; real color codes vary by site, voltage and country.</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" className="btn btn-primary" onClick={check}><Icon name="check" size={16} /> Check wiring</button>
          <button type="button" className="btn" onClick={() => { setWires([]); setColors([]); setResult(null); setArmed(null); setShown(false); }} disabled={wires.length === 0}>Clear</button>
          <button type="button" className="btn btn-ghost" onClick={() => { setWires(ex.solution); setColors(ex.solution.map((_, i) => WIRE_COLORS[i % WIRE_COLORS.length])); setNextColor(ex.solution.length); setShown(true); setArmed(null); setResult(checkWiring(ex.id, ex.solution)); }}>Show me one answer</button>
        </div>
      </section>

      {result && (
        <section className="card card-pad mb-3" role="status" aria-label="Check result" style={{ borderColor: result.pass ? 'var(--live)' : 'var(--warn)' }}>
          <h2 className="text-base font-bold m-0">{result.pass ? (shown ? 'That\'s one correct way.' : 'It works.') : 'Not yet.'}</h2>
          {result.reading && <p className="m-0 mt-1 font-mono">Analog input reads {result.reading}</p>}
          <ul className="m-0 mt-2 p-0 list-none space-y-2">
            {result.steps.map((s) => (
              <li key={s.name} className="text-sm flex gap-2">
                <Icon name={s.ok ? 'check' : 'x'} size={16} className={`flex-none mt-0.5 ${s.ok ? 'text-live' : 'text-warn'}`} />
                <span><strong className="text-heading">{s.name}</strong>{s.why && <><br />{s.why}</>}</span>
              </li>
            ))}
          </ul>
          {result.pass && <p className="text-sm text-muted m-0 mt-2">The checker tests how the circuit behaves, so other correct layouts pass too.</p>}
        </section>
      )}
    </div>
  );
}

export default function WiringPage({ id }: { id?: string }) {
  const ex = id ? EXERCISE_BY_ID.get(id as Exercise['id']) : undefined;
  if (ex) return <Trainer key={ex.id} ex={ex} />;
  return (
    <div>
      <RouteHead seg="wiring" />
      <div className="grid gap-2 sm:grid-cols-2">
        {EXERCISES.map((e) => (
          <a key={e.id} href={href(`wiring/${e.id}`)} className="card card-link card-pad">
            <span className="font-bold text-heading">{e.title}</span>
            <span className="block text-sm text-muted mt-1">{e.goal}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
