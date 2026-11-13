import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { MOTOR_FLA, MOTOR_RPM, MOTOR_SYNC_RPM, MOTOR_T_RATED, OL_RESET_BELOW, OL_TAU_COOL, currentPU, loadTorque, torquePU, type MotorState } from '../../plant/motor';
import { useMemo } from 'react';
import { buzz, sfx } from '../../lib/sound';
import type { SimRuntime } from './runtime';

/** Momentary button: on while pointer/key is held. */
export function PushButton({ label, color, pressed, onChange, hint }: { label: string; color: 'green' | 'red' | 'white'; pressed: boolean; onChange: (v: boolean) => void; hint: string }) {
  const down = () => {
    if (!pressed) {
      buzz(8);
      sfx.tick();
    }
    onChange(true);
  };
  const up = () => onChange(false);
  return (
    <button
      type="button"
      className={`pb pb-${color}`}
      data-pressed={pressed}
      aria-pressed={pressed}
      aria-label={`${label} pushbutton. ${hint}. Hold to press.`}
      onPointerDown={(e) => {
        try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* synthetic or already released */ }
        down();
      }}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault();
          down();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') up();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="pb-cap" />
      {label}
    </button>
  );
}

export function Lamp({ on, color, label }: { on: boolean; color: 'green' | 'amber' | 'red'; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-14">
      <span className="lamp" data-on={on} data-color={color} role="img" aria-label={`${label} light ${on ? 'on' : 'off'}`} />
      <span className="text-xs font-bold">{label}</span>
      <span className="text-2xs font-bold text-muted">{on ? 'ON' : 'OFF'}</span>
    </div>
  );
}

