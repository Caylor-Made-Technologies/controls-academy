/**
 * Machine — Motor station with a VFD driving a fan (the motor station's motor, now speed-controlled).
 *
 * Field wiring:
 *   DI0 Start PB (NO)   DI1 Stop PB (NC)   DI2 Reset PB (NO)
 *   DI3 Drive healthy relay (closed = no fault)   DI4 Drive running relay   DI5 STO circuit OK (monitor)
 *   AI0 Speed potentiometer via 4–20 mA converter
 *   DO0 Drive RUN (forward) terminal   DO1 Drive fault-reset terminal   DO2 Running light   DO3 Fault light
 *   AO0 Speed reference to the drive, 0–100 % (sent as 4–20 mA or 0–10 V, per the drive's reference setting)
 *
 * All numbers are illustrative generic values for a 10 HP, 460 V drive — not a specific product. // VERIFY
 */
import { program } from '../engine/text';
import { clamp, mA, momentary } from './kit';
import { MOTOR_FLA, MOTOR_T_RATED, OL_TAU_COOL, OL_TAU_HEAT, OL_TRIP, currentPU, torquePU } from './motor';
import type { FaultDef, FieldDevice, PlantScene } from './types';

/** Nominal DC bus for a 460 V supply: √2 × 460 ≈ 650 V. */
export const BUS_NOM = 650;
/** Overvoltage trip level (illustrative). */
export const BUS_OV_TRIP = 810;
/** Braking chopper turn-on level (illustrative). */
export const BUS_CHOPPER = 760;
/** DC bus capacitance, farads (illustrative). */
export const BUS_C = 0.0047;
/** Fan + motor inertia, kg·m² (a heavy fan wheel). */
export const FAN_J = 2.0;
/** Drive + motor losses that soak up regenerated power, W (≈ 8 % of a 7.5 kW drive; illustrative). */
export const DRIVE_LOSS_W = 600;
/** Instantaneous overcurrent trip, × FLA (illustrative). */
export const OC_TRIP = 2.0;
/** Synchronous rpm per Hz for a 4-pole motor: 120 / 4 = 30. */
export const RPM_PER_HZ = 30;

export type DriveFault = '' | 'OC' | 'OV' | 'LOSS OF REF' | 'MOTOR OL';

export interface VfdState {
  startPressed: boolean;
  stopPressed: boolean;
  resetPressed: boolean;
  /** Operator speed pot, 0–100 %. */
  speedPot: number;
  /** Guard/E-stop safety circuit closed (STO inputs powered). */
  stoClosed: boolean;
  // ---- drive parameters (generic names) ----
  control: 'terminals' | 'keypad';
  refSource: '4-20mA' | '0-10V' | 'keypad';
  keypadHz: number;
  keypadRun: boolean;
  accelS: number;
  decelS: number;
  minHz: number;
  maxHz: number;
  stopMode: 'ramp' | 'coast';
  brakeResistor: boolean;
  /** Current limit, × FLA. */
  currentLimit: number;
  // ---- drive internals ----
  hz: number;
  running: boolean;
  fault: DriveFault;
  bus: number;
  /** Motor electronic overload memory 0…1. */
  heat: number;
  // ---- motor + fan ----
  rpm: number;
  amps: number;
  torque: number;
  /** Extra mechanical drag (× rated torque) — a dragging bearing. */
  drag: number;
}

const fresh = (): VfdState => {
  const s = {
    speedPot: 75, stoClosed: true,
    control: 'terminals', refSource: '4-20mA', keypadHz: 30, keypadRun: false,
    accelS: 10, decelS: 30, minHz: 6, maxHz: 60, stopMode: 'ramp', brakeResistor: false, currentLimit: 1.5,
    hz: 0, running: false, fault: '', bus: BUS_NOM, heat: 0,
    rpm: 0, amps: 0, torque: 0, drag: 0,
  } as VfdState;
  return s;
};

