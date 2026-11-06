/**
 * Machine — Water-plant tank with a 4–20 mA level transmitter and a PID-controlled fill valve.
 *
 *   AI0 LT-101 level transmitter, 4–20 mA = 0–4 m        AO0 FV-101 fill valve, 0–100 % open
 *   DI0 LSL low-level switch (ON = level above the switch) DI1 LSHH high-high switch (ON = OK, opens on high)
 *   DO0 Bad-signal light  DO1 High-high light  DO2 Transfer pump (outflow) run
 * Tank 1.5 m² × 4 m. Valve wide open = 0.030 m³/s in. The transmitter has 2 s damping; ~1 s transport delay. The transfer pump takes the plant demand out.
 */
import { program } from '../engine/text';
import { clamp, lag, mA } from './kit';
import type { FaultDef, FieldDevice, PlantScene } from './types';

export const TANK_AREA = 1.5; // m²
export const TANK_H = 4; // m
export const Q_IN_MAX = 0.03; // m³/s at 100 % valve
/** Transmitter damping (a first-order filter set in the transmitter), s. */
export const LT_DAMPING = 2;
/** Transport delay from the valve to the level reading (pipe + surface settling), s. */
export const DEAD_TIME = 1;
export const VALVE_TAU = 3; // s, actuator stroke lag
export const LSL_AT = 0.3; // m
export const LSHH_AT = 3.8; // m

export interface TankState {
  level: number; // m
  valve: number; // actual position, %
  demand: number; // plant demand, m³/s
  overflowed: number; // m³ lost over the top
  /** Damped transmitter reading, m. */
  measured: number;
  /** Recent inflows for the transport delay. */
  delayLine: number[];
}

export function tankProgram() {
  return program(
    'Tank level PID',
    [
      { name: 'LT101_mA', type: 'REAL', io: { kind: 'AI', point: 0 }, description: 'Level transmitter, 4–20 mA = 0–4 m' },
      { name: 'LSL_OK', type: 'BOOL', io: { kind: 'DI', point: 0 }, description: 'Low-level switch: ON = level above the switch' },
      { name: 'LSHH_OK', type: 'BOOL', io: { kind: 'DI', point: 1 }, description: 'High-high switch: ON = OK (opens on high — fails safe)' },
      { name: 'FV101', type: 'REAL', io: { kind: 'AO', point: 0 }, description: 'Fill valve command, %' },
      { name: 'Bad_Light', type: 'BOOL', io: { kind: 'DO', point: 0 } },
      { name: 'HH_Light', type: 'BOOL', io: { kind: 'DO', point: 1 } },
      { name: 'Pump_Run', type: 'BOOL', io: { kind: 'DO', point: 2 }, description: 'Transfer pump (outflow)' },
      { name: 'Level_Pct', type: 'REAL' },
      { name: 'LT_Bad', type: 'BOOL', description: 'Signal below 3.6 mA or above 21 mA' },
      { name: 'Close_Valve', type: 'BOOL' },
      { name: 'SP_Pct', type: 'REAL', initial: 60, description: 'Level setpoint, %' },
      { name: 'Tune_KP', type: 'REAL', initial: 6, description: 'Proportional gain' },
      { name: 'Tune_KI', type: 'REAL', initial: 0.05, description: 'Integral gain, per second' },
      { name: 'Tune_KD', type: 'REAL', initial: 0, description: 'Derivative gain, seconds' },
      { name: 'Level_PID', type: 'PID' },
    ],
    [
      { text: 'SCP(LT101_mA,4.0,20.0,0.0,100.0,Level_Pct)', comment: 'Scale 4–20 mA to 0–100 % of the tank.' },
      { text: '[LES(LT101_mA,3.6),GRT(LT101_mA,21.0)]OTE(LT_Bad)', comment: 'Out-of-range signal = bad transmitter or broken wire, not a real level.' },
      { text: '[XIC(LT_Bad),XIO(LSHH_OK)]OTE(Close_Valve)', comment: 'Fail safe: no trustworthy level, or the high-high switch opened → close the fill valve.' },
      { text: 'MOV(SP_Pct,Level_PID.SP)', comment: 'Setpoint and tuning come from tags the HMI writes.' },
      { text: 'MOV(Tune_KP,Level_PID.KP)' },
      { text: 'MOV(Tune_KI,Level_PID.KI)' },
      { text: 'MOV(Tune_KD,Level_PID.KD)' },
      { text: 'MOV(Level_Pct,Level_PID.PV)' },
      { text: 'PID(Level_PID)', comment: 'Reverse acting: level below setpoint → open the valve more.' },
      { text: 'XIO(Close_Valve)MOV(Level_PID.CV,FV101)' },
      { text: 'XIC(Close_Valve)MOV(0,FV101)' },
      { text: 'XIC(LT_Bad)OTE(Bad_Light)' },
      { text: 'XIO(LSHH_OK)OTE(HH_Light)' },
      { text: 'XIC(LSL_OK)OTE(Pump_Run)', comment: 'Never run the transfer pump dry.' },
    ],
  );
}