export function MotorPanel({ rt, onDevice, compact }: { rt: SimRuntime; onDevice?: (id: string) => void; compact?: boolean }) {
  const s = rt.scene.state;
  const io = rt.io;
  const [, force] = useState(0);
  const set = (patch: Partial<typeof s>) => {
    Object.assign(s, patch);
    force((x) => x + 1);
    rt.notify();
  };
  const spinDur = s.rpm > 30 ? Math.max(0.05, 60 / s.rpm) * 6 : 0;
  const ampsPct = Math.min(1, s.amps / (MOTOR_FLA * 6));

  return (
    <section className="card card-pad space-y-4" aria-label="Motor start/stop station">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="eyebrow m-0">Machine</p>
          <h2 className="text-base font-bold">Motor start/stop station</h2>
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {s.olTripped && <span className="chip chip-alarm"><Icon name="warn" size={14} /> OL tripped</span>}
          {s.estopIn && <span className="chip chip-alarm"><Icon name="warn" size={14} /> E-stop in</span>}
          {rt.plc.hasForces && <span className="chip chip-warn">FORCE</span>}
        </div>
      </div>

      {/* Operator station */}
      <div className="rounded-2xl border border-line bg-sunk p-3 sm:p-4">
        <p className="text-2xs font-bold tracking-widest uppercase text-muted m-0 mb-3">Operator station</p>
        <div className="flex flex-wrap items-end justify-around gap-x-2 gap-y-4">
          <PushButton label="Start" color="green" pressed={s.startPressed} onChange={(v) => set({ startPressed: v })} hint="Normally open, input I0" />
          <PushButton label="Stop" color="red" pressed={s.stopPressed} onChange={(v) => set({ stopPressed: v })} hint="Normally closed, input I1" />
          <PushButton label="Reset" color="white" pressed={s.resetPressed} onChange={(v) => set({ resetPressed: v })} hint="Fault reset, input I4" />
          <button
            type="button"
            className="pb pb-estop"
            data-pressed={s.estopIn}
            aria-pressed={s.estopIn}
            aria-label={`Emergency stop. ${s.estopIn ? 'Pushed in. Press to twist out and release.' : 'Released. Press to push in.'}`}
            onClick={() => {
              buzz(25);
              sfx.tick();
              set({ estopIn: !s.estopIn });
            }}
          >
            <span className="pb-cap" />
            {s.estopIn ? 'Twist out' : 'E-stop'}
          </button>
          <div className="flex gap-2">
            <Lamp on={Boolean(io.DO[1])} color="green" label="Running" />
            <Lamp on={Boolean(io.DO[2])} color="amber" label="Fault" />
          </div>
        </div>
      </div>

      {/* Field: contactor, overload, motor */}
      {!compact && (
        <div className="grid grid-cols-3 gap-2 items-stretch">
          <button type="button" className="rounded-xl border border-line bg-sunk p-2 text-left cursor-pointer" onClick={() => onDevice?.('coil')} aria-label={`Contactor M1, ${s.contactor ? 'pulled in' : 'dropped out'}. Tap for details.`}>
            <svg viewBox="0 0 80 70" className="w-full h-16" aria-hidden="true">
              <rect x="10" y="6" width="60" height="58" rx="6" fill="var(--dev-body)" stroke="var(--led-off-line)" />
              <rect x="18" y={s.contactor ? 26 : 16} width="44" height="12" rx="3" fill={s.contactor ? 'var(--live)' : 'var(--dev-idle)'} style={{ transition: 'y 0.05s' }} />
              {[24, 40, 56].map((x) => <circle key={x} cx={x} cy="52" r="4" fill="var(--dev-metal)" />)}
            </svg>
            <span className="block text-xs font-bold">M1 contactor</span>
            <span className="block text-2xs text-muted">{s.contactor ? 'Pulled in' : 'Dropped out'}</span>
          </button>
          <button type="button" className="rounded-xl border border-line bg-sunk p-2 text-left cursor-pointer" onClick={() => onDevice?.('ol')} aria-label={`Overload relay, ${s.olTripped ? 'tripped' : 'OK'}, ${Math.round(s.olHeat * 100)}% thermal. Tap for details.`}>
            <svg viewBox="0 0 80 70" className="w-full h-16" aria-hidden="true">
              <rect x="10" y="10" width="60" height="50" rx="6" fill="var(--dev-body)" stroke="var(--led-off-line)" />
              <rect x="16" y="46" width="48" height="6" rx="3" fill="var(--dev-slot)" />
              <rect x="16" y="46" width={48 * Math.min(1, s.olHeat)} height="6" rx="3" fill={s.olHeat > 0.7 ? 'var(--alarm)' : 'var(--warn)'} />
              <rect x="28" y={s.olTripped ? 2 : 14} width="24" height="10" rx="2" fill={s.olTripped ? 'var(--alarm)' : 'var(--dev-idle)'} />
              <text x="40" y="38" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--dev-text)">95-96</text>
            </svg>
            <span className="block text-xs font-bold">Overload</span>
            <span className="block text-2xs text-muted">{s.olTripped ? 'TRIPPED' : `${Math.round(s.olHeat * 100)}% heat`}</span>
          </button>
          <div className="rounded-xl border border-line bg-sunk p-2" role="img" aria-label={`Motor at ${Math.round(s.rpm)} RPM drawing ${s.amps.toFixed(1)} amps${s.jammed ? ', load jammed' : ''}`}>
            <svg viewBox="0 0 80 70" className="w-full h-16" aria-hidden="true">
              <rect x="6" y="18" width="52" height="40" rx="8" fill="var(--dev-motor)" />
              {[24, 30, 36, 42, 48].map((y) => <rect key={y} x="10" y={y} width="44" height="2" fill="var(--dev-fin)" />)}
              <rect x="58" y="34" width="16" height="8" rx="2" fill="var(--dev-shaft)" />
              <g transform="translate(66 38)">
                <g className={spinDur ? 'motor-spin' : ''} style={spinDur ? { animation: `spin ${spinDur}s linear infinite` } : undefined}>
                  <path d="M0 -14 L3 0 L0 14 L-3 0 Z" fill={s.rpm > 30 ? 'var(--live)' : 'var(--dev-shaft)'} />
                  <path d="M-14 0 L0 3 L14 0 L0 -3 Z" fill={s.rpm > 30 ? 'var(--live)' : 'var(--dev-shaft)'} />
                </g>
              </g>
            </svg>
            <span className="block text-xs font-bold">Motor</span>
            <span className="block text-2xs text-muted tabular-nums">{Math.round(s.rpm)} rpm · {s.amps.toFixed(1)} A</span>
            <span className="block h-1.5 rounded-full bg-raised mt-1 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${ampsPct * 100}%`, background: ampsPct > 0.3 ? 'var(--alarm)' : 'var(--live)' }} /></span>
          </div>
        </div>
      )}

      {!compact && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm" aria-pressed={s.jammed} onClick={() => set({ jammed: !s.jammed })}>
            <Icon name="warn" size={16} /> {s.jammed ? 'Clear the jam' : 'Jam the load'}
          </button>
          {(() => {
            const hot = s.olTripped && s.olHeat > OL_RESET_BELOW;
            // Time for the thermal memory to fall to the reset level at zero current.
            const wait = hot ? Math.ceil(OL_TAU_COOL * Math.log(s.olHeat / OL_RESET_BELOW)) : 0;
            return (
              <button type="button" className="btn btn-sm" disabled={!s.olTripped || hot} onClick={() => { rt.scene.resetOverload?.(); force((x) => x + 1); rt.notify(); }}>
                <Icon name="reset" size={16} /> {hot ? `Cooling — reset in ${wait} s` : 'Reset overload'}
              </button>
            );
          })()}
        </div>
      )}

      <MotorCurve s={s} open={!compact} />

      <IoCards rt={rt} onDevice={onDevice} />
      <p className="sr-only" aria-live="polite">{s.contactor ? 'Motor running' : 'Motor stopped'}. {s.olTripped ? 'Overload tripped.' : ''}</p>
      <span className="hidden">{MOTOR_RPM}</span>
    </section>
  );
}

