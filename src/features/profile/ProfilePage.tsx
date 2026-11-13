import { useRef, useState, type CSSProperties } from 'react';
import { RouteHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { ProgressRing } from '../../components/ProgressRing';
import { Sheet } from '../../components/Sheet';
import { TRACKS } from '../../content/catalog';
import { PRACTICE_RECORD } from '../../lib/practice';
import { href } from '../../lib/router';
import { sfx } from '../../lib/sound';
import { skinsByMaker, type SkinId } from '../../skins';
import { usePrefs, type Goal, type Quality, type ThemePref } from '../../state/prefs';
import { badges, level, streak, today, trackProgress, useProgress } from '../../state/progress';
import { saveCertificate } from './certificate';
import { Stat } from '../../components/ui';

export default function ProfilePage() {
  const p = useProgress();
  const prefs = usePrefs();
  const readiness = p.exams.readiness;
  const readinessOk = Boolean(readiness && readiness.best / readiness.total >= 0.8);
  const lv = level(p.xp);
  const bs = badges(p);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ ...p.data(), exportedAt: new Date().toISOString(), app: 'controls-academy' }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `controls-academy-progress-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg('Progress saved to a file on this device.');
  };

  return (
    <div>
      <RouteHead seg="profile" title={prefs.name || undefined} />

      <section className="card card-pad flex flex-wrap items-center gap-4 mb-4">
        <ProgressRing pct={lv.pct} size={84} stroke={8} label="Level progress">
          <span className="text-center leading-none"><span className="block text-2xs text-muted">LEVEL</span><span className="text-lg">{lv.index + 1}</span></span>
        </ProgressRing>
        <div className="flex-1 min-w-[10rem]">
          <p className="m-0 font-head font-extrabold text-heading text-lg">{lv.name}</p>
          <p className="m-0 text-sm text-muted tabular-nums">{p.xp} XP{lv.next ? ` · ${lv.next - p.xp} to next` : ' · max level'}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center w-full sm:w-auto">
          <Stat label="Day streak" value={streak(p.days)} />
          <Stat label="Lessons" value={Object.keys(p.lessons).length} />
          <Stat label="Faults found" value={Object.keys(p.hunts).length} />
        </div>
      </section>

      <h2 className="text-lg font-bold mb-2">Badges</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
        {bs.map((b, i) => (
          <div key={b.id} data-enter="pop" className="card p-3" style={{ ...({ '--i': Math.min(i, 12) } as CSSProperties), ...(b.earned ? { borderColor: 'var(--live)' } : { opacity: 0.6 }) }}>
            <span className="w-9 h-9 rounded-full flex items-center justify-center mb-1.5" style={{ background: b.earned ? 'var(--grad-live)' : 'var(--surface-raised)' }}>
              <Icon name={b.earned ? 'trophy' : 'shield'} size={18} className={b.earned ? 'text-on-live' : 'text-muted'} />
            </span>
            <p className="m-0 font-bold text-heading text-sm">{b.title}</p>
            <p className="m-0 text-xs text-muted">{b.desc}</p>
            <span className="sr-only">{b.earned ? 'Earned' : 'Not earned yet'}</span>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold mb-2">Certificates</h2>
      <div className="grid gap-2 sm:grid-cols-2 mb-6">
        {TRACKS.filter((t) => t.lessons.length).map((t) => {
          const tp = trackProgress(p, t.id);
          return (
            <div key={t.id} className="card p-3 flex items-center gap-3 min-w-0">
              <ProgressRing pct={tp.pct} size={44} stroke={5} live={tp.complete} label={`Track ${t.n}`}>{t.n}</ProgressRing>
              <div className="flex-1 min-w-0"><p className="m-0 font-semibold text-heading text-sm truncate">{t.title}</p><p className="m-0 text-xs text-muted">{tp.done}/{tp.total} lessons</p></div>
              <button type="button" className="btn btn-sm" disabled={!tp.complete} onClick={() => saveCertificate({ name: prefs.name, track: t.title, trackN: t.n, date: today(), lessons: tp.total })} aria-label={`Save certificate for track ${t.n}`}>
                <Icon name="download" size={16} /> {tp.complete ? 'Save' : 'Locked'}
              </button>
            </div>
          );
        })}
      </div>
      <div className="card p-3 flex items-center gap-3 min-w-0 mb-2">
        <ProgressRing pct={readiness ? readiness.best / readiness.total : 0} size={44} stroke={5} live={readinessOk} label="Readiness">R</ProgressRing>
        <div className="flex-1 min-w-0"><p className="m-0 font-semibold text-heading text-sm">Controls Technician Readiness</p><p className="m-0 text-xs text-muted">{readiness ? `Best ${Math.round((readiness.best / readiness.total) * 100)} %` : 'Not taken yet'} · 80 % unlocks it</p></div>
        {readinessOk
          ? <button type="button" className="btn btn-sm" onClick={() => saveCertificate({ kind: 'readiness', name: prefs.name, date: today(), pct: Math.round((readiness!.best / readiness!.total) * 100) })} aria-label="Save readiness practice record"><Icon name="download" size={16} /> Save</button>
          : <a className="btn btn-sm" href={href('exam/readiness')}>Take it</a>}
      </div>
      <p className="text-sm font-semibold mb-6 flex items-start gap-1.5"><Icon name="shield" size={16} className="flex-none mt-0.5 text-warn" /> <span>{PRACTICE_RECORD} Certificates and readiness results record self-paced training.</span></p>

      <h2 className="text-lg font-bold mb-2">Settings</h2>
      <section className="card card-pad space-y-5 mb-6">
        <Row label="Theme" hint="Dark is easier on the eyes in a dim control room.">
          <div className="seg" role="group" aria-label="Theme">
            {(['dark', 'light', 'system'] as ThemePref[]).map((t) => <button key={t} type="button" aria-pressed={prefs.theme === t} onClick={() => prefs.setPrefs({ theme: t })}>{t[0].toUpperCase() + t.slice(1)}</button>)}
          </div>
        </Row>
        <Row label="PLC platform" hint="Addresses, instruction names, timer units and 3D hardware labels follow this.">
          <select className="input !w-auto max-w-full" value={prefs.skin} onChange={(e) => prefs.setPrefs({ skin: e.target.value as SkinId, hwModel: '' })} aria-label="Brand skin">
            {skinsByMaker().map((g) => (
              <optgroup key={g.maker} label={g.maker}>
                {g.skins.map((s) => <option key={s.id} value={s.id}>{s.family} — {s.style}</option>)}
              </optgroup>
            ))}
          </select>
        </Row>
        <Row label="Goal" hint="Orders your recommended path.">
          <select className="input !w-auto" value={prefs.goal ?? 'maintenance'} onChange={(e) => prefs.setPrefs({ goal: e.target.value as Goal })} aria-label="Goal">
            <option value="maintenance">Maintenance tech</option><option value="new-tech">New controls tech</option><option value="bas">Building automation</option><option value="curious">Just curious</option>
          </select>
        </Row>
        <Row label="Sound" hint="Contactor clunk, motor hum and alarm horn. Generated on device.">
          <button type="button" className="btn btn-sm" aria-pressed={prefs.sound} onClick={() => { prefs.setPrefs({ sound: !prefs.sound }); sfx.setEnabled(!prefs.sound); if (!prefs.sound) setTimeout(() => sfx.clunk(), 30); }}>
            <Icon name={prefs.sound ? 'volume' : 'mute'} size={16} /> {prefs.sound ? 'On' : 'Off'}
          </button>
        </Row>
        <Row label="Text size">
          <div className="seg" role="group" aria-label="Text size">
            {[[0.9, 'A−'], [1, 'A'], [1.15, 'A+'], [1.3, 'A++']].map(([v, l]) => <button key={l} type="button" aria-pressed={prefs.textScale === v} onClick={() => prefs.setPrefs({ textScale: v as number })}>{l}</button>)}
          </div>
        </Row>
        <Row label="3D graphics" hint="The 3D panel and plant views are coming. Choose 2D only to never load them.">
          <select className="input !w-auto" value={prefs.quality} onChange={(e) => prefs.setPrefs({ quality: e.target.value as Quality })} aria-label="3D quality">
            <option value="auto">Auto</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="2d">2D only</option>
          </select>
        </Row>
        <Row label="Your name" hint="Shown on certificates. Stays on this device.">
          <input className="input !w-56 max-w-full" value={prefs.name} maxLength={30} onChange={(e) => prefs.setPrefs({ name: e.target.value })} aria-label="Your name" />
        </Row>
        <Row label="Intro screens">
          <button type="button" className="btn btn-sm" onClick={() => prefs.setPrefs({ onboarded: false })}>Show again</button>
        </Row>
      </section>

      <h2 className="text-lg font-bold mb-2">Your data</h2>
      <section className="card card-pad space-y-3 mb-6">
        <p className="m-0 text-sm">Move your progress to another phone or computer with a backup file. Nothing goes through a server.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={exportData}><Icon name="download" size={18} /> Export progress</button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}><Icon name="upload" size={18} /> Import progress</button>
          <button type="button" className="btn btn-danger" onClick={() => setConfirmReset(true)}><Icon name="trash" size={18} /> Erase everything</button>
        </div>
        {msg && <p className="m-0 text-sm text-live" role="status">{msg}</p>}
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f || f.size > 1024 * 1024) { setMsg('That file is too big to be a progress backup.'); return; }
          try {
            setMsg(p.importData(JSON.parse(await f.text())) ? 'Progress restored.' : 'That file isn\'t a Controls Academy backup.');
          } catch { setMsg('Couldn\'t read that file.'); }
        }} />
      </section>

      <a href={href('about')} className="card card-link card-pad flex items-center gap-3">
        <Icon name="info" className="text-glow" />
        <span className="flex-1"><span className="block font-bold text-heading">About, privacy & credits</span><span className="block text-sm text-muted">Caylor Made Technologies · sister app · licenses</span></span>
        <Icon name="chevron" />
      </a>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Erase all progress?">
        <p className="mt-0">This deletes your XP, lessons, badges, fault-hunt times and saved program on this device. It can't be undone. Export a backup first if you might want it.</p>
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
          <button type="button" className="btn btn-danger" onClick={async () => { await p.reset(); const { remove } = await import('../../state/persist'); await remove('sim-program'); setConfirmReset(false); setMsg('Erased.'); }}>Erase</button>
        </div>
      </Sheet>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="min-w-0"><p className="m-0 font-semibold text-heading">{label}</p>{hint && <p className="m-0 text-xs text-muted">{hint}</p>}</div>
      {children}
    </div>
  );
}
