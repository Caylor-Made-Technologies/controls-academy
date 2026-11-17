import { useEffect, useMemo, useRef, useState } from 'react';
import { RouteHead } from '../../components/Brand';
import { href } from '../../lib/router';
import { Icon, type IconName } from '../../components/Icon';
import { buzz } from '../../lib/sound';
import { SkeletonPage } from '../../components/Skeleton';
import type { Program } from '../../engine/types';
import { MACHINE_INFO, MACHINE_INFO_BY_ID, type MachineInfo } from '../../plant/catalog';
import { SKIN_LIST, addressMap } from '../../skins';
import { debouncedSaver, load } from '../../state/persist';
import { usePrefs } from '../../state/prefs';
import { queryParam, useQueryParam } from '../../lib/router';
import { decodeProgram, encodeProgram, validateProgram } from './edit';
import { Workbench } from './LazyWorkbench';
import { Button } from '../../components/ui';

/** Each machine keeps its own saved program. The motor keeps the original key so old saves still load. */
const storeKey = (m: string) => (m === 'motor' ? 'sim-program' : `sim-program:${m}`);
const savers = new Map<string, (p: Program) => void>();
const saveProgram = (m: string, p: Program) => {
  if (!savers.has(m)) savers.set(m, debouncedSaver<Program>(storeKey(m), 400));
  savers.get(m)!(p);
};

export default function SimulatorPage() {
  const m = useQueryParam('m');
  const machine = m && MACHINE_INFO_BY_ID.has(m) ? m : 'motor';
  return <MachineSim key={machine} machine={machine} />;
}

