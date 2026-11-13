import { useEffect, useMemo, useRef, useState } from 'react';
import { RouteHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { LESSONS, TRACKS } from '../../content';
import { buildGraph, skillState, type SkillState } from '../../content/graph';
import { href } from '../../lib/router';
import { useProgress } from '../../state/progress';

const COL_W = 168;
const NODE_W = 140;
const NODE_H = 46;
const ROW_H = 64;
const PAD = 24;
const HEAD = 44;

const STATE_TEXT: Record<SkillState, string> = { locked: 'Locked', unlocked: 'Ready', done: 'Done', mastered: 'Mastered' };

function readView(): 'map' | 'list' {
  try { return localStorage.getItem('ca:skillmap-view') === 'list' ? 'list' : 'map'; } catch { return 'map'; }
}

/** Two-line label that fits a node. */
function wrap(title: string, max = 19): [string, string] {
  if (title.length <= max) return [title, ''];
  const cut = title.lastIndexOf(' ', max);
  const a = title.slice(0, cut > 0 ? cut : max);
  const rest = title.slice(a.length).trim();
  return [a, rest.length > max ? `${rest.slice(0, max - 1)}…` : rest];
}

export default function SkillMapPage() {
  const records = useProgress((s) => s.lessons);
  const graph = useMemo(() => buildGraph(LESSONS), []);
  const [view, setView] = useState<'map' | 'list'>(readView);
  const [zoom, setZoom] = useState(0.8);
  const [focus, setFocus] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const states = useMemo(() => new Map(LESSONS.map((l) => [l.id, skillState(l.id, graph, records)])), [graph, records]);
  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    TRACKS.forEach((t, c) => t.lessons.forEach((id, r) => m.set(id, { x: PAD + c * COL_W, y: HEAD + PAD + r * ROW_H })));
    return m;
  }, []);
  const width = PAD * 2 + TRACKS.length * COL_W - (COL_W - NODE_W);
  const height = HEAD + PAD * 2 + Math.max(...TRACKS.map((t) => t.lessons.length)) * ROW_H;
  const counts = useMemo(() => {
    const c: Record<SkillState, number> = { locked: 0, unlocked: 0, done: 0, mastered: 0 };
    states.forEach((s) => c[s]++);
    return c;
  }, [states]);
  const related = useMemo(() => {
    if (!focus) return null;
    return new Set([focus, ...(graph.prereqs.get(focus) ?? []), ...(graph.unlocks.get(focus) ?? [])]);
  }, [focus, graph]);

  const setV = (v: 'map' | 'list') => { setView(v); try { localStorage.setItem('ca:skillmap-view', v); } catch { /* storage off */ } };
  const clampZoom = (z: number) => Math.min(1.6, Math.max(0.35, Math.round(z * 100) / 100));

  // Pinch (two pointers) and ctrl/⌘ + wheel zoom on the map. Native scrolling pans.
  useEffect(() => {
    const el = box.current;
    if (!el || view !== 'map') return;
    const pts = new Map<number, { x: number; y: number }>();
    let start = 0;
    let startZoom = 1;
    const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    const down = (e: PointerEvent) => { if (e.pointerType !== 'touch') return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) { start = dist(); setZoom((z) => { startZoom = z; return z; }); } };
    const move = (e: PointerEvent) => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2 && start > 0) setZoom(clampZoom((startZoom * dist()) / start)); };
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2) start = 0; };
    const wheel = (e: WheelEvent) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); setZoom((z) => clampZoom(z * (e.deltaY < 0 ? 1.1 : 0.9))); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [view]);

  const edges: { from: string; to: string; d: string }[] = [];
  for (const l of LESSONS) {
    const b = pos.get(l.id)!;
    for (const p of l.prereqs) {
      const a = pos.get(p)!;
      const sameCol = a.x === b.x;
      const d = sameCol
        ? `M${a.x + NODE_W - 10} ${a.y + NODE_H} C${a.x + NODE_W + 14} ${a.y + NODE_H + 18} ${b.x + NODE_W + 14} ${b.y - 18} ${b.x + NODE_W - 10} ${b.y}`
        : `M${a.x + NODE_W} ${a.y + NODE_H / 2} C${a.x + NODE_W + 40} ${a.y + NODE_H / 2} ${b.x - 40} ${b.y + NODE_H / 2} ${b.x} ${b.y + NODE_H / 2}`;
      edges.push({ from: p, to: l.id, d });
    }
  }

  return (
    <div>
      <RouteHead seg="skills" />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="seg" role="group" aria-label="View">
          <button type="button" aria-pressed={view === 'map'} onClick={() => setV('map')}>Map</button>
          <button type="button" aria-pressed={view === 'list'} onClick={() => setV('list')}>List</button>
        </div>
        {view === 'map' && (
          <div className="flex gap-1" role="group" aria-label="Zoom">
            <button type="button" className="btn icon-btn" aria-label="Zoom out" onClick={() => setZoom((z) => clampZoom(z - 0.15))}><span aria-hidden="true" className="text-xl font-bold leading-none">−</span></button>
            <button type="button" className="btn icon-btn" aria-label="Zoom in" onClick={() => setZoom((z) => clampZoom(z + 0.15))}><Icon name="plus" size={18} /></button>
          </div>
        )}
        <p className="m-0 text-sm text-muted ml-auto" aria-live="polite">{counts.mastered} mastered · {counts.done} done · {counts.unlocked} ready · {counts.locked} locked</p>
      </div>

      <ul className="flex flex-wrap gap-2 list-none p-0 m-0 mb-3 text-xs" aria-label="Legend">
        {(['locked', 'unlocked', 'done', 'mastered'] as const).map((s) => <li key={s} className={`chip skill-chip skill-${s}`}>{STATE_TEXT[s]}</li>)}
      </ul>

      {view === 'map' ? (
        <>
          <p className="sr-only">The map is a visual overview. Switch to List view for the same information as a list.</p>
          <div ref={box} className="skill-map card" aria-hidden="true" style={{ touchAction: 'pan-x pan-y' }}>
            <svg width={width * zoom} height={height * zoom} viewBox={`0 0 ${width} ${height}`} className="block" onPointerLeave={() => setFocus(null)}>
              {TRACKS.map((t, c) => (
                <text key={t.id} x={PAD + c * COL_W} y={PAD + 10} fontSize="12" fontWeight="800" fill="var(--text-muted)">
                  {`T${t.n} · ${t.title.length > 20 ? `${t.title.slice(0, 19)}…` : t.title}`}
                </text>
              ))}
              {edges.map((e) => {
                const on = related && related.has(e.from) && related.has(e.to) && (e.from === focus || e.to === focus);
                return <path key={`${e.from}>${e.to}`} d={e.d} fill="none" stroke={on ? 'var(--blue-glow)' : 'var(--border-strong)'} strokeOpacity={related && !on ? 0.15 : on ? 1 : 0.55} strokeWidth={on ? 2.5 : 1.4} />;
              })}
              {LESSONS.map((l) => {
                const p = pos.get(l.id)!;
                const s = states.get(l.id)!;
                const [a, b] = wrap(l.title);
                const dim = related && !related.has(l.id);
                return (
                  <a key={l.id} href={href(`lesson/${l.id}`)} tabIndex={-1} onPointerEnter={() => setFocus(l.id)} style={{ opacity: dim ? 0.3 : 1 }}>
                    <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx="10" className={`skill-node skill-${s}`} />
                    {s === 'mastered' && <text x={p.x + NODE_W - 16} y={p.y + 17} fontSize="13" fill="var(--warn)">★</text>}
                    {s === 'done' && <text x={p.x + NODE_W - 16} y={p.y + 17} fontSize="13" fill="var(--live)">✓</text>}
                    <text x={p.x + 10} y={p.y + (b ? 19 : 28)} fontSize="11.5" fontWeight="700" className="skill-label">{a}</text>
                    {b && <text x={p.x + 10} y={p.y + 34} fontSize="11.5" fontWeight="700" className="skill-label">{b}</text>}
                  </a>
                );
              })}
            </svg>
          </div>
          <p className="text-xs text-muted mt-2">Scroll to pan · pinch or Ctrl + scroll to zoom · tap a lesson to open it.</p>
        </>
      ) : (
        <div className="space-y-4">
          {TRACKS.map((t) => (
            <section key={t.id} className="card card-pad" aria-labelledby={`sm-${t.id}`}>
              <h2 id={`sm-${t.id}`} className="text-base font-bold m-0">Track {t.n} · {t.title}</h2>
              <ul className="list-none p-0 m-0 mt-2 space-y-1.5">
                {t.lessons.map((id) => {
                  const l = LESSONS.find((x) => x.id === id)!;
                  const s = states.get(id)!;
                  const pre = l.prereqs.map((p) => LESSONS.find((x) => x.id === p)!.title);
                  return (
                    <li key={id}>
                      <a href={href(`lesson/${id}`)} className="flex items-start gap-3 rounded-xl px-3 py-2.5 bg-raised no-underline text-body hover:text-heading min-h-12">
                        <span className={`chip skill-chip skill-${s} flex-none`}>{STATE_TEXT[s]}</span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-heading">{l.title}</span>
                          <span className="block text-xs text-muted">{pre.length ? `Builds on: ${pre.join(', ')}` : 'Starts from zero'}</span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
