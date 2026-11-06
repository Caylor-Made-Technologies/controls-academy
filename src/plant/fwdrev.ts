/**
 * Machine — Forward/reverse starter on a flour-mill screw conveyor.
 *
 *   DI0 Forward PB (NO)  DI1 Reverse PB (NO)  DI2 Stop PB (NC)  DI3 Overload 95-96 (NC)
 *   DI4 F aux 13-14      DI5 R aux 13-14      DI6 Zero-speed switch (closed when the screw is stopped)
 *   DO0 F contactor coil DO1 R contactor coil DO2 Forward light DO3 Reverse light
 * Hardwired: an NC aux of R is in series with F's coil and vice versa (electrical interlock), and a lever
 * between the contactors (mechanical interlock). The program adds a third, logic interlock.
 */
import { program } from '../engine/text';
import { canResetOverload, momentary, motorStep, newMotor, type MotorSim } from './kit';
import { MOTOR_FLA } from './motor';
import type { FaultDef, FieldDevice, PlantScene } from './types';

export interface FwdRevState {
  fwdPressed: boolean;
  revPressed: boolean;
  stopPressed: boolean;
  /** Contactor states (main contacts closed). */
  f: boolean;
  r: boolean;
  motor: MotorSim;
  /** A choke in the screw (more load). */
  choked: boolean;
}

export function fwdRevProgram() {
  return program(
    'Forward/reverse screw conveyor',
    [
      { name: 'Fwd_PB', type: 'BOOL', io: { kind: 'DI', point: 0 }, description: 'Forward pushbutton (NO)' },
      { name: 'Rev_PB', type: 'BOOL', io: { kind: 'DI', point: 1 }, description: 'Reverse pushbutton (NO)' },
      { name: 'Stop_PB', type: 'BOOL', io: { kind: 'DI', point: 2 }, description: 'Stop pushbutton (NC)' },
      { name: 'OL_OK', type: 'BOOL', io: { kind: 'DI', point: 3 }, description: 'Overload 95-96 (NC)' },
      { name: 'F_Aux', type: 'BOOL', io: { kind: 'DI', point: 4 }, description: 'Forward contactor aux 13-14' },
      { name: 'R_Aux', type: 'BOOL', io: { kind: 'DI', point: 5 }, description: 'Reverse contactor aux 13-14' },
      { name: 'Zero_Speed', type: 'BOOL', io: { kind: 'DI', point: 6 }, description: 'Zero-speed switch: ON when the screw has stopped' },
      { name: 'Fwd_Run', type: 'BOOL', io: { kind: 'DO', point: 0 }, description: 'Forward contactor coil' },
      { name: 'Rev_Run', type: 'BOOL', io: { kind: 'DO', point: 1 }, description: 'Reverse contactor coil' },
      { name: 'Fwd_Light', type: 'BOOL', io: { kind: 'DO', point: 2 }, description: 'Forward running light' },
      { name: 'Rev_Light', type: 'BOOL', io: { kind: 'DO', point: 3 }, description: 'Reverse running light' },
    ],
    [
      { text: '[XIC(Fwd_PB)XIC(Zero_Speed),XIC(Fwd_Run)]XIC(Stop_PB)XIC(OL_OK)XIO(Rev_Run)XIO(R_Aux)OTE(Fwd_Run)', comment: 'Forward: starts only from standstill (zero-speed switch, no plugging), and only if reverse is neither called nor proven in (logic interlock).' },
      { text: '[XIC(Rev_PB)XIC(Zero_Speed),XIC(Rev_Run)]XIC(Stop_PB)XIC(OL_OK)XIO(Fwd_Run)XIO(F_Aux)OTE(Rev_Run)', comment: 'Reverse: the mirror image. The hardwired interlocks still protect if this logic is wrong.' },
      { text: 'XIC(Fwd_Run)XIC(F_Aux)OTE(Fwd_Light)', comment: 'Lights only when called AND proven.' },
      { text: 'XIC(Rev_Run)XIC(R_Aux)OTE(Rev_Light)' },
    ],
  );
}

