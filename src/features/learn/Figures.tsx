import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../lib/motion';
import type { FigureId } from '../../content/types';
import { twoLoads } from '../../lib/circuits';

const box = 'card card-pad';

function Slider({ label, value, min, max, step = 1, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm"><span className="font-semibold text-heading">{label}</span><span className="font-mono tabular-nums">{value} {unit}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--blue)] h-11" />
    </label>
  );
}

function Ohms() {
  const [v, setV] = useState(24);
  const [r, setR] = useState(240);
  const i = v / r;
  const glow = Math.min(1, i / 0.3);
  return (
    <div className={box}>
      <svg viewBox="0 0 300 120" className="w-full max-w-md mx-auto block" role="img" aria-label={`Circuit: ${v} volts across ${r} ohms gives ${(i * 1000).toFixed(0)} milliamps`}>
        <rect x="20" y="20" width="260" height="80" rx="10" fill="none" stroke="var(--border-strong)" strokeWidth="3" />
        <rect x="8" y="45" width="24" height="30" rx="4" fill="var(--surface-raised)" stroke="var(--blue-glow)" strokeWidth="2" />
        <text x="20" y="64" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--text-heading)">{v}V</text>
        <path d="M120 20 l8 -8 l10 16 l10 -16 l10 16 l10 -16 l8 8" fill="none" stroke="var(--warn)" strokeWidth="3" transform="translate(0 0)" />
        <text x="150" y="44" textAnchor="middle" fontSize="11" fill="var(--text-muted)">{r} Ω</text>
        <circle cx="250" cy="100" r="14" fill={`rgba(255, 210, 120, ${0.15 + glow * 0.85})`} stroke="var(--border-strong)" strokeWidth="2" style={{ filter: `drop-shadow(0 0 ${glow * 14}px #ffb547)` }} />
        <text x="150" y="80" textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--live)">I = {(i * 1000).toFixed(1)} mA</text>
      </svg>
      <Slider label="Voltage" value={v} min={1} max={48} unit="V" onChange={setV} />
      <Slider label="Resistance" value={r} min={10} max={1000} step={10} unit="Ω" onChange={setR} />
      <p className="text-sm text-muted m-0">I = V ÷ R = {v} ÷ {r} = <strong className="text-heading">{i.toFixed(3)} A</strong></p>
    </div>
  );
}

