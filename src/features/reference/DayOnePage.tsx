import { DAY_ONE_KEY } from '../../state/stored';
import { useEffect, useState } from 'react';
import { PageHead } from '../../components/Brand';
import { Button, Callout } from '../../components/ui';
import { DAY_ONE, DAY_ONE_COUNT, dayOneText } from '../../content/dayone';
import { href } from '../../lib/router';
import { load, save } from '../../state/persist';

const KEY = DAY_ONE_KEY;

/** Day one at a new plant: tick items as you go (saved on this device), export or print the list. */
export default function DayOnePage() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => { void load<Record<string, boolean>>(KEY).then((v) => { if (v && typeof v === 'object') setDone(v); }); }, []);
  const toggle = (id: string) => setDone((d) => { const n = { ...d, [id]: !d[id] }; void save(KEY, n); return n; });
  const count = Object.values(done).filter(Boolean).length;
  const exportText = () => {
    const date = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(new Blob([dayOneText(done, date)], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = `day-one-checklist-${date}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="cheats">
      <div className="no-print"><Button href={href('reference')} variant="ghost" size="sm" icon="back" className="-ml-2 mb-2">Reference</Button></div>
      <PageHead eyebrow="Reference" title="Day one at a new plant">What to find out and set up before you touch anything. Tick items as you go; they are saved on this device.</PageHead>
      <p className="text-sm font-semibold text-heading m-0 mb-2" role="status">{count} of {DAY_ONE_COUNT} done</p>
      <div className="no-print flex flex-wrap gap-2 mb-3">
        <Button variant="primary" icon="download" onClick={exportText}>Export as text</Button>
        <Button icon="download" onClick={() => window.print()}>Print</Button>
      </div>
      <div className="space-y-3">
        {DAY_ONE.map((g) => (
          <section key={g.id} className="card card-pad" aria-labelledby={`d1-${g.id}`}>
            <h2 id={`d1-${g.id}`} className="text-base font-bold m-0 mb-2">{g.title}</h2>
            <ul className="list-none p-0 m-0 grid gap-2">
              {g.items.map((i) => (
                <li key={i.id}>
                  <label className="toggle-row !items-start">
                    <input type="checkbox" className="toggle-box mt-0.5" checked={Boolean(done[i.id])} onChange={() => toggle(i.id)} />
                    <span className="text-sm"><span className="text-heading">{i.text}</span>{i.why && <><br /><span className="text-muted">{i.why}</span></>}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Callout tone="safety" className="mt-3">This is training material, not site procedure. Your site's orientation, lockout program and rules always come first.</Callout>
    </div>
  );
}
