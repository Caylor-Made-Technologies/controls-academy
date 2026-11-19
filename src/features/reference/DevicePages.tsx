import { lazy, Suspense, useState } from 'react';
import { PageHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { Rich } from '../../components/RichText';
import { Button, Callout, NotFound } from '../../components/ui';
import { DEVICES, DEVICE_BY_ID, GROUP_TEXT, type DeviceGroup } from '../../content/devices';
import { LESSON_META_BY_ID } from '../../content/catalog';
import { useAfterPaint } from '../../lib/afterPaint';
import { href } from '../../lib/router';
import { usePrefs } from '../../state/prefs';
import { PosterFrame } from '../../three/poster/frames';
import { prefer3D } from '../../three/support';

const FieldDevice3D = lazy(() => import('../../three/FieldDevice3D'));
const GROUPS = Object.keys(GROUP_TEXT) as DeviceGroup[];

/** Field devices, grouped: sensors, operator devices, motor control, safety, process instruments. */
export function DeviceList() {
  return (
    <div>
      <Button href={href('reference')} variant="ghost" size="sm" icon="back" className="-ml-2 mb-2">Reference</Button>
      <PageHead eyebrow="Reference" title="Field devices">The sensors, buttons, starters, safety devices and instruments wired to a PLC: what each one is, how it is wired, how it fails and how to test it safely. Generic devices, no brands.</PageHead>
      {GROUPS.map((g) => (
        <section key={g} className="mb-4" aria-labelledby={`grp-${g}`}>
          <h2 id={`grp-${g}`} className="text-base font-bold m-0 mb-2">{GROUP_TEXT[g]}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEVICES.filter((d) => d.group === g).map((d) => (
              <a key={d.id} href={href(`reference/device/${d.id}`)} className="card card-link card-pad">
                <span className="block font-bold text-heading">{d.name}</span>
                <span className="block text-sm text-muted mt-1"><Rich text={d.what.split('. ')[0] + '.'} /></span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Section({ title, icon, items }: { title: string; icon: Parameters<typeof Icon>[0]['name']; items: string[] }) {
  return (
    <section className="card card-pad" aria-label={title}>
      <h2 className="text-base font-bold m-0 mb-2 flex items-center gap-2"><Icon name={icon} size={18} className="text-glow" />{title}</h2>
      <ul className="pl-5 list-disc space-y-1.5 m-0 text-sm">{items.map((t) => <li key={t}><Rich text={t} /></li>)}</ul>
    </section>
  );
}

/** One device: 3D model (unless 2D only / reduced motion), then what it is, wiring, print symbol, failures, tests. */
export function DeviceDetail({ id }: { id: string }) {
  const d = DEVICE_BY_ID.get(id);
  const quality = usePrefs((s) => s.quality);
  const [want3d, setWant3d] = useState(() => prefer3D(quality));
  const painted = useAfterPaint();
  if (!d) return <NotFound what="Device" backHref={href('reference/devices')} backLabel="All field devices" />;
  const i = DEVICES.indexOf(d);
  const prev = DEVICES[i - 1];
  const next = DEVICES[i + 1];
  const loading = <PosterFrame kind="inside" label={`Loading 3D ${d.name}`} />;
  const lessons = d.lessons.map((l) => LESSON_META_BY_ID.get(l)).filter(Boolean);
  return (
    <div>
      <Button href={href('reference/devices')} variant="ghost" size="sm" icon="back" className="-ml-2 mb-2">Field devices</Button>
      <PageHead eyebrow={GROUP_TEXT[d.group]} title={d.name}><Rich text={d.what} /></PageHead>
      <section className="card overflow-hidden mb-3" aria-label={`${d.name} model`}>
        {want3d ? (painted ? <Suspense fallback={loading}><FieldDevice3D device={d} /></Suspense> : loading) : null}
        <div className="flex flex-wrap gap-2 items-center px-3 py-2 border-t border-line">
          <Button variant="ghost" size="sm" icon="layers" onClick={() => setWant3d(!want3d)} aria-pressed={want3d}>{want3d ? 'Hide 3D model' : 'Show in 3D'}</Button>
          <span className="text-xs text-muted">Generic look-alike, no brand.</span>
        </div>
      </section>
      <div className="grid gap-3 lg:grid-cols-2">
        <Section title="How it's wired" icon="branch" items={d.wiring} />
        <Section title="On the print" icon="book" items={[d.symbol]} />
        <Section title="How it fails" icon="warn" items={d.fails} />
        <Section title="How to test it" icon="meter" items={d.test} />
      </div>
      {d.safety && <Callout tone="safety" className="mt-3"><span className="text-sm">{d.safety}</span></Callout>}
      {lessons.length > 0 && (
        <p className="mt-3 text-sm m-0">Learn more: {lessons.map((l, k) => <span key={l!.id}>{k > 0 && ' · '}<a href={href(`lesson/${l!.id}`)}>{l!.title}</a></span>)}</p>
      )}
      <nav className="grid grid-cols-2 gap-2 mt-3" aria-label="Other devices">
        {prev ? <a className="card card-link card-pad !py-3 text-sm no-chev" href={href(`reference/device/${prev.id}`)}><span className="flex items-center gap-1 text-muted text-xs"><Icon name="left" size={14} /> Previous</span>{prev.name}</a> : <span />}
        {next ? <a className="card card-link card-pad !py-3 text-sm text-right no-chev" href={href(`reference/device/${next.id}`)}><span className="flex items-center justify-end gap-1 text-muted text-xs">Next <Icon name="right" size={14} /></span>{next.name}</a> : <span />}
      </nav>
      <p className="text-xs text-muted mt-3">Training material, not site procedure. Follow the device's manual and your site's lockout and live-work rules.</p>
    </div>
  );
}
