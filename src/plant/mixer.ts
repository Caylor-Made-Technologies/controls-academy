/**
 * Machine — Flour-mill batch mixer: two feed screws weigh ingredients into a hopper on load cells, a mixer runs
 * for a set time, then a gate discharges to a conveyor. The dust collector must be proven before feeding.
 *
 *   DI0 Start batch (NO)  DI1 Stop (NC)  DI2 Dust collector proven (DP switch)  DI3 Gate closed LS
 *   DI4 Gate open LS  DI5 Conveyor running (aux)  DI6 Reset (NO)
 *   AI0 Weight transmitter, 4–20 mA = 0–2000 lb
 *   DO0 Dust collector  DO1 Feed screw A  DO2 Feed screw B  DO3 Mixer  DO4 Discharge gate solenoid
 *   DO5 Discharge conveyor  DO6 Fault light  DO7 Batch running light
 * Step 0 idle · 5 prove dust collector · 10 feed A · 20 feed B · 30 mix · 40 discharge · 50 close gate.
 * Faults go to 901–906 so the HMI step number IS the fault code.
 */
import { program } from '../engine/text';
import { clamp, lag, mA, momentary } from './kit';
import type { FaultDef, FieldDevice, PlantScene } from './types';

export const SCREW_RATE = 40; // lb/s per feed screw
export const DISCHARGE_RATE = 80; // lb/s through the open gate
export const IN_FLIGHT_S = 0.5; // material already falling when a screw stops
export const GATE_S = 2; // gate travel time

export interface MixerState {
  startPressed: boolean;
  stopPressed: boolean;
  resetPressed: boolean;
  weight: number; // lb (real)
  inFlight: number; // lb still falling
  gate: number; // 0 closed … 1 open
  dcAir: number; // 0–1 dust collector airflow
  convSpin: number;
  mixerSpin: number;
  batches: number;
  /** Real weight of each finished batch. */
  lastBatch: number;
  peak: number;
}

