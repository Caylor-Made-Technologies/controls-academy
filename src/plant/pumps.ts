/**
 * Machine — Wastewater lift station: two pumps, lead/lag with alternation, fail-over and a backup float.
 *
 *   AI0 LT wet-well level, 4–20 mA = 0–5 m
 *   DI0 P1 aux (running proof)  DI1 P2 aux  DI2 P1 overload OK (NC)  DI3 P2 overload OK (NC)
 *   DI4 High-level backup float (ON = high)  DI5 Fail reset (NO)  DI6 Low-level cutout float (ON = above 0.4 m)
 *   DO0 P1 starter  DO1 P2 starter  DO2 High-level alarm  DO3 Pump fail light
 * Wet well 4 m² × 5 m. Lead on at 2.0 m, lag on at 3.0 m, both off at 0.8 m. Each pump moves 0.04 m³/s.
 */
import { program } from '../engine/text';
import { canResetOverload, mA, momentary, motorStep, newMotor, type MotorSim } from './kit';
import { MOTOR_FLA, MOTOR_RPM } from './motor';
import type { FaultDef, FieldDevice, PlantScene } from './types';

export const WELL_AREA = 4;
export const WELL_DEPTH = 5;
export const PUMP_Q = 0.04;
export const FLOAT_AT = 4.2;
/** The float's tether gives it a natural deadband: it opens again only below this level. */
export const FLOAT_RESET = 4.0;
/** Low-level cutout float: opens below 0.4 m, closes again above 0.6 m (deadband) — dry-run protection. */
export const LOW_CUTOUT = 0.4;
export const LOW_RESET = 0.6;

export interface PumpsState {
  resetPressed: boolean;
  level: number;
  inflow: number;
  p1: MotorSim;
  p2: MotorSim;
  /** Total pump starts, for checking alternation. */
  starts: [number, number];
  flooded: number;
  floatHigh: boolean;
  lowMade: boolean;
}

