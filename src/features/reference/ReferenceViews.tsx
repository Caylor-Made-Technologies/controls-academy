import { useEffect, useMemo, useState } from 'react';
import { PageHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { Rich } from '../../components/RichText';
import { BRAND_GUIDES, PRACTICE_TOOLS } from '../../content/brands';
import { GLOSSARY } from '../../content/glossary';
import { OP_LIST, type OpCategory } from '../../engine/ops';
import { href, queryParam } from '../../lib/router';
import { SKINS, SKIN_LIST, mnemonic } from '../../skins';
import { usePrefs } from '../../state/prefs';
import { HARDWARE, categoryOf } from '../../content/hardware';
import { HardwareCard } from './HardwarePages';
import { EmptyState, NotFound, Chip, Button } from '../../components/ui';

/** Reference sub-views (brand guides, instructions, glossary, safety, practice), loaded on demand from the Reference index. */
function Back({ to = 'reference', label = 'Reference' }: { to?: string; label?: string }) {
  return <Button href={href(to)} variant="ghost" size="sm" className="-ml-2 mb-2"><Icon name="back" size={16} /> {label}</Button>;
}

export function Brands() {
  return (
    <div>
      <Back />
      <PageHead eyebrow="Reference" title="Brand field guides">Brand names are used only to describe conventions. Not affiliated with any manufacturer.</PageHead>
      <a href={href('reference/compare')} className="card card-link card-pad mb-3 block">
        <span className="block eyebrow">Compare</span>
        <span className="block font-bold text-heading">Brands side by side</span>
        <span className="block text-sm text-muted mt-1">Pick up to three platforms and read timers, forcing, going online, backups and gotchas next to each other.</span>
      </a>
      <div className="grid gap-3 sm:grid-cols-2">
        {BRAND_GUIDES.map((b) => (
          <a key={b.id} href={href(`reference/brand/${b.id}`)} className="card card-link card-pad">
            <span className="block font-bold text-heading">{b.name}</span>
            <span className="block text-sm text-muted mt-1">{b.software.slice(0, 2).map((s) => s.name).join(' · ')}</span>
            {HARDWARE.some((m) => m.brand === b.id) && <span className="block text-xs text-glow mt-1">{HARDWARE.filter((m) => m.brand === b.id).length} 3D models</span>}
          </a>
        ))}
      </div>
    </div>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone?: 'gotcha' | 'tip' }) {
  return (
    <section className={`card card-pad ${tone === 'gotcha' ? '' : ''}`} style={tone === 'gotcha' ? { borderColor: 'var(--warn)' } : undefined}>
      <h2 className="text-base font-bold flex items-center gap-2 mb-2">{tone === 'gotcha' && <Icon name="warn" size={18} className="text-warn" />}{tone === 'tip' && <Icon name="bolt" size={18} className="text-live" />}{title}</h2>
      <ul className="pl-5 list-disc space-y-1.5 m-0 text-base">{items.map((t, i) => <li key={i}><Rich text={t} /></li>)}</ul>
    </section>
  );
}

export function BrandGuide({ id }: { id: string }) {
  const b = BRAND_GUIDES.find((x) => x.id === id);
  const setPrefs = usePrefs((s) => s.setPrefs);
  const skin = usePrefs((s) => s.skin);
  if (!b) return <NotFound what="Guide" backHref={href('reference/brands')} backLabel="Brand guides" />;
  const models = HARDWARE.filter((m) => m.brand === b.id);
  return (
    <div>
      <Back to="reference/brands" label="Brands" />
      <PageHead eyebrow="Brand field guide" title={b.name}>{b.us && <Rich text={b.us} />}</PageHead>
      <div className="flex flex-wrap gap-2 mb-4">
{models.some((m) => ['plc', 'logic'].includes(categoryOf(m))) && (
                  <Button size="sm" disabled={skin === b.skin} onClick={() => setPrefs({ skin: b.skin, hwModel: '' })}>
          <Icon name="sim" size={16} /> {skin === b.skin ? `Simulator uses ${SKINS[b.skin].brand}` : `Use ${SKINS[b.skin].brand} skin in the simulator`}
        </Button>
        )}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <section className="card card-pad">
          <h2 className="text-base font-bold mb-2">Software</h2>
          <dl className="m-0 space-y-1.5">{b.software.map((s) => <div key={s.name}><dt className="font-semibold text-heading text-sm">{s.name}</dt><dd className="m-0 text-sm text-muted">{s.for}</dd></div>)}</dl>
        </section>
        <section className="card card-pad">
          <h2 className="text-base font-bold mb-2">Addressing cheat sheet</h2>
          <table className="w-full text-sm border-collapse"><tbody>{b.addressing.map(([k, v]) => <tr key={k} className="border-t border-line first:border-0"><td className="py-1.5 pr-3 text-muted align-top">{k}</td><td className="py-1.5 font-mono text-heading"><Rich text={v} /></td></tr>)}</tbody></table>
        </section>
        <List title="First day on site" items={b.firstDay} />
        <List title="Tips & tricks" items={b.tips} tone="tip" />
        <List title="Gotchas" items={b.gotchas} tone="gotcha" />
        <section className="card card-pad">
          <h2 className="text-base font-bold mb-2">Hardware families</h2>
          <div className="flex flex-wrap gap-1.5">{b.hardware.map((h) => <Chip key={h}>{h}</Chip>)}</div>
          <p className="text-sm text-muted mt-3 mb-0"><Rich text={SKINS[b.skin].notes[0]} /></p>
        </section>
        {b.hmi && <List title="HMIs and SCADA you'll see with it" items={b.hmi} />}
        {b.drives && <List title="Drives you'll see with it" items={b.drives} />}
        {b.networks && <List title="Networks" items={b.networks} />}
      </div>
      {models.length > 0 && (
        <section className="mt-4" aria-labelledby="brand-models">
          <h2 id="brand-models" className="text-base font-bold mb-2">Common models in 3D</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{models.map((m) => <HardwareCard key={m.id} m={m} />)}</div>
        </section>
      )}
    </div>
  );
}

const CATS: Record<OpCategory, string> = { bit: 'Bit', timer: 'Timers', counter: 'Counters', compare: 'Compare', math: 'Math', move: 'Move', program: 'Program control', process: 'Process' };

export function Instructions() {
  const skin = usePrefs((s) => s.skin);
  const focus = queryParam('op');
  const [cat, setCat] = useState<OpCategory | 'all'>('all');
  useEffect(() => {
    if (focus) document.getElementById(`op-${focus}`)?.scrollIntoView({ block: 'center' });
  }, [focus]);
  const list = OP_LIST.filter((o) => cat === 'all' || o.category === cat);
  const shown = [SKINS[skin], ...SKIN_LIST.filter((s) => s.id !== skin && ['siemens-tia', 'mitsubishi', 'ab-logix'].includes(s.id))].slice(0, 3);
  return (
    <div>
      <Back />
      <PageHead eyebrow="Reference" title="Instruction reference">Behavior is the generic Logix/IEC baseline the simulator runs. Names are shown for your skin plus two others.</PageHead>
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2" role="group" aria-label="Category">
        {(['all', ...Object.keys(CATS)] as (OpCategory | 'all')[]).map((c) => (
          <Chip key={c} onClick={() => setCat(c)} pressed={cat === c} className="whitespace-nowrap">{c === 'all' ? 'All' : CATS[c]}</Chip>
        ))}
      </div>
      <p className="text-xs text-muted mt-0 mb-3">* = no exact native equivalent on that platform; the closest tool is shown. "—" = not available.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((o) => (
          <section key={o.op} id={`op-${o.op}`} className="card card-pad" style={focus === o.op ? { borderColor: 'var(--blue-glow)', boxShadow: 'var(--glow)' } : undefined}>
            <div className="flex items-baseline justify-between gap-2"><h2 className="text-base font-bold font-mono m-0">{o.op}</h2><Chip className="!min-h-5.5 !text-2xs">{o.role}</Chip></div>
            <p className="m-0 font-semibold text-heading text-sm">{o.title}</p>
            <p className="text-sm text-muted mt-1 mb-2">{o.summary}</p>
            {o.args.length > 0 && <p className="text-xs m-0 mb-2"><span className="text-muted">Operands:</span> <span className="font-mono">{o.args.map((a) => a.name).join(', ')}</span></p>}
            <div className="flex flex-wrap gap-1.5">{shown.map((s) => <span key={s.id} className="chip !text-2xs" title={s.brand}>{s.brand.split(' ')[0]}: <span className="font-mono">{mnemonic(o.op, s)}</span></span>)}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function Glossary() {
  const focus = queryParam('t');
  const [q, setQ] = useState('');
  useEffect(() => {
    if (focus) document.getElementById(`g-${focus}`)?.scrollIntoView({ block: 'center' });
  }, [focus]);
  const list = useMemo(() => {
    const qq = q.toLowerCase();
    return [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term)).filter((g) => !qq || `${g.term} ${g.def} ${(g.aka ?? []).join(' ')}`.toLowerCase().includes(qq));
  }, [q]);
  return (
    <div>
      <Back />
      <PageHead eyebrow="Reference" title="Glossary" />
      <input className="input mb-3" placeholder="Filter terms…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter glossary" />
      <dl className="m-0 space-y-2">
        {list.map((g) => (
          <div key={g.id} id={`g-${g.id}`} className="card card-pad" style={focus === g.id ? { borderColor: 'var(--blue-glow)', boxShadow: 'var(--glow)' } : undefined}>
            <dt className="font-bold text-heading">{g.term}</dt>
            <dd className="m-0 mt-1">{g.def}{g.aka && <span className="block text-sm text-muted mt-1">Also: {g.aka.join(', ')}</span>}</dd>
          </div>
        ))}
      </dl>
      {list.length === 0 && <EmptyState title="No terms match">Nothing in the glossary matches "{q}". Try a shorter word, or search everything with the magnifier at the top.</EmptyState>}
    </div>
  );
}

const RULES = [
  ['LOTOTO before your hands go in.', 'Lock out, tag out, try out. Every energy source: electrical, air, hydraulic, gravity, springs.'],
  ['Live-dead-live, every time.', 'Prove your meter on a known source, test, prove it again.'],
  ['Right meter, right rating.', 'Check the CAT rating and voltage on the meter and the leads. Inspect leads before use.'],
  ['Respect the arc-flash label.', 'Don\'t cross the boundary without the qualification and PPE the label calls for.'],
  ['Never bypass a safety circuit.', 'No jumpers on E-stops, guards or light curtains. Not in wiring, not in logic, not "just for now".'],
  ['Never force with people in the machine.', 'Know what moves. Get authorization. Document and remove every force.'],
  ['Upload before you change anything.', 'Save a dated backup of what is actually running.'],
  ['Drives store energy.', 'Wait the manual\'s discharge time, then verify the DC bus with a meter.'],
  ['Find the cause before you reset.', 'An overload trip or a blown fuse is a symptom.'],
];

export function Safety() {
  return (
    <div>
      <Back />
      <PageHead eyebrow="Reference" title="Safety rules">Training material, not your site's procedure. Your site's written procedures and qualified trainers come first.</PageHead>
      <ol className="list-none p-0 m-0 space-y-2">
        {RULES.map(([t, d], i) => (
          <li key={t} className="card card-pad flex gap-3" style={{ borderColor: 'var(--alarm-soft)' }}>
            <span className="w-8 h-8 flex-none rounded-full flex items-center justify-center font-bold text-alarm" style={{ background: 'var(--alarm-soft)' }}>{i + 1}</span>
            <span><strong className="text-heading block">{t}</strong><span className="text-sm">{d}</span></span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Practice() {
  return (
    <div>
      <Back />
      <PageHead eyebrow="Reference" title="Practice at home">Licensing and availability change. Check each vendor's or project's site before you download — we don't state prices or license terms.</PageHead>
      <div className="grid gap-2 sm:grid-cols-2">
        {PRACTICE_TOOLS.map((t) => (
          <section key={t.name} className="card card-pad">
            <h2 className="text-base font-bold m-0">{t.name}</h2>
            <p className="text-sm mt-1 mb-1">{t.what}</p>
            <p className="text-xs text-muted m-0">{t.note}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