export function mixerProgram() {
  const t = (name: string, ms: number, d: string) => ({ name, type: 'TIMER' as const, initial: ms, description: d });
  return program(
    'Flour batch mixer',
    [
      { name: 'Start_PB', type: 'BOOL', io: { kind: 'DI', point: 0 } },
      { name: 'Stop_PB', type: 'BOOL', io: { kind: 'DI', point: 1 }, description: 'NC — ON when not pressed' },
      { name: 'DC_Proven', type: 'BOOL', io: { kind: 'DI', point: 2 }, description: 'Dust collector differential-pressure switch' },
      { name: 'Gate_Closed', type: 'BOOL', io: { kind: 'DI', point: 3 } },
      { name: 'Gate_Open_LS', type: 'BOOL', io: { kind: 'DI', point: 4 } },
      { name: 'Conv_Running', type: 'BOOL', io: { kind: 'DI', point: 5 } },
      { name: 'Reset_PB', type: 'BOOL', io: { kind: 'DI', point: 6 } },
      { name: 'Wt_mA', type: 'REAL', io: { kind: 'AI', point: 0 }, description: 'Weight transmitter, 4–20 mA = 0–2000 lb' },
      { name: 'DC_Run', type: 'BOOL', io: { kind: 'DO', point: 0 } },
      { name: 'Screw_A', type: 'BOOL', io: { kind: 'DO', point: 1 } },
      { name: 'Screw_B', type: 'BOOL', io: { kind: 'DO', point: 2 } },
      { name: 'Mixer', type: 'BOOL', io: { kind: 'DO', point: 3 } },
      { name: 'Gate_Sol', type: 'BOOL', io: { kind: 'DO', point: 4 } },
      { name: 'Conveyor', type: 'BOOL', io: { kind: 'DO', point: 5 } },
      { name: 'Fault_Light', type: 'BOOL', io: { kind: 'DO', point: 6 } },
      { name: 'Run_Light', type: 'BOOL', io: { kind: 'DO', point: 7 } },
      { name: 'Step', type: 'DINT', description: '0 idle … 50; 901–906 = fault code' },
      { name: 'Weight', type: 'REAL' },
      { name: 'Target_A', type: 'REAL', initial: 600, description: 'Recipe: flour A, lb' },
      { name: 'Target_AB', type: 'REAL', initial: 1000, description: 'Recipe: A + B, lb' },
      { name: 'Batch_Active', type: 'BOOL' },
      t('Mix_Tmr', 20000, 'Mix time (shortened for the simulator)'),
      t('DC_Tmr', 10000, 'Dust collector must prove within 10 s'),
      t('FeedA_Tmr', 30000, 'Feed A timeout'),
      t('FeedB_Tmr', 30000, 'Feed B timeout'),
      t('Dis_Tmr', 60000, 'Discharge timeout'),
      t('DC_Purge', 30000, 'Dust collector run-on after the batch to purge the system'),
      { name: 'Batch_Ctr', type: 'COUNTER', initial: 1000000 },
    ],
    [
      { text: 'SCP(Wt_mA,4.0,20.0,0.0,2000.0,Weight)' },
      { text: 'EQU(Step,0)XIC(Start_PB)XIC(Gate_Closed)LES(Weight,30.0)MOV(5,Step)', comment: 'Start only from idle, gate proven closed and the hopper empty (no feeding on top of a faulted batch).' },
      { text: '[EQU(Step,5),EQU(Step,10),EQU(Step,20),EQU(Step,30),EQU(Step,40),EQU(Step,50)]OTE(Batch_Active)' },
      { text: 'XIC(Batch_Active)TOF(DC_Purge)', comment: 'Dust collector runs for the whole batch and 30 s after (purge).' },
      { text: 'XIC(DC_Purge.DN)OTE(DC_Run)' },
      { text: 'EQU(Step,5)XIC(DC_Proven)MOV(10,Step)', comment: 'No feeding until the collector is PROVEN (airflow), not just commanded. Flour dust is combustible.' },
      { text: 'EQU(Step,10)OTE(Screw_A)' },
      { text: 'EQU(Step,10)GEQ(Weight,Target_A)MOV(20,Step)' },
      { text: 'EQU(Step,20)OTE(Screw_B)' },
      { text: 'EQU(Step,20)GEQ(Weight,Target_AB)MOV(30,Step)' },
      { text: '[EQU(Step,30),EQU(Step,40)]OTE(Mixer)', comment: 'Mix, and keep mixing while discharging so it empties clean.' },
      { text: 'EQU(Step,30)TON(Mix_Tmr)' },
      { text: 'EQU(Step,30)XIC(Mix_Tmr.DN)MOV(40,Step)' },
      { text: '[EQU(Step,40),EQU(Step,50)]OTE(Conveyor)' },
      { text: 'EQU(Step,40)XIC(Conv_Running)OTE(Gate_Sol)', comment: 'Never open the gate onto a stopped conveyor.' },
      { text: 'EQU(Step,40)XIC(Gate_Open_LS)LES(Weight,20.0)MOV(50,Step)' },
      { text: 'EQU(Step,50)XIC(Gate_Closed)CTU(Batch_Ctr)' },
      { text: 'EQU(Step,50)XIC(Gate_Closed)MOV(0,Step)' },
      { text: 'EQU(Step,5)TON(DC_Tmr)', comment: 'A timeout on every state turns a silent hang into a clear fault code.' },
      { text: 'EQU(Step,10)TON(FeedA_Tmr)' },
      { text: 'EQU(Step,20)TON(FeedB_Tmr)' },
      { text: 'EQU(Step,40)TON(Dis_Tmr)' },
      { text: 'XIC(DC_Tmr.DN)MOV(901,Step)', comment: '901 dust collector not proven' },
      { text: 'XIC(FeedA_Tmr.DN)MOV(902,Step)', comment: '902 feed A timeout' },
      { text: 'XIC(FeedB_Tmr.DN)MOV(903,Step)', comment: '903 feed B timeout' },
      { text: 'XIC(Dis_Tmr.DN)MOV(904,Step)', comment: '904 discharge timeout' },
      { text: '[EQU(Step,10),EQU(Step,20)]XIO(DC_Proven)MOV(905,Step)', comment: '905 dust collector lost while feeding' },
      { text: 'XIC(Batch_Active)XIO(Stop_PB)MOV(906,Step)', comment: '906 stopped by the operator' },
      { text: 'GEQ(Step,900)OTE(Fault_Light)' },
      { text: 'GEQ(Step,900)XIC(Reset_PB)MOV(0,Step)' },
      { text: 'XIC(Batch_Active)OTE(Run_Light)' },
    ],
  );
}