function SinkSource() {
  const [sensor, setSensor] = useState<'PNP' | 'NPN'>('PNP');
  const [card, setCard] = useState<'sinking' | 'sourcing'>('sinking');
  const [target, setTarget] = useState(true);
  const reduce = useReducedMotion();
  const works = (sensor === 'PNP' && card === 'sinking') || (sensor === 'NPN' && card === 'sourcing');
  const flowing = works && target;
  // Sensor output side: PNP switches +24, NPN switches 0V. Card common: sinking → 0V, sourcing → +24.
  const outLevel = sensor === 'PNP' ? '+24 V' : '0 V';
  const comLevel = card === 'sinking' ? '0 V' : '+24 V';
  const dash = flowing && !reduce ? { strokeDasharray: '6 8', animation: 'flow 0.8s linear infinite' } : undefined;
  return (
    <div className={box}>
      <div className="flex flex-wrap gap-3 mb-3">
        <div className="seg" role="group" aria-label="Sensor type">
          {(['PNP', 'NPN'] as const).map((s) => <button key={s} type="button" aria-pressed={sensor === s} onClick={() => setSensor(s)}>{s} sensor</button>)}
        </div>
        <div className="seg" role="group" aria-label="Input card type">
          {(['sinking', 'sourcing'] as const).map((c) => <button key={c} type="button" aria-pressed={card === c} onClick={() => setCard(c)}>{c} card</button>)}
        </div>
        <button type="button" className="btn btn-sm" aria-pressed={target} onClick={() => setTarget(!target)}>{target ? 'Target present' : 'No target'}</button>
      </div>
      <svg viewBox="0 0 320 170" className="w-full max-w-lg mx-auto block" role="img" aria-label={`${sensor} sensor on a ${card} card: ${works ? (target ? 'current flows, input ON' : 'would work; no target so input OFF') : 'no complete loop, input stays OFF'}`}>
        <text x="10" y="18" fontSize="11" fontWeight="700" fill="var(--alarm)">+24 V</text>
        <line x1="10" y1="24" x2="310" y2="24" stroke="var(--alarm)" strokeWidth="3" />
        <text x="10" y="162" fontSize="11" fontWeight="700" fill="var(--blue-glow)">0 V</text>
        <line x1="10" y1="150" x2="310" y2="150" stroke="var(--blue-glow)" strokeWidth="3" />
        {/* sensor */}
        <rect x="40" y="62" width="80" height="50" rx="8" fill="var(--surface-raised)" stroke="var(--border-strong)" strokeWidth="2" />
        <text x="80" y="84" textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--text-heading)">{sensor}</text>
        <text x="80" y="100" textAnchor="middle" fontSize="9" fill="var(--text-muted)">out = {target ? outLevel : 'off'}</text>
        <line x1="60" y1="24" x2="60" y2="62" stroke="var(--alarm)" strokeWidth="2" />
        <line x1="100" y1="112" x2="100" y2="150" stroke="var(--blue-glow)" strokeWidth="2" />
        <circle cx="70" cy="70" r="4" fill={target ? '#ffb547' : '#3a4558'} />
        {/* signal wire */}
        <path d="M120 87 H200" stroke={flowing ? 'var(--live)' : 'var(--dead)'} strokeWidth="4" fill="none" style={dash} />
        {/* card */}
        <rect x="200" y="56" width="90" height="62" rx="8" fill="var(--surface-sunk)" stroke="var(--border-strong)" strokeWidth="2" />
        <text x="245" y="76" textAnchor="middle" fontSize="10" fontWeight="800" fill="var(--text-heading)">{card.toUpperCase()}</text>
        <text x="245" y="90" textAnchor="middle" fontSize="9" fill="var(--text-muted)">input card</text>
        <rect x="236" y="96" width="18" height="12" rx="3" fill={flowing ? '#ffb547' : '#2a3342'} style={flowing ? { filter: 'drop-shadow(0 0 6px #ffb547)' } : undefined} />
        <path d={card === 'sinking' ? 'M270 118 V150' : 'M270 56 V24'} stroke={flowing ? 'var(--live)' : 'var(--dead)'} strokeWidth="3" fill="none" style={dash} />
        <text x="276" y={card === 'sinking' ? 138 : 44} fontSize="9" fill="var(--text-muted)">COM → {comLevel}</text>
      </svg>
      <p className={`m-0 mt-2 font-semibold ${works ? 'text-live' : 'text-alarm'}`} role="status">
        {works
          ? target ? `Works: ${sensor === 'PNP' ? 'sensor sources +24 V into the card, card sinks it to 0 V' : 'card sources +24 V, sensor sinks it to 0 V'}. Input LED ON.` : 'This pair works — bring a target to the sensor.'
          : `No loop: ${sensor === 'PNP' ? 'both sides offer +24 V' : 'both sides offer 0 V'}. The sensor LED can light while the PLC input stays OFF.`}
      </p>
    </div>
  );
}