/** Fan load torque, N·m: friction plus air load ∝ speed² (≈ 90 % of rated at 1750 rpm), plus any drag. */
export function fanTorque(rpm: number, drag = 0): number {
  const n = Math.abs(rpm) / 1750;
  return MOTOR_T_RATED * (0.04 + 0.9 * n * n + drag) * Math.sign(rpm || 1);
}

/**
 * V/Hz induction motor on a drive: torque and current depend on slip *speed* (sync rpm − rpm), so the same
 * curve as across-the-line operation applies at any frequency (constant flux). Returns per-unit torque and current.
 */
export function vhzMotor(hz: number, rpm: number): { tPU: number; iPU: number } {
  if (hz <= 0.05) return { tPU: 0, iPU: 0 };
  const slipRpm = hz * RPM_PER_HZ - rpm;
  const s = Math.abs(slipRpm) / 1800;
  return { tPU: Math.sign(slipRpm) * torquePU(Math.min(1, s)), iPU: currentPU(Math.min(1, Math.max(1e-5, s))) };
}

export function vfdProgram() {
  return program(
    'Fan on a VFD',
    [
      { name: 'Start_PB', type: 'BOOL', io: { kind: 'DI', point: 0 }, description: 'Start pushbutton (NO)' },
      { name: 'Stop_PB', type: 'BOOL', io: { kind: 'DI', point: 1 }, description: 'Stop pushbutton (NC — ON when not pressed)' },
      { name: 'Reset_PB', type: 'BOOL', io: { kind: 'DI', point: 2 }, description: 'Fault reset pushbutton (NO)' },
      { name: 'Drive_OK', type: 'BOOL', io: { kind: 'DI', point: 3 }, description: 'Drive healthy relay (closed = no fault)' },
      { name: 'Drive_Running', type: 'BOOL', io: { kind: 'DI', point: 4 }, description: 'Drive running relay' },
      { name: 'STO_OK', type: 'BOOL', io: { kind: 'DI', point: 5 }, description: 'Safety circuit closed (STO powered) — monitor only' },
      { name: 'Speed_Pot', type: 'REAL', io: { kind: 'AI', point: 0 }, description: 'Speed potentiometer, 4–20 mA' },
      { name: 'Drive_Run', type: 'BOOL', io: { kind: 'DO', point: 0 }, description: 'Drive RUN terminal' },
      { name: 'Drive_Reset', type: 'BOOL', io: { kind: 'DO', point: 1 }, description: 'Drive fault-reset terminal' },
      { name: 'Run_Light', type: 'BOOL', io: { kind: 'DO', point: 2 }, description: 'Green running light' },
      { name: 'Fault_Light', type: 'BOOL', io: { kind: 'DO', point: 3 }, description: 'Amber fault light' },
      { name: 'Speed_Ref', type: 'REAL', io: { kind: 'AO', point: 0 }, description: 'Speed reference to the drive, 0–100 %' },
      { name: 'Run_Cmd', type: 'BOOL', description: 'Run command (sealed in)' },
    ],
    [
      { text: '[XIC(Start_PB),XIC(Run_Cmd)]XIC(Stop_PB)XIC(Drive_OK)XIC(STO_OK)OTE(Run_Cmd)', comment: '3-wire start/stop. A drive fault or an open safety circuit drops the run command, so it never restarts by itself.' },
      { text: 'XIC(Run_Cmd)OTE(Drive_Run)', comment: 'Run the drive from its terminals.' },
      { text: 'SCP(Speed_Pot,4.0,20.0,0.0,100.0,Speed_Ref)', comment: 'Pot 4–20 mA → 0–100 % speed reference to the drive.' },
      { text: 'XIC(Reset_PB)OTE(Drive_Reset)', comment: 'Pass the reset button through to the drive.' },
      { text: 'XIC(Drive_Running)OTE(Run_Light)', comment: 'Green light from the drive\'s running relay — proof, not just a command.' },
      { text: 'XIO(Drive_OK)OTE(Fault_Light)', comment: 'Amber light on any drive fault.' },
    ],
  );
}

