/**
 * Shared building blocks for machines. SI units inside; tested in tests/unit/kit.test.ts.
 * Motor curves come from the motor station (motor.ts) so every machine behaves the same way.
 */
import { MOTOR_FLA, MOTOR_SYNC_RPM, MOTOR_T_RATED, OL_TAU_COOL, OL_TAU_HEAT, OL_TRIP, currentPU, torquePU } from './motor';

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** First-order lag toward a target with time constant tau (s). */
export const lag = (x: number, target: number, tau: number, dt: number) => x + (target - x) * Math.min(1, dt / Math.max(1e-6, tau));

/** 4–20 mA from a 0–1 fraction of range, and back. */
export const mA = (frac: number) => 4 + 16 * clamp(frac, 0, 1);
export const fracFromMa = (ma: number) => (ma - 4) / 16;

/**
 * Momentary pushbutton fields with a minimum press time in simulated ms, so a tap that starts and ends
 * between two sim steps still reaches the inputs (see B-005).
 */
export function momentary<K extends string>(state: object, fields: K[], minMs = 60) {
  const raw = {} as Record<K, boolean>;
  const hold = {} as Record<K, number>;
  for (const k of fields) {
    raw[k] = false;
    hold[k] = 0;
    Object.defineProperty(state, k, {
      enumerable: true,
      get: () => raw[k],
      set: (v: boolean) => { if (v && !raw[k]) hold[k] = minMs; raw[k] = v; },
    });
  }
  return {
    held: (k: K) => raw[k] || hold[k] > 0,
    tick: (dtMs: number) => { for (const k of fields) hold[k] = Math.max(0, hold[k] - dtMs); },
  };
}

/** A three-phase induction motor driving a load. rpm is signed (negative = reverse). */
export interface MotorSim {
  rpm: number;
  amps: number;
  torque: number;
  /** Overload thermal memory 0…1 (trips at 1). */
  heat: number;
  tripped: boolean;
}

export const newMotor = (): MotorSim => ({ rpm: 0, amps: 0, torque: 0, heat: 0, tripped: false });

export interface MotorDrive {
  /** -1 reverse, 0 off, +1 forward (which contactor is in). */
  dir: -1 | 0 | 1;
  /** Load torque at full speed as a fraction of rated (0.6 ≈ a loaded conveyor). */
  loadPU: number;
  /** Load jammed: more torque than the motor's breakdown torque. */
  jammed?: boolean;
  /** Shaft inertia, kg·m². */
  inertia?: number;
  /** Motor full-load amps (nameplate). */
  fla?: number;
  /** Overload relay setting in amps (defaults to the motor FLA). */
  olFla?: number;
}

/**
 * Advance the motor by dt seconds: J·dω/dt = T_motor(slip) − T_load, in 1 ms substeps. Running against the
 * field (plugging) puts slip above 1: high current and full braking torque.
 */
export function motorStep(m: MotorSim, d: MotorDrive, dt: number): MotorSim {
  const J = d.inertia ?? 0.22;
  const steps = Math.max(1, Math.ceil(dt / 0.001));
  const h = dt / steps;
  const wSyncMag = (MOTOR_SYNC_RPM * 2 * Math.PI) / 60;
  let w = (m.rpm * 2 * Math.PI) / 60;
  let te = 0;
  let amps = 0;
  for (let k = 0; k < steps; k++) {
    let tl = 0;
    const sgn = Math.sign(w);
    const n = Math.abs(w) / wSyncMag;
    if (d.jammed) tl = MOTOR_T_RATED * 3.2;
    else tl = MOTOR_T_RATED * ((Math.abs(w) < 0.5 ? 0.2 : 0.05) + d.loadPU * (0.85 + 0.15 * n * n));
    if (d.dir === 0) {
      te = 0;
      amps = 0;
    } else {
      const wSync = d.dir * wSyncMag;
      const slip = 1 - w / wSync; // 0 at sync, 1 stopped, up to 2 when plugging from full speed
      te = d.dir * torquePU(Math.min(1, slip)) * MOTOR_T_RATED;
      amps = (d.fla ?? MOTOR_FLA) * currentPU(Math.min(1, slip)) * (slip > 1 ? 1.1 : 1);
    }
    // Load torque always opposes motion; at standstill it holds the shaft until motor torque beats it.
    let net: number;
    if (Math.abs(w) < 1e-3) net = Math.abs(te) > tl ? te - Math.sign(te) * tl : 0;
    else net = te - sgn * tl;
    const wNext = w + (net / J) * h;
    w = sgn !== 0 && Math.sign(wNext) !== sgn && d.dir === 0 ? 0 : wNext;
    w = clamp(w, -wSyncMag, wSyncMag);
  }
  const ratio = amps / (d.olFla ?? d.fla ?? MOTOR_FLA);
  const th = m.heat * OL_TRIP;
  const target2 = ratio * ratio;
  const next = th + (target2 - th) * Math.min(1, dt / (target2 > th ? OL_TAU_HEAT : OL_TAU_COOL));
  const heat = Math.max(0, next / OL_TRIP);
  let rpm = (w * 60) / (2 * Math.PI);
  if (Math.abs(rpm) < 0.5) rpm = 0;
  return { rpm, amps, torque: te, heat, tripped: m.tripped || heat >= 1 };
}

/** Overload can be reset once it has cooled below 80 % of trip. */
export const canResetOverload = (m: MotorSim) => m.tripped && m.heat <= 0.8;