function Scaling() {
  const [ma, setMa] = useState(12);
  const [euMax, setEuMax] = useState(200);
  const rawMin = 4000, rawMax = 20000;
  const raw = Math.round(ma * 1000);
  const broken = ma < 3.6;
  const eu = ((raw - rawMin) * euMax) / (rawMax - rawMin);
  return (
    <div className={box}>
      <Slider label="Loop current" value={ma} min={0} max={21} step={0.1} unit="mA" onChange={setMa} />
      <Slider label="Tank size (EU max)" value={euMax} min={50} max={1000} step={10} unit="gal" onChange={setEuMax} />
      <div className="grid grid-cols-3 gap-2 text-center mt-2">
        <div className="rounded-xl bg-raised p-2"><p className="m-0 text-xs text-muted">Raw counts</p><p className="m-0 font-mono font-bold text-heading">{raw}</p></div>
        <div className="rounded-xl bg-raised p-2"><p className="m-0 text-xs text-muted">Across 250 Ω</p><p className="m-0 font-mono font-bold text-heading">{(ma * 0.25).toFixed(2)} V</p></div>
        <div className="rounded-xl bg-raised p-2"><p className="m-0 text-xs text-muted">Level</p><p className={`m-0 font-mono font-bold ${broken ? 'text-alarm' : 'text-live'}`}>{broken ? 'FAULT' : `${eu.toFixed(1)} gal`}</p></div>
      </div>
      <p className="text-sm text-muted mb-0 mt-2">
        ({raw} − {rawMin}) × ({euMax} − 0) ÷ ({rawMax} − {rawMin}) + 0 = <strong className="text-heading">{eu.toFixed(1)}</strong>.
        {broken ? ' Below ~3.6 mA: treat it as a broken wire, not an empty tank.' : ''} Example card: 4–20 mA → 4000–20000 counts.
      </p>
    </div>
  );
}

function Numbers() {
  const [n, setN] = useState(25);
  const safe = Math.max(0, Math.min(9999, Math.floor(n || 0)));
  const bcd = String(safe).split('').map((d) => Number(d).toString(2).padStart(4, '0')).join(' ');
  const rows: [string, string][] = [
    ['Decimal', String(safe)],
    ['Binary', safe.toString(2).padStart(8, '0').replace(/(.{4})(?=.)/g, '$1 ')],
    ['Hex', `16#${safe.toString(16).toUpperCase()}`],
    ['Octal', `8#${safe.toString(8)}`],
    ['BCD', bcd],
  ];
  return (
    <div className={box}>
      <label className="block mb-3">
        <span className="text-sm font-semibold text-heading">Decimal number (0–9999)</span>
        <input className="input mt-1 font-mono" inputMode="numeric" value={n} onChange={(e) => setN(Number(e.target.value.replace(/\D/g, '')))} />
      </label>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 m-0">
        {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-sm text-muted">{k}</dt><dd className="m-0 font-mono text-heading break-all">{v}</dd></div>)}
      </dl>
      <p className="text-sm text-muted mb-0 mt-3">On a Mitsubishi FX, input point #{safe} is <strong className="text-heading font-mono">X{safe.toString(8)}</strong>.</p>
    </div>
  );
}

function Scan() {
  const steps = ['Read inputs', 'Solve logic', 'Write outputs', 'Housekeeping'];
  const [k, setK] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setK((x) => (x + 1) % 4), 1100);
    return () => clearInterval(t);
  }, [reduce]);
  return (
    <div className={box}>
      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2 list-none p-0 m-0" aria-label="Scan cycle">
        {steps.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => setK(i)} className="w-full rounded-xl p-3 text-left border-2 transition-colors min-h-[72px] cursor-pointer" style={{ borderColor: i === k ? 'var(--live)' : 'var(--border)', background: i === k ? 'var(--live-soft)' : 'var(--surface-raised)' }} aria-current={i === k ? 'step' : undefined}>
              <span className="block text-xs text-muted font-bold">{i + 1}</span>
              <span className="block font-semibold text-heading text-sm">{s}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted mb-0 mt-3" aria-live="polite">
        {['Field inputs are copied into the input image. Changes after this wait for the next scan.', 'Rungs are solved top to bottom, left to right, using the image — not the live wires.', 'The output image is copied to the output cards. If two rungs wrote the same bit, the last one wins.', 'Comms and diagnostics. Then the whole thing repeats, often every few milliseconds.'][k]}
      </p>
    </div>
  );
}

