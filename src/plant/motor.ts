/**
 * Scene 1 — Motor start/stop station (3-wire control, seal-in, overload, hardwired E-stop).
 *
 * Field wiring (24 VDC inputs, 120 VAC coil circuit):
 *   DI0 Start PB (NO)           DI1 Stop PB (NC — input is ON when NOT pressed)
 *   DI2 Overload 95-96 (NC)     DI3 Contactor M1 aux 13-14 (NO)
 *   DI4 Fault reset PB (NO)     DI5 E-stop monitor contact (NC)
 *   DO0 M1 coil (through the E-stop and OL contacts, hardwired)
 *   DO1 Green "running" light   DO2 Amber "fault" light
 */
import { program } from '../engine/text';
import type { Program } from '../engine/types';
import type { FaultDef, FieldDevice, PlantScene } from './types';

export interface MotorState {
  startPressed: boolean;
  stopPressed: boolean;
  resetPressed: boolean;
  /** E-stop mushroom pushed in (latched until twisted out). */
  estopIn: boolean;
  /** Overload relay tripped (manual reset on the device). */
  olTripped: boolean;
  /** Overload thermal memory 0…1 (trips at 1). */
  olHeat: number;
  /** Contactor main contacts closed. */
  contactor: boolean;
  /** 0…1 pull-in progress (contactor takes ~30 ms). */
  pull: number;
  rpm: number;
  amps: number;
  /** Mechanical load is jammed (fault injection or "jam it" button). */
  jammed: boolean;
  /** Motor (electromagnetic) torque and load torque, N·m. */
  torque: number;
  loadTorque: number;
  /** Slip 0…1 (1 = locked rotor). */
  slip: number;
  /** Line voltage seen at the motor terminals, 0…1 of nameplate (dips during inrush). */
  volts: number;
}

export const MOTOR_FLA = 14; // amps, a typical 10 HP 460 V motor nameplate value (illustrative)
export const MOTOR_RPM = 1770;
/** Synchronous speed of a 4-pole motor on 60 Hz. */
export const MOTOR_SYNC_RPM = 1800;
/** Rated (full-load) torque: 10 HP at 1770 rpm ≈ 40 N·m. */
export const MOTOR_T_RATED = (7457 / (MOTOR_RPM * 2 * Math.PI / 60));
/** Motor + coupled load inertia, kg·m² (illustrative small conveyor). */
export const INERTIA = 0.22;

const SR = 1 - MOTOR_RPM / MOTOR_SYNC_RPM; // rated slip ≈ 1.7 %

/**
 * Illustrative NEMA design B–like torque–speed curve, per-unit of rated torque.
 * Kloss's formula gives the breakdown hump near low slip; a deep-bar term lifts starting torque.
 * Locked rotor ≈ 1.5×, breakdown ≈ 2.5×, 1.0× at rated slip.
 */
export function torquePU(slip: number): number {
  const s = Math.max(1e-5, Math.min(1, slip));
  const sk = 0.085;
  const tb = 2.4;
  const kloss = (2 * tb) / (s / sk + sk / s);
  const k = 1 / ((2 * tb) / (SR / sk + sk / SR) + 1.05 * SR); // normalize so T(SR) = 1
  return (kloss + 1.05 * s) * k;
}

/**
 * Line current per-unit of FLA from a simplified equivalent circuit: rotor branch that depends on
 * slip, plus a magnetizing current in quadrature. ≈ 6× at locked rotor, ≈ 1× at rated, ≈ 0.37× no-load.
 */
export function currentPU(slip: number): number {
  const s = Math.max(1e-5, Math.min(1, slip));
  const a = 0.01753;
  const b = 0.1659;
  const ir = 1 / Math.sqrt((a / s) ** 2 + b * b);
  return Math.sqrt(ir * ir + 0.35 * 0.35);
}

