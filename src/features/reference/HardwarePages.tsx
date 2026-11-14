import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { PageHead } from '../../components/Brand';
import { HwFront } from '../../components/HwFront';
import { Icon } from '../../components/Icon';
import { Rich } from '../../components/RichText';
import { BRAND_GUIDES } from '../../content/brands';
import { CATEGORY_ONE, CATEGORY_TEXT, HARDWARE, HARDWARE_BY_ID, STATUS_TEXT, UNIT_INFO, categoryOf, type HwCategory, type HwModel } from '../../content/hardware';
import { href } from '../../lib/router';
import { vtName } from '../../lib/motion';
import { SKINS } from '../../skins';
import { usePrefs } from '../../state/prefs';
import { prefer3D } from '../../three/support';
import { useAfterPaint } from '../../lib/afterPaint';
import { EmptyState, NotFound } from '../../components/ui';

const Hardware3D = lazy(() => import('../../three/Hardware3D'));

const brandName = (id: string) => BRAND_GUIDES.find((b) => b.id === id)?.name ?? id;

function Back({ to, label }: { to: string; label: string }) {
  return <a href={href(to)} className="btn btn-ghost btn-sm -ml-2 mb-2"><Icon name="back" size={16} /> {label}</a>;
}

function StatusChip({ m }: { m: HwModel }) {
  const color = m.status === 'current' ? 'var(--live)' : m.status === 'mature' ? 'var(--blue-glow)' : 'var(--warn)';
  return <span className="chip !text-2xs" style={{ borderColor: color, color }}>{m.status === 'current' ? 'Current' : m.status === 'mature' ? 'Mature' : 'Legacy'}</span>;
}

const ioPoints = (u: HwModel['shape']['units'][number]) => {
  const n = Number(/\d+/.exec(u.label)?.[0] ?? 0);
  return u.kind === 'brick' || u.kind === 'logic' ? (u.inputs ?? 0) + (u.outputs ?? 0) : ['di', 'do', 'ai', 'ao'].includes(u.kind) ? n : 0;
};

export function HardwareCard({ m }: { m: HwModel }) {
  return (
    <a href={href(`reference/hw/${m.id}`)} className="card card-link card-pad flex flex-col gap-2 hw-card">
      <span className="block rounded-lg overflow-hidden hw-thumb" style={{ viewTransitionName: vtName('hw', m.id) }}>
        <HwFront model={m} className="block w-full h-24 hw-thumb-svg" title={`${m.name} front view`} />
      </span>
      <span className="flex items-start justify-between gap-2">
        <span>
          <span className="block font-bold text-heading leading-snug">{m.name}</span>
          <span className="block text-sm text-muted">{m.role}</span>
        </span>
        <span className="flex flex-col items-end gap-1 flex-none">
          <StatusChip m={m} />
          <span className="text-2xs font-bold uppercase tracking-wider text-muted">{CATEGORY_ONE[categoryOf(m)]}</span>
        </span>
      </span>
    </a>
  );
}