function Hardwired() {
  const [run, setRun] = useState(false);
  const live = 'var(--live)';
  const dead = 'var(--dead)';
  return (
    <div className={box}>
      <svg viewBox="0 0 340 170" className="w-full max-w-xl mx-auto block" role="img" aria-label="Hardwired 3-wire start/stop: L1, Stop pushbutton normally closed, Start pushbutton normally open with M seal-in contact in parallel, M coil, overload contact, L2. Line 2: M auxiliary contact and run light.">
        <text x="20" y="14" fontSize="10" fontWeight="800" fill="var(--text-muted)">L1</text>
        <text x="310" y="14" fontSize="10" fontWeight="800" fill="var(--text-muted)">L2</text>
        <line x1="26" y1="20" x2="26" y2="160" stroke="var(--text-body)" strokeWidth="3" />
        <line x1="316" y1="20" x2="316" y2="160" stroke="var(--text-body)" strokeWidth="3" />
        <text x="6" y="54" fontSize="9" fill="var(--text-muted)">1</text>
        <text x="6" y="134" fontSize="9" fill="var(--text-muted)">3</text>
        {/* line 1 */}
        <path d="M26 50 H52" stroke={live} strokeWidth="2.5" />
        <path d="M52 44 H74 M52 50 V44 M74 44 V50" stroke={live} strokeWidth="2.5" fill="none" />
        <text x="63" y="38" textAnchor="middle" fontSize="8" fill="var(--text-muted)">STOP</text>
        <path d="M74 50 H100" stroke={live} strokeWidth="2.5" />
        <circle cx="96" cy="58" r="7" fill="var(--surface)" stroke="var(--border-strong)" /><text x="96" y="61" textAnchor="middle" fontSize="7">2</text>
        <path d="M100 50 H112 M112 50 V58 M134 50 V58 M112 58 H134" stroke={run ? live : dead} strokeWidth="2.5" fill="none" />
        <path d="M100 50 H112" stroke={live} strokeWidth="2.5" />
        <text x="123" y="38" textAnchor="middle" fontSize="8" fill="var(--text-muted)">START</text>
        <path d="M112 44 H134" stroke={run ? live : 'var(--text-body)'} strokeWidth="2.5" />
        <path d="M134 50 H200" stroke={run ? live : dead} strokeWidth="2.5" />
        <circle cx="150" cy="58" r="7" fill="var(--surface)" stroke="var(--border-strong)" /><text x="150" y="61" textAnchor="middle" fontSize="7">3</text>
        {/* seal-in branch */}
        <path d="M106 50 V90 H114 M136 90 H142 V50" stroke={run ? live : dead} strokeWidth="2.5" fill="none" />
        <path d="M114 84 V96 M136 84 V96" stroke={run ? live : 'var(--text-body)'} strokeWidth="2.5" />
        <path d="M114 90 H136" stroke={run ? live : 'transparent'} strokeWidth="2.5" />
        <text x="125" y="108" textAnchor="middle" fontSize="8" fontWeight="800" fill="var(--text-heading)">M</text>
        <text x="125" y="118" textAnchor="middle" fontSize="7" fill="var(--text-muted)">seal-in</text>
        {/* coil */}
        <circle cx="216" cy="50" r="14" fill={run ? 'var(--live-soft)' : 'none'} stroke={run ? live : 'var(--text-body)'} strokeWidth="2.5" />
        <text x="216" y="54" textAnchor="middle" fontSize="10" fontWeight="800" fill="var(--text-heading)">M</text>
        <path d="M230 50 H262" stroke={run ? live : dead} strokeWidth="2.5" />
        <path d="M262 44 H282 M262 50 V44 M282 44 V50" stroke={run ? live : dead} strokeWidth="2.5" fill="none" />
        <text x="272" y="38" textAnchor="middle" fontSize="8" fill="var(--text-muted)">OL</text>
        <path d="M282 50 H316" stroke={run ? live : dead} strokeWidth="2.5" />
        <text x="216" y="80" textAnchor="middle" fontSize="7" fill="var(--text-muted)">3, 1</text>
        {/* line 3: run light */}
        <path d="M26 130 H110" stroke={live} strokeWidth="2.5" />
        <path d="M110 124 V136 M132 124 V136" stroke={run ? live : 'var(--text-body)'} strokeWidth="2.5" />
        <path d="M110 130 H132" stroke={run ? live : 'transparent'} strokeWidth="2.5" />
        <text x="121" y="118" textAnchor="middle" fontSize="8" fontWeight="800" fill="var(--text-heading)">M</text>
        <path d="M132 130 H200" stroke={run ? live : dead} strokeWidth="2.5" />
        <circle cx="216" cy="130" r="12" fill={run ? '#3ddc97' : 'none'} stroke="var(--text-body)" strokeWidth="2.5" style={run ? { filter: 'drop-shadow(0 0 8px #3ddc97)' } : undefined} />
        <text x="216" y="156" textAnchor="middle" fontSize="8" fill="var(--text-muted)">RUN LT</text>
        <path d="M228 130 H316" stroke={run ? live : dead} strokeWidth="2.5" />
      </svg>
      <div className="flex gap-2 flex-wrap mt-2">
        <button type="button" className="btn btn-sm" onClick={() => setRun(true)}>Press Start</button>
        <button type="button" className="btn btn-sm" onClick={() => setRun(false)}>Press Stop</button>
        <span className="text-sm text-muted self-center">{run ? 'M is sealed in through its own contact.' : 'Stopped. Green = energized.'}</span>
      </div>
      <p className="text-xs text-muted mb-0 mt-2">Circles are wire numbers. "3, 1" under coil M is its contact cross-reference: lines where M's contacts appear.</p>
    </div>
  );
}