export const VFD_DEVICES: FieldDevice[] = [
  { id: 'start', label: 'Start', kind: 'pb-no', io: { kind: 'DI', point: 0 }, color: 'green', wiring: 'Normally-open pushbutton to input I0.' },
  { id: 'stop', label: 'Stop', kind: 'pb-nc', io: { kind: 'DI', point: 1 }, color: 'red', wiring: 'Normally-closed pushbutton to input I1 (ON when not pressed — fails safe).' },
  { id: 'reset', label: 'Reset', kind: 'pb-no', io: { kind: 'DI', point: 2 }, color: 'white', wiring: 'Fault reset pushbutton to input I2. The PLC passes it to the drive\'s reset terminal.' },
  { id: 'drvok', label: 'Drive OK', kind: 'contact', io: { kind: 'DI', point: 3 }, wiring: 'Drive relay output set to "healthy / no fault": closed while the drive has no fault, to input I3.' },
  { id: 'drvrun', label: 'Drive running', kind: 'contact', io: { kind: 'DI', point: 4 }, wiring: 'Drive relay output set to "running", to input I4.' },
  { id: 'sto', label: 'STO circuit', kind: 'contact', io: { kind: 'DI', point: 5 }, wiring: 'The guard switch and E-stop feed a safety relay that powers the drive\'s Safe Torque Off inputs. A monitor contact goes to input I5 so the program knows.' },
  { id: 'pot', label: 'Speed pot', kind: 'analog', io: { kind: 'AI', point: 0 }, wiring: 'Operator speed potentiometer through a 4–20 mA signal converter to analog input 0.' },
  { id: 'run', label: 'Drive RUN', kind: 'coil', io: { kind: 'DO', point: 0 }, wiring: 'Output O0 to the drive\'s run/forward terminal (24 VDC logic input).' },
  { id: 'drvreset', label: 'Drive reset', kind: 'coil', io: { kind: 'DO', point: 1 }, wiring: 'Output O1 to the drive\'s fault-reset terminal.' },
  { id: 'runlt', label: 'Running', kind: 'light', io: { kind: 'DO', point: 2 }, color: 'green', wiring: 'Green pilot light on output O2.' },
  { id: 'faultlt', label: 'Fault', kind: 'light', io: { kind: 'DO', point: 3 }, color: 'amber', wiring: 'Amber pilot light on output O3.' },
  { id: 'ref', label: 'Speed reference', kind: 'analog', io: { kind: 'AO', point: 0 }, wiring: 'Analog output 0 to the drive\'s analog reference input, as 4–20 mA (or 0–10 V, per the drive setting). Shielded pair, shield grounded at one end.' },
  { id: 'drive', label: 'VFD', kind: 'coil', wiring: 'The drive: 480 V three-phase in (L1-L2-L3), motor out (T1-T2-T3). Its DC bus stays charged after power is removed.' },
];