/** Load torque, N·m: breakaway friction plus a conveyor-like load that rises a little with speed. */
export function loadTorque(rpm: number, jammed: boolean): number {
  const n = Math.max(0, rpm) / MOTOR_RPM;
  if (jammed) return MOTOR_T_RATED * 3.2; // more than breakdown torque: the motor stalls
  const breakaway = rpm < 5 ? 0.25 : 0.08;
  return MOTOR_T_RATED * (breakaway + 0.55 + 0.12 * n * n);
}

/**
 * Overload thermal model (illustrative Class 10): heat θ follows I² with a time constant, and trips at
 * 1.15² × FLA² (service-factor pickup). From cold, 600 % current trips in about 5 s.
 */
export const OL_TAU_HEAT = 134;
export const OL_TAU_COOL = 28;
export const OL_TRIP = 1.15 * 1.15;
/** The relay can be reset only once it has cooled below this fraction of the trip level. */
export const OL_RESET_BELOW = 0.8;

/**
 * Shortest press the machine sees, in simulated ms. A tap that starts and ends between two sim steps (a slow
 * phone, a busy page) would otherwise never reach the inputs; the press is held for this long in sim time.
 */
export const MIN_PRESS_MS = 60;

type Momentary = 'startPressed' | 'stopPressed' | 'resetPressed';
const MOMENTARY: Momentary[] = ['startPressed', 'stopPressed', 'resetPressed'];

const fresh = (): MotorState => {
  const raw: Record<Momentary, boolean> = { startPressed: false, stopPressed: false, resetPressed: false };
  const hold: Record<Momentary, number> = { startPressed: 0, stopPressed: 0, resetPressed: 0 };
  const st = {
    estopIn: false,
    olTripped: false, olHeat: 0, contactor: false, pull: 0, rpm: 0, amps: 0, jammed: false,
    torque: 0, loadTorque: 0, slip: 1, volts: 1,
  } as MotorState;
  for (const k of MOMENTARY) {
    Object.defineProperty(st, k, {
      enumerable: true,
      get: () => raw[k],
      set: (v: boolean) => { if (v && !raw[k]) hold[k] = MIN_PRESS_MS; raw[k] = v; },
    });
  }
  Object.defineProperty(st, 'held', { enumerable: false, value: (k: Momentary) => raw[k] || hold[k] > 0 });
  Object.defineProperty(st, 'tickHold', { enumerable: false, value: (dtMs: number) => { for (const k of MOMENTARY) hold[k] = Math.max(0, hold[k] - dtMs); } });
  return st;
};

/** Pressed now, or released so recently that the minimum press time hasn't run out. */
const held = (s: MotorState, k: Momentary) => (s as unknown as { held(k: Momentary): boolean }).held(k);

export function motorProgram(): Program {
  return program(
    'Motor start/stop',
    [
      { name: 'Start_PB', type: 'BOOL', io: { kind: 'DI', point: 0 }, description: 'Start pushbutton, normally open' },
      { name: 'Stop_PB', type: 'BOOL', io: { kind: 'DI', point: 1 }, description: 'Stop pushbutton, normally closed (ON = not pressed)' },
      { name: 'OL_OK', type: 'BOOL', io: { kind: 'DI', point: 2 }, description: 'Overload 95-96 contact (ON = healthy)' },
      { name: 'M1_Aux', type: 'BOOL', io: { kind: 'DI', point: 3 }, description: 'Contactor auxiliary contact (ON = pulled in)' },
      { name: 'Reset_PB', type: 'BOOL', io: { kind: 'DI', point: 4 }, description: 'Fault reset pushbutton' },
      { name: 'EStop_OK', type: 'BOOL', io: { kind: 'DI', point: 5 }, description: 'E-stop monitor contact (ON = E-stop released)' },
      { name: 'Motor_Run', type: 'BOOL', io: { kind: 'DO', point: 0 }, description: 'M1 contactor coil' },
      { name: 'Run_Light', type: 'BOOL', io: { kind: 'DO', point: 1 }, description: 'Green running pilot light' },
      { name: 'Fault_Light', type: 'BOOL', io: { kind: 'DO', point: 2 }, description: 'Amber fault pilot light' },
      { name: 'Fail_Tmr', type: 'TIMER', initial: 2000, description: 'Fail-to-start timer: 2 s for the aux contact to prove the contactor pulled in' },
      { name: 'Fail_Alarm', type: 'BOOL', description: 'Latched fail-to-start alarm' },
    ],
    [
      { text: '[XIC(Start_PB),XIC(Motor_Run)]XIC(Stop_PB)XIC(EStop_OK)XIC(OL_OK)XIO(Fail_Alarm)OTE(Motor_Run)', comment: '3-wire start/stop. Motor_Run seals itself in around the Start button. Stop, E-stop, overload or an alarm break the seal.' },
      { text: 'XIC(Motor_Run)XIO(M1_Aux)TON(Fail_Tmr)', comment: 'If we call for the motor but the aux contact hasn\'t proven the contactor pulled in within 2 s…' },
      { text: 'XIC(Fail_Tmr.DN)OTL(Fail_Alarm)', comment: '…latch a fail-to-start alarm. It stays on until someone looks and resets it.' },
      { text: 'XIC(Reset_PB)OTU(Fail_Alarm)', comment: 'Reset clears the alarm.' },
      { text: 'XIC(Motor_Run)XIC(M1_Aux)OTE(Run_Light)', comment: 'Green light only when called AND proven running.' },
      { text: '[XIC(Fail_Alarm),XIO(OL_OK)]OTE(Fault_Light)', comment: 'Amber light for any fault.' },
    ],
  );
}