const JOBS = [
  { job: 'Is there voltage at this live terminal?', answer: 'V', why: 'Voltage is the only safe first test on a live circuit.' },
  { job: 'Is this fuse good? (circuit locked out, verified dead, fuse removed)', answer: 'Continuity', why: 'Dead, isolated part → continuity is fine.' },
  { job: 'What does this contactor coil measure? (locked out, one lead lifted)', answer: 'Ω', why: 'Resistance tells you if the coil is open (very high) or shorted (very low).' },
  { job: 'How much current is the motor drawing while running?', answer: 'Clamp A', why: 'A clamp meter reads current around one conductor without breaking the circuit.' },
];

function Meter() {
  const [picks, setPicks] = useState<Record<number, string>>({});
  return (
    <div className={`${box} space-y-3`}>
      {JOBS.map((j, i) => (
        <div key={i}>
          <p className="m-0 mb-1.5 text-sm font-semibold text-heading">{j.job}</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={j.job}>
            {['V', 'Continuity', 'Ω', 'Clamp A'].map((s) => {
              const picked = picks[i] === s;
              const right = picked && s === j.answer;
              return (
                <button key={s} type="button" className="btn btn-sm" aria-pressed={picked} onClick={() => setPicks({ ...picks, [i]: s })} style={picked ? { borderColor: right ? 'var(--live)' : 'var(--alarm)', background: right ? 'var(--live-soft)' : 'var(--alarm-soft)' } : undefined}>
                  {s}
                </button>
              );
            })}
          </div>
          {picks[i] && <p className={`text-xs mt-1 mb-0 ${picks[i] === j.answer ? 'text-live' : 'text-alarm'}`} role="status">{picks[i] === j.answer ? 'Right. ' : 'Not this one. '}{j.why}</p>}
        </div>
      ))}
    </div>
  );
}

const fmt = (x: number, d = 2) => (Number.isFinite(x) ? Number(x.toFixed(d)).toString() : '∞');