export const MIXER_DEVICES: FieldDevice[] = [
  { id: 'start', label: 'Start batch', kind: 'pb-no', io: { kind: 'DI', point: 0 }, color: 'green', wiring: 'Pushbutton to input I0.' },
  { id: 'stop', label: 'Stop', kind: 'pb-nc', io: { kind: 'DI', point: 1 }, color: 'red', wiring: 'Normally-closed pushbutton to input I1. (The E-stop is a separate hardwired safety circuit, not shown.)' },
  { id: 'dc', label: 'Dust collector DP', kind: 'sensor', io: { kind: 'DI', point: 2 }, wiring: 'Differential-pressure switch across the dust collector fan: closes when air is really moving, to input I2.' },
  { id: 'gatecl', label: 'Gate closed LS', kind: 'sensor', io: { kind: 'DI', point: 3 }, wiring: 'Limit switch made when the discharge gate is fully closed, to input I3.' },
  { id: 'gateop', label: 'Gate open LS', kind: 'sensor', io: { kind: 'DI', point: 4 }, wiring: 'Limit switch made when the gate is fully open, to input I4.' },
  { id: 'convaux', label: 'Conveyor aux', kind: 'contact', io: { kind: 'DI', point: 5 }, wiring: 'Discharge conveyor starter aux contact to input I5.' },
  { id: 'reset', label: 'Reset', kind: 'pb-no', io: { kind: 'DI', point: 6 }, color: 'white', wiring: 'Fault reset pushbutton to input I6.' },
  { id: 'wt', label: 'Weight transmitter', kind: 'analog', io: { kind: 'AI', point: 0 }, wiring: 'Load cells → summing box → weight transmitter (4–20 mA = 0–2000 lb) → analog input 0.' },
  { id: 'dcrun', label: 'Dust collector', kind: 'coil', io: { kind: 'DO', point: 0 }, wiring: 'Output O0 to the dust collector fan starter.' },
  { id: 'screwa', label: 'Feed screw A', kind: 'coil', io: { kind: 'DO', point: 1 }, wiring: 'Output O1 to screw A starter.' },
  { id: 'screwb', label: 'Feed screw B', kind: 'coil', io: { kind: 'DO', point: 2 }, wiring: 'Output O2 to screw B starter.' },
  { id: 'mixer', label: 'Mixer', kind: 'coil', io: { kind: 'DO', point: 3 }, wiring: 'Output O3 to the mixer starter.' },
  { id: 'gate', label: 'Gate solenoid', kind: 'coil', io: { kind: 'DO', point: 4 }, wiring: 'Output O4 to the gate air solenoid (spring return: closes on loss of power).' },
  { id: 'conv', label: 'Conveyor', kind: 'coil', io: { kind: 'DO', point: 5 }, wiring: 'Output O5 to the discharge conveyor starter.' },
  { id: 'faultlt', label: 'Fault', kind: 'light', io: { kind: 'DO', point: 6 }, color: 'amber', wiring: 'Pilot light on output O6.' },
  { id: 'runlt', label: 'Batch running', kind: 'light', io: { kind: 'DO', point: 7 }, color: 'green', wiring: 'Pilot light on output O7.' },
];