export const MOTOR_DEVICES: FieldDevice[] = [
  { id: 'start', label: 'Start', kind: 'pb-no', io: { kind: 'DI', point: 0 }, color: 'green', wiring: 'Normally-open pushbutton. +24 V → button → input I0. Pressing it closes the contact and turns the input ON.' },
  { id: 'stop', label: 'Stop', kind: 'pb-nc', io: { kind: 'DI', point: 1 }, color: 'red', wiring: 'Normally-CLOSED pushbutton. Input I1 is ON when nobody is touching it. A broken wire looks exactly like someone pressing Stop — that\'s the point: it fails safe.' },
  { id: 'ol', label: 'Overload', kind: 'contact', io: { kind: 'DI', point: 2 }, wiring: 'Overload relay contact 95-96 (normally closed). Opens when the motor draws too much current for too long. Wired in series with the coil AND to input I2 so the PLC knows.' },
  { id: 'aux', label: 'M1 aux', kind: 'contact', io: { kind: 'DI', point: 3 }, wiring: 'Auxiliary contact 13-14 on the contactor. Closes when the contactor actually pulls in — proof, not just a command.' },
  { id: 'reset', label: 'Reset', kind: 'pb-no', io: { kind: 'DI', point: 4 }, color: 'white', wiring: 'Fault reset pushbutton, normally open, to input I4.' },
  { id: 'estop', label: 'E-stop', kind: 'estop', io: { kind: 'DI', point: 5 }, color: 'red', wiring: 'Mushroom-head E-stop with two normally-closed contacts. One is hardwired in series with the contactor coil (removes power no matter what the PLC does). The second goes to input I5 so the program drops its seal-in.' },
  { id: 'coil', label: 'M1 coil', kind: 'coil', io: { kind: 'DO', point: 0 }, wiring: 'Output O0 → E-stop contact → OL 95-96 → contactor coil A1-A2. Every safety device is in series with the coil, in hardware.' },
  { id: 'runlt', label: 'Running', kind: 'light', io: { kind: 'DO', point: 1 }, color: 'green', wiring: 'Green pilot light on output O1.' },
  { id: 'faultlt', label: 'Fault', kind: 'light', io: { kind: 'DO', point: 2 }, color: 'amber', wiring: 'Amber pilot light on output O2.' },
];