export const VFD_FAULTS: FaultDef[] = [
  { id: 'vfd-oc', title: 'Accel time far too short', difficulty: 2, culprit: 'params',
    complaint: 'The fan drive trips on "OC" (overcurrent) every time it starts.',
    cause: 'Someone set the acceleration time to 0.5 s and turned the current limit off. A heavy fan can\'t follow, slip and current shoot past the overcurrent trip.',
    howToFind: 'The drive fault log says OC during acceleration. The motor and cable test fine. Look at the accel time and current limit parameters.',
    readings: 'Motor current spikes past 2× FLA within a second of starting; the DC bus is normal (~650 VDC).',
    fix: 'Set accel back to a sensible time for the fan (here 10 s) and turn the current limit back on, then test a start. Record the parameter change.',
    safety: 'Read and change parameters from the keypad or software with the drive stopped; never open the drive cover while powered.' },
  { id: 'vfd-ov', title: 'Decel too fast with no braking resistor', difficulty: 2, culprit: 'params',
    complaint: 'The fan drive trips on "OV" (overvoltage) every time someone presses Stop.',
    cause: 'Decel time was cut from 30 s to 2 s. The heavy fan drives the motor as a generator and pushes energy back onto the DC bus faster than the drive can get rid of it.',
    howToFind: 'Trips only on stopping. Watch the DC bus voltage while stopping: it climbs past the trip level. Starting and running are fine.',
    readings: 'DC bus rises from ~650 VDC to over ~800 VDC during the stop; motor current is moderate.',
    fix: 'Lengthen the decel time (here 30 s), use coast-to-stop for a fan, or add a braking resistor if the drive has a chopper.',
    safety: 'The DC bus can be 650–800 VDC and stays charged after power is removed. Verify it is near zero with a rated meter before touching the drive\'s terminals.' },
  { id: 'vfd-sto', title: 'Safety circuit open (STO)', difficulty: 1, culprit: 'sto',
    complaint: 'The fan won\'t start. The drive keypad says "STO".',
    cause: 'A guard switch on the fan housing is open, so the safety relay removed power from the drive\'s Safe Torque Off inputs.',
    howToFind: 'The PLC sees STO_OK off and won\'t issue a run command. Check the guard, the E-stop and the safety relay before anything else.',
    readings: 'STO input terminals at the drive: 0 VDC (should be 24 VDC). Safety relay outputs open.',
    fix: 'Find out why the guard is open, close it properly (or repair the switch with the correct safety-rated part), reset the safety relay, then start normally.',
    safety: 'Never jumper STO inputs or a guard switch. STO removes torque, not voltage — the drive and motor leads can still be live.' },
  { id: 'vfd-ref', title: 'Broken speed-reference wire', difficulty: 3, culprit: 'ref',
    complaint: 'The fan drive keeps faulting on "loss of reference" and won\'t run.',
    cause: 'The 4–20 mA speed reference wire from the PLC analog output to the drive is broken. The drive sees 0 mA and faults (that\'s what live zero is for).',
    howToFind: 'The PLC analog output shows a normal value, but the drive\'s reference input reads 0 mA. Half-split the wire between them.',
    readings: 'PLC AO0 terminal: normal mA. Drive reference input: 0 mA.',
    fix: 'Lock out, repair the conductor or termination, check the shield, then confirm the drive sees the right reference.',
    safety: 'Reference wiring runs in the drive cabinet next to 480 V: lock out before working at the drive terminals.' },
  { id: 'vfd-ol', title: 'Dragging fan bearing', difficulty: 2, culprit: 'motor',
    complaint: 'The fan runs a while, then the drive trips on "motor overload".',
    cause: 'A failing fan bearing adds drag, so the motor draws more than its full-load current until the drive\'s motor overload protection trips.',
    howToFind: 'Motor current at full speed is well above nameplate FLA. Parameters are fine. Check the mechanics: bearing, belt tension, a rubbing wheel.',
    readings: 'Motor current ~1.5× FLA at full speed; DC bus normal; overload meter on the keypad climbing.',
    fix: 'Lock out, repair the bearing, check the fan turns freely by hand, then let the overload cool and reset.',
    safety: 'Lock out and wait for the fan to stop completely — a big fan wheel coasts for minutes — before opening the housing.' },
];