export const MIXER_FAULTS: FaultDef[] = [
  { id: 'mx-dc', title: 'Dust collector not proven', difficulty: 2, evidence: ['i2', 'o0'], culprit: 'dc',
    complaint: 'Start a batch: the dust collector runs, then the mixer faults with code 901.',
    cause: 'The dust collector\'s pressure-switch tubing is plugged with flour, so the DP switch never closes. The fan runs; the PLC never gets proof, and correctly refuses to feed.',
    howToFind: 'Step stuck at 5, then 901. DC_Run (O0) is on and the fan is running, but DC_Proven (I2) never turns on. The logic is protecting you — check the proof device.',
    readings: 'Output O0: on. Input I2 terminal: 0 VDC. Collector fan amps normal.',
    fix: 'Clear and reconnect the pressure tubing, check the DP switch setpoint, then confirm I2 makes with the fan running.',
    safety: 'Never jumper a dust-collector proof to make batches. Flour dust can explode; the interlock is part of the plant\'s combustible-dust protection.' },
  { id: 'mx-wt', title: 'Weigh transmitter reads low', difficulty: 3, evidence: ['scale', 'ai0'], culprit: 'wt',
    complaint: 'Batches finish normally, but QA says every batch is heavy.',
    cause: 'The weight transmitter reads about 15 % low (a load cell is binding, or calibration drifted). The PLC stops each screw at the right DISPLAYED weight, so the real weight is high.',
    howToFind: 'Everything sequences fine — no fault. Put test weights on the hopper (or weigh a batch elsewhere): the display reads low.',
    readings: 'With 1000 lb really in the hopper, AI0 reads about 10.8 mA (≈ 850 lb) instead of 12.0 mA.',
    fix: 'Free any binding (check flexures, debris under the hopper), then recalibrate with certified test weights. Record as-found / as-left.',
    safety: 'Lock out the mixer and feeders before working under or around the hopper.' },
  { id: 'mx-gate', title: 'Gate-closed limit switch failed', difficulty: 2, evidence: ['i3', 'lssup'], culprit: 'gatecl',
    complaint: 'The Start button does nothing. No fault light, nothing moves.',
    cause: 'The gate-closed limit switch arm is bent, so the PLC never sees the gate proven closed and won\'t start a batch (a permissive, not a fault).',
    howToFind: 'Step stays 0. Rung 1 is false at XIC(Gate_Closed): input I3 is off with the gate physically shut.',
    readings: 'Input I3 terminal: 0 VDC with the gate closed. Switch supply side: 24 VDC.',
    fix: 'Replace or re-adjust the limit switch so it makes when the gate is fully closed, then test a batch.',
    safety: 'The gate is air-operated: isolate and bleed the air, and lock out, before adjusting a switch at the gate.' },
  { id: 'mx-screw', title: 'Feed screw A jammed', difficulty: 1, evidence: ['o1'], culprit: 'screwa',
    complaint: 'Batch starts, then faults with code 902 after half a minute.',
    cause: 'A foreign object jammed feed screw A. The screw is commanded on but nothing is coming out, so the weight never reaches target and the feed timeout trips.',
    howToFind: 'Code 902 = feed A timeout. Screw_A (O1) was on, but the weight didn\'t rise. Check the screw\'s motor (overload? current?) and the screw itself.',
    readings: 'Output O1: on during step 10. Weight flat. Screw A motor current at locked-rotor level (or its overload tripped).',
    fix: 'Lock out, clear the jam and find where the object came from (magnets, screens), then reset and run a test batch.',
    safety: 'Screw conveyors cause amputations: lock out, try out and block the screw before opening any cover.' },
];

