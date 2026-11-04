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
}

export const MOTOR_FLA = 14; // amps, a typical small 480 V motor nameplate value (illustrative)
export const MOTOR_RPM = 1770;

const fresh = (): MotorState => ({
  startPressed: false, stopPressed: false, resetPressed: false, estopIn: false,
  olTripped: false, olHeat: 0, contactor: false, pull: 0, rpm: 0, amps: 0, jammed: false,
});

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
    howToFind: 'Every input LED is off, even the normally-closed ones (Stop, OL, E-stop) that should be on. When *everything* is dead, check power first: meter across the fuse — voltage across a fuse that should be closed means it\'s open.' },
  { id: 'stopwire', title: 'Broken Stop button wire', difficulty: 2, culprit: 'stop',
    complaint: 'Motor won\'t start. Start button does nothing.',
    cause: 'The wire from the Stop button to input I1 is broken, so the PLC sees Stop as pressed all the time.',
    howToFind: 'Stop_PB input is OFF even though nobody is pressing it. Meter at the I1 terminal reads 0 V; at the button\'s supply side 24 V. Half-split between them.' },
  { id: 'startworn', title: 'Worn Start contact', difficulty: 2, culprit: 'start',
    complaint: 'Motor won\'t start, but stop and reset seem fine.',
    cause: 'The Start button\'s contact block is worn and never closes.',
    howToFind: 'Watch input I0 while the operator presses Start: the LED never comes on. Every other permissive in rung 0 is true.' },
  { id: 'coilopen', title: 'Open contactor coil', difficulty: 3, culprit: 'coil',
    complaint: 'Press Start: the amber fault light comes on after a couple of seconds.',
    cause: 'The contactor coil is burned open. The PLC turns O0 on, but the contactor never pulls in, so the aux contact never proves it.',
    howToFind: 'Output O0 LED is on and the terminal has voltage, but the contactor doesn\'t move and M1_Aux stays off. Measure voltage at the coil A1-A2: voltage present + no pull-in = bad coil (after LOTOTO, check coil resistance: open/infinite).' },
  { id: 'jam', title: 'Jammed load → overload trip', difficulty: 1, culprit: 'ol',
    complaint: 'Motor ran a few seconds then stopped. Amber light is on.',
    cause: 'The driven load is jammed. The motor drew locked-rotor current and the overload relay tripped to protect it.',
    howToFind: 'OL_OK input is off and the trip indicator on the overload is showing. Don\'t just reset it — find out WHY it tripped (jam, bad bearing, single-phasing) before restarting.' },
  { id: 'forced', title: 'Output left forced OFF', difficulty: 3, culprit: 'force',
    complaint: 'Motor stopped working after last night\'s maintenance. Logic looks fine.',
    cause: 'Someone forced output O0 OFF while testing and never removed the force.',
    howToFind: 'Rung 0 is true (Motor_Run is on in logic), but the output never reaches the field. The controller\'s FORCE indicator is on. Check the force table, document, remove the force.' },
  { id: 'auxfail', title: 'Failed auxiliary contact', difficulty: 3, culprit: 'aux',
    complaint: 'Motor starts, hums for two seconds, then shuts off with a fault light.',
    cause: 'The aux contact block fell off the contactor. The motor really runs, but the PLC never gets proof, so the fail-to-start timer trips.',
    howToFind: 'The contactor pulls in and the motor turns, but M1_Aux stays off. The logic is doing exactly what it should — the feedback device failed.' },
  { id: 'estopin', title: 'E-stop pushed in', difficulty: 1, culprit: 'estop',
    complaint: 'Motor won\'t start and the line is dead.',
    cause: 'Someone hit the E-stop and nobody twisted it back out.',
    howToFind: 'Check the obvious first: E-stops, overloads, air. EStop_OK input is off. Before resetting, find out who pushed it and why.' },
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
    setFault(id) {
      scene.activeFault = id;
      if (id === 'jam') scene.state.jammed = true;
      if (id === 'estopin') scene.state.estopIn = true;
    },
    reset() {
      scene.state = fresh();
      scene.activeFault = null;
    },
    step(dtMs, io) {
      const s = scene.state;
      const f = scene.activeFault;
      const dt = dtMs / 1000;
      const ctrlPower = f !== 'fuse';

      // ---- Inputs (24 VDC sinking card; contact closed = input ON) ----
      const di = io.DI;
      di[0] = ctrlPower && s.startPressed && f !== 'startworn';
      di[1] = ctrlPower && !s.stopPressed && f !== 'stopwire';
      di[2] = ctrlPower && !s.olTripped;
      di[3] = ctrlPower && s.contactor && f !== 'auxfail';
      di[4] = ctrlPower && s.resetPressed;
      di[5] = ctrlPower && !s.estopIn;

      // ---- Coil circuit (hardwired): output → E-stop → OL 95-96 → coil ----
      const coilPowered = ctrlPower && io.DO[0] && !s.estopIn && !s.olTripped;
      const coilWorks = coilPowered && f !== 'coilopen';
      s.pull = Math.max(0, Math.min(1, s.pull + (coilWorks ? dt / 0.03 : -dt / 0.02)));
      s.contactor = s.pull >= 1 ? true : s.pull <= 0 ? false : s.contactor;

      // ---- Motor mechanics and current ----
      const target = s.contactor ? (s.jammed ? 0 : MOTOR_RPM) : 0;
      const tau = s.contactor ? 0.45 : 1.6; // spins up faster than it coasts down
      s.rpm += (target - s.rpm) * Math.min(1, dt / tau);
      if (s.rpm < 1) s.rpm = 0;
      if (s.contactor) {
        // Current falls from ~6× FLA (locked rotor) to ~0.8 FLA as speed comes up.
        const slip = 1 - s.rpm / MOTOR_RPM;
        s.amps = MOTOR_FLA * (0.8 + 5.2 * Math.pow(slip, 1.5));
      } else s.amps = 0;

      // ---- Overload: simple I²t thermal model, roughly a "Class 10" feel (illustrative) ----
      const ratio = s.amps / MOTOR_FLA;
      const heatIn = ratio > 1.15 ? (ratio * ratio - 1) / 60 : 0;
      const coolOut = 0.02;
      s.olHeat = Math.max(0, s.olHeat + (heatIn - (heatIn ? 0 : coolOut)) * dt);
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
