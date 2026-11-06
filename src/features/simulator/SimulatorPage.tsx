import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { SkeletonPage } from '../../components/Skeleton';
import type { Program } from '../../engine/types';
import { MACHINES, MACHINE_BY_ID, createMachine } from '../../plant';
import { SKIN_LIST, addressMap } from '../../skins';
import { debouncedSaver, load } from '../../state/persist';
import { usePrefs } from '../../state/prefs';
import { navigate, queryParam, useQueryParam } from '../../lib/router';
import { decodeProgram, encodeProgram, validateProgram } from './edit';
import { Workbench } from './Workbench';

/** Each machine keeps its own saved program. The motor keeps the original key so old saves still load. */
const storeKey = (m: string) => (m === 'motor' ? 'sim-program' : `sim-program:${m}`);
const savers = new Map<string, (p: Program) => void>();
const saveProgram = (m: string, p: Program) => {
  if (!savers.has(m)) savers.set(m, debouncedSaver<Program>(storeKey(m), 400));
  savers.get(m)!(p);
};

export default function SimulatorPage() {
  const m = useQueryParam('m');
  const machine = m && MACHINE_BY_ID.has(m) ? m : 'motor';
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
      if (!alive) return;
      const p = fromLink ?? saved ?? createMachine(machine).program();
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
      <PageHead eyebrow="Simulator" title="PLC workbench">
        A real scan cycle driving a real-feeling machine. Press buttons, watch power flow, edit the logic online, switch brands.
      </PageHead>
      <label className="flex flex-wrap items-center gap-2 mb-3">
        <span className="font-semibold text-heading text-sm">Machine</span>
        <select className="input !w-auto max-w-full" value={machine} onChange={(e) => navigate(e.target.value === 'motor' ? 'sim' : `sim?m=${e.target.value}`)} aria-label="Machine">
          {MACHINES.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
        <span className="text-xs text-muted">{MACHINE_BY_ID.get(machine)!.summary}</span>
      </label>
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
                <button type="button" className="btn btn-sm" onClick={share}><Icon name="share" size={16} /> Share</button>
                <button type="button" className="btn btn-sm" onClick={exportJson}><Icon name="download" size={16} /> Export</button>
                <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} /> Import</button>
                <button type="button" className="btn btn-sm" onClick={() => loadProgram(createMachine(machine).program(), 'Restored the original program for this machine.')}><Icon name="reset" size={16} /> Original</button>
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
      <div className="overflow-x-auto -mx-1" tabIndex={0} role="region" aria-label="Addresses in every brand dialect">
        <table className="text-xs border-collapse min-w-full">
          <thead>
            <tr>
              <th className="text-left p-1.5 sticky left-0 bg-surface">Tag</th>
              {maps.map(({ s }) => (
                <th key={s.id} className={`text-left p-1.5 whitespace-nowrap align-bottom ${s.id === skin ? 'text-glow' : 'text-muted'}`}>
                  <span className="block text-[0.62rem] uppercase tracking-wider">{s.maker.replace(/\s*\(.*\)$/, '')}</span>
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