export const FWDREV_DEVICES: FieldDevice[] = [
  { id: 'fwd', label: 'Forward', kind: 'pb-no', io: { kind: 'DI', point: 0 }, color: 'green', wiring: 'Normally-open pushbutton to input I0.' },
  { id: 'rev', label: 'Reverse', kind: 'pb-no', io: { kind: 'DI', point: 1 }, color: 'green', wiring: 'Normally-open pushbutton to input I1.' },
  { id: 'stop', label: 'Stop', kind: 'pb-nc', io: { kind: 'DI', point: 2 }, color: 'red', wiring: 'Normally-closed pushbutton to input I2 (fails safe).' },
  { id: 'ol', label: 'Overload', kind: 'contact', io: { kind: 'DI', point: 3 }, wiring: 'Overload 95-96 (NC) in series with both coils, and to input I3.' },
  { id: 'faux', label: 'F aux', kind: 'contact', io: { kind: 'DI', point: 4 }, wiring: 'Forward contactor aux 13-14 (NO) to input I4 — proof F pulled in.' },
  { id: 'raux', label: 'R aux', kind: 'contact', io: { kind: 'DI', point: 5 }, wiring: 'Reverse contactor aux 13-14 (NO) to input I5 — proof R pulled in.' },
  { id: 'zss', label: 'Zero speed', kind: 'sensor', io: { kind: 'DI', point: 6 }, wiring: 'Zero-speed switch on the screw shaft: closed when stopped, to input I6. Prevents reversing a turning screw.' },
  { id: 'fcoil', label: 'F coil', kind: 'coil', io: { kind: 'DO', point: 0 }, wiring: 'Output O0 → R contactor NC aux (electrical interlock) → OL 95-96 → F coil A1-A2.' },
  { id: 'rcoil', label: 'R coil', kind: 'coil', io: { kind: 'DO', point: 1 }, wiring: 'Output O1 → F contactor NC aux (electrical interlock) → OL 95-96 → R coil A1-A2.' },
  { id: 'fwdlt', label: 'Fwd light', kind: 'light', io: { kind: 'DO', point: 2 }, color: 'green', wiring: 'Pilot light on output O2.' },
  { id: 'revlt', label: 'Rev light', kind: 'light', io: { kind: 'DO', point: 3 }, color: 'green', wiring: 'Pilot light on output O3.' },
];

export const FWDREV_FAULTS: FaultDef[] = [
  { id: 'fr-raux', title: 'Reverse aux contact stuck closed', difficulty: 2, culprit: 'raux',
    complaint: 'Reverse works. Forward does nothing — no click, no light.',
    cause: 'The reverse contactor\'s aux contact is stuck closed, so the PLC thinks reverse is still pulled in and the logic interlock blocks forward.',
    howToFind: 'Output O0 never turns on. Rung 0 is false at XIO(R_Aux): input I5 is ON although the R contactor is clearly open.',
    readings: 'Input I5 terminal: 24 VDC with R dropped out. Output O0: 0 VAC.',
    fix: 'Replace the R aux contact block, then test both directions and the interlock.',
    safety: 'Lock out the starter before replacing contact blocks; the main contacts carry 480 V.' },
  { id: 'fr-fcoil', title: 'Forward contactor coil open', difficulty: 2, culprit: 'fcoil',
    complaint: 'Forward doesn\'t run. Reverse is fine. The forward light never comes on.',
    cause: 'The F coil is burned open. The PLC turns O0 on but the contactor never pulls in.',
    howToFind: 'Unlike a logic block, here O0 IS on — but F_Aux never proves. Voltage at the F coil with no pull-in = bad coil.',
    readings: 'Output O0: 120 VAC. F coil A1-A2: 120 VAC, no pull-in. Locked out: coil reads open.',
    fix: 'Replace the F coil (correct voltage), then test both directions.',
    safety: 'Lock out and verify before changing a coil; check the interlock lever still moves freely after reassembly.' },
  { id: 'fr-zss', title: 'Zero-speed switch failed open', difficulty: 3, culprit: 'zss',
    complaint: 'After a shutdown, the screw won\'t start in either direction.',
    cause: 'The zero-speed switch failed open, so the PLC always thinks the screw is still turning and won\'t let it start (anti-plugging).',
    howToFind: 'Both starts fail at XIC(Zero_Speed). Input I6 is off with the shaft clearly stopped.',
    readings: 'Input I6 terminal: 0 VDC with the screw stopped. Switch supply side: 24 VDC.',
    fix: 'Repair or replace the zero-speed switch and set its gap/target per the maker, then test.',
    safety: 'Never jumper the zero-speed input to "get it going" — reversing a turning screw breaks gearboxes and throws material. Lock out the screw drive to work at the shaft.' },
  { id: 'fr-choke', title: 'Choked screw trips the overload', difficulty: 1, culprit: 'ol',
    complaint: 'The screw ran a few seconds, groaned and stopped. Neither direction will start now.',
    cause: 'Product packed into the screw (a choke). The motor stalled and the overload tripped.',
    howToFind: 'OL_OK (I3) is off and the overload flag is showing. Find out why before resetting: clear the choke first.',
    readings: 'Input I3 terminal: 0 VDC (95-96 open). Motor current before the trip: about 6× FLA.',
    fix: 'Lock out, clear the choke, check the screw turns, let the overload cool, reset, restart.',
    safety: 'Screw conveyors are a classic amputation hazard. Lock out, try out and block the screw before opening a cover — never reach in while it can move.' },
];

