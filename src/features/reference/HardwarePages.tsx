import { lazy, Suspense, useMemo, useState } from 'react';
import { PageHead } from '../../components/Brand';
import { HwFront } from '../../components/HwFront';
import { Icon } from '../../components/Icon';
import { Rich } from '../../components/RichText';
import { BRAND_GUIDES } from '../../content/brands';
import { HARDWARE, HARDWARE_BY_ID, STATUS_TEXT, UNIT_INFO, type HwModel } from '../../content/hardware';
import { href } from '../../lib/router';
import { SKINS } from '../../skins';
import { usePrefs } from '../../state/prefs';
import { prefer3D } from '../../three/support';

const Hardware3D = lazy(() => import('../../three/Hardware3D'));

const brandName = (id: string) => BRAND_GUIDES.find((b) => b.id === id)?.name ?? id;

function Back({ to, label }: { to: string; label: string }) {
  return <a href={href(to)} className="btn btn-ghost btn-sm -ml-2 mb-2"><Icon name="back" size={16} /> {label}</a>;
}

function StatusChip({ m }: { m: HwModel }) {
  const color = m.status === 'current' ? 'var(--live)' : m.status === 'mature' ? 'var(--blue-glow)' : 'var(--warn)';
  return <span className="chip !text-[0.68rem]" style={{ borderColor: color, color }}>{m.status === 'current' ? 'Current' : m.status === 'mature' ? 'Mature' : 'Legacy'}</span>;
}

export function HardwareCard({ m }: { m: HwModel }) {
  return (
    <a href={href(`reference/hw/${m.id}`)} className="card card-link card-pad flex flex-col gap-2">
      <span className="block rounded-lg overflow-hidden" style={{ background: 'var(--surface-sunk)' }}>
        <HwFront model={m} className="block w-full h-24" title={`${m.name} front view`} />
      </span>
      <span className="flex items-start justify-between gap-2">
        <span>
          <span className="block font-bold text-heading leading-snug">{m.name}</span>
          <span className="block text-sm text-muted">{m.role}</span>
        </span>
        <StatusChip m={m} />
      </span>
    </a>
  );
}

export function HardwareLibrary() {
  const [brand, setBrand] = useState<string>('all');
  const brands = useMemo(() => BRAND_GUIDES.filter((b) => HARDWARE.some((m) => m.brand === b.id)), []);
  const list = HARDWARE.filter((m) => brand === 'all' || m.brand === brand);
  const groups = brands.filter((b) => brand === 'all' || b.id === brand);
  return (
    <div>
      <Back to="reference" label="Reference" />
      <PageHead eyebrow="Reference" title="PLC hardware library">
        {HARDWARE.length} PLC, remote I/O and logic-module families you commonly see in US plants, in 3D. Tap one to turn it around and learn what each module does.
      </PageHead>
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3" role="group" aria-label="Filter by brand">
        {[{ id: 'all', name: 'All brands' }, ...brands].map((b) => (
          <button key={b.id} type="button" className="chip cursor-pointer !min-h-[44px] whitespace-nowrap" aria-pressed={brand === b.id} style={brand === b.id ? { borderColor: 'var(--blue-glow)', color: 'var(--blue-glow)' } : undefined} onClick={() => setBrand(b.id)}>
            {b.name.split(' (')[0].split(' / ')[0]}
          </button>
        ))}
      </div>
      {groups.map((b) => (
        <section key={b.id} className="mb-5" aria-labelledby={`hwb-${b.id}`}>
          <h2 id={`hwb-${b.id}`} className="text-base font-bold mb-2 flex items-center justify-between gap-2">
            <span>{b.name}</span>
            <a className="text-sm font-semibold text-glow" href={href(`reference/brand/${b.id}`)}>Field guide</a>
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
  const [sel, setSel] = useState<number | null>(null);
  if (!m) return <div><Back to="reference/hardware" label="Hardware library" /><p>Model not found.</p></div>;
  const unit = sel !== null ? m.shape.units[sel] : null;
  const inSim = hwModel === m.id && skin === m.skin;
  const kinds = [...new Set(m.shape.units.map((u) => u.kind))];
  return (
    <div>
      <Back to="reference/hardware" label="Hardware library" />
      <PageHead eyebrow={brandName(m.brand)} title={m.name}>{m.role}.</PageHead>
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <StatusChip m={m} />
        <span className="text-sm text-muted">{STATUS_TEXT[m.status]}</span>
      </div>

      <section className="card overflow-hidden mb-3" aria-label={`${m.name} model`}>
        {want3d ? (
          <Suspense fallback={<div className="h-[clamp(300px,52svh,460px)] flex items-center justify-center text-muted text-sm" role="status">Loading 3D…</div>}>
            <Hardware3D model={m} selected={sel} onSelect={setSel} />
          </Suspense>
        ) : (
          <div className="p-3" style={{ background: '#0d131b' }}><HwFront model={m} selected={sel} onSelect={setSel} className="block w-full h-56" /></div>
        )}
        <div className="flex flex-wrap gap-2 items-center px-3 py-2 border-t border-line">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setWant3d(!want3d)} aria-pressed={want3d}>
            <Icon name="layers" size={16} /> {want3d ? 'Show flat front view' : 'Show in 3D'}
          </button>
          <button type="button" className="btn btn-sm" disabled={inSim} onClick={() => setPrefs({ hwModel: m.id, skin: m.skin })}>
            <Icon name="sim" size={16} /> {inSim ? 'Shown in the simulator' : 'Use in the simulator'}
          </button>
          {inSim && <a className="btn btn-sm btn-ghost" href={href('sim')}>Open simulator <Icon name="chevron" size={16} /></a>}
        </div>
        <p className="text-xs text-muted px-3 pb-2 m-0">Drag to turn, pinch to zoom, tap a module. Simplified generic look-alike: proportions are approximate, no logos. Simulator dialect: {SKINS[m.skin].brand}.</p>
      </section>

      {unit && (
        <section className="card card-pad mb-3" aria-live="polite" style={{ borderColor: 'var(--blue-glow)' }}>
          <h2 className="text-base font-bold m-0">{UNIT_INFO[unit.kind].title}{unit.label ? ` (${unit.label})` : ''}</h2>
          <p className="text-sm m-0 mt-1">{UNIT_INFO[unit.kind].what}</p>
        </section>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="card card-pad">
          <h2 className="text-base font-bold mb-2">Where you'll see it</h2>
          <p className="m-0 text-[0.95rem]"><Rich text={m.where} /></p>
          <p className="m-0 mt-2 text-sm"><span className="text-muted">Software: </span><Rich text={m.software} /></p>
        </section>
        <section className="card card-pad">
          <h2 className="text-base font-bold mb-2">What to look at</h2>
          <ul className="pl-5 list-disc space-y-1.5 m-0 text-[0.95rem]">{m.spot.map((t, i) => <li key={i}><Rich text={t} /></li>)}</ul>
        </section>
        <section className="card card-pad lg:col-span-2">
          <h2 className="text-base font-bold mb-2">Modules in this example</h2>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {m.shape.units.map((u, i) => u.kind !== 'blank' && (
              <button key={i} type="button" className="chip cursor-pointer !min-h-[44px]" aria-pressed={sel === i} onClick={() => setSel(sel === i ? null : i)} style={sel === i ? { borderColor: 'var(--blue-glow)', color: 'var(--blue-glow)' } : undefined}>
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
      <p className="mt-4"><a className="btn btn-sm btn-ghost" href={href(`reference/brand/${m.brand}`)}>{brandName(m.brand)} field guide <Icon name="chevron" size={16} /></a></p>
    </div>
  );
}