export function pumpsProgram() {
  return program(
    'Lift station lead/lag',
    [
      { name: 'LT_mA', type: 'REAL', io: { kind: 'AI', point: 0 }, description: 'Wet-well level, 4–20 mA = 0–5 m' },
      { name: 'P1_Aux', type: 'BOOL', io: { kind: 'DI', point: 0 } },
      { name: 'P2_Aux', type: 'BOOL', io: { kind: 'DI', point: 1 } },
      { name: 'P1_OL', type: 'BOOL', io: { kind: 'DI', point: 2 }, description: 'P1 overload OK (NC)' },
      { name: 'P2_OL', type: 'BOOL', io: { kind: 'DI', point: 3 }, description: 'P2 overload OK (NC)' },
      { name: 'HH_Float', type: 'BOOL', io: { kind: 'DI', point: 4 }, description: 'Backup high-level float, ON = high' },
      { name: 'Reset_PB', type: 'BOOL', io: { kind: 'DI', point: 5 } },
      { name: 'Low_OK', type: 'BOOL', io: { kind: 'DI', point: 6 }, description: 'Low-level cutout float: ON = enough water to pump' },
      { name: 'P1_Run', type: 'BOOL', io: { kind: 'DO', point: 0 } },
      { name: 'P2_Run', type: 'BOOL', io: { kind: 'DO', point: 1 } },
      { name: 'High_Alarm', type: 'BOOL', io: { kind: 'DO', point: 2 } },
      { name: 'Fail_Light', type: 'BOOL', io: { kind: 'DO', point: 3 } },
      { name: 'Level_m', type: 'REAL' },
      { name: 'Lead_Call', type: 'BOOL' },
      { name: 'Lag_Call', type: 'BOOL' },
      { name: 'Alt_Ctr', type: 'COUNTER', initial: 1000000 },
      { name: 'Alt_Bit', type: 'DINT' },
      { name: 'Lead_P2', type: 'BOOL', description: 'Pump 2 is lead this cycle' },
      { name: 'P1_FTS', type: 'TIMER', initial: 3000, description: 'P1 fail-to-start' },
      { name: 'P2_FTS', type: 'TIMER', initial: 3000, description: 'P2 fail-to-start' },
      { name: 'P1_Fail', type: 'BOOL' },
      { name: 'P2_Fail', type: 'BOOL' },
      { name: 'P1_Down', type: 'BOOL', description: 'P1 failed or overload tripped' },
      { name: 'P2_Down', type: 'BOOL' },
      { name: 'HH_Hold', type: 'TIMER', initial: 60000, description: 'Keep both pumps on 60 s after the float drops — no short-cycling' },
    ],
    [
      { text: 'SCP(LT_mA,4.0,20.0,0.0,5.0,Level_m)', comment: 'Level in metres.' },
      { text: '[GEQ(Level_m,2.0),XIC(Lead_Call)]GRT(Level_m,0.8)OTE(Lead_Call)', comment: 'Lead pump: on at 2.0 m, off at 0.8 m (a seal-in gives the deadband).' },
      { text: '[GEQ(Level_m,3.0),XIC(Lag_Call)]GRT(Level_m,0.8)OTE(Lag_Call)', comment: 'Lag pump: on at 3.0 m — inflow is beating one pump.' },
      { text: 'XIO(Lead_Call)CTU(Alt_Ctr)', comment: 'Count each pump-down cycle (the rung goes true when the lead call drops).' },
      { text: 'MOD(Alt_Ctr.ACC,2,Alt_Bit)' },
      { text: 'EQU(Alt_Bit,1)OTE(Lead_P2)', comment: 'Alternate: odd cycles P2 leads, even cycles P1 leads — equal wear.' },
      { text: 'XIC(HH_Float)TOF(HH_Hold)', comment: 'Backup float: run both pumps while it\'s up and for 60 s after (TOF), so they can\'t chatter on and off.' },
      { text: '[XIC(P1_Fail),XIO(P1_OL)]OTE(P1_Down)' },
      { text: '[XIC(P2_Fail),XIO(P2_OL)]OTE(P2_Down)' },
      { text: '[XIC(Lead_Call)XIO(Lead_P2),XIC(Lag_Call)XIC(Lead_P2),XIC(Lead_Call)XIC(P2_Down),XIC(HH_Hold.DN)]XIO(P1_Down)XIC(Low_OK)OTE(P1_Run)', comment: 'P1 runs as lead, as lag, as stand-in when P2 is down, or on the backup float — never below the low-level cutout (no dry running).' },
      { text: '[XIC(Lead_Call)XIC(Lead_P2),XIC(Lag_Call)XIO(Lead_P2),XIC(Lead_Call)XIC(P1_Down),XIC(HH_Hold.DN)]XIO(P2_Down)XIC(Low_OK)OTE(P2_Run)' },
      { text: 'XIC(P1_Run)XIO(P1_Aux)TON(P1_FTS)', comment: 'Called but not proven running within 3 s → failed.' },
      { text: 'XIC(P1_FTS.DN)OTL(P1_Fail)' },
      { text: 'XIC(P2_Run)XIO(P2_Aux)TON(P2_FTS)' },
      { text: 'XIC(P2_FTS.DN)OTL(P2_Fail)' },
      { text: 'XIC(Reset_PB)OTU(P1_Fail)' },
      { text: 'XIC(Reset_PB)OTU(P2_Fail)' },
      { text: '[XIC(HH_Float),GEQ(Level_m,4.0)]OTE(High_Alarm)', comment: 'High level from either the transmitter or the independent float.' },
      { text: '[XIC(P1_Down),XIC(P2_Down)]OTE(Fail_Light)' },
    ],
  );
}