export function IoCards({ rt, onDevice }: { rt: SimRuntime; onDevice?: (id: string) => void }) {
  const io = rt.io;
  const forces = rt.plc.forces;
  const devices = rt.scene.devices;
  const ins = devices.filter((d) => d.io?.kind === 'DI').sort((a, b) => a.io!.point - b.io!.point);
  const outs = devices.filter((d) => d.io?.kind === 'DO').sort((a, b) => a.io!.point - b.io!.point);
  const row = (kind: 'DI' | 'DO', list: typeof ins) => list.length === 0 ? null : (
    <div className="rounded-xl border border-line bg-sunk p-2.5">
      <p className="text-2xs font-bold tracking-widest uppercase text-muted m-0 mb-2">{kind === 'DI' ? 'Input card · 24 VDC' : 'Output card'}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {list.map((d) => {
          const on = kind === 'DI' ? io.DI[d.io!.point] : io.DO[d.io!.point];
          const forced = forces[kind].has(d.io!.point);
          return (
            <button
              type="button"
              key={d.id}
              className="flex flex-col items-center gap-1 rounded-lg py-1.5 min-h-11 hover:bg-raised cursor-pointer relative"
              onClick={() => onDevice?.(d.id)}
              aria-label={`${kind === 'DI' ? 'Input' : 'Output'} ${d.io!.point}, ${d.label}: ${on ? 'ON' : 'OFF'}${forced ? ', forced' : ''}`}
            >
              <span className="io-led" data-on={on} data-kind={kind} />
              <span className="text-2xs font-mono font-bold">{kind === 'DI' ? 'I' : 'O'}{d.io!.point}</span>
              <span className="text-2xs text-muted leading-tight text-center">{d.label}</span>
              {forced && <span className="absolute top-0 right-1 text-2xs font-extrabold text-warn">F</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
  return (
    <div className="grid gap-2">
      {row('DI', ins)}
      {row('DO', outs)}
    </div>
  );
}

/**
 * Live torque–speed chart: the motor's curve, the load's curve, and the operating point moving
 * along them as the motor starts, runs, jams or coasts. Shows why a jam stalls the motor.
 */
function MotorCurve({ s, open }: { s: MotorState; open: boolean }) {
  const W = 300;
  const H = 150;
  const pad = { l: 30, r: 10, t: 10, b: 24 };
  const TMAX = 3.4;
  const x = (rpm: number) => pad.l + (rpm / MOTOR_SYNC_RPM) * (W - pad.l - pad.r);
  const y = (pu: number) => H - pad.b - (Math.min(TMAX, pu) / TMAX) * (H - pad.t - pad.b);
  const curves = useMemo(() => {
    const motor: string[] = [];
    const amps: string[] = [];
    const load: string[] = [];
    for (let i = 0; i <= 90; i++) {
      const rpm = (i / 90) * MOTOR_SYNC_RPM;
      const slip = 1 - rpm / MOTOR_SYNC_RPM;
      motor.push(`${x(rpm).toFixed(1)},${y(torquePU(slip)).toFixed(1)}`);
      amps.push(`${x(rpm).toFixed(1)},${y((currentPU(slip) / 6.5) * TMAX).toFixed(1)}`);
      load.push(`${x(rpm).toFixed(1)},${y(loadTorque(rpm, false) / MOTOR_T_RATED).toFixed(1)}`);
    }
    return { motor: motor.join(' '), amps: amps.join(' '), load: load.join(' ') };
    // the curves depend only on constants
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const tPU = s.torque / MOTOR_T_RATED;
  const lPU = s.loadTorque / MOTOR_T_RATED;
  const running = s.contactor;
  const pt = { cx: x(s.rpm), cy: y(running ? tPU : lPU) };
  const read = [
    ['Speed', `${Math.round(s.rpm)} rpm`],
    ['Slip', running ? `${(s.slip * 100).toFixed(1)} %` : '—'],
    ['Torque', running ? `${Math.round(s.torque)} N·m (${Math.round(tPU * 100)} %)` : '0'],
    ['Current', `${s.amps.toFixed(1)} A (${(s.amps / MOTOR_FLA).toFixed(1)}× FLA)`],
  ];
  return (
    <details className="rounded-xl border border-line bg-sunk p-3 group" open={open}>
      <summary className="cursor-pointer font-bold text-sm text-heading flex items-center justify-between min-h-8">
        Motor physics <span className="text-xs text-muted font-semibold">torque vs speed · live</span>
      </summary>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2" role="group" aria-label="Live motor readings">
        {read.map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line px-2 py-1.5 bg-raised">
            <span className="block text-2xs uppercase tracking-wider text-muted font-bold">{k}</span>
            <span className="block text-sm font-bold text-heading tabular-nums">{v}</span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-2" role="img" aria-label={`Torque-speed chart. Motor at ${Math.round(s.rpm)} rpm, motor torque ${Math.round(tPU * 100)} percent of rated, load ${Math.round(lPU * 100)} percent.${s.jammed ? ' Load is jammed: load torque is above the motor curve, so it stalls.' : ''}`}>
        {[0, 1, 2, 3].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="0.6" />
            <text x={pad.l - 4} y={y(t) + 3} fontSize="8" textAnchor="end" fill="var(--text-muted)">{t * 100}%</text>
          </g>
        ))}
        {[0, 600, 1200, 1800].map((r) => <text key={r} x={x(r)} y={H - 8} fontSize="8" textAnchor="middle" fill="var(--text-muted)">{r}</text>)}
        <text x={W - pad.r} y={H - 1} fontSize="7.5" textAnchor="end" fill="var(--text-muted)">rpm</text>
        <polyline points={curves.amps} fill="none" stroke="var(--warn)" strokeWidth="1.2" strokeDasharray="2 3" opacity="0.75" />
        <polyline points={curves.motor} fill="none" stroke="var(--blue-glow)" strokeWidth="2" strokeLinejoin="round" />
        {s.jammed
          ? <line x1={pad.l} x2={W - pad.r} y1={y(3.2)} y2={y(3.2)} stroke="var(--alarm)" strokeWidth="1.6" strokeDasharray="5 3" />
          : <polyline points={curves.load} fill="none" stroke="var(--text-muted)" strokeWidth="1.4" strokeDasharray="5 3" />}
        <circle cx={pt.cx} cy={pt.cy} r="5" fill={s.jammed && running ? 'var(--alarm)' : running ? 'var(--live)' : 'var(--text-muted)'} stroke="var(--bg)" strokeWidth="1.5" />
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-2xs text-muted mt-1">
        <span><span className="inline-block w-3 h-0.5 align-middle mr-1" style={{ background: 'var(--blue-glow)' }} />Motor torque</span>
        <span><span className="inline-block w-3 h-0.5 align-middle mr-1" style={{ background: s.jammed ? 'var(--alarm)' : 'var(--text-muted)' }} />Load torque{s.jammed ? ' (jammed)' : ''}</span>
        <span><span className="inline-block w-3 h-0.5 align-middle mr-1" style={{ background: 'var(--warn)' }} />Current (0–6.5× FLA)</span>
      </div>
      <p className="text-xs text-muted mt-1.5 mb-0">Where the two curves cross is where the motor settles. Starting current is about 6× nameplate; it falls as speed comes up. Jam the load and the load line rises above the motor curve: it can't accelerate, current stays high, and the overload trips. Illustrative design B–like curve, not a specific motor.</p>
    </details>
  );
}