/** Two 120 V lamps in series or parallel. Pull one out and see what the other does. */
function SeriesParallel() {
  const [mode, setMode] = useState<'series' | 'parallel'>('series');
  const [r2, setR2] = useState(60);
  const [open2, setOpen2] = useState(false);
  const V = 120, r1 = 60;
  const x = twoLoads(V, r1, r2, mode, open2);
  const glow = (p: number) => Math.min(1, p / 240);
  const lamp = (cx: number, cy: number, p: number, label: string, out = false) => (
    <g>
      <circle cx={cx} cy={cy} r="15" fill={out ? 'var(--surface-sunk)' : `rgba(255, 210, 120, ${0.12 + glow(p) * 0.88})`} stroke="var(--border-strong)" strokeWidth="2" strokeDasharray={out ? '4 4' : undefined} style={!out && p > 1 ? { filter: `drop-shadow(0 0 ${glow(p) * 12}px #ffb547)` } : undefined} />
      <text x={cx} y={cy + 30} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{label}</text>
    </g>
  );
  return (
    <div className={box}>
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="seg" role="group" aria-label="Wiring">
          {(['series', 'parallel'] as const).map((m) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>{m === 'series' ? 'Series' : 'Parallel'}</button>)}
        </div>
        <button type="button" className="btn btn-sm" aria-pressed={open2} onClick={() => setOpen2(!open2)}>{open2 ? 'Put lamp 2 back' : 'Pull lamp 2 out'}</button>
      </div>
      <svg viewBox="0 0 300 140" className="w-full max-w-md mx-auto block" role="img"
        aria-label={`${mode} circuit, 120 volts: lamp 1 ${fmt(x.p[0], 0)} watts, lamp 2 ${open2 ? 'removed' : fmt(x.p[1], 0) + ' watts'}, total current ${fmt(x.iTotal)} amps`}>
        <rect x="8" y="50" width="30" height="40" rx="5" fill="var(--surface-raised)" stroke="var(--blue-glow)" strokeWidth="2" />
        <text x="23" y="74" textAnchor="middle" fontSize="10" fontWeight="800" fill="var(--text-heading)">120V</text>
        {mode === 'series' ? (
          <>
            <path d="M23 50 V20 H280 V120 H23 V90" fill="none" stroke="var(--border-strong)" strokeWidth="3" />
            {lamp(120, 20, x.p[0], 'Lamp 1')}
            {lamp(210, 20, x.p[1], 'Lamp 2', open2)}
          </>
        ) : (
          <>
            <path d="M23 50 V20 H260 M23 90 V120 H260 M150 20 V120 M260 20 V120" fill="none" stroke="var(--border-strong)" strokeWidth="3" />
            {lamp(150, 70, x.p[0], 'Lamp 1')}
            {lamp(260, 70, x.p[1], 'Lamp 2', open2)}
          </>
        )}
      </svg>
      {!open2 && <Slider label="Lamp 2 resistance" value={r2} min={20} max={240} step={10} unit="Ω" onChange={setR2} />}
      <div className="overflow-x-auto rounded-xl border border-line mt-2">
        <table className="w-full text-sm tabular-nums">
          <thead className="bg-raised"><tr><th className="text-left p-2">Lamp 1 (60 Ω)</th><th className="text-left p-2">Lamp 2 ({open2 ? 'out' : `${r2} Ω`})</th><th className="text-left p-2">Total</th></tr></thead>
          <tbody><tr className="border-t border-line">
            <td className="p-2">{fmt(x.v[0], 1)} V · {fmt(x.i[0])} A · {fmt(x.p[0], 0)} W</td>
            <td className="p-2">{fmt(x.v[1], 1)} V · {fmt(x.i[1])} A · {fmt(x.p[1], 0)} W</td>
            <td className="p-2">{fmt(x.rTotal, 1)} Ω · <strong className="text-heading">{fmt(x.iTotal)} A</strong></td>
          </tr></tbody>
        </table>
      </div>
      <p className="text-sm text-muted m-0 mt-2" role="status">
        {mode === 'series'
          ? open2 ? 'One path, now broken: no current anywhere, and the full 120 V shows across the gap.' : 'One path: the same current through both lamps; their voltages add up to 120 V.'
          : open2 ? 'Lamp 1 still has its own path and the full 120 V — it doesn\'t care.' : 'Each lamp sits across the full 120 V; the currents add up at the supply.'}
      </p>
    </div>
  );
}

export function Figure({ id }: { id: FigureId }) {
  switch (id) {
    case 'ohms': return <Ohms />;
    case 'sinksource': return <SinkSource />;
    case 'scaling': return <Scaling />;
    case 'numbers': return <Numbers />;
    case 'scan': return <Scan />;
    case 'hardwired-3wire': return <Hardwired />;
    case 'meter': return <Meter />;
    case 'seriesparallel': return <SeriesParallel />;
  }
}