export const PUMPS_DEVICES: FieldDevice[] = [
  { id: 'lt', label: 'Level transmitter', kind: 'analog', io: { kind: 'AI', point: 0 }, wiring: 'Submersible pressure transducer, 2-wire 4–20 mA (0–5 m) to analog input 0.' },
  { id: 'p1aux', label: 'P1 aux', kind: 'contact', io: { kind: 'DI', point: 0 }, wiring: 'P1 starter aux contact to input I0 — running proof.' },
  { id: 'p2aux', label: 'P2 aux', kind: 'contact', io: { kind: 'DI', point: 1 }, wiring: 'P2 starter aux contact to input I1.' },
  { id: 'p1ol', label: 'P1 overload', kind: 'contact', io: { kind: 'DI', point: 2 }, wiring: 'P1 overload relay: a separate NC auxiliary contact (95-96 is in the 120 VAC coil circuit) to input I2.' },
  { id: 'p2ol', label: 'P2 overload', kind: 'contact', io: { kind: 'DI', point: 3 }, wiring: 'P2 overload relay auxiliary contact (NC) to input I3.' },
  { id: 'hh', label: 'Backup float', kind: 'sensor', io: { kind: 'DI', point: 4 }, wiring: 'Backup high-level float: closes at 4.2 m rising, opens below about 4.0 m (tether swing), to input I4. Here it goes through the PLC for teaching; many real stations hardwire it straight to the starters so it works even with the PLC dead.' },
  { id: 'low', label: 'Low cutout float', kind: 'sensor', io: { kind: 'DI', point: 6 }, wiring: 'Low-level cutout float: opens below 0.4 m, closes again above about 0.6 m, to input I6. Stops the pumps before they run dry.' },
  { id: 'reset', label: 'Fail reset', kind: 'pb-no', io: { kind: 'DI', point: 5 }, color: 'white', wiring: 'Reset pushbutton to input I5.' },
  { id: 'p1', label: 'P1 starter', kind: 'coil', io: { kind: 'DO', point: 0 }, wiring: 'Output O0 → P1 overload 95-96 → P1 contactor coil.' },
  { id: 'p2', label: 'P2 starter', kind: 'coil', io: { kind: 'DO', point: 1 }, wiring: 'Output O1 → P2 overload 95-96 → P2 contactor coil.' },
  { id: 'hialm', label: 'High level', kind: 'light', io: { kind: 'DO', point: 2 }, color: 'red', wiring: 'Alarm light (and auto-dialer) on output O2.' },
  { id: 'faillt', label: 'Pump fail', kind: 'light', io: { kind: 'DO', point: 3 }, color: 'amber', wiring: 'Pilot light on output O3.' },
];

export const PUMPS_FAULTS: FaultDef[] = [
  { id: 'pp-p1-ol', title: 'Pump 1 overload tripped', difficulty: 1, evidence: ['i2'], culprit: 'p1ol',
    complaint: 'Pump fail light on, but the station is still keeping up.',
    cause: 'Pump 1\'s overload tripped (rags wrapped on the impeller). The fail-over logic made pump 2 the lead, so the station kept pumping on one pump.',
    howToFind: 'P1_OL (I2) is off; P1_Down is on. P2 is doing every cycle. Find out why P1 tripped before resetting.',
    readings: 'Input I2 terminal: 0 VDC. P1 current before the trip: well above FLA.',
    fix: 'Lock out P1, pull and clear the impeller (rags), check it turns freely, let the overload cool, reset and test.',
    safety: 'Submersible pumps are normally pulled from grade on their guide rails — no entry needed. If anyone must enter, it\'s a permit confined space with hydrogen sulfide risk: gas test, ventilate, attendant. Lock out the pump before pulling it.' },
  { id: 'pp-p2-aux', title: 'Pump 2 aux contact failed', difficulty: 2, evidence: ['i1', 'o1', 'p2amps'], culprit: 'p2aux',
    complaint: 'Pump 2 shows "failed" every time it\'s called — but the operator heard it running.',
    cause: 'P2\'s starter aux contact no longer closes, so the PLC never gets running proof and the fail-to-start timer locks P2 out after 3 s.',
    howToFind: 'P2_Run (O1) turns on, the contactor pulls in and the pump runs, but P2_Aux (I1) stays off. The logic is right; the proof device failed.',
    readings: 'While called (the first 3 s, before the lockout): output O1 120 VAC, P2 coil energized, clamp shows running current; input I1 terminal 0 VDC.',
    fix: 'Replace the aux contact block, reset the fail, and run P2 to confirm the proof. (An aux contact proves the contactor closed, not that water moves — many stations add a flow or current switch.)',
    safety: 'The aux contact is on the 480 V starter: lock out before replacing it.' },
  { id: 'pp-lt', title: 'Level transmitter frozen', difficulty: 3, evidence: ['ai0'], culprit: 'lt',
    complaint: 'High-level alarm. The pumps only seem to run on the backup float.',
    cause: 'The level transducer is fouled with grease and stuck reading about 1.5 m, so the lead and lag calls never come on. The independent float is saving the station.',
    howToFind: 'Level_m sits at ~1.5 m while the backup float says high. Two instruments disagree — believe the one that matches a field check.',
    readings: 'AI0 steady at about 8.8 mA (≈1.5 m) no matter what the real level does.',
    fix: 'Pull the transducer from grade, clean and test it (or replace it), then check it against a known depth.',
    safety: 'Confined space and sewage: gas test, PPE for biological hazards, and never enter a wet well alone.' },
  { id: 'pp-float', title: 'Backup float stuck high', difficulty: 2, evidence: ['i4'], culprit: 'hh',
    complaint: 'High-level alarm is on and both pumps keep starting, though the well is nearly empty.',
    cause: 'Debris is holding the backup float in the "high" position, so the PLC calls both pumps no matter what the transmitter says. Only the low-level cutout keeps them from running dry.',
    howToFind: 'HH_Float (I4) is ON while Level_m reads low. The transmitter and the real level agree; the float doesn\'t.',
    readings: 'Input I4 terminal: 24 VDC with the well near empty.',
    fix: 'Clear the float and its cable, check it swings freely, test it by lifting it, then confirm normal lead/lag operation.',
    safety: 'Pumps that short-cycle at the low cutout overheat — take them to Off first. Floats are normally pulled from grade; confined-space rules apply before anyone enters the well.' },
];

