import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { MOTOR_DEVICES, MOTOR_FLA, MOTOR_RPM } from '../../plant/motor';
import { buzz, sfx } from '../../lib/sound';
import type { SimRuntime } from './runtime';

/** Momentary button: on while pointer/key is held. */
function PushButton({ label, color, pressed, onChange, hint }: { label: string; color: 'green' | 'red' | 'white'; pressed: boolean; onChange: (v: boolean) => void; hint: string }) {
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
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
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

function Lamp({ on, color, label }: { on: boolean; color: 'green' | 'amber' | 'red'; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[56px]">
      <span className="lamp" data-on={on} data-color={color} role="img" aria-label={`${label} light ${on ? 'on' : 'off'}`} />
      <span className="text-[0.72rem] font-bold">{label}</span>
      <span className="text-[0.62rem] font-bold text-muted">{on ? 'ON' : 'OFF'}</span>
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
        <p className="text-[0.7rem] font-bold tracking-widest uppercase text-muted m-0 mb-3">Operator station</p>
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
              <rect x="10" y="6" width="60" height="58" rx="6" fill="#2a3242" stroke="#3a4558" />
              <rect x="18" y={s.contactor ? 26 : 16} width="44" height="12" rx="3" fill={s.contactor ? 'var(--live)' : '#5b6a80'} style={{ transition: 'y 0.05s' }} />
              {[24, 40, 56].map((x) => <circle key={x} cx={x} cy="52" r="4" fill="#8a96a8" />)}
            </svg>
            <span className="block text-[0.72rem] font-bold">M1 contactor</span>
            <span className="block text-[0.66rem] text-muted">{s.contactor ? 'Pulled in' : 'Dropped out'}</span>
          </button>
          <button type="button" className="rounded-xl border border-line bg-sunk p-2 text-left cursor-pointer" onClick={() => onDevice?.('ol')} aria-label={`Overload relay, ${s.olTripped ? 'tripped' : 'OK'}, ${Math.round(s.olHeat * 100)}% thermal. Tap for details.`}>
            <svg viewBox="0 0 80 70" className="w-full h-16" aria-hidden="true">
              <rect x="10" y="10" width="60" height="50" rx="6" fill="#2a3242" stroke="#3a4558" />
              <rect x="16" y="46" width="48" height="6" rx="3" fill="#1a2030" />
              <rect x="16" y="46" width={48 * Math.min(1, s.olHeat)} height="6" rx="3" fill={s.olHeat > 0.7 ? 'var(--alarm)' : 'var(--warn)'} />
              <rect x="28" y={s.olTripped ? 2 : 14} width="24" height="10" rx="2" fill={s.olTripped ? 'var(--alarm)' : '#5b6a80'} />
              <text x="40" y="38" textAnchor="middle" fontSize="11" fontWeight="800" fill="#c9d3e0">95-96</text>
            </svg>
            <span className="block text-[0.72rem] font-bold">Overload</span>
            <span className="block text-[0.66rem] text-muted">{s.olTripped ? 'TRIPPED' : `${Math.round(s.olHeat * 100)}% heat`}</span>
          </button>
          <div className="rounded-xl border border-line bg-sunk p-2" role="img" aria-label={`Motor at ${Math.round(s.rpm)} RPM drawing ${s.amps.toFixed(1)} amps${s.jammed ? ', load jammed' : ''}`}>
            <svg viewBox="0 0 80 70" className="w-full h-16" aria-hidden="true">
              <rect x="6" y="18" width="52" height="40" rx="8" fill="#334155" />
              {[24, 30, 36, 42, 48].map((y) => <rect key={y} x="10" y={y} width="44" height="2" fill="#475569" />)}
              <rect x="58" y="34" width="16" height="8" rx="2" fill="#94a3b8" />
              <g transform="translate(66 38)">
                <g className={spinDur ? 'motor-spin' : ''} style={spinDur ? { animation: `spin ${spinDur}s linear infinite` } : undefined}>
                  <path d="M0 -14 L3 0 L0 14 L-3 0 Z" fill={s.rpm > 30 ? 'var(--live)' : '#94a3b8'} />
                  <path d="M-14 0 L0 3 L14 0 L0 -3 Z" fill={s.rpm > 30 ? 'var(--live)' : '#94a3b8'} />
                </g>
              </g>
            </svg>
            <span className="block text-[0.72rem] font-bold">Motor</span>
            <span className="block text-[0.66rem] text-muted tabular-nums">{Math.round(s.rpm)} rpm · {s.amps.toFixed(1)} A</span>
            <span className="block h-1.5 rounded-full bg-raised mt-1 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${ampsPct * 100}%`, background: ampsPct > 0.3 ? 'var(--alarm)' : 'var(--live)' }} /></span>
          </div>
        </div>
      )}

      {!compact && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm" aria-pressed={s.jammed} onClick={() => set({ jammed: !s.jammed })}>
            <Icon name="warn" size={16} /> {s.jammed ? 'Clear the jam' : 'Jam the load'}
          </button>
          <button type="button" className="btn btn-sm" disabled={!s.olTripped} onClick={() => set({ olTripped: false, olHeat: Math.min(s.olHeat, 0.6) })}>
            <Icon name="reset" size={16} /> Reset overload
          </button>
        </div>
      )}

      <IoCards rt={rt} onDevice={onDevice} />
      <p className="sr-only" aria-live="polite">{s.contactor ? 'Motor running' : 'Motor stopped'}. {s.olTripped ? 'Overload tripped.' : ''}</p>
      <span className="hidden">{MOTOR_RPM}</span>
    </section>
  );
}

export function IoCards({ rt, onDevice }: { rt: SimRuntime; onDevice?: (id: string) => void }) {
  const io = rt.io;
  const forces = rt.plc.forces;
  const ins = MOTOR_DEVICES.filter((d) => d.io?.kind === 'DI').sort((a, b) => a.io!.point - b.io!.point);
  const outs = MOTOR_DEVICES.filter((d) => d.io?.kind === 'DO').sort((a, b) => a.io!.point - b.io!.point);
  const row = (kind: 'DI' | 'DO', list: typeof ins) => (
    <div className="rounded-xl border border-line bg-sunk p-2.5">
      <p className="text-[0.68rem] font-bold tracking-widest uppercase text-muted m-0 mb-2">{kind === 'DI' ? 'Input card · 24 VDC' : 'Output card'}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {list.map((d) => {
          const on = kind === 'DI' ? io.DI[d.io!.point] : io.DO[d.io!.point];
          const forced = forces[kind].has(d.io!.point);
          return (
            <button
              type="button"
              key={d.id}
              className="flex flex-col items-center gap-1 rounded-lg py-1.5 min-h-[44px] hover:bg-raised cursor-pointer relative"
              onClick={() => onDevice?.(d.id)}
              aria-label={`${kind === 'DI' ? 'Input' : 'Output'} ${d.io!.point}, ${d.label}: ${on ? 'ON' : 'OFF'}${forced ? ', forced' : ''}`}
            >
              <span className="io-led" data-on={on} data-kind={kind} />
              <span className="text-[0.62rem] font-mono font-bold">{kind === 'DI' ? 'I' : 'O'}{d.io!.point}</span>
              <span className="text-[0.6rem] text-muted leading-tight text-center">{d.label}</span>
              {forced && <span className="absolute top-0 right-1 text-[0.55rem] font-extrabold text-warn">F</span>}
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