export const TANK_DEVICES: FieldDevice[] = [
  { id: 'lt', label: 'LT-101 level', kind: 'analog', io: { kind: 'AI', point: 0 }, wiring: '2-wire, loop-powered level transmitter: +24 V → transmitter → analog input 0. 4 mA = empty, 20 mA = 4 m.' },
  { id: 'lsl', label: 'LSL low switch', kind: 'sensor', io: { kind: 'DI', point: 0 }, wiring: 'Float switch at 0.3 m, closed while the level is above it, to input I0.' },
  { id: 'lshh', label: 'LSHH high-high', kind: 'sensor', io: { kind: 'DI', point: 1 }, wiring: 'Float switch at 3.8 m wired fail-safe: closed when OK, opens on high level (or a broken wire), to input I1.' },
  { id: 'fv', label: 'FV-101 fill valve', kind: 'analog', io: { kind: 'AO', point: 0 }, wiring: 'Analog output 0 (4–20 mA) to the valve positioner. 4 mA = closed (the valve fails closed on loss of air or signal).' },
  { id: 'badlt', label: 'Bad signal', kind: 'light', io: { kind: 'DO', point: 0 }, color: 'amber', wiring: 'Pilot light on output O0.' },
  { id: 'hhlt', label: 'High-high', kind: 'light', io: { kind: 'DO', point: 1 }, color: 'red', wiring: 'Pilot light on output O1.' },
  { id: 'pump', label: 'Transfer pump', kind: 'coil', io: { kind: 'DO', point: 2 }, wiring: 'Output O2 to the transfer pump starter.' },
];