export function createPumpsScene(): PlantScene<PumpsState> {
  let mo: ReturnType<typeof momentary<'resetPressed'>>;
  const init = (): PumpsState => {
    const s = { level: 1.0, inflow: 0.03, p1: newMotor(), p2: newMotor(), starts: [0, 0], flooded: 0, floatHigh: false, lowMade: true } as unknown as PumpsState;
    mo = momentary(s, ['resetPressed']);
    return s;
  };
  let was: [boolean, boolean] = [false, false];
  const scene: PlantScene<PumpsState> = {
    id: 'pumps',
    title: 'Lift station: pump lead/lag',
    summary: 'Lead/lag, alternation, fail-over and an independent high-level float.',
    site: 'water',
    devices: PUMPS_DEVICES,
    state: init(),
    faults: PUMPS_FAULTS,
    activeFault: null,
    program: pumpsProgram,
    sound: { hum: (s) => Math.max(s.p1.rpm, s.p2.rpm) / MOTOR_RPM, contactor: (s) => s.p1.rpm > 0 || s.p2.rpm > 0 },
    setFault(id) {
      scene.activeFault = id;
      if (id === 'pp-p1-ol') scene.state.p1 = { ...scene.state.p1, tripped: true, heat: 1 };
    },
    reset() { scene.state = init(); scene.activeFault = null; was = [false, false]; },
    step(dtMs, io) {
      const s = scene.state;
      const f = scene.activeFault;
      const dt = dtMs / 1000;
      io.DI[5] = mo.held('resetPressed');
      mo.tick(dtMs);
      const on1 = io.DO[0] && !s.p1.tripped;
      const on2 = io.DO[1] && !s.p2.tripped;
      if (on1 && !was[0]) s.starts[0]++;
      if (on2 && !was[1]) s.starts[1]++;
      was = [on1, on2];
      s.p1 = motorStep(s.p1, { dir: on1 ? 1 : 0, loadPU: 0.75 }, dt);
      s.p2 = motorStep(s.p2, { dir: on2 ? 1 : 0, loadPU: 0.75 }, dt);
      const pumped = PUMP_Q * (Math.max(0, s.p1.rpm) / MOTOR_RPM + Math.max(0, s.p2.rpm) / MOTOR_RPM);
      let h = s.level + ((s.inflow - (s.level > 0.05 ? pumped : 0)) / WELL_AREA) * dt;
      if (h > WELL_DEPTH) { s.flooded += (h - WELL_DEPTH) * WELL_AREA; h = WELL_DEPTH; }
      s.level = Math.max(0, h);
      io.AI[0] = f === 'pp-lt' ? mA(1.5 / WELL_DEPTH) : mA(s.level / WELL_DEPTH);
      io.DI[0] = on1 && s.p1.rpm > 100;
      io.DI[1] = on2 && s.p2.rpm > 100 && f !== 'pp-p2-aux';
      io.DI[2] = !s.p1.tripped;
      io.DI[3] = !s.p2.tripped;
      s.floatHigh = s.level >= FLOAT_AT || (s.floatHigh && s.level > FLOAT_RESET);
      io.DI[4] = s.floatHigh || f === 'pp-float';
      s.lowMade = s.level > LOW_RESET || (s.lowMade && s.level > LOW_CUTOUT);
      io.DI[6] = s.lowMade;
    },
    meterPoints(io) {
      const s = scene.state;
      const v = (on: boolean) => ({ value: on ? 24 : 0, unit: 'VDC' as const });
      return [
        { id: 'psu', label: '24 VDC supply (+ to −)', read: () => ({ value: 24, unit: 'VDC' }) },
        { id: 'ai0', label: 'Level loop current (AI0)', read: () => ({ value: Number(io.AI[0].toFixed(2)), unit: 'mA' }) },
        { id: 'i1', label: 'Input I1 (P2 aux)', read: () => v(io.DI[1]) },
        { id: 'i2', label: 'Input I2 (P1 overload)', read: () => v(io.DI[2]) },
        { id: 'i4', label: 'Input I4 (backup float)', read: () => v(io.DI[4]) },
        { id: 'o1', label: 'Output O1 (P2 starter)', read: () => ({ value: io.DO[1] ? 120 : 0, unit: 'VAC' }) },
        { id: 'p2amps', label: 'Clamp meter on P2 motor lead', read: () => ({ value: Number(s.p2.amps.toFixed(1)), unit: 'A' }) },
      ];
    },
    ui: {
      controls: [
        { kind: 'momentary', field: 'resetPressed', label: 'Fail reset', color: 'white', hint: 'Input I5' },
        { kind: 'slider', field: 'inflow', label: 'Inflow', min: 0, max: 0.09, step: 0.005, unit: 'm³/s', hint: 'Wastewater arriving; storms push it above one pump\'s 0.04 m³/s' },
      ],
      indicators: [
        { kind: 'light', label: 'P1 running', color: 'green', on: (_s, io) => io.DI[0] },
        { kind: 'light', label: 'P2 running', color: 'green', on: (_s, io) => io.DI[1] },
        { kind: 'light', label: 'High level', color: 'red', on: (_s, io) => io.DO[2] },
        { kind: 'light', label: 'Pump fail', color: 'amber', on: (_s, io) => io.DO[3] },
        { kind: 'text', label: 'Lead pump', value: (_s, _io, tag) => (tag('Lead_P2') ? 'Pump 2' : 'Pump 1') },
        { kind: 'gauge', label: 'Real level', unit: 'm', max: WELL_DEPTH, value: (s) => s.level, digits: 2, warn: 4 },
        { kind: 'gauge', label: 'Level (transmitter)', unit: 'm', max: WELL_DEPTH, value: (_s, _io, tag) => tag('Level_m'), digits: 2 },
        { kind: 'gauge', label: 'P1 current', unit: 'A', max: MOTOR_FLA * 1.5, value: (s) => s.p1.amps },
        { kind: 'gauge', label: 'P2 current', unit: 'A', max: MOTOR_FLA * 1.5, value: (s) => s.p2.amps },
      ],
      trend: [
        { label: 'Level (m × 20)', color: 'var(--live)', value: (s) => s.level * 20 },
        { label: 'P1', color: 'var(--blue-glow)', value: (s) => (s.p1.rpm > 100 ? 10 : 2) },
        { label: 'P2', color: 'var(--warn)', value: (s) => (s.p2.rpm > 100 ? 14 : 6) },
      ],
      trendMax: 100,
      actions: [
        { id: 'p1reset', label: 'Reset P1 overload', run: (sc) => { const m = sc.state.p1; if (!canResetOverload(m)) return false; sc.state.p1 = { ...m, tripped: false }; return true; }, disabled: (s) => (!s.p1.tripped ? 'P1 overload OK' : canResetOverload(s.p1) ? null : 'P1 overload cooling…') },
      ],
    },
  };
  return scene;
}
