import { useRef } from 'react';
import { Icon } from '../../components/Icon';
import type { PanelControl, PanelIndicator } from '../../plant/types';
import { IoCards, Lamp, PushButton } from './MotorPanel';
import type { SimRuntime } from './runtime';

const fmt = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '—');

function Control({ c, rt, set }: { c: PanelControl; rt: SimRuntime; set: (field: string, v: unknown) => void }) {
  const s = rt.scene.state as Record<string, unknown>;
  switch (c.kind) {
    case 'momentary':
      return <PushButton label={c.label} color={c.color} pressed={Boolean(s[c.field])} onChange={(v) => set(c.field, v)} hint={c.hint} />;
    case 'toggle':
      return (
        <div className="flex flex-col items-center gap-1 min-w-[88px]">
          <button type="button" className="btn btn-sm" aria-pressed={Boolean(s[c.field])} onClick={() => set(c.field, !s[c.field])} aria-label={`${c.label}: ${s[c.field] ? c.on : c.off}. ${c.hint}`}>{s[c.field] ? c.on : c.off}</button>
          <span className="text-[0.72rem] font-bold text-center">{c.label}</span>
        </div>
      );
    case 'selector':
      return (
        <div className="flex flex-col gap-1">
          <span className="text-[0.72rem] font-bold">{c.label}</span>
          <div className="seg" role="group" aria-label={`${c.label}. ${c.hint}`}>
            {c.options.map((o) => <button key={o.value} type="button" aria-pressed={s[c.field] === o.value} onClick={() => set(c.field, o.value)}>{o.label}</button>)}
          </div>
        </div>
      );
    case 'slider': {
      const v = Number(s[c.field]);
      return (
        <label className="block w-full">
          <span className="flex justify-between text-sm"><span className="font-semibold text-heading">{c.label}</span><span className="font-mono tabular-nums">{fmt(v, c.step < 1 ? 1 : 0)} {c.unit}</span></span>
          <input type="range" min={c.min} max={c.max} step={c.step} value={v} onChange={(e) => set(c.field, Number(e.target.value))} className="w-full accent-[var(--blue)] h-11" aria-describedby={`hint-${c.field}`} />
          <span id={`hint-${c.field}`} className="sr-only">{c.hint}</span>
        </label>
      );
    }
  }
}

function Readout({ x, rt }: { x: PanelIndicator; rt: SimRuntime }) {
  const s = rt.scene.state;
  if (x.kind === 'light') return <Lamp on={x.on(s, rt.io)} color={x.color} label={x.label} />;
  if (x.kind === 'text') return <div className="rounded-xl border border-line bg-sunk p-2.5 min-w-[120px]"><p className="m-0 text-[0.68rem] font-bold uppercase tracking-widest text-muted">{x.label}</p><p className="m-0 font-bold text-heading">{x.value(s, rt.io)}</p></div>;
  const v = x.value(s, rt.io);
  const pct = Math.max(0, Math.min(1, v / x.max));
  const warn = x.warn !== undefined && v >= x.warn;
  return (
    <div className="rounded-xl border border-line bg-sunk p-2.5 min-w-[120px] flex-1">
      <p className="m-0 text-[0.68rem] font-bold uppercase tracking-widest text-muted">{x.label}</p>
      <p className="m-0 font-bold text-heading tabular-nums">{fmt(v, x.digits ?? 1)} {x.unit}</p>
      <div className="h-1.5 rounded-full bg-raised overflow-hidden mt-1" role="img" aria-label={`${x.label} ${fmt(v, x.digits ?? 1)} ${x.unit}${warn ? ', high' : ''}`}>
        <div className="h-full" style={{ width: `${pct * 100}%`, background: warn ? 'var(--warn)' : 'var(--blue-glow)' }} />
      </div>
    </div>
  );
}