function MachineSim({ machine }: { machine: string }) {
  const [initial, setInitial] = useState<Program | null>(null);
  const [key, setKey] = useState(0);
  const [msg, setMsg] = useState('');
  const current = useRef<Program | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const shared = queryParam('p');
      const fromLink = shared ? decodeProgram(shared) : null;
      const saved = validateProgram(await load(storeKey(machine)));
      // The machine code (physics, faults, starter program) is its own chunk; the page heading shows first.
      const p = fromLink ?? saved ?? (await import('../../plant')).createMachine(machine).program();
      if (!alive) return;
      if (fromLink) setMsg('Loaded a shared program from the link.');
      current.current = p;
      setInitial(p);
    })();
    return () => { alive = false; };
  }, [machine]);

  const loadProgram = (p: Program, note: string) => {
    current.current = p;
    saveProgram(machine, p);
    setInitial(p);
    setKey((k) => k + 1);
    setMsg(note);
  };

  const exportJson = () => {
    const p = current.current;
    if (!p) return;
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${p.name.replace(/[^\w-]+/g, '_') || 'program'}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const share = async () => {
    const p = current.current;
    if (!p) return;
    const url = `${location.origin}${location.pathname}#/sim?${machine === 'motor' ? '' : `m=${machine}&`}p=${encodeProgram(p)}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Controls Academy program', url });
      else {
        await navigator.clipboard.writeText(url);
        setMsg('Link copied. Anyone who opens it gets a copy of this program — nothing is uploaded.');
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div>
      <RouteHead seg="sim" />
      <Button href={href('wiring')} size="sm" className="mb-3"><Icon name="branch" size={16} /> Wiring trainer</Button>
      <MachinePicker current={machine} />
      {msg && <p className="callout callout-tip text-sm mb-3" role="status">{msg}</p>}
      {!initial ? (
        <SkeletonPage />
      ) : (
        <>
          <Workbench
            key={key}
            initial={initial}
            machine={machine}
            start3D
            onProgramChange={(p) => { current.current = p; saveProgram(machine, p); }}
            extraTools={
              <>
                <Button size="sm" onClick={share}><Icon name="share" size={16} /> Share</Button>
                <Button size="sm" onClick={exportJson}><Icon name="download" size={16} /> Export</Button>
                <Button size="sm" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} /> Import</Button>
                <Button size="sm" onClick={async () => loadProgram((await import('../../plant')).createMachine(machine).program(), 'Restored the original program for this machine.')}><Icon name="reset" size={16} /> Original</Button>
              </>
            }
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f || f.size > 512 * 1024) { setMsg('That file is too big for a program.'); return; }
              try {
                const p = validateProgram(JSON.parse(await f.text()));
                if (p) loadProgram(p, `Imported "${p.name}".`);
                else setMsg('That file isn\'t a Controls Academy program.');
              } catch {
                setMsg('Couldn\'t read that file.');
              }
            }}
          />
          <Dialects program={current.current ?? initial} />
        </>
      )}
    </div>
  );
}

/** "Same logic in ten dialects": every tag's address in every skin. */
function Dialects({ program }: { program: Program }) {
  const skin = usePrefs((s) => s.skin);
  const maps = useMemo(() => SKIN_LIST.map((s) => ({ s, m: addressMap(program, s) })), [program]);
  const io = program.tags.filter((t) => t.io || t.type === 'TIMER').slice(0, 10);
  return (
    <section className="card card-pad mt-3">
      <p className="eyebrow m-0">Brand dialects</p>
      <h2 className="text-lg font-bold mb-1">Same logic, ten dialects</h2>
      <p className="text-sm text-muted mt-0">Your program's tags as each platform would address them. Switch the skin above and the ladder relabels itself.</p>
      <div className="overflow-x-auto -mx-1 scroll-cue" tabIndex={0} role="region" aria-label="Addresses in every brand dialect">
        <table className="text-xs border-collapse min-w-full">
          <thead>
            <tr>
              <th className="text-left p-1.5 sticky left-0 bg-surface">Tag</th>
              {maps.map(({ s }) => (
                <th key={s.id} className={`text-left p-1.5 whitespace-nowrap align-bottom ${s.id === skin ? 'text-glow' : 'text-muted'}`}>
                  <span className="block text-2xs uppercase tracking-wider">{s.maker.replace(/\s*\(.*\)$/, '')}</span>
                  <span className="block">{s.family.split(' / ')[0]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {io.map((t) => (
              <tr key={t.name} className="border-t border-line">
                <td className="p-1.5 font-mono text-heading sticky left-0 bg-surface whitespace-nowrap">{t.name}</td>
                {maps.map(({ s, m }) => <td key={s.id} className="p-1.5 font-mono whitespace-nowrap">{m.get(t.name)?.address}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const SITE: Record<MachineInfo['site'], { icon: IconName; text: string }> = {
  general: { icon: 'power', text: 'Any plant' },
  mill: { icon: 'wrench', text: 'Mill' },
  water: { icon: 'meter', text: 'Water' },
  datacenter: { icon: 'bolt', text: 'Data center' },
};

/**
 * Machine picker: a row of cards (it was a plain select). The chosen card's highlight glides to the new card
 * while the workbench below cross-fades (View Transitions; instant with reduced motion).
 */
function MachinePicker({ current }: { current: string }) {
  const info = MACHINE_INFO_BY_ID.get(current)!;
  const list = useRef<HTMLUListElement>(null);
  // Keep the chosen card in view on a phone (the row scrolls sideways).
  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const row = list.current;
    if (el && row) row.scrollLeft = Math.max(0, el.offsetLeft - row.clientWidth / 2 + el.clientWidth / 2);
  }, [current]);
  return (
    <nav aria-label="Machine" className="mb-3">
      <ul ref={list} className="machine-pick chip-scroll list-none p-0 m-0">
        {MACHINE_INFO.map((m) => {
          const on = m.id === current;
          return (
            <li key={m.id}>
              <a
                className="machine-card"
                href={href(m.id === 'motor' ? 'sim' : `sim?m=${m.id}`)}
                aria-current={on ? 'page' : undefined}
                onClick={() => { if (!on) buzz(8); }}
              >
                {on && <span className="machine-card-glow" style={{ viewTransitionName: 'machine-pick' }} aria-hidden="true" />}
                <span className="machine-card-site"><Icon name={SITE[m.site].icon} size={14} /> {SITE[m.site].text}</span>
                <span className="machine-card-title">{m.title}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted m-0 mt-1.5">{info.summary}</p>
    </nav>
  );
}