export const MOTOR_FAULTS: FaultDef[] = [
  { id: 'fuse', title: 'Blown control fuse', difficulty: 1, culprit: 'fuse',
    complaint: 'Nothing works. No lights, motor won\'t start.',
    cause: 'The 24 VDC control fuse is open. No input can turn on and the output card has no field power.',
    howToFind: 'Every input LED is off, even the normally-closed ones (Stop, OL, E-stop) that should be on. When *everything* is dead, check power first: meter across the fuse — voltage across a fuse that should be closed means it\'s open.',
    readings: 'Across the control fuse: 24 VDC (an open fuse has the full supply across it). Every input terminal: 0 V. Supply + to −: 24 VDC.',
    fix: 'Find why it blew (a short or ground on the 24 V circuit), fix that, then replace the fuse with the same type and rating.',
    safety: 'Pulling a fuse in a live panel can draw an arc: measure live only as a qualified person in PPE, then lock out to replace it.' },
  { id: 'stopwire', title: 'Broken Stop button wire', difficulty: 2, culprit: 'stop',
    complaint: 'Motor won\'t start. Start button does nothing.',
    cause: 'The wire from the Stop button to input I1 is broken, so the PLC sees Stop as pressed all the time.',
    howToFind: 'Stop_PB input is OFF even though nobody is pressing it. Meter at the I1 terminal reads 0 V; at the button\'s supply side 24 V. Half-split between them.',
    readings: 'Stop button supply side: 24 VDC. Input I1 terminal: 0 V. The break is between them.',
    fix: 'Lock out, find the broken or loose conductor between the button and I1, repair or replace it, then test Stop.',
    safety: 'Measuring along the circuit is energized work (qualified, PPE); the repair itself is done locked out.' },
  { id: 'startworn', title: 'Worn Start contact', difficulty: 2, culprit: 'start',
    complaint: 'Motor won\'t start, but stop and reset seem fine.',
    cause: 'The Start button\'s contact block is worn and never closes.',
    howToFind: 'Watch input I0 while the operator presses Start: the LED never comes on. Every other permissive in rung 0 is true.',
    readings: 'Input I0 terminal: 0 V even while Start is held; the button\'s supply terminal: 24 VDC.',
    fix: 'Replace the Start contact block, then test start and stop.',
    safety: 'Changing a contact block in the operator station is done with control power locked out.' },
  { id: 'coilopen', title: 'Open contactor coil', difficulty: 3, culprit: 'coil',
    complaint: 'Press Start: the amber fault light comes on after a couple of seconds.',
    cause: 'The contactor coil is burned open. The PLC turns O0 on, but the contactor never pulls in, so the aux contact never proves it.',
    howToFind: 'Output O0 LED is on and the terminal has voltage, but the contactor doesn\'t move and M1_Aux stays off. Measure voltage at the coil A1-A2: voltage present + no pull-in = bad coil (after LOTOTO, check coil resistance: open/infinite).',
    readings: 'Output O0 terminal: 120 VAC. Coil A1-A2: 120 VAC with no pull-in. Locked out, the coil reads open (OL / infinite ohms).',
    fix: 'Replace the contactor coil (or the contactor), confirm the coil voltage on its label, then test.',
    safety: 'Coil voltage and motor power are both in the starter: lock out the disconnect and verify absence of voltage before replacing anything.' },
  { id: 'jam', title: 'Jammed load → overload trip', difficulty: 1, culprit: 'ol',
    complaint: 'Motor ran a few seconds then stopped. Amber light is on.',
    cause: 'The driven load is jammed. The motor drew locked-rotor current and the overload relay tripped to protect it.',
    howToFind: 'OL_OK input is off and the trip indicator on the overload is showing. Don\'t just reset it — find out WHY it tripped (jam, bad bearing, single-phasing) before restarting.',
    readings: 'OL contact 95-96: open (Input I2 terminal 0 V). Motor current before the trip: near locked-rotor (about 6× FLA).',
    fix: 'Lock out, clear the jam, check the load turns freely, let the overload cool, then reset it and restart.',
    safety: 'Never reach into a jammed conveyor or reset the overload until the machine is locked out and the cause is found.' },
  { id: 'forced', title: 'Output left forced OFF', difficulty: 3, culprit: 'force',
    complaint: 'Motor stopped working after last night\'s maintenance. Logic looks fine.',
    cause: 'Someone forced output O0 OFF while testing and never removed the force.',
    howToFind: 'Rung 0 is true (Motor_Run is on in logic), but the output never reaches the field. The controller\'s FORCE indicator is on. Check the force table, document, remove the force.',
    readings: 'Output O0 terminal: 0 VAC although rung 0 is true; all inputs read normally.',
    fix: 'Document why the force was there, remove it with authorization, check the FORCE indicator is off, then test.',
    safety: 'Removing a force can start the motor immediately — clear the area and tell the operators first.' },
  { id: 'auxfail', title: 'Failed auxiliary contact', difficulty: 3, culprit: 'aux',
    complaint: 'Motor starts, hums for two seconds, then shuts off with a fault light.',
    cause: 'The aux contact block fell off the contactor. The motor really runs, but the PLC never gets proof, so the fail-to-start timer trips.',
    howToFind: 'The contactor pulls in and the motor turns, but M1_Aux stays off. The logic is doing exactly what it should — the feedback device failed.',
    readings: 'Coil A1-A2: 120 VAC and the motor runs; Input I3 terminal (aux 14): 0 V.',
    fix: 'Re-seat or replace the auxiliary contact block, then test that M1_Aux follows the contactor.',
    safety: 'Work on the contactor with the starter locked out; the main contacts carry motor power.' },
  { id: 'estopin', title: 'E-stop pushed in', difficulty: 1, culprit: 'estop',
    complaint: 'Motor won\'t start and the line is dead.',
    cause: 'Someone hit the E-stop and nobody twisted it back out.',
    howToFind: 'Check the obvious first: E-stops, overloads, air. EStop_OK input is off. Before resetting, find out who pushed it and why.',
    readings: 'Input I5 terminal (E-stop): 0 V; coil circuit open at the E-stop contact.',
    fix: 'Find out who pressed it and why, make the area safe, then twist it out and restart normally.',
    safety: 'An E-stop pressed for a reason means someone may be in danger — never release it until you know why.' },
];