export const TANK_FAULTS: FaultDef[] = [
  { id: 'tk-drift', title: 'Level transmitter reads high', difficulty: 3, evidence: ['sight', 'ai0'], culprit: 'lt',
    complaint: 'The screen says the tank is at setpoint, but the operator\'s sight glass shows it much lower.',
    cause: 'LT-101 has drifted: it reads about 0.8 m (20 %) high. The PID is happily holding the WRONG level.',
    howToFind: 'Compare the transmitter with an independent reading (sight glass, a tape). The loop is doing exactly what the PV tells it.',
    readings: 'Loop current about 3.2 mA higher than the real level should give (e.g. 16.4 mA where 13.2 mA is right).',
    fix: 'Recalibrate (or replace) the transmitter against a known level, then return the loop to auto. Log the as-found and as-left values.',
    safety: 'Calibration means taking the loop out of automatic: tell the operators, put the PID in manual, and watch the level while you work.' },
  { id: 'tk-wire', title: 'Broken transmitter wire', difficulty: 1, evidence: ['ai0', 'lttx'], culprit: 'lt',
    complaint: 'Amber "bad signal" light. The fill valve shut and the level is dropping.',
    cause: 'The LT-101 loop wire broke at the junction box: 0 mA. The logic sees an impossible value, flags bad signal and fails the valve closed — as designed.',
    howToFind: 'Analog input shows ~0 mA. Below 3.6 mA is a loop fault, not an empty tank. Measure loop current at the transmitter and at the card.',
    readings: 'AI0: 0 mA. Loop supply: 24 VDC at the card, 0 V across the transmitter terminals.',
    fix: 'Repair the termination or cable, confirm 4–20 mA returns, then the bad-signal alarm clears and the PID resumes.',
    safety: 'Junction boxes outdoors may be wet: check for voltage first, and keep the area dry before opening.' },
  { id: 'tk-valve', title: 'Fill valve stuck at 20 %', difficulty: 2, evidence: ['ao0'], culprit: 'fv',
    complaint: 'The level keeps falling even though the controller output is 100 %.',
    cause: 'The valve stem is stuck at about 20 % open (a seized packing). The PID winds up to 100 % but the valve can\'t follow.',
    howToFind: 'Controller output (CV) is 100 % and the AO signal is 20 mA, but the valve position stays at ~20 %. The control system is fine — the final element isn\'t.',
    readings: 'AO0 / positioner input: 20 mA. Valve position feedback (local indicator): ~20 %.',
    fix: 'Isolate and repair the valve (packing, actuator, positioner), stroke-test it 0–100 %, return to auto.',
    safety: 'Valves can move suddenly when air or signal changes: isolate the air supply and lock out before working on the actuator.' },
  { id: 'tk-tune', title: 'Gain set far too high', difficulty: 2, culprit: 'logic',
    complaint: 'The fill valve slams open and closed every few seconds and the level wobbles.',
    cause: 'Someone set the proportional gain to 200 "to make it faster". With the valve, transmitter damping and transport delay, the loop goes unstable: the valve slams between closed and open.',
    howToFind: 'Put the loop in manual: the level steadies, so it\'s not the process. Trend SP, PV and CV — CV swings full scale. Check the tuning tags.',
    readings: 'Valve signal swinging 4 → 20 mA every few seconds; transmitter signal steady in manual.',
    fix: 'Restore sensible tuning (here KP 6, KI 0.05), change one thing at a time while watching a trend, then document it.',
    safety: 'A slamming valve can cause water hammer — put the loop in manual at a safe output first, then retune with operations aware.' },
];

