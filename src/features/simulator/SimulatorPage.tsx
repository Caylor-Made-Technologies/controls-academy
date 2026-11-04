import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { SkeletonPage } from '../../components/Skeleton';
import type { Program } from '../../engine/types';
import { motorProgram } from '../../plant/motor';
import { SKIN_LIST, addressMap } from '../../skins';
import { debouncedSaver, load } from '../../state/persist';
import { usePrefs } from '../../state/prefs';
import { queryParam } from '../../lib/router';
import { decodeProgram, encodeProgram, validateProgram } from './edit';
import { Workbench } from './Workbench';

const saveProgram = debouncedSaver<Program>('sim-program', 400);

export default function SimulatorPage() {
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
      const saved = validateProgram(await load('sim-program'));
      if (!alive) return;
      const p = fromLink ?? saved ?? motorProgram();
      if (fromLink) setMsg('Loaded a shared program from the link.');
      current.current = p;
      setInitial(p);
    })();
    return () => { alive = false; };
  }, []);

  const loadProgram = (p: Program, note: string) => {
    current.current = p;
    saveProgram(p);
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
    const url = `${location.origin}${location.pathname}#/sim?p=${encodeProgram(p)}`;
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
      {msg && <p className="callout callout-tip text-sm mb-3" role="status">{msg}</p>}
      {!initial ? (
        <SkeletonPage />
      ) : (
        <>
          <Workbench
            key={key}
            initial={initial}
            onProgramChange={(p) => { current.current = p; saveProgram(p); }}
            extraTools={
              <>
                <button type="button" className="btn btn-sm" onClick={share}><Icon name="share" size={16} /> Share</button>
                <button type="button" className="btn btn-sm" onClick={exportJson}><Icon name="download" size={16} /> Export</button>
                <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} /> Import</button>
                <button type="button" className="btn btn-sm" onClick={() => loadProgram(motorProgram(), 'Restored the original motor program.')}><Icon name="reset" size={16} /> Original</button>
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
              {maps.map(({ s }) => <th key={s.id} className={`text-left p-1.5 whitespace-nowrap ${s.id === skin ? 'text-glow' : 'text-muted'}`}>{s.brand}</th>)}
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