export function createMotorScene(): PlantScene<MotorState> {
  const scene: PlantScene<MotorState> = {
    id: 'motor',
    title: 'Motor start/stop station',
    devices: MOTOR_DEVICES,
    state: fresh(),
    faults: MOTOR_FAULTS,
    activeFault: null,
    program: motorProgram,
    view3d: 'motor-panel',
    huntChoices: [{ id: 'fuse', label: 'Control power / fuse' }, { id: 'force', label: 'A force is installed' }, { id: 'logic', label: 'The program is wrong' }],
    armFault(id, plc) { if (id === 'forced') plc.forces.DO.set(0, false); },
    sound: { hum: (st) => st.rpm / MOTOR_RPM, contactor: (st) => st.contactor },
    setFault(id) {
      scene.activeFault = id;
      if (id === 'jam') scene.state.jammed = true;
      if (id === 'estopin') scene.state.estopIn = true;
    },
    reset() {
      scene.state = fresh();
      scene.activeFault = null;
    },
    resetOverload() {
      const st = scene.state;
      if (!st.olTripped || st.olHeat > OL_RESET_BELOW) return false;
      st.olTripped = false;
      return true;
    },
    step(dtMs, io) {
      const s = scene.state;
      const f = scene.activeFault;
      const dt = dtMs / 1000;
      const ctrlPower = f !== 'fuse';

      // ---- Inputs (24 VDC sinking card; contact closed = input ON) ----
      const di = io.DI;
      di[0] = ctrlPower && held(s, 'startPressed') && f !== 'startworn';
      di[1] = ctrlPower && !held(s, 'stopPressed') && f !== 'stopwire';
      di[2] = ctrlPower && !s.olTripped;
      di[3] = ctrlPower && s.contactor && f !== 'auxfail';
      di[4] = ctrlPower && held(s, 'resetPressed');
      (s as unknown as { tickHold(dt: number): void }).tickHold(dtMs);
      di[5] = ctrlPower && !s.estopIn;

      // ---- Coil circuit (hardwired): output → E-stop → OL 95-96 → coil ----
      const coilPowered = ctrlPower && io.DO[0] && !s.estopIn && !s.olTripped;
      const coilWorks = coilPowered && f !== 'coilopen';
      s.pull = Math.max(0, Math.min(1, s.pull + (coilWorks ? dt / 0.03 : -dt / 0.02)));
      s.contactor = s.pull >= 1 ? true : s.pull <= 0 ? false : s.contactor;

      // ---- Motor mechanics: J·dω/dt = T_motor(slip) − T_load(ω), integrated in 1 ms substeps ----
      const steps = Math.max(1, Math.ceil(dtMs / 1));
      const h = dt / steps;
      const wSync = (MOTOR_SYNC_RPM * 2 * Math.PI) / 60;
      let w = (s.rpm * 2 * Math.PI) / 60;
      let te = 0;
      let tl = 0;
      for (let k = 0; k < steps; k++) {
        const slip = 1 - w / wSync;
        // Inrush pulls the supply down a little; torque goes with V².
        const v = s.contactor ? 1 - 0.06 * Math.min(1, currentPU(slip) / 6) : 0;
        te = s.contactor ? torquePU(slip) * MOTOR_T_RATED * v * v : 0;
        tl = loadTorque((w * 60) / (2 * Math.PI), s.jammed);
        // Friction holds a stopped shaft: no motion until motor torque beats breakaway.
        let net = te - tl;
        if (w <= 0 && net < 0) net = 0;
        w = Math.max(0, Math.min(wSync, w + (net / INERTIA) * h));
        s.volts = v || 1;
      }
      s.rpm = (w * 60) / (2 * Math.PI);
      if (s.rpm < 0.5) s.rpm = 0;
      s.slip = 1 - s.rpm / MOTOR_SYNC_RPM;
      s.torque = te;
      s.loadTorque = tl;
      s.amps = s.contactor ? MOTOR_FLA * currentPU(s.slip) * s.volts : 0;

      // ---- Overload: thermal memory follows I², trips at the pickup level, cools when current is low ----
      const ratio = s.amps / MOTOR_FLA;
      const th = s.olHeat * OL_TRIP;
      const target2 = ratio * ratio;
      const tau = target2 > th ? OL_TAU_HEAT : OL_TAU_COOL;
      const next = th + (target2 - th) * Math.min(1, dt / tau);
      s.olHeat = Math.max(0, next / OL_TRIP);
      if (s.olHeat >= 1) s.olTripped = true;
    },
        meterPoints(io) {
      const s = scene.state;
      const f = scene.activeFault;
      const ctrl = f !== 'fuse';
      const v = (on: boolean) => ({ value: on ? 24 : 0, unit: 'VDC' as const });
      return [
        { id: 'psu', label: '24 VDC supply (+ to −)', read: () => ({ value: 24, unit: 'VDC' }) },
        { id: 'fuse', label: 'Across the control fuse', read: () => ({ value: ctrl ? 0 : 24, unit: 'VDC' }) },
        { id: 'i0', label: 'Input I0 terminal (Start)', read: () => v(io.DI[0]) },
        { id: 'i1', label: 'Input I1 terminal (Stop)', read: () => v(io.DI[1]) },
        { id: 'stopsupply', label: 'Stop button supply side', read: () => v(ctrl) },
        { id: 'i2', label: 'Input I2 terminal (OL 96)', read: () => v(io.DI[2]) },
        { id: 'i3', label: 'Input I3 terminal (aux 14)', read: () => v(io.DI[3]) },
        { id: 'i5', label: 'Input I5 terminal (E-stop)', read: () => v(io.DI[5]) },
        { id: 'o0', label: 'Output O0 terminal', read: () => ({ value: ctrl && io.DO[0] ? 120 : 0, unit: 'VAC' }) },
        { id: 'coil', label: 'Contactor coil A1-A2', read: () => ({ value: ctrl && io.DO[0] && !s.estopIn && !s.olTripped ? 120 : 0, unit: 'VAC' }) },
      ];
    },
  };
  return scene;
}