/** Live trend of a few values (last ~60 s), sampled at most 5 times a second. */
function Trend({ rt }: { rt: SimRuntime }) {
  const ui = rt.scene.ui!;
  const buf = useRef<{ t: number; v: number[] }[]>([]);
  const now = performance.now();
  const last = buf.current[buf.current.length - 1];
  if (!last || now - last.t > 200) {
    buf.current.push({ t: now, v: ui.trend!.map((l) => l.value(rt.scene.state, rt.io)) });
    if (buf.current.length > 300) buf.current.shift();
  }
  const W = 300, H = 90, max = ui.trendMax ?? 100;
  const pts = buf.current;
  return (
    <figure className="m-0 mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full block rounded-xl border border-line bg-sunk" role="img" aria-label={`Trend: ${ui.trend!.map((l, i) => `${l.label} ${fmt(last?.v[i] ?? 0)}`).join(', ')}`}>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="var(--border)" strokeWidth="0.5" />)}
        {ui.trend!.map((l, i) => (
          <polyline key={l.label} fill="none" stroke={l.color} strokeWidth="1.8"
            points={pts.map((p, k) => `${(k / 299) * W},${H - (Math.max(0, Math.min(max, p.v[i])) / max) * H}`).join(' ')} />
        ))}
      </svg>
      <figcaption className="flex flex-wrap gap-3 text-xs text-muted mt-1">
        {ui.trend!.map((l) => <span key={l.label} className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{ background: l.color }} />{l.label}</span>)}
        <span>last minute</span>
      </figcaption>
    </figure>
  );
}

export function MachinePanel({ rt, onDevice }: { rt: SimRuntime; onDevice?: (id: string) => void }) {
  const scene = rt.scene;
  const ui = scene.ui!;
  const set = (field: string, v: unknown) => { (scene.state as Record<string, unknown>)[field] = v; rt.notify(); };
  const lights = ui.indicators.filter((x) => x.kind === 'light');
  const other = ui.indicators.filter((x) => x.kind !== 'light');
  const analog = scene.devices.filter((d) => d.io && (d.io.kind === 'AI' || d.io.kind === 'AO'));
  return (
    <section className="card card-pad" aria-label={scene.title}>
      <p className="eyebrow m-0">Machine</p>
      <h2 className="text-lg font-bold mt-1 mb-0">{scene.title}</h2>
      {scene.summary && <p className="text-sm text-muted m-0 mt-1">{scene.summary}</p>}

      <div className="rounded-2xl border border-line bg-sunk p-3 mt-3">
        <p className="text-[0.68rem] font-bold tracking-widest uppercase text-muted m-0 mb-2">Operator station</p>
        <div className="flex flex-wrap gap-3 items-end">
          {ui.controls.filter((c) => c.kind !== 'slider').map((c) => <Control key={c.field} c={c} rt={rt} set={set} />)}
        </div>
        {ui.controls.some((c) => c.kind === 'slider') && (
          <div className="grid gap-1 mt-2">{ui.controls.filter((c) => c.kind === 'slider').map((c) => <Control key={c.field} c={c} rt={rt} set={set} />)}</div>
        )}
        {lights.length > 0 && <div className="flex flex-wrap gap-3 mt-3">{lights.map((x) => <Readout key={x.label} x={x} rt={rt} />)}</div>}
      </div>

      {other.length > 0 && <div className="flex flex-wrap gap-2 mt-3">{other.map((x) => <Readout key={x.label} x={x} rt={rt} />)}</div>}
      {ui.trend && <Trend rt={rt} />}

      {ui.actions && ui.actions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {ui.actions.map((a) => {
            const why = a.disabled?.(scene.state) ?? null;
            return <button key={a.id} type="button" className="btn btn-sm" disabled={Boolean(why)} onClick={() => { a.run(scene); rt.notify(); }}><Icon name="reset" size={14} /> {why ?? a.label}</button>;
          })}
        </div>
      )}

      <div className="mt-3"><IoCards rt={rt} onDevice={onDevice} /></div>
      {analog.length > 0 && (
        <div className="rounded-xl border border-line bg-sunk p-2.5 mt-2">
          <p className="text-[0.68rem] font-bold tracking-widest uppercase text-muted m-0 mb-1">Analog</p>
          <ul className="list-none p-0 m-0 grid gap-1">
            {analog.map((d) => (
              <li key={d.id}>
                <button type="button" className="w-full flex justify-between gap-2 rounded-lg px-2 py-2 min-h-[44px] hover:bg-raised text-left text-sm" onClick={() => onDevice?.(d.id)}>
                  <span><span className="font-mono font-bold">{d.io!.kind}{d.io!.point}</span> {d.label}</span>
                  <span className="font-mono tabular-nums">{fmt(d.io!.kind === 'AI' ? rt.io.AI[d.io!.point] : rt.io.AO[d.io!.point], 2)} {d.io!.kind === 'AI' ? 'mA' : '%'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
