import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Icon } from '../../components/Icon';
import { Rich } from '../../components/RichText';
import { MACHINES, MACHINE_BY_ID, allFaults, createMachine } from '../../plant';
import type { FaultDef } from '../../plant/types';
import { href, navigate } from '../../lib/router';
import { buzz, sfx } from '../../lib/sound';
import { useProgress } from '../../state/progress';
import type { SimRuntime } from '../simulator/runtime';
import { Workbench } from '../simulator/LazyWorkbench';
import { hasWebGL, prefer3D } from '../../three/support';
import { useAfterPaint } from '../../lib/afterPaint';
import { PosterFrame } from '../../three/poster/frames';
import { POSTERS } from '../../three/poster/meter.gen';
import { usePrefs } from '../../state/prefs';
import { MODE_LABEL, huntScore, meterResult, type MeterMode, type Penalty } from './scoring';


function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

type HuntFault = FaultDef & { machine: string };
const FAULTS: HuntFault[] = allFaults();

/** The hunt list (below the page heading, which TroubleshootPage draws) or one running hunt. */
export default function HuntScreens({ huntId }: { huntId?: string }) {
  const hunts = useProgress((s) => s.hunts);
  const fault = huntId ? FAULTS.find((f) => f.id === huntId) ?? null : null;
  const [level, setLevel] = useState<0 | 1 | 2 | 3>(0);
  const shown = FAULTS.filter((f) => !level || f.difficulty === level);
  const [round, setRound] = useState(0);

  // Each hunt has its own URL, so the Back button and the Troubleshoot tab return to the list.
  const start = (f: HuntFault) => {
    setRound((r) => r + 1);
    buzz(15);
    navigate(`troubleshoot/${f.id}`);
  };
  const surprise = () => {
    const unsolved = shown.filter((f) => !hunts[f.id] && f.id !== huntId);
    const pool = unsolved.length ? unsolved : shown.filter((f) => f.id !== huntId);
    start(pool[Math.floor(Math.random() * pool.length)]);
  };

  if (fault) return <Hunt key={`${fault.id}-${round}`} fault={fault} onExit={() => navigate('troubleshoot')} onNext={surprise} />;

  return (
    <div>
      <div className="card card-pad mb-4 flex flex-wrap gap-3 items-center" style={{ boxShadow: 'var(--glow)' }}>
        <div className="flex-1 min-w-[12rem]">
          <h2 className="text-lg font-bold m-0">Surprise me</h2>
          <p className="text-sm text-muted m-0">Random fault you haven't solved yet. No hints about which one.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={surprise}><Icon name="bolt" size={18} /> Start a hunt</button>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm font-semibold text-heading">Difficulty</span>
        <div className="seg" role="group" aria-label="Difficulty">
          {([[0, 'All'], [1, 'Easy'], [2, 'Medium'], [3, 'Hard']] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={level === v} onClick={() => setLevel(v)}>{l}</button>)}
        </div>
      </div>
      <div className="callout callout-tip text-sm mb-4">
        <strong className="text-heading">The method:</strong> talk to the operator → check the obvious → I/O LEDs → find the output in logic and work backward → half-split with your meter → fix, test, document. <a href={href('lesson/troubleshooting-method')}>Lesson</a>
      </div>
      {MACHINES.map((m) => {
        const list = shown.filter((f) => f.machine === m.id);
        if (!list.length) return null;
        return (
          <section key={m.id} className="mb-5" aria-labelledby={`fh-${m.id}`}>
            <h2 id={`fh-${m.id}`} className="text-lg font-bold mb-1">{m.title}</h2>
            <p className="text-sm text-muted mt-0 mb-2">{m.summary} · {list.filter((f) => hunts[f.id]).length}/{list.length} solved{level ? ' at this level' : ''}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {list.map((f) => {
                const h = hunts[f.id];
                return (
                  <button key={f.id} type="button" className="card card-link card-pad text-left cursor-pointer" onClick={() => start(f)}>
                    <span className="font-bold text-heading">"{f.complaint}"</span>
                    <span className="flex gap-1.5 mt-2 flex-wrap">
                      <span className="chip">{'●'.repeat(f.difficulty)}{'○'.repeat(3 - f.difficulty)} difficulty</span>
                      {h ? <span className="chip chip-live"><Icon name="check" size={13} /> Best {fmtTime(h.bestMs)}{h.safe ? ' · safe' : ''}</span> : <span className="chip">Unsolved</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="text-sm text-muted">{FAULTS.filter((f) => hunts[f.id]).length} of {FAULTS.length} faults solved across {MACHINES.length} machines.</p>
    </div>
  );
}

const MeterProbes3D = lazy(() => import('../../three/MeterProbes3D'));
const noSub = () => () => {};

function Hunt({ fault, onExit, onNext }: { fault: HuntFault; onExit: () => void; onNext: () => void }) {
  const recordHunt = useProgress((s) => s.recordHunt);
  const [rt, setRt] = useState<SimRuntime | null>(null);
  const [t0] = useState(() => performance.now());
  const [now, setNow] = useState(t0);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [moment, setMoment] = useState<string | null>(null);
  const [solved, setSolved] = useState<{ ms: number; score: number } | null>(null);
  const [meterPoint, setMeterPoint] = useState('');
  const [reading, setReading] = useState<string | null>(null);
  const [proved, setProved] = useState(false);
  const [mode, setMode] = useState<MeterMode>('VDC');
  const [evidence, setEvidence] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const machine = MACHINE_BY_ID.get(fault.machine)!;
  const initial = useMemo(() => createMachine(fault.machine).program(), [fault.machine]);
  const penalize = useCallback((why: string, pts: number, unsafe = false) => {
    setPenalties((p) => [...p, { why, pts, unsafe }]);
    setMoment(why);
    sfx.horn();
    buzz(40);
  }, []);

  useEffect(() => {
    if (solved) return;
    const t = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(t);
  }, [solved]);

  const onRuntime = useCallback((r: SimRuntime) => {
    setRt((cur) => {
      if (cur === r) return cur;
      r.scene.reset();
      r.scene.setFault(fault.id);
      r.scene.armFault?.(fault.id, r.plc);
      return r;
    });
  }, [fault]);

  const elapsed = (solved?.ms ?? now - t0);

  const pick = (id: string) => {
    if (solved) return;
    if (id === fault.culprit) {
      const ms = performance.now() - t0;
      const score = huntScore(ms, penalties, evidence, Boolean(fault.evidence?.length));
      setSolved({ ms, score });
      recordHunt(fault.id, ms, penalties.length === 0, 40 + Math.round(score / 5));
      sfx.tick();
      buzz(20);
    } else {
      const label = rt?.scene.devices.find((d) => d.id === id)?.label ?? rt?.scene.huntChoices?.find((c) => c.id === id)?.label.toLowerCase() ?? id;
      setWrong(label);
      penalize(`Replaced or blamed ${label}, but that wasn't it. On the job that's a part, an hour and a callback. Measure before you swap.`, 15);
    }
  };

  // Each mistake costs once per point and mode (sweeping the dial or re-dropping a probe doesn't stack it).
  const charged = useRef(new Set<string>());
  const once = (key: string, why: string, pts: number, unsafe?: boolean) => {
    if (charged.current.has(key)) { setMoment(why); return; }
    charged.current.add(key);
    penalize(why, pts, unsafe);
  };
  // Live-dead-live: a "dead" reading only counts as proof after the meter is proved again on a live source.
  const [deadAt, setDeadAt] = useState<string | null>(null);
  const measure = (at = meterPoint, m = mode) => {
    if (!rt || !at) return;
    const p = rt.scene.meterPoints(rt.io).find((x) => x.id === at);
    if (!p) return;
    if (!proved && at !== 'psu') {
      once(`prove|${at}`, 'Prove your meter first: check it on a known live source (the 24 VDC supply) before trusting any reading. That\'s the first "live" in live-dead-live.', 5);
    }
    const r = p.read();
    const res = meterResult(m, r.unit, r.value);
    setReading(res.display);
    buzz(6);
    if (res.penalty) { once(`${at}|${m}`, res.penalty.why, res.penalty.pts, res.penalty.unsafe); return; }
    if (at === 'psu' && m === 'VDC' && r.value > 0) {
      setProved(true);
      if (deadAt && fault.evidence?.includes(deadAt)) setEvidence(true); // dead reading now confirmed
      setDeadAt(null);
      return;
    }
    if (!proved) return;
    if (Math.abs(r.value) < 0.05) setDeadAt(at); // reads dead: prove the meter again before trusting it
    else if (fault.evidence?.includes(at)) setEvidence(true);
  };
  // 3D probes: the probe stays on a terminal and the display follows the live value.
  const quality = usePrefs((s) => s.quality);
  const can3d = useMemo(() => hasWebGL() && quality !== '2d', [quality]);
  const [probes3d, setProbes3d] = useState(() => prefer3D(quality));
  const painted = useAfterPaint();
  const [placed, setPlaced] = useState(false);
  const live = useSyncExternalStore(rt ? rt.subscribe : noSub, () => {
    if (!rt || !placed || !meterPoint) return null;
    const p = rt.scene.meterPoints(rt.io).find((x) => x.id === meterPoint);
    if (!p) return null;
    const r = p.read();
    return meterResult(mode, r.unit, r.value).display;
  });
  const points = useMemo(() => (rt ? rt.scene.meterPoints(rt.io).map(({ id, label }) => ({ id, label })) : []), [rt]);
  const onLand = useCallback((id: string | null) => {
    setPlaced(Boolean(id));
    setMeterPoint(id ?? '');
    if (id) measure(id); else setReading(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rt, mode, proved, fault, deadAt]);
  const onLift = useCallback(() => { setPlaced(false); setReading(null); }, []);
  const onDial = useCallback((m: MeterMode) => {
    setMode(m);
    if (placed && meterPoint) measure(meterPoint, m); else setReading(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, meterPoint, rt, proved, fault, deadAt]);
  // What kind of point the leads are on, for the right safety and method cue.
  const pointUnit = useMemo(() => (rt && meterPoint ? rt.scene.meterPoints(rt.io).find((x) => x.id === meterPoint)?.read().unit ?? null : null), [rt, meterPoint]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button type="button" className="btn btn-ghost btn-sm -ml-2" onClick={onExit}><Icon name="back" size={16} /> All faults</button>
        <span role="timer" className="ml-auto chip font-mono tabular-nums text-base !min-h-[34px]" aria-label={`Elapsed ${fmtTime(elapsed)}`}><Icon name="slow" size={16} /> {fmtTime(elapsed)}</span>
      </div>

      <section className="card card-pad mb-3" style={{ borderColor: 'var(--warn)' }}>
        <p className="eyebrow m-0">Work order</p>
        <h1 className="text-xl font-extrabold mt-1">"{fault.complaint}"</h1>
        <p className="text-sm text-muted m-0 mt-1">Operator, {machine.title.toLowerCase()}. Find the cause. Tap a device or I/O point and choose <strong className="text-heading">This is the problem</strong> — or use the buttons below.</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {(rt?.scene.huntChoices ?? []).map((c) => <button key={c.id} type="button" className="btn btn-sm" onClick={() => pick(c.id)}><Icon name="flag" size={16} /> {c.label}</button>)}
        </div>
      </section>

      {moment && !solved && (
        <div data-enter="drop" className="callout callout-safety mb-3 flex gap-2 items-start" role="alert">
          <Icon name="shield" className="flex-none mt-0.5" />
          <div className="flex-1 text-sm"><strong className="text-heading">Teaching moment. </strong>{moment}</div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMoment(null)}>OK</button>
        </div>
      )}

      {solved && (
        <section data-enter="pop" className="card card-pad mb-3" style={{ borderColor: 'var(--live)', boxShadow: 'var(--live-glow)' }} role="status">
          <p className="eyebrow m-0">Found it</p>
          <h2 className="text-xl font-extrabold mt-1">{fault.title}</h2>
          <div className="flex gap-2 flex-wrap my-2">
            <span className="chip chip-live">Score {solved.score}</span>
            <span className="chip">Time {fmtTime(solved.ms)}</span>
            <span className={`chip ${penalties.length ? 'chip-warn' : 'chip-live'}`}>{penalties.length ? `${penalties.length} unsafe / wasted move${penalties.length > 1 ? 's' : ''}` : 'Zero unsafe moves'}</span>
            {evidence && <span className="chip chip-live">Proved with the meter</span>}
          </div>
          <p className="m-0"><strong className="text-heading">Cause:</strong> <Rich text={fault.cause} /></p>
          <p className="mt-2 mb-0"><strong className="text-heading">How a pro finds it:</strong> <Rich text={fault.howToFind} /></p>
          <p className="mt-2 mb-0"><strong className="text-heading">What the meter shows:</strong> <Rich text={fault.readings} /></p>
          <p className="mt-2 mb-0"><strong className="text-heading">The fix:</strong> <Rich text={fault.fix} /></p>
          <p className="mt-2 mb-0 flex gap-1.5"><Icon name="shield" size={16} className="flex-none mt-1 text-warn" /><span><strong className="text-heading">Safety first:</strong> <Rich text={fault.safety} /></span></p>
          <p className="text-sm m-0 mt-2"><strong className="text-heading">Method:</strong> {evidence ? 'You proved it with the meter before naming it (+10).' : fault.evidence?.length ? 'You named it without measuring the proof point (−10). Measure first, then decide.' : 'This one is found in the settings/logic, not with the meter.'}</p>
          {penalties.length > 0 && <ul className="text-sm text-muted mt-2 mb-0 pl-5 list-disc">{penalties.map((p, i) => <li key={i}>−{p.pts}: {p.why}</li>)}</ul>}
          <p className="text-sm text-muted mt-2 mb-0">Then: fix, test, document — and remove any forces.</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <button type="button" className="btn btn-primary" onClick={onNext}>Next hunt <Icon name="chevron" size={16} /></button>
            <button type="button" className="btn" onClick={onExit}>All faults</button>
          </div>
        </section>
      )}

      {wrong && !solved && <p className="text-sm text-warn mb-3" role="status">Not {wrong}. Keep looking — check what the PLC sees vs what it commands.</p>}

      {/* Meter */}
      <section className="card card-pad mb-3" aria-label="Multimeter">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="rounded-xl px-4 py-2 font-mono text-2xl tabular-nums min-w-[9rem] text-center" style={{ background: '#0c1a12', color: '#7dffbe', boxShadow: 'inset 0 0 0 2px #1f3a2b' }} aria-hidden="true">
            {live ?? reading ?? '----'}
          </div>
          <p className="sr-only" role="status" aria-live="polite">{reading ? `Meter reads ${reading}` : ''}</p>
          {can3d && (
            <button type="button" className="btn btn-sm btn-ghost" aria-pressed={probes3d} onClick={() => setProbes3d(!probes3d)}><Icon name="meter" size={16} /> {probes3d ? 'Hide 3D probes' : '3D probes'}</button>
          )}
          <div className="w-full">
            <span className="text-sm font-semibold text-heading">Meter mode</span>
            <div className="seg mt-1 flex-wrap" role="group" aria-label="Meter mode">
              {(Object.keys(MODE_LABEL) as MeterMode[]).map((m) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => onDial(m)}>{MODE_LABEL[m]}</button>)}
            </div>
          </div>
          <label className="flex-1 min-w-[12rem]">
            <span className="text-sm font-semibold text-heading flex items-center gap-1.5"><Icon name="meter" size={16} /> Meter — put your leads on</span>
            <select className="input mt-1" value={meterPoint} onChange={(e) => { setMeterPoint(e.target.value); setPlaced(false); setReading(null); }}>
              <option value="">Choose a test point…</option>
              {rt?.scene.meterPoints(rt.io).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <button type="button" className="btn btn-primary" disabled={!meterPoint} onClick={() => measure()}>Measure</button>
        </div>
        {can3d && probes3d && rt && (
          <div className="mt-3">
            {painted ? (
              <Suspense fallback={<PosterFrame kind="meter" spec={POSTERS[fault.machine]} label="Loading 3D meter" />}>
                <MeterProbes3D poster={POSTERS[fault.machine]} points={points} mode={mode} at={placed ? meterPoint : null} reading={live ?? reading ?? '----'} onMode={onDial} onLand={onLand} onLift={onLift} />
              </Suspense>
            ) : <PosterFrame kind="meter" spec={POSTERS[fault.machine]} label="Loading 3D meter" />}
            <p className="text-xs text-muted m-0 mt-1">Drag the red probe onto a terminal; the black lead is on common. Turn the dial by tapping a mode. The reading stays live while the probe is on.</p>
          </div>
        )}
        {pointUnit === 'mA' && <p className="text-sm m-0 mt-2 flex gap-1.5"><Icon name="info" size={16} className="flex-none mt-0.5 text-glow" /><span>Loop current is measured in series: the meter goes in place of the loop's test link (or use a mA clamp or loop calibrator) — not from a terminal to common. Opening a live loop moves the reading under range: tell operations and put the loop in manual first.</span></p>}
        {pointUnit === 'A' && <p className="text-sm m-0 mt-2 flex gap-1.5"><Icon name="shield" size={16} className="flex-none mt-0.5 text-warn" /><span>Motor current: clamp around one conductor, never in series. 480 V: a meter rated CAT III or higher and arc-rated PPE per NFPA 70E.</span></p>}
        {deadAt && <p className="text-sm m-0 mt-2 text-warn" role="status">That reads dead. Prove the meter on the 24 VDC supply again before you trust it (the last "live" in live-dead-live).</p>}
        <p className="text-xs text-muted mb-0 mt-2">{proved ? 'Meter proved on a known source. Prove it again after any dead reading.' : 'Tip: set the mode, then prove the meter on the 24 VDC supply first (live-dead-live). Voltage readings are to 0 V / neutral unless the point says "across".'} Training sim: on real gear, measuring live needs the right PPE, a CAT-rated meter, and authorization.</p>
      </section>

      <Workbench initial={initial} machine={fault.machine} editable={false} onRuntime={onRuntime} onUnsafe={(w) => penalize(`${w}. Forcing can start equipment with someone in the machine. Find the cause with your meter and the logic instead — forcing is a last resort with authorization and everyone clear.`, 20)} onDevicePick={pick} devicePickLabel="This is the problem" />
    </div>
  );
}