export function createMixerScene(): PlantScene<MixerState> {
  let mo: ReturnType<typeof momentary<'startPressed' | 'stopPressed' | 'resetPressed'>>;
  const init = (): MixerState => {
    const s = { weight: 0, inFlight: 0, gate: 0, dcAir: 0, convSpin: 0, mixerSpin: 0, batches: 0, lastBatch: 0, peak: 0 } as unknown as MixerState;
    mo = momentary(s, ['startPressed', 'stopPressed', 'resetPressed']);
    return s;
  };
  const scene: PlantScene<MixerState> = {
    id: 'mixer',
    title: 'Flour batch mixer',
    summary: 'Recipe weights, state machine with fault codes, dust-collector and gate interlocks.',
    site: 'mill',
    devices: MIXER_DEVICES,
    state: init(),
    faults: MIXER_FAULTS,
    activeFault: null,
    program: mixerProgram,
    sound: { hum: (s) => Math.max(s.mixerSpin, s.dcAir) * 0.8, contactor: (s) => s.mixerSpin > 0.5 },
    setFault(id) { scene.activeFault = id; },
    reset() { scene.state = init(); scene.activeFault = null; },
    step(dtMs, io) {
      const s = scene.state;
      const f = scene.activeFault;
      const dt = dtMs / 1000;
      io.DI[0] = mo.held('startPressed');
      io.DI[1] = !mo.held('stopPressed');
      io.DI[6] = mo.held('resetPressed');
      mo.tick(dtMs);
      s.dcAir = lag(s.dcAir, io.DO[0] ? 1 : 0, 2, dt);
      s.convSpin = lag(s.convSpin, io.DO[5] ? 1 : 0, 1, dt);
      s.mixerSpin = lag(s.mixerSpin, io.DO[3] ? 1 : 0, 1.5, dt);
      s.gate = clamp(s.gate + ((io.DO[4] ? 1 : -1) * dt) / GATE_S, 0, 1);
      // Feed: screws push material that lands IN_FLIGHT_S later (that's why a real scale overshoots).
      const feeding = (io.DO[1] && f !== 'mx-screw' ? SCREW_RATE : 0) + (io.DO[2] ? SCREW_RATE : 0);
      s.inFlight += feeding * dt;
      const landing = Math.min(s.inFlight, (s.inFlight / IN_FLIGHT_S) * dt);
      s.inFlight -= landing;
      s.weight += landing;
      if (s.gate > 0.5 && s.convSpin > 0.5) s.weight = Math.max(0, s.weight - DISCHARGE_RATE * s.gate * dt);
      s.peak = Math.max(s.peak, s.weight);
      if (s.peak > 100 && s.weight < 30) { s.lastBatch = s.peak; s.batches++; s.peak = 0; }
      const shown = f === 'mx-wt' ? s.weight * 0.85 : s.weight;
      io.AI[0] = mA(shown / 2000);
      io.DI[2] = s.dcAir > 0.8 && f !== 'mx-dc';
      io.DI[3] = s.gate <= 0 && f !== 'mx-gate';
      io.DI[4] = s.gate >= 1;
      io.DI[5] = s.convSpin > 0.8;
    },
    meterPoints(io) {
      const s = scene.state;
      const v = (on: boolean) => ({ value: on ? 24 : 0, unit: 'VDC' as const });
      return [
        { id: 'psu', label: '24 VDC supply (+ to −)', read: () => ({ value: 24, unit: 'VDC' }) },
        { id: 'i2', label: 'Input I2 (dust collector DP switch)', read: () => v(io.DI[2]) },
        { id: 'i3', label: 'Input I3 (gate closed LS)', read: () => v(io.DI[3]) },
        { id: 'lssup', label: 'Gate LS supply side', read: () => v(true) },
        { id: 'ai0', label: 'Weight loop current (AI0)', read: () => ({ value: Number(io.AI[0].toFixed(2)), unit: 'mA' }) },
        { id: 'o0', label: 'Output O0 (dust collector)', read: () => ({ value: io.DO[0] ? 120 : 0, unit: 'VAC' }) },
        { id: 'o1', label: 'Output O1 (screw A)', read: () => ({ value: io.DO[1] ? 120 : 0, unit: 'VAC' }) },
        { id: 'scale', label: 'Test weights on the hopper (true weight, as mA)', read: () => ({ value: Number(mA(s.weight / 2000).toFixed(2)), unit: 'mA' }) },
      ];
    },
    ui: {
      controls: [
        { kind: 'momentary', field: 'startPressed', label: 'Start batch', color: 'green', hint: 'Input I0' },
        { kind: 'momentary', field: 'stopPressed', label: 'Stop', color: 'red', hint: 'Normally closed, input I1' },
        { kind: 'momentary', field: 'resetPressed', label: 'Reset', color: 'white', hint: 'Fault reset, input I6' },
        { settings: true, kind: 'slider', field: 'tag:Target_A', label: 'Recipe: flour A', min: 100, max: 1000, step: 10, unit: 'lb', hint: 'Tag Target_A' },
        { settings: true, kind: 'slider', field: 'tag:Target_AB', label: 'Recipe: A + B', min: 200, max: 1800, step: 10, unit: 'lb', hint: 'Tag Target_AB' },
      ],
      indicators: [
        { kind: 'light', label: 'Batch running', color: 'green', on: (_s, io) => io.DO[7] },
        { kind: 'light', label: 'Fault', color: 'amber', on: (_s, io) => io.DO[6] },
        { kind: 'text', label: 'Step', value: (_s, _io, tag) => { const n = tag('Step'); return ({ 0: '0 · Idle', 5: '5 · Proving dust collector', 10: '10 · Feeding A', 20: '20 · Feeding B', 30: '30 · Mixing', 40: '40 · Discharging', 50: '50 · Closing gate', 901: '901 · Dust collector not proven', 902: '902 · Feed A timeout', 903: '903 · Feed B timeout', 904: '904 · Discharge timeout', 905: '905 · Dust collector lost', 906: '906 · Stopped' } as Record<number, string>)[n] ?? String(n); } },
        { kind: 'text', label: 'Batches / last real weight', value: (s) => `${s.batches} · ${s.lastBatch ? `${s.lastBatch.toFixed(0)} lb` : '—'}` },
        { kind: 'gauge', label: 'Hopper (displayed)', unit: 'lb', max: 2000, value: (_s, _io, tag) => tag('Weight'), digits: 0 },
        { kind: 'gauge', label: 'Hopper (real)', unit: 'lb', max: 2000, value: (s) => s.weight, digits: 0 },
        { kind: 'gauge', label: 'Gate open', unit: '%', max: 100, value: (s) => s.gate * 100, digits: 0 },
      ],
      settingsTitle: 'Recipe (PLC tags)',
    },
  };
  return scene;
}