export function HardwareLibrary() {
  const [brand, setBrand] = useState<string>('all');
  const [status, setStatus] = useState<'all' | HwModel['status']>('all');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'all' | HwCategory>('all');
  const brands = useMemo(() => BRAND_GUIDES.filter((b) => HARDWARE.some((m) => m.brand === b.id)), []);
  const needle = q.trim().toLowerCase();
  const list = HARDWARE.filter((m) => (brand === 'all' || m.brand === brand) && (status === 'all' || m.status === status) && (cat === 'all' || categoryOf(m) === cat)
    && (!needle || `${m.name} ${m.role} ${m.software} ${brandName(m.brand)} ${m.where}`.toLowerCase().includes(needle)));
  const groups = brands.filter((b) => list.some((m) => m.brand === b.id));
  return (
    <div>
      <Back to="reference" label="Reference" />
      <PageHead eyebrow="Reference" title="PLC hardware library">
        {HARDWARE.length} PLCs, remote I/O, drives, HMIs, safety relays and building-automation controllers you commonly see in US plants and data centers, in 3D. Tap one to turn it around and learn what each part does.
      </PageHead>
      <div className="flex flex-wrap gap-2 items-center mb-2">
        <label className="relative flex-1 min-w-[12rem]">
          <span className="sr-only">Search hardware</span>
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input className="input !pl-9" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: 1756, S7-1200, CLICK, slice I/O…" aria-label="Search hardware" />
        </label>
        <div className="seg" role="group" aria-label="Filter by status">
          {(['all', 'current', 'mature', 'legacy'] as const).map((st) => (
            <button key={st} type="button" aria-pressed={status === st} onClick={() => setStatus(st)}>{st === 'all' ? 'All' : st[0].toUpperCase() + st.slice(1)}</button>
          ))}
        </div>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1 chip-scroll" role="group" aria-label="Filter by type">
        {([['all', 'All types'], ...Object.entries(CATEGORY_TEXT)] as [string, string][]).map(([id, label]) => (
          <button key={id} type="button" className="chip cursor-pointer !min-h-11 whitespace-nowrap" aria-pressed={cat === id} style={cat === id ? { borderColor: 'var(--blue-glow)', color: 'var(--blue-glow)' } : undefined} onClick={() => setCat(id as 'all' | HwCategory)}>
            {label} <span className="text-muted font-semibold ml-0.5">{id === 'all' ? HARDWARE.length : HARDWARE.filter((m) => categoryOf(m) === id).length}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1 chip-scroll" role="group" aria-label="Filter by brand">
        {[{ id: 'all', name: 'All brands' }, ...brands].map((b) => (
          <button key={b.id} type="button" className="chip cursor-pointer !min-h-11 whitespace-nowrap" aria-pressed={brand === b.id} style={brand === b.id ? { borderColor: 'var(--blue-glow)', color: 'var(--blue-glow)' } : undefined} onClick={() => setBrand(b.id)}>
            {b.name.split(' (')[0].split(' / ')[0]}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted mb-3" aria-live="polite">{list.length === HARDWARE.length ? `All ${list.length} models` : `${list.length} of ${HARDWARE.length} models`}</p>
      {list.length === 0 && <EmptyState title="No models match">Try a family name like "CompactLogix", or clear the filters.</EmptyState>}
      {groups.map((b) => (
        <section key={b.id} className="mb-5" aria-labelledby={`hwb-${b.id}`}>
          <h2 id={`hwb-${b.id}`} className="text-base font-bold mb-2 flex items-center justify-between gap-2">
            <span>{b.name}</span>
            <a className="text-sm font-semibold text-glow whitespace-nowrap" href={href(`reference/brand/${b.id}`)}>Field guide</a>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.filter((m) => m.brand === b.id).map((m) => <HardwareCard key={m.id} m={m} />)}</div>
        </section>
      ))}
      <p className="text-xs text-muted">Simplified generic models for recognition: approximate proportions and neutral colors, no logos or markings. Brand and product names are used only to describe hardware; not affiliated with or endorsed by any manufacturer. Always check the actual nameplate and the maker's manual.</p>
    </div>
  );
}

export function HardwareDetail({ id }: { id: string }) {
  const m = HARDWARE_BY_ID[id];
  const quality = usePrefs((s) => s.quality);
  const skin = usePrefs((s) => s.skin);
  const hwModel = usePrefs((s) => s.hwModel);
  const setPrefs = usePrefs((s) => s.setPrefs);
  const [want3d, setWant3d] = useState(() => prefer3D(quality));
  const painted = useAfterPaint();
  const [sel, setSel] = useState<number | null>(null);
  useEffect(() => { setSel(null); window.scrollTo?.(0, 0); }, [id]);
  if (!m) return <NotFound what="Model" backHref={href('reference/hardware')} backLabel="Hardware library" />;
  const unit = sel !== null ? m.shape.units[sel] : null;
  const loading3d = (
    <div className="h-[clamp(300px,52svh,460px)] relative panel3d-bg flex items-center justify-center p-4" role="status" aria-label="Loading 3D model">
      <HwFront model={m} className="block w-full max-h-full opacity-80" title={`${m.name} front view`} />
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 hud-chip !cursor-default"><span className="spinner" aria-hidden="true" /> Loading 3D…</span>
    </div>
  );
  const isPlc = categoryOf(m) === 'plc' || categoryOf(m) === 'logic';
  const inSim = hwModel === m.id && skin === m.skin;
  const kinds = [...new Set(m.shape.units.map((u) => u.kind))];
  const idx = HARDWARE.indexOf(m);
  const prev = HARDWARE[idx - 1];
  const next = HARDWARE[idx + 1];
  return (
    <div>
      <Back to="reference/hardware" label="Hardware library" />
      <PageHead eyebrow={brandName(m.brand)} title={m.name}>{m.role}.</PageHead>
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <StatusChip m={m} />
        <span className="chip !text-2xs">{CATEGORY_TEXT[categoryOf(m)]}</span>
        <span className="text-sm text-muted">{STATUS_TEXT[m.status]}</span>
      </div>

      <section className="card overflow-hidden mb-3" aria-label={`${m.name} model`} style={{ viewTransitionName: vtName('hw', m.id) }}>
        {want3d ? (
          painted ? <Suspense fallback={loading3d}><Hardware3D model={m} selected={sel} onSelect={setSel} /></Suspense> : loading3d
        ) : (
          <div className="p-3" style={{ background: 'var(--stage-2)' }}><HwFront model={m} selected={sel} onSelect={setSel} className="block w-full h-56" /></div>
        )}
        <div className="flex flex-wrap gap-2 items-center px-3 py-2 border-t border-line">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setWant3d(!want3d)} aria-pressed={want3d}>
            <Icon name="layers" size={16} /> {want3d ? 'Show flat front view' : 'Show in 3D'}
          </button>
          {isPlc && (
            <button type="button" className="btn btn-sm" disabled={inSim} onClick={() => setPrefs({ hwModel: m.id, skin: m.skin })}>
              <Icon name="sim" size={16} /> {inSim ? 'Shown in the simulator' : 'Use in the simulator'}
            </button>
          )}
          {inSim && <a className="btn btn-sm btn-ghost" href={href('sim')}>Open simulator <Icon name="chevron" size={16} /></a>}
        </div>
        <p className="text-xs text-muted px-3 pb-2 m-0">Drag to turn, pinch to zoom, tap a module. Simplified generic look-alike: proportions are approximate, no logos. {isPlc ? `Simulator dialect: ${SKINS[m.skin].brand}.` : `Type: ${CATEGORY_TEXT[categoryOf(m)]}.`}</p>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3" aria-label="At a glance">
        {[
          ['Mounting', m.shape.mount === 'din' ? 'DIN rail' : m.shape.mount === 'chassis' ? 'Chassis / rack' : m.shape.mount === 'plate' ? 'Back plate' : 'Door cut-out'],
          ['Modules shown', String(m.shape.units.filter((u) => u.kind !== 'blank' && u.kind !== 'end').length)],
          ['I/O points shown', String(m.shape.units.reduce((n, u) => n + ioPoints(u), 0))],
          ['Height × depth', `≈ ${m.shape.h} × ${m.shape.d} mm`],
        ].map(([k, v]) => (
          <div key={k} className="card card-pad !py-2.5 stat-tile">
            <span className="block text-2xs uppercase tracking-wider text-muted font-bold">{k}</span>
            <span className="block font-bold text-heading text-lg leading-tight mt-0.5">{v}</span>
          </div>
        ))}
      </div>

      {unit && (
        <section className="card card-pad mb-3" aria-live="polite" style={{ borderColor: 'var(--blue-glow)' }}>
          <h2 className="text-base font-bold m-0">{UNIT_INFO[unit.kind].title}{unit.label ? ` (${unit.label})` : ''}</h2>
          <p className="text-sm m-0 mt-1">{UNIT_INFO[unit.kind].what}</p>
        </section>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="card card-pad">
          <h2 className="text-base font-bold mb-2">Where you'll see it</h2>
          <p className="m-0 text-base"><Rich text={m.where} /></p>
          <p className="m-0 mt-2 text-sm"><span className="text-muted">Software: </span><Rich text={m.software} /></p>
        </section>
        <section className="card card-pad">
          <h2 className="text-base font-bold mb-2">What to look at</h2>
          <ul className="pl-5 list-disc space-y-1.5 m-0 text-base">{m.spot.map((t, i) => <li key={i}><Rich text={t} /></li>)}</ul>
        </section>
        <section className="card card-pad lg:col-span-2">
          <h2 className="text-base font-bold mb-2">Modules in this example</h2>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {m.shape.units.map((u, i) => u.kind !== 'blank' && (
              <button key={i} type="button" className="chip cursor-pointer !min-h-11" aria-pressed={sel === i} onClick={() => setSel(sel === i ? null : i)} style={sel === i ? { borderColor: 'var(--blue-glow)', color: 'var(--blue-glow)' } : undefined}>
                {u.label || UNIT_INFO[u.kind].title}
              </button>
            ))}
          </div>
          <dl className="m-0 space-y-1.5">
            {kinds.filter((k) => k !== 'blank').map((k) => <div key={k}><dt className="font-semibold text-heading text-sm">{UNIT_INFO[k].title}</dt><dd className="m-0 text-sm text-muted">{UNIT_INFO[k].what}</dd></div>)}
          </dl>
          <p className="text-xs text-muted mt-3 mb-0">Real systems vary: module count, widths and options depend on the catalog number. Read the nameplate.</p>
        </section>
      </div>
      <nav className="mt-4 grid grid-cols-2 gap-2" aria-label="More models">
        {prev ? <a className="card card-link card-pad !py-3 text-sm" href={href(`reference/hw/${prev.id}`)}><span className="flex items-center gap-1 text-muted text-xs"><Icon name="left" size={14} /> Previous</span><span className="block font-bold text-heading">{prev.name}</span></a> : <span />}
        {next ? <a className="card card-link card-pad !py-3 text-sm text-right" href={href(`reference/hw/${next.id}`)}><span className="flex items-center justify-end gap-1 text-muted text-xs">Next <Icon name="right" size={14} /></span><span className="block font-bold text-heading">{next.name}</span></a> : <span />}
      </nav>
      <p className="mt-3"><a className="btn btn-sm btn-ghost" href={href(`reference/brand/${m.brand}`)}>{brandName(m.brand)} field guide <Icon name="chevron" size={16} /></a></p>
    </div>
  );
}
