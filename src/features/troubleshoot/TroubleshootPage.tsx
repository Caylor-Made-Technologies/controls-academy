import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHead } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { Rich } from '../../components/RichText';
import { MOTOR_DEVICES, MOTOR_FAULTS, motorProgram } from '../../plant/motor';
import type { FaultDef } from '../../plant/types';
import { href, navigate } from '../../lib/router';
import { buzz, sfx } from '../../lib/sound';
import { useProgress } from '../../state/progress';
import type { SimRuntime } from '../simulator/runtime';
import { Workbench } from '../simulator/Workbench';

interface Penalty { why: string; pts: number }

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function TroubleshootPage({ huntId }: { huntId?: string }) {
  const hunts = useProgress((s) => s.hunts);
  const fault = huntId ? MOTOR_FAULTS.find((f) => f.id === huntId) ?? null : null;
  const [round, setRound] = useState(0);

  // Each hunt has its own URL, so the Back button and the Troubleshoot tab return to the list.
  const start = (f: FaultDef) => {
    setRound((r) => r + 1);
    buzz(15);
    navigate(`troubleshoot/${f.id}`);
  };
  const surprise = () => {
    const unsolved = MOTOR_FAULTS.filter((f) => !hunts[f.id] && f.id !== huntId);
    const pool = unsolved.length ? unsolved : MOTOR_FAULTS.filter((f) => f.id !== huntId);
    start(pool[Math.floor(Math.random() * pool.length)]);
  };

  if (fault) return <Hunt key={`${fault.id}-${round}`} fault={fault} onExit={() => navigate('troubleshoot')} onNext={surprise} />;

  return (
    <div>
      <PageHead eyebrow="Troubleshoot" title="Fault Hunt">
        A fault is hidden in the motor station. You get the operator's complaint, I/O LEDs, the live logic, a meter and a stopwatch. Scored on speed <em>and</em> on staying safe.
      </PageHead>
      <div className="card card-pad mb-4 flex flex-wrap gap-3 items-center" style={{ boxShadow: 'var(--glow)' }}>
        <div className="flex-1 min-w-[12rem]">
          <h2 className="text-lg font-bold m-0">Surprise me</h2>
          <p className="text-sm text-muted m-0">Random fault you haven't solved yet. No hints about which one.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={surprise}><Icon name="bolt" size={18} /> Start a hunt</button>
      </div>
      <div className="callout callout-tip text-sm mb-4">
        <strong className="text-heading">The method:</strong> talk to the operator → check the obvious → I/O LEDs → find the output in logic and work backward → half-split with your meter → fix, test, document. <a href={href('lesson/troubleshooting-method')}>Lesson</a>
      </div>
      <h2 className="text-lg font-bold mb-2">Pick a fault to practice</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {MOTOR_FAULTS.map((f) => {
          const h = hunts[f.id];
          return (
            <button key={f.id} type="button" className="card card-link card-pad text-left cursor-pointer" onClick={() => start(f)}>
              <span className="flex items-center justify-between gap-2">
                <span className="font-bold text-heading">"{f.complaint}"</span>
              </span>
              <span className="flex gap-1.5 mt-2 flex-wrap">
                <span className="chip">{'●'.repeat(f.difficulty)}{'○'.repeat(3 - f.difficulty)} difficulty</span>
                {h ? <span className="chip chip-live"><Icon name="check" size={13} /> Best {fmtTime(h.bestMs)}{h.safe ? ' · safe' : ''}</span> : <span className="chip">Unsolved</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted mt-4">{Object.keys(hunts).length} of {MOTOR_FAULTS.length} motor-station faults solved. More machines and faults are coming with the next plant scenes.</p>
    </div>
  );
}

function Hunt({ fault, onExit, onNext }: { fault: FaultDef; onExit: () => void; onNext: () => void }) {
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
  const [wrong, setWrong] = useState<string | null>(null);
  const initial = useMemo(() => motorProgram(), []);
  const penalize = useCallback((why: string, pts: number) => {
    setPenalties((p) => [...p, { why, pts }]);
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
      if (fault.id === 'forced') r.plc.forces.DO.set(0, false);
      return r;
    });
  }, [fault]);

  const elapsed = (solved?.ms ?? now - t0);

  const pick = (id: string) => {
    if (solved) return;
    if (id === fault.culprit) {
      const ms = performance.now() - t0;
      const lost = penalties.reduce((a, p) => a + p.pts, 0);
      const timeBonus = Math.max(0, 50 - Math.floor(ms / 6000));
      const score = Math.max(10, 50 + timeBonus - lost);
      setSolved({ ms, score });
      recordHunt(fault.id, ms, penalties.length === 0, 40 + Math.round(score / 5));
      sfx.tick();
      buzz(20);
    } else {
      const label = MOTOR_DEVICES.find((d) => d.id === id)?.label ?? (id === 'fuse' ? 'the control fuse' : id === 'force' ? 'a force' : id);
      setWrong(label);
      penalize(`Replaced or blamed ${label}, but that wasn't it. On the job that's a part, an hour and a callback. Measure before you swap.`, 15);
    }
  };

  const measure = () => {
    if (!rt || !meterPoint) return;
    const p = rt.scene.meterPoints(rt.io).find((x) => x.id === meterPoint);
    if (!p) return;
    if (!proved && meterPoint !== 'psu') {
      penalize('Prove your meter first: check it on a known live source (the 24 VDC supply) before trusting any reading. That\'s the first "live" in live-dead-live.', 5);
    }
    if (meterPoint === 'psu') setProved(true);
    const r = p.read();
    setReading(`${r.value.toFixed(r.value % 1 ? 1 : 0)} ${r.unit}`);
    buzz(6);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button type="button" className="btn btn-ghost btn-sm -ml-2" onClick={onExit}><Icon name="back" size={16} /> All faults</button>
        <span role="timer" className="ml-auto chip font-mono tabular-nums text-base !min-h-[34px]" aria-label={`Elapsed ${fmtTime(elapsed)}`}><Icon name="slow" size={16} /> {fmtTime(elapsed)}</span>
      </div>

      <section className="card card-pad mb-3" style={{ borderColor: 'var(--warn)' }}>
        <p className="eyebrow m-0">Work order</p>
        <h1 className="text-xl font-extrabold mt-1">"{fault.complaint}"</h1>
        <p className="text-sm text-muted m-0 mt-1">Operator, motor station 1. Find the cause. Tap a device, I/O point or contactor and choose <strong className="text-heading">This is the problem</strong> — or use the buttons below for power and forces.</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" className="btn btn-sm" onClick={() => pick('fuse')}><Icon name="flag" size={16} /> Control power / fuse</button>
          <button type="button" className="btn btn-sm" onClick={() => pick('force')}><Icon name="flag" size={16} /> A force is installed</button>
          <button type="button" className="btn btn-sm" onClick={() => pick('logic')}><Icon name="flag" size={16} /> The program is wrong</button>
        </div>
      </section>

      {moment && !solved && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="callout callout-safety mb-3 flex gap-2 items-start" role="alert">
          <Icon name="shield" className="flex-none mt-0.5" />
          <div className="flex-1 text-sm"><strong className="text-heading">Teaching moment. </strong>{moment}</div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMoment(null)}>OK</button>
        </motion.div>
      )}

      {solved && (
        <motion.section initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card card-pad mb-3" style={{ borderColor: 'var(--live)', boxShadow: 'var(--live-glow)' }} role="status">
          <p className="eyebrow m-0">Found it</p>
          <h2 className="text-xl font-extrabold mt-1">{fault.title}</h2>
          <div className="flex gap-2 flex-wrap my-2">
            <span className="chip chip-live">Score {solved.score}</span>
            <span className="chip">Time {fmtTime(solved.ms)}</span>
            <span className={`chip ${penalties.length ? 'chip-warn' : 'chip-live'}`}>{penalties.length ? `${penalties.length} unsafe / wasted move${penalties.length > 1 ? 's' : ''}` : 'Zero unsafe moves'}</span>
          </div>
          <p className="m-0"><strong className="text-heading">Cause:</strong> <Rich text={fault.cause} /></p>
          <p className="mt-2 mb-0"><strong className="text-heading">How a pro finds it:</strong> <Rich text={fault.howToFind} /></p>
          {penalties.length > 0 && <ul className="text-sm text-muted mt-2 mb-0 pl-5 list-disc">{penalties.map((p, i) => <li key={i}>−{p.pts}: {p.why}</li>)}</ul>}
          <p className="text-sm text-muted mt-2 mb-0">Then: fix, test, document — and remove any forces.</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <button type="button" className="btn btn-primary" onClick={onNext}>Next hunt <Icon name="chevron" size={16} /></button>
            <button type="button" className="btn" onClick={onExit}>All faults</button>
          </div>
        </motion.section>
      )}

      {wrong && !solved && <p className="text-sm text-warn mb-3" role="status">Not {wrong}. Keep looking — check what the PLC sees vs what it commands.</p>}

      {/* Meter */}
      <section className="card card-pad mb-3" aria-label="Multimeter">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="rounded-xl px-4 py-2 font-mono text-2xl tabular-nums min-w-[9rem] text-center" style={{ background: '#0c1a12', color: '#7dffbe', boxShadow: 'inset 0 0 0 2px #1f3a2b' }} role="status" aria-live="polite" aria-label={`Meter reading ${reading ?? 'none'}`}>
            {reading ?? '----'}
          </div>
          <label className="flex-1 min-w-[12rem]">
            <span className="text-sm font-semibold text-heading flex items-center gap-1.5"><Icon name="meter" size={16} /> Meter — put your leads on</span>
            <select className="input mt-1" value={meterPoint} onChange={(e) => { setMeterPoint(e.target.value); setReading(null); }}>
              <option value="">Choose a test point…</option>
              {rt?.scene.meterPoints(rt.io).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <button type="button" className="btn btn-primary" disabled={!meterPoint} onClick={measure}>Measure</button>
        </div>
        <p className="text-xs text-muted mb-0 mt-2">{proved ? 'Meter proved on a known source. Prove it again before you call anything dead.' : 'Tip: prove the meter on the 24 VDC supply first (live-dead-live). Readings are to 0 V / neutral unless the point says "across".'} Training sim: on real gear, measuring live needs the right PPE, a CAT-rated meter, and authorization.</p>
      </section>

      <Workbench initial={initial} editable={false} onRuntime={onRuntime} onUnsafe={(w) => penalize(`${w}. Forcing can start equipment with someone in the machine. Find the cause with your meter and the logic instead — forcing is a last resort with authorization and everyone clear.`, 20)} onDevicePick={pick} devicePickLabel="This is the problem" />
    </div>
  );
}
