import { lazy, Suspense, useMemo, useState } from 'react';
import { PageHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { INSIDE, INSIDE_BY_ID } from '../../content/inside';
import { useAfterPaint } from '../../lib/afterPaint';
import { PosterFrame } from '../../three/poster/frames';
import { POSTERS } from '../../three/poster/inside.gen';
import { href } from '../../lib/router';
import { usePrefs } from '../../state/prefs';
import { hasWebGL, prefer3D } from '../../three/support';
import { Callout } from '../../components/ui';

const Inside3D = lazy(() => import('../../three/Inside3D'));

export function InsideList() {
  return (
    <div>
      <a href={href('reference')} className="btn btn-ghost btn-sm -ml-2 mb-2"><Icon name="back" size={16} /> Reference</a>
      <PageHead eyebrow="Reference" title="What's inside">Exploded views of devices you'll meet on day one. Pull them apart, tap a part, learn what it does and how it fails.</PageHead>
      <div className="grid gap-2 sm:grid-cols-2">
        {INSIDE.map((d) => (
          <a key={d.id} href={href(`reference/inside/${d.id}`)} className="card card-link card-pad">
            <span className="font-bold text-heading">{d.title}</span>
            <span className="block text-sm text-muted mt-1">{d.summary}</span>
          </a>
        ))}
      </div>
      <p className="text-xs text-muted mt-3">Generic, vendor-neutral drawings. Real products differ in layout; the parts and what they do are what matters.</p>
    </div>
  );
}

export function InsideDetail({ id }: { id: string }) {
  const device = INSIDE_BY_ID.get(id as never);
  const quality = usePrefs((s) => s.quality);
  const can3d = useMemo(() => hasWebGL() && quality !== '2d', [quality]);
  const painted = useAfterPaint();
  const [show3d, setShow3d] = useState(() => prefer3D(quality));
  const [spread, setSpread] = useState(0.6);
  const [sel, setSel] = useState<string | null>(null);
  if (!device) return <div><a href={href('reference/inside')} className="btn btn-ghost btn-sm -ml-2 mb-2"><Icon name="back" size={16} /> What's inside</a><p>Not found.</p></div>;
  const part = device.parts.find((p) => p.id === sel) ?? null;
  return (
    <div>
      <a href={href('reference/inside')} className="btn btn-ghost btn-sm -ml-2 mb-2"><Icon name="back" size={16} /> What's inside</a>
      <PageHead eyebrow="What's inside" title={device.title}>{device.summary}</PageHead>
      <Callout tone="safety" className="mb-3 text-sm">{device.safety}</Callout>
      {can3d && (
        <button type="button" className="btn btn-sm mb-2" aria-pressed={show3d} onClick={() => setShow3d(!show3d)}><Icon name="layers" size={16} /> {show3d ? 'Hide 3D view' : 'Show 3D view'}</button>
      )}
      {can3d && show3d && (
        <div className="mb-3">
          {painted ? (
            <Suspense fallback={<PosterFrame kind="inside" spec={POSTERS[device.id]} label="Loading 3D view" />}>
              <Inside3D device={device} spread={spread} selected={sel} onPick={setSel} />
            </Suspense>
          ) : <PosterFrame kind="inside" spec={POSTERS[device.id]} label="Loading 3D view" />}
          <label className="flex items-center gap-3 mt-2 text-sm">
            <span className="font-semibold text-heading">Explode</span>
            <input type="range" min={0} max={1} step={0.05} value={spread} onChange={(e) => setSpread(Number(e.target.value))} className="flex-1 min-h-11" aria-label="How far apart the parts are" />
          </label>
        </div>
      )}
      {part && (
        <section className="card card-pad mb-3" aria-live="polite" style={{ borderColor: 'var(--blue-glow)' }}>
          <h2 className="text-base font-bold m-0">{part.name}</h2>
          <p className="m-0 mt-1 text-sm">{part.what}</p>
          {part.tip && <p className="m-0 mt-2 text-sm flex gap-1.5"><Icon name="info" size={16} className="flex-none mt-0.5 text-glow" /><span>{part.tip}</span></p>}
        </section>
      )}
      <section className="card card-pad" aria-label="Parts">
        <h2 className="text-base font-bold m-0 mb-2">Parts</h2>
        <ul className="m-0 p-0 list-none space-y-1">
          {device.parts.map((p) => (
            <li key={p.id}>
              <button type="button" className={`btn btn-ghost w-full !justify-start text-left !min-h-11 ${sel === p.id ? 'btn-primary' : ''}`} aria-pressed={sel === p.id} onClick={() => setSel(sel === p.id ? null : p.id)}>
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
