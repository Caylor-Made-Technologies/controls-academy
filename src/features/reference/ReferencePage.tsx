import { useEffect, useMemo, useState } from 'react';
import { PageHead, RouteHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { Rich } from '../../components/RichText';
import { BRAND_GUIDES, PRACTICE_TOOLS } from '../../content/brands';
import { GLOSSARY } from '../../content/glossary';
import { OP_LIST, type OpCategory } from '../../engine/ops';
import { href, queryParam } from '../../lib/router';
import { SKINS, SKIN_LIST, mnemonic } from '../../skins';
import { usePrefs } from '../../state/prefs';
import { HARDWARE, categoryOf } from '../../content/hardware';
import { HardwareCard, HardwareDetail, HardwareLibrary } from './HardwarePages';
import { HwFront } from '../../components/HwFront';
import { InsideDetail, InsideList } from './InsidePages';

const SECTIONS = [
  { id: 'brands', title: 'Brand field guides', desc: 'Software, hardware, addressing, first-day checklists, tips and gotchas.', icon: 'layers' as const },
  { id: 'instructions', title: 'Instruction reference', desc: 'Every instruction, with its name on each platform.', icon: 'sim' as const },
  { id: 'glossary', title: 'Glossary', desc: `${GLOSSARY.length} terms in plain English.`, icon: 'book' as const },
  { id: 'safety', title: 'Safety rules', desc: 'The hard stops. Read these before you touch a panel.', icon: 'shield' as const },
  { id: 'inside', title: 'What\'s inside', desc: 'Exploded 3D views: overload relay, prox sensor, input card, VFD.', icon: 'search' as const },
  { id: 'practice', title: 'Practice at home', desc: 'Free and trial tools to keep learning.', icon: 'download' as const },
];

export default function ReferencePage({ section, item }: { section?: string; item?: string }) {
  const sec = section?.split('?')[0];
  if (sec === 'brand' && item) return <BrandGuide id={item.split('?')[0]} />;
  if (sec === 'brands') return <Brands />;
  if (sec === 'hardware') return <HardwareLibrary />;
  if (sec === 'hw' && item) return <HardwareDetail id={item.split('?')[0]} />;
  if (sec === 'instructions') return <Instructions />;
  if (sec === 'glossary') return <Glossary />;
  if (sec === 'safety') return <Safety />;
  if (sec === 'practice') return <Practice />;
  if (sec === 'inside') return item ? <InsideDetail id={item.split('?')[0]} /> : <InsideList />;
  return (
    <div>
      <RouteHead seg="reference" />
      <a href={href('reference/hardware')} className="card card-link hw-card mb-3 block overflow-hidden" aria-label={`PLC hardware library: ${HARDWARE.length} 3D models of hardware you see in US plants`}>
        <span className="grid grid-cols-3 gap-1.5 p-2 hw-thumb">
          {['controllogix', 'powerflex-525', 's7-1200'].map((id) => {
            const m = HARDWARE.find((x) => x.id === id);
            return m ? <HwFront key={id} model={m} className="block w-full h-16 sm:h-24 hw-thumb-svg" title="" /> : null;
          })}
        </span>
        <span className="flex items-center gap-3 card-pad">
          <span className="flex-1">
            <span className="block eyebrow">New · 3D</span>
            <span className="block font-bold text-heading text-lg">PLC hardware library</span>
            <span className="block text-sm text-muted">{HARDWARE.length} PLCs, drives, HMIs, safety relays, remote I/O and building controllers from {new Set(HARDWARE.map((m) => m.brand)).size} brands you see in US plants and data centers. Turn them, spread the modules, put a PLC in the simulator.</span>
          </span>
          <Icon name="chevron" className="text-glow flex-none" />
        </span>
      </a>
      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <a key={s.id} href={href(`reference/${s.id}`)} className="card card-link card-pad flex gap-3 items-start">
            <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-none" style={{ background: 'var(--blue-soft)' }}><Icon name={s.icon} className="text-glow" /></span>
            <span>
              <span className="block font-bold text-heading">{s.title}</span>
              <span className="block text-sm text-muted">{s.desc}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function Back({ to = 'reference', label = 'Reference' }: { to?: string; label?: string }) {
  return <a href={href(to)} className="btn btn-ghost btn-sm -ml-2 mb-2"><Icon name="back" size={16} /> {label}</a>;
}

function Brands() {
  return (
    <div>
      <Back />
      <PageHead eyebrow="Reference" title="Brand field guides">Brand names are used only to describe conventions. Not affiliated with any manufacturer.</PageHead>
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
      <ul className="pl-5 list-disc space-y-1.5 m-0 text-[0.95rem]">{items.map((t, i) => <li key={i}><Rich text={t} /></li>)}</ul>
    </section>
  );
}

function BrandGuide({ id }: { id: string }) {
  const b = BRAND_GUIDES.find((x) => x.id === id);
  const setPrefs = usePrefs((s) => s.setPrefs);
  const skin = usePrefs((s) => s.skin);
  if (!b) return <div><Back to="reference/brands" label="Brands" /><p>Guide not found.</p></div>;
  const models = HARDWARE.filter((m) => m.brand === b.id);
  return (
    <div>
      <Back to="reference/brands" label="Brands" />
      <PageHead eyebrow="Brand field guide" title={b.name}>{b.us && <Rich text={b.us} />}</PageHead>
      <div className="flex flex-wrap gap-2 mb-4">
{models.some((m) => ['plc', 'logic'].includes(categoryOf(m))) && (
                  <button type="button" className="btn btn-sm" disabled={skin === b.skin} onClick={() => setPrefs({ skin: b.skin, hwModel: '' })}>
          <Icon name="sim" size={16} /> {skin === b.skin ? `Simulator uses ${SKINS[b.skin].brand}` : `Use ${SKINS[b.skin].brand} skin in the simulator`}
        </button>
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
          <div className="flex flex-wrap gap-1.5">{b.hardware.map((h) => <span key={h} className="chip">{h}</span>)}</div>
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

function Instructions() {
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
          <button key={c} type="button" className="chip cursor-pointer !min-h-[44px] whitespace-nowrap" aria-pressed={cat === c} style={cat === c ? { borderColor: 'var(--blue-glow)', color: 'var(--blue-glow)' } : undefined} onClick={() => setCat(c)}>{c === 'all' ? 'All' : CATS[c]}</button>
        ))}
      </div>
      <p className="text-xs text-muted mt-0 mb-3">* = no exact native equivalent on that platform; the closest tool is shown. "—" = not available.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((o) => (
          <section key={o.op} id={`op-${o.op}`} className="card card-pad" style={focus === o.op ? { borderColor: 'var(--blue-glow)', boxShadow: 'var(--glow)' } : undefined}>
            <div className="flex items-baseline justify-between gap-2"><h2 className="text-base font-bold font-mono m-0">{o.op}</h2><span className="chip !min-h-[22px] !text-[0.65rem]">{o.role}</span></div>
            <p className="m-0 font-semibold text-heading text-sm">{o.title}</p>
            <p className="text-sm text-muted mt-1 mb-2">{o.summary}</p>
            {o.args.length > 0 && <p className="text-xs m-0 mb-2"><span className="text-muted">Operands:</span> <span className="font-mono">{o.args.map((a) => a.name).join(', ')}</span></p>}
            <div className="flex flex-wrap gap-1.5">{shown.map((s) => <span key={s.id} className="chip !text-[0.68rem]" title={s.brand}>{s.brand.split(' ')[0]}: <span className="font-mono">{mnemonic(o.op, s)}</span></span>)}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Glossary() {
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
        {list.length === 0 && <p className="text-muted">No terms match "{q}".</p>}
      </dl>
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

function Safety() {
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

function Practice() {
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
