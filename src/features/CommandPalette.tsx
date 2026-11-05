import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { LESSONS } from '../content';
import { BRAND_GUIDES } from '../content/brands';
import { GLOSSARY } from '../content/glossary';
import { OP_LIST } from '../engine/ops';
import { navigate } from '../lib/router';

interface Item {
  title: string;
  sub: string;
  path: string;
  icon: IconName;
  hay: string;
}

function buildIndex(): Item[] {
  return [
    ...LESSONS.map((l) => ({ title: l.title, sub: `Lesson · ${l.summary}`, path: `lesson/${l.id}`, icon: 'learn' as const, hay: `${l.title} ${l.summary}` })),
    ...GLOSSARY.map((g) => ({ title: g.term, sub: `Glossary · ${g.def}`, path: `reference/glossary?t=${g.id}`, icon: 'book' as const, hay: `${g.term} ${(g.aka ?? []).join(' ')} ${g.def}` })),
    ...OP_LIST.map((o) => ({ title: `${o.op} — ${o.title}`, sub: `Instruction · ${o.summary}`, path: `reference/instructions?op=${o.op}`, icon: 'sim' as const, hay: `${o.op} ${o.title} ${o.summary}` })),
    ...BRAND_GUIDES.map((b) => ({ title: b.name, sub: 'Brand field guide', path: `reference/brand/${b.id}`, icon: 'layers' as const, hay: `${b.name} ${b.software.map((s) => s.name).join(' ')} ${b.tips.join(' ')} ${b.gotchas.join(' ')}` })),
    { title: 'Simulator', sub: 'PLC workbench with the motor station', path: 'sim', icon: 'sim', hay: 'simulator workbench ladder editor run step' },
    { title: 'Fault Hunt', sub: 'Troubleshooting practice', path: 'troubleshoot', icon: 'wrench', hay: 'fault hunt troubleshoot meter practice' },
    { title: 'Settings & backup', sub: 'Theme, sound, brand, export progress', path: 'profile', icon: 'gear', hay: 'settings profile theme dark light sound export import backup certificate badges' },
  ];
}

function score(item: Item, q: string): number {
  const t = item.title.toLowerCase();
  const h = item.hay.toLowerCase();
  let s = 0;
  for (const w of q.split(/\s+/).filter(Boolean)) {
    if (t.startsWith(w)) s += 6;
    else if (t.includes(w)) s += 4;
    else if (h.includes(w)) s += 1;
    else return 0;
  }
  return s;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const index = useMemo(buildIndex, []);
  const listRef = useRef<HTMLUListElement>(null);
  const results = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return index.filter((i) => i.icon === 'learn').slice(0, 8);
    return index.map((i) => ({ i, s: score(i, qq) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 20).map((x) => x.i);
  }, [q, index]);
  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => { if (!open) setQ(''); }, [open]);
  const go = (it: Item) => { onClose(); navigate(it.path); };

  return (
    <Sheet open={open} onClose={onClose} title="Search" wide>
      <div className="relative">
        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          className="input !pl-10"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Lessons, terms, instructions, brands…"
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-label="Search"
          aria-controls="palette-results"
          aria-activedescendant={results[active] ? `pal-${active}` : undefined}
          data-autofocus
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === 'Enter' && results[active]) go(results[active]);
          }}
        />
      </div>
      <ul id="palette-results" ref={listRef} role="listbox" className="list-none p-0 m-0 mt-3 space-y-1 max-h-[55dvh] overflow-y-auto">
        {results.map((r, i) => (
          <li key={r.path + r.title} id={`pal-${i}`} role="option" aria-selected={i === active}>
            <button type="button" className="w-full flex gap-3 items-start text-left rounded-xl p-2.5 cursor-pointer min-h-[48px]" style={{ background: i === active ? 'var(--blue-soft)' : undefined }} onClick={() => go(r)} onMouseEnter={() => setActive(i)}>
              <Icon name={r.icon} size={18} className="flex-none mt-0.5 text-glow" />
              <span className="min-w-0">
                <span className="block font-semibold text-heading text-sm">{r.title}</span>
                <span className="block text-xs text-muted truncate">{r.sub}</span>
              </span>
            </button>
          </li>
        ))}
        {results.length === 0 && <li className="text-sm text-muted p-3">No matches. Try "timer", "sinking" or "Siemens".</li>}
      </ul>
    </Sheet>
  );
}