export function createFwdRevScene(): PlantScene<FwdRevState> {
  let mo: ReturnType<typeof momentary<'fwdPressed' | 'revPressed' | 'stopPressed'>>;
  const init = (): FwdRevState => {
    const s = { f: false, r: false, motor: newMotor(), choked: false } as FwdRevState;
    mo = momentary(s, ['fwdPressed', 'revPressed', 'stopPressed']);
    return s;
  };
  const scene: PlantScene<FwdRevState> = {
    id: 'fwdrev',
    title: 'Forward/reverse screw conveyor',
    summary: 'Reversing starter with mechanical, electrical and logic interlocks, and a zero-speed switch.',
    site: 'mill',
    devices: FWDREV_DEVICES,
    state: init(),
    faults: FWDREV_FAULTS,
    activeFault: null,
    program: fwdRevProgram,
    sound: { hum: (s) => Math.abs(s.motor.rpm) / 1770, contactor: (s) => s.f || s.r },
    setFault(id) { scene.activeFault = id; if (id === 'fr-choke') scene.state.choked = true; },
    reset() { scene.state = init(); scene.activeFault = null; },
    step(dtMs, io) {
      const s = scene.state;
      const f = scene.activeFault;
      io.DI[0] = mo.held('fwdPressed');
      io.DI[1] = mo.held('revPressed');
      io.DI[2] = !mo.held('stopPressed');
      mo.tick(dtMs);
      io.DI[3] = !s.motor.tripped;
      // Coils: output → other contactor's NC aux (electrical interlock) → OL → coil. The mechanical lever
      // stops a contactor closing while the other one is closed.
      const fCoil = io.DO[0] && !s.r && !s.motor.tripped && f !== 'fr-fcoil';
      const rCoil = io.DO[1] && !s.f && !s.motor.tripped;
      s.f = fCoil && !s.r;
      s.r = rCoil && !s.f;
      io.DI[4] = s.f;
      io.DI[5] = s.r || f === 'fr-raux';
      io.DI[6] = Math.abs(s.motor.rpm) < 30 && f !== 'fr-zss';
      s.motor = motorStep(s.motor, { dir: s.f ? 1 : s.r ? -1 : 0, loadPU: 0.55, jammed: s.choked }, dtMs / 1000);
      if (s.motor.tripped) { s.f = false; s.r = false; }
    },
    meterPoints(io) {
      const s = scene.state;
      const v = (on: boolean) => ({ value: on ? 24 : 0, unit: 'VDC' as const });
      const ac = (on: boolean) => ({ value: on ? 120 : 0, unit: 'VAC' as const });
      return [
        { id: 'psu', label: '24 VDC supply (+ to −)', read: () => ({ value: 24, unit: 'VDC' }) },
        { id: 'i0', label: 'Input I0 (Forward PB)', read: () => v(io.DI[0]) },
        { id: 'i3', label: 'Input I3 (OL 96)', read: () => v(io.DI[3]) },
        { id: 'i4', label: 'Input I4 (F aux)', read: () => v(io.DI[4]) },
        { id: 'i5', label: 'Input I5 (R aux)', read: () => v(io.DI[5]) },
        { id: 'i6', label: 'Input I6 (zero speed)', read: () => v(io.DI[6]) },
        { id: 'zsssup', label: 'Zero-speed switch supply side', read: () => v(true) },
        { id: 'o0', label: 'Output O0 (F coil)', read: () => ac(io.DO[0]) },
        { id: 'fcoil', label: 'F coil A1-A2', read: () => ac(io.DO[0] && !s.r && !s.motor.tripped) },
        { id: 'o1', label: 'Output O1 (R coil)', read: () => ac(io.DO[1]) },
      ];
    },
    ui: {
      controls: [
        { kind: 'momentary', field: 'fwdPressed', label: 'Forward', color: 'green', hint: 'Normally open, input I0' },
        { kind: 'momentary', field: 'revPressed', label: 'Reverse', color: 'green', hint: 'Normally open, input I1' },
        { kind: 'momentary', field: 'stopPressed', label: 'Stop', color: 'red', hint: 'Normally closed, input I2' },
        { kind: 'toggle', field: 'choked', label: 'Screw', on: 'CHOKED', off: 'Clear', hint: 'Pack the screw with product' },
      ],
      indicators: [
        { kind: 'light', label: 'Forward', color: 'green', on: (_s, io) => io.DO[2] },
        { kind: 'light', label: 'Reverse', color: 'green', on: (_s, io) => io.DO[3] },
        { kind: 'text', label: 'Contactors', value: (s) => `F ${s.f ? 'IN' : 'out'} · R ${s.r ? 'IN' : 'out'}` },
        { kind: 'gauge', label: 'Screw speed', unit: 'rpm', max: 1800, value: (s) => s.motor.rpm, digits: 0 },
        { kind: 'gauge', label: 'Motor current', unit: 'A', max: MOTOR_FLA * 7, value: (s) => s.motor.amps, warn: MOTOR_FLA * 1.15 },
        { kind: 'gauge', label: 'Overload heat', unit: '%', max: 100, value: (s) => s.motor.heat * 100, warn: 80, digits: 0 },
      ],
      actions: [{ id: 'olreset', label: 'Reset overload', run: (sc) => { const m = sc.state.motor; if (!canResetOverload(m)) return false; sc.state.motor = { ...m, tripped: false }; return true; }, disabled: (s) => (!s.motor.tripped ? 'Overload OK' : canResetOverload(s.motor) ? null : 'Overload cooling…') }],
    },
  };
  return scene;
}