export function createTankScene(): PlantScene<TankState> {
  const init = (): TankState => ({ level: 1.2, valve: 0, demand: 0.008, overflowed: 0, measured: 1.2, delayLine: [] });
  const scene: PlantScene<TankState> = {
    id: 'tank',
    title: 'Tank level with PID',
    summary: '4–20 mA level transmitter, PID fill valve, bad-signal and high-high protection.',
    site: 'water',
    devices: TANK_DEVICES,
    state: init(),
    faults: TANK_FAULTS,
    activeFault: null,
    program: tankProgram,
    huntChoices: [{ id: 'logic', label: 'The tuning / program is wrong' }],
    setFault(id) { scene.activeFault = id; },
    armFault(id, plc) { if (id === 'tk-tune') plc.tags.write('Tune_KP', 200); },
    reset() { scene.state = init(); scene.activeFault = null; },
    step(dtMs, io) {
      const s = scene.state;
      const f = scene.activeFault;
      const dt = dtMs / 1000;
      const cmd = clamp(io.AO[0], 0, 100);
      s.valve = f === 'tk-valve' ? 20 : lag(s.valve, cmd, VALVE_TAU, dt);
      s.delayLine.push((Q_IN_MAX * s.valve) / 100);
      const qIn = s.delayLine.length > DEAD_TIME / dt ? s.delayLine.shift()! : 0;
      const pumpOn = io.DO[2];
      const qOut = pumpOn ? s.demand : 0;
      let h = s.level + ((qIn - qOut) / TANK_AREA) * dt;
      if (h > TANK_H) { s.overflowed += (h - TANK_H) * TANK_AREA; h = TANK_H; }
      s.level = Math.max(0, h);
      s.measured = lag(s.measured, s.level, LT_DAMPING, dt);
      const reads = f === 'tk-drift' ? s.measured + 0.8 : s.measured;
      io.AI[0] = f === 'tk-wire' ? 0 : mA(reads / TANK_H);
      io.DI[0] = s.level > LSL_AT;
      io.DI[1] = s.level < LSHH_AT;
    },
    meterPoints(io) {
      const s = scene.state;
      return [
        { id: 'psu', label: '24 VDC loop supply (+ to −)', read: () => ({ value: 24, unit: 'VDC' }) },
        { id: 'ai0', label: 'Loop current at the analog card (AI0)', read: () => ({ value: Number(io.AI[0].toFixed(2)), unit: 'mA' }) },
        { id: 'lttx', label: 'Across the transmitter terminals', read: () => ({ value: scene.activeFault === 'tk-wire' ? 0 : 18, unit: 'VDC' }) },
        { id: 'ao0', label: 'Valve signal at the positioner (AO0)', read: () => ({ value: Number(mA(clamp(io.AO[0], 0, 100) / 100).toFixed(2)), unit: 'mA' }) },
        { id: 'lshh', label: 'Input I1 (LSHH)', read: () => ({ value: io.DI[1] ? 24 : 0, unit: 'VDC' }) },
        { id: 'sight', label: 'Sight glass (read by eye, as mA equivalent)', read: () => ({ value: Number(mA(s.level / TANK_H).toFixed(2)), unit: 'mA' }) },
      ];
    },
    ui: {
      controls: [
        { kind: 'slider', field: 'demand', label: 'Plant demand (outflow)', min: 0, max: 0.024, step: 0.001, unit: 'm³/s', hint: 'What the transfer pump takes out' },
        { settings: true, kind: 'slider', field: 'tag:SP_Pct', label: 'Setpoint', min: 0, max: 100, step: 1, unit: '%', hint: 'Level setpoint tag SP_Pct' },
        { settings: true, kind: 'slider', field: 'tag:Tune_KP', label: 'KP (gain)', min: 0, max: 250, step: 0.5, unit: '', hint: 'Proportional gain tag Tune_KP' },
        { settings: true, kind: 'slider', field: 'tag:Tune_KI', label: 'KI (integral)', min: 0, max: 0.5, step: 0.01, unit: '/s', hint: 'Integral gain tag Tune_KI' },
        { settings: true, kind: 'slider', field: 'tag:Tune_KD', label: 'KD (derivative)', min: 0, max: 20, step: 0.5, unit: 's', hint: 'Derivative gain tag Tune_KD' },
      ],
      indicators: [
        { kind: 'light', label: 'Bad signal', color: 'amber', on: (_s, io) => io.DO[0] },
        { kind: 'light', label: 'High-high', color: 'red', on: (_s, io) => io.DO[1] },
        { kind: 'light', label: 'Transfer pump', color: 'green', on: (_s, io) => io.DO[2] },
        { kind: 'gauge', label: 'Real level', unit: 'm', max: TANK_H, value: (s) => s.level, digits: 2, warn: LSHH_AT },
        { kind: 'gauge', label: 'PV (transmitter)', unit: '%', max: 100, value: (_s, _io, tag) => tag('Level_Pct') },
        { kind: 'gauge', label: 'Controller output (CV)', unit: '%', max: 100, value: (_s, _io, tag) => tag('Level_PID.CV') },
        { kind: 'gauge', label: 'Valve position', unit: '%', max: 100, value: (s) => s.valve },
      ],
      trend: [
        { label: 'SP', color: 'var(--text-muted)', value: (_s, _io, tag) => tag('SP_Pct') },
        { label: 'PV', color: 'var(--live)', value: (_s, _io, tag) => tag('Level_Pct') },
        { label: 'CV', color: 'var(--blue-glow)', value: (_s, _io, tag) => tag('Level_PID.CV') },
      ],
      trendMax: 100,
      settingsTitle: 'Setpoint and PID tuning (PLC tags)',
    },
  };
  return scene;
}