export function createVfdScene(): PlantScene<VfdState> {
  let mo = momentary(fresh(), ['startPressed', 'stopPressed', 'resetPressed']);
  const init = () => {
    const s = fresh();
    mo = momentary(s, ['startPressed', 'stopPressed', 'resetPressed']);
    return s;
  };
  let lastReset = false;
  const scene: PlantScene<VfdState> = {
    id: 'vfd',
    title: 'Fan on a VFD',
    summary: 'Speed control, accel/decel ramps, analog reference, STO and drive faults.',
    site: 'datacenter',
    devices: VFD_DEVICES,
    state: init(),
    faults: VFD_FAULTS,
    activeFault: null,
    program: vfdProgram,
    huntChoices: [{ id: 'params', label: 'A drive parameter is wrong' }, { id: 'logic', label: 'The program is wrong' }],
    sound: { hum: (s) => Math.abs(s.rpm) / 1770, contactor: (s) => s.running },
    setFault(id) {
      scene.activeFault = id;
      const s = scene.state;
      if (id === 'vfd-oc') { s.accelS = 0.5; s.currentLimit = 0; }
      if (id === 'vfd-ov') { s.decelS = 2; s.brakeResistor = false; s.stopMode = 'ramp'; }
      if (id === 'vfd-sto') s.stoClosed = false;
      if (id === 'vfd-ol') { s.drag = 0.9; s.heat = 0.85; }
    },
    reset() { scene.state = init(); scene.activeFault = null; },
    step(dtMs, io) {
      const s = scene.state;
      const dt = dtMs / 1000;
      // ---- Field inputs to the PLC ----
      io.DI[0] = mo.held('startPressed');
      io.DI[1] = !mo.held('stopPressed');
      io.DI[2] = mo.held('resetPressed');
      mo.tick(dtMs);
      io.AI[0] = mA(s.speedPot / 100);

      // ---- Drive: what reference and run command does it see? ----
      const refWireBroken = scene.activeFault === 'vfd-ref';
      const aoPct = clamp(io.AO[0], 0, 100);
      const refMa = refWireBroken ? 0 : 4 + 0.16 * aoPct;
      const refV = refWireBroken ? 0 : 0.1 * aoPct;
      const runCmd = s.control === 'keypad' ? s.keypadRun : io.DO[0];
      if (s.refSource === '4-20mA' && runCmd && refMa < 2 && !s.fault) s.fault = 'LOSS OF REF';
      // Reset on a rising edge of the reset terminal (or keypad) once the cause is gone.
      const resetNow = io.DO[1];
      if (resetNow && !lastReset && s.fault) {
        const cleared = s.fault === 'MOTOR OL' ? s.heat < 0.8 : s.fault === 'LOSS OF REF' ? refMa >= 2 || s.refSource !== '4-20mA' : s.fault === 'OV' ? s.bus < BUS_OV_TRIP - 40 : true;
        if (cleared) s.fault = '';
      }
      lastReset = resetNow;

      const refPct = s.refSource === 'keypad' ? (s.keypadHz / s.maxHz) * 100 : s.refSource === '4-20mA' ? clamp(((refMa - 4) / 16) * 100, 0, 100) : clamp(refV * 10, 0, 100);
      const enabled = runCmd && !s.fault && s.stoClosed;
      const target = enabled ? clamp(s.minHz + (refPct / 100) * (s.maxHz - s.minHz), s.minHz, s.maxHz) : 0;

      // ---- Ramp + motor + DC bus, in 1 ms substeps ----
      const steps = Math.max(1, Math.ceil(dt / 0.001));
      const h = dt / steps;
      let w = (s.rpm * 2 * Math.PI) / 60;
      for (let k = 0; k < steps; k++) {
        const outputOn = !s.fault && s.stoClosed && (enabled || (s.stopMode === 'ramp' && s.hz > 0.2 && s.running));
        if (!outputOn) { s.hz = 0; s.running = false; }
        else {
          s.running = true;
          const rateUp = s.maxHz / Math.max(0.1, s.accelS);
          const rateDn = s.maxHz / Math.max(0.1, s.decelS);
          const goal = enabled ? target : 0;
          let next = s.hz + clamp(goal - s.hz, -rateDn * h, rateUp * h);
          // Current limit: hold the ramp (accelerating or decelerating) while current is over the limit.
          if (s.currentLimit > 0 && s.amps > s.currentLimit * MOTOR_FLA) next = s.hz;
          // Overvoltage stall-prevention is off here on purpose: the lesson is what a short decel does.
          s.hz = next;
          if (!enabled && s.hz <= 0.2) { s.hz = 0; s.running = false; }
        }
        const rpm = (w * 60) / (2 * Math.PI);
        const m = s.running ? vhzMotor(s.hz, rpm) : { tPU: 0, iPU: 0 };
        const te = m.tPU * MOTOR_T_RATED;
        const tl = fanTorque(rpm, s.drag);
        // At standstill, friction holds the shaft until motor torque beats it.
        const net = Math.abs(w) < 1e-3 && te <= Math.abs(tl) ? 0 : te - tl;
        const wNext = w + (net / FAN_J) * h;
        w = w > 0 && wNext < 0 ? 0 : wNext;
        s.torque = te;
        s.amps = s.running ? MOTOR_FLA * m.iPU : 0;
        // DC bus: regenerated power (motor torque opposing rotation) charges the capacitors; losses and the
        // braking chopper drain it; the supply rectifier holds it up to nominal.
        const pMech = te * w; // > 0 motoring, < 0 generating
        const pIn = pMech < 0 ? -pMech * 0.85 : 0;
        const chopper = s.brakeResistor && s.bus > BUS_CHOPPER ? 15000 : 0;
        const e = 0.5 * BUS_C * s.bus * s.bus + (pIn - DRIVE_LOSS_W - chopper) * h;
        s.bus = Math.max(BUS_NOM, Math.sqrt(Math.max(0, (2 * e) / BUS_C)));
        if (s.bus >= BUS_OV_TRIP && !s.fault) s.fault = 'OV';
        if (s.amps > OC_TRIP * MOTOR_FLA && !s.fault) s.fault = 'OC';
      }
      s.rpm = (w * 60) / (2 * Math.PI);
      if (Math.abs(s.rpm) < 0.5) s.rpm = 0;
      if (!s.running) s.amps = 0;
      // Motor electronic overload (same I² model as the overload relay).
      const r = s.amps / MOTOR_FLA;
      const th = s.heat * OL_TRIP;
      const next = th + (r * r - th) * Math.min(1, dt / (r * r > th ? OL_TAU_HEAT : OL_TAU_COOL));
      s.heat = Math.max(0, next / OL_TRIP);
      if (s.heat >= 1 && !s.fault) s.fault = 'MOTOR OL';

      // ---- Drive relay outputs back to the PLC ----
      io.DI[3] = !s.fault;
      io.DI[4] = s.running && s.hz > 0.5;
      io.DI[5] = s.stoClosed;
    },
    meterPoints(io) {
      const s = scene.state;
      const refMa = scene.activeFault === 'vfd-ref' ? 0 : 4 + 0.16 * clamp(io.AO[0], 0, 100);
      const v = (on: boolean) => ({ value: on ? 24 : 0, unit: 'VDC' as const });
      return [
        { id: 'psu', label: '24 VDC supply (+ to −)', read: () => ({ value: 24, unit: 'VDC' }) },
        { id: 'line', label: 'Drive input L1-L2 (480 V, energized work)', read: () => ({ value: 480, unit: 'VAC' }) },
        { id: 'bus', label: 'Drive DC bus DC+ to DC− (energized work)', read: () => ({ value: Math.round(s.bus), unit: 'VDC' }) },
        { id: 'motor', label: 'Drive output T1-T2', read: () => ({ value: Math.round((460 * s.hz) / 60), unit: 'VAC' }) },
        { id: 'ao0', label: 'PLC analog output AO0', read: () => ({ value: Number((4 + 0.16 * clamp(io.AO[0], 0, 100)).toFixed(2)), unit: 'mA' }) },
        { id: 'refin', label: 'Drive reference input', read: () => ({ value: Number(refMa.toFixed(2)), unit: 'mA' }) },
        { id: 'stoin', label: 'Drive STO input terminals', read: () => v(s.stoClosed) },
        { id: 'o0', label: 'Output O0 (drive RUN terminal)', read: () => v(io.DO[0]) },
        { id: 'i3', label: 'Input I3 (drive OK relay)', read: () => v(io.DI[3]) },
      ];
    },
    ui: {
      controls: [
        { kind: 'momentary', field: 'startPressed', label: 'Start', color: 'green', hint: 'Normally open, input I0' },
        { kind: 'momentary', field: 'stopPressed', label: 'Stop', color: 'red', hint: 'Normally closed, input I1' },
        { kind: 'momentary', field: 'resetPressed', label: 'Reset', color: 'white', hint: 'Fault reset, input I2' },
        { kind: 'toggle', field: 'stoClosed', label: 'Fan guard', on: 'Closed', off: 'OPEN', hint: 'Guard switch in the STO safety circuit' },
        { kind: 'slider', field: 'speedPot', label: 'Speed pot', min: 0, max: 100, step: 1, unit: '%', hint: 'Operator speed potentiometer, to the PLC as 4–20 mA' },
        { settings: true, kind: 'selector', field: 'refSource', label: 'Drive reference source', options: [{ value: '4-20mA', label: '4–20 mA' }, { value: '0-10V', label: '0–10 V' }, { value: 'keypad', label: 'Keypad' }], hint: 'Where the drive takes its speed from' },
        { settings: true, kind: 'selector', field: 'stopMode', label: 'Stop mode', options: [{ value: 'ramp', label: 'Ramp' }, { value: 'coast', label: 'Coast' }], hint: 'Ramp down on the decel time, or let it coast' },
        { settings: true, kind: 'toggle', field: 'brakeResistor', label: 'Braking resistor', on: 'Fitted', off: 'None', hint: 'Dumps regenerated energy above the chopper level' },
        { settings: true, kind: 'slider', field: 'accelS', label: 'Accel time', min: 0.5, max: 30, step: 0.5, unit: 's', hint: 'Time from 0 to max frequency' },
        { settings: true, kind: 'slider', field: 'decelS', label: 'Decel time', min: 0.5, max: 60, step: 0.5, unit: 's', hint: 'Time from max frequency to 0' },
        { settings: true, kind: 'slider', field: 'keypadHz', label: 'Keypad speed', min: 0, max: 60, step: 1, unit: 'Hz', hint: 'Used when the reference source is the keypad' },
      ],
      indicators: [
        { kind: 'light', label: 'Running', color: 'green', on: (_s, io) => io.DO[2] },
        { kind: 'light', label: 'Fault', color: 'amber', on: (_s, io) => io.DO[3] },
        { kind: 'text', label: 'Drive keypad', value: (s) => (s.fault ? `FAULT: ${s.fault}` : !s.stoClosed ? 'STO — safe torque off' : s.running ? `${s.hz.toFixed(1)} Hz · ${s.amps.toFixed(1)} A` : 'READY · 0.0 Hz') },
        { kind: 'gauge', label: 'Output frequency', unit: 'Hz', max: 60, value: (s) => s.hz },
        { kind: 'gauge', label: 'Motor current', unit: 'A', max: MOTOR_FLA * 2.2, value: (s) => s.amps, warn: MOTOR_FLA * 1.15 },
        { kind: 'gauge', label: 'DC bus', unit: 'V', max: 850, value: (s) => s.bus, warn: BUS_CHOPPER, digits: 0 },
        { kind: 'gauge', label: 'Fan speed', unit: 'rpm', max: 1800, value: (s) => Math.abs(s.rpm), digits: 0 },
        { kind: 'gauge', label: 'Motor overload', unit: '%', max: 100, value: (s) => s.heat * 100, warn: 80, digits: 0 },
      ],
      trend: [
        { label: 'Hz × 1.67', color: 'var(--blue-glow)', value: (s) => s.hz * (100 / 60) },
        { label: 'Amps % of 2× FLA', color: 'var(--warn)', value: (s) => (s.amps / (MOTOR_FLA * 2)) * 100 },
        { label: 'DC bus (600–850 V)', color: 'var(--alarm)', value: (s) => ((s.bus - 600) / 250) * 100 },
      ],
      trendMax: 100,
      settingsTitle: 'Drive parameters (generic names)',
    },
  };
  return scene;
}
