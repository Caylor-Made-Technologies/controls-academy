/**
 * Machine — Data-center mechanical bus: automatic transfer switch (ATS) + standby generator, feeding a
 * CRAH (computer-room air handler) whose chilled-water valve holds supply-air temperature with a PID.
 * Generic: no specific site, client or product. Times are shortened for the simulator. // VERIFY
 *
 *   DI0 Utility OK (voltage/frequency sensing relay)  DI1 Generator ready (at voltage and frequency)
 *   DI2 ATS in Normal (position switch)  DI3 ATS in Emergency (position switch)  DI4 CRAH airflow proven
 *   DI5 Alarm reset (NO)
 *   AI0 Supply-air temperature, 4–20 mA = 0–40 °C
 *   DO0 Generator start (run request)  DO1 Transfer to Emergency  DO2 Transfer to Normal
 *   DO3 Generator / ATS fail alarm  DO4 High temperature alarm  DO5 CRAH fan run
 *   AO0 Chilled-water valve, 0–100 % open
 * IT load rides through on its UPS (not modeled); the CRAH is on the mechanical bus, so it stops in an outage.
 */
import { program } from '../engine/text';
import { clamp, lag, mA, momentary } from './kit';
import type { FaultDef, FieldDevice, PlantScene } from './types';

export const GEN_READY_S = 10; // start to rated voltage/frequency (illustrative)
export const ATS_MOVE_S = 0.5;
export const UA = 20; // kW per K across the cooling coil at 100 % valve
export const T_CHW = 10; // °C chilled water supply
export const HEAT_CAP = 600; // kJ/K, air + equipment thermal mass (illustrative)

export interface DcState {
  resetPressed: boolean;
  utility: boolean;
  itLoad: number; // kW
  genTime: number; // s since start request (−1 = stopped)
  genReady: boolean;
  ats: 'N' | 'E' | 'moving-N' | 'moving-E';
  atsTimer: number;
  fanSpin: number; // 0–1
  valve: number; // %
  temp: number; // °C supply air
}

export function dcProgram() {
  return program(
    'ATS and CRAH',
    [
      { name: 'Util_OK', type: 'BOOL', io: { kind: 'DI', point: 0 } },
      { name: 'Gen_Ready', type: 'BOOL', io: { kind: 'DI', point: 1 } },
      { name: 'ATS_Normal', type: 'BOOL', io: { kind: 'DI', point: 2 } },
      { name: 'ATS_Emerg', type: 'BOOL', io: { kind: 'DI', point: 3 } },
      { name: 'Air_Proven', type: 'BOOL', io: { kind: 'DI', point: 4 } },
      { name: 'Reset_PB', type: 'BOOL', io: { kind: 'DI', point: 5 } },
      { name: 'SAT_mA', type: 'REAL', io: { kind: 'AI', point: 0 }, description: 'Supply-air temp, 4–20 mA = 0–40 °C' },
      { name: 'Gen_Start', type: 'BOOL', io: { kind: 'DO', point: 0 } },
      { name: 'Xfer_Emerg', type: 'BOOL', io: { kind: 'DO', point: 1 } },
      { name: 'Xfer_Normal', type: 'BOOL', io: { kind: 'DO', point: 2 } },
      { name: 'Fail_Light', type: 'BOOL', io: { kind: 'DO', point: 3 } },
      { name: 'HiTemp_Light', type: 'BOOL', io: { kind: 'DO', point: 4 } },
      { name: 'Fan_Run', type: 'BOOL', io: { kind: 'DO', point: 5 } },
      { name: 'CHW_Valve', type: 'REAL', io: { kind: 'AO', point: 0 } },
      { name: 'Util_Lost', type: 'TIMER', initial: 2000, description: 'Utility must be gone 2 s before the generator starts (rides through blips)' },
      { name: 'Util_Stable', type: 'TIMER', initial: 30000, description: 'Retransfer delay: utility must be steady 30 s (real sites use minutes)' },
      { name: 'Cooldown', type: 'TIMER', initial: 20000, description: 'Generator runs unloaded before stopping' },
      { name: 'Gen_FTS', type: 'TIMER', initial: 15000, description: 'Generator fail-to-start' },
      { name: 'Xfer_Tmr', type: 'TIMER', initial: 3000, description: 'ATS fail-to-transfer' },
      { name: 'Gen_Fail', type: 'BOOL' },
      { name: 'ATS_Fail', type: 'BOOL' },
      { name: 'SAT_C', type: 'REAL' },
      { name: 'SAT_Bad', type: 'BOOL' },
      { name: 'SAT_SP', type: 'REAL', initial: 20, description: 'Supply-air setpoint, °C' },
      { name: 'CHW_PID', type: 'PID' },
    ],
    [
      { text: 'XIO(Util_OK)TON(Util_Lost)', comment: 'Utility gone long enough to be real.' },
      { text: 'XIC(Util_OK)TON(Util_Stable)', comment: 'Utility back and steady before retransfer.' },
      { text: 'XIC(Util_OK)XIC(ATS_Normal)XIC(Gen_Start)TON(Cooldown)', comment: 'Back on utility: let the generator cool down unloaded.' },
      { text: '[XIC(Util_Lost.DN),XIC(Gen_Start)]XIO(Cooldown.DN)OTE(Gen_Start)', comment: 'Start the generator on utility loss; keep it running until cooldown is done.' },
      { text: 'XIC(Gen_Start)XIO(Gen_Ready)TON(Gen_FTS)' },
      { text: 'XIC(Gen_FTS.DN)OTL(Gen_Fail)' },
      { text: 'XIO(Util_OK)XIC(Gen_Ready)XIO(ATS_Emerg)OTE(Xfer_Emerg)', comment: 'Transfer to the generator once it is ready (open transition).' },
      { text: 'XIC(Util_Stable.DN)XIO(ATS_Normal)OTE(Xfer_Normal)', comment: 'Retransfer to utility after the stable delay.' },
      { text: '[XIC(Xfer_Emerg),XIC(Xfer_Normal)]TON(Xfer_Tmr)', comment: 'A transfer that doesn\'t finish in 3 s = ATS failed.' },
      { text: 'XIC(Xfer_Tmr.DN)OTL(ATS_Fail)' },
      { text: 'XIC(Reset_PB)OTU(Gen_Fail)' },
      { text: 'XIC(Reset_PB)OTU(ATS_Fail)' },
      { text: '[XIC(Gen_Fail),XIC(ATS_Fail)]OTE(Fail_Light)' },
      { text: 'OTE(Fan_Run)', comment: 'The CRAH fan is always called; it runs whenever its bus has power.' },
      { text: 'SCP(SAT_mA,4.0,20.0,0.0,40.0,SAT_C)' },
      { text: '[LES(SAT_mA,3.6),GRT(SAT_mA,21.0)]OTE(SAT_Bad)', comment: 'Bad sensor → fail to full cooling (safer for IT than no cooling).' },
      { text: 'OTE(CHW_PID.DIRECT)', comment: 'Direct acting: temperature above setpoint → open the valve more.' },
      { text: 'MOV(SAT_SP,CHW_PID.SP)' },
      { text: 'MOV(SAT_C,CHW_PID.PV)' },
      { text: 'MOV(8.0,CHW_PID.KP)' },
      { text: 'MOV(0.15,CHW_PID.KI)' },
      { text: 'PID(CHW_PID)' },
      { text: 'XIO(SAT_Bad)MOV(CHW_PID.CV,CHW_Valve)' },
      { text: 'XIC(SAT_Bad)MOV(100,CHW_Valve)' },
      { text: 'GRT(SAT_C,27.0)OTE(HiTemp_Light)', comment: '27 °C: top of the commonly used recommended inlet range. // VERIFY site limits' },
    ],
  );
}

export const DC_DEVICES: FieldDevice[] = [
  { id: 'util', label: 'Utility sensing', kind: 'contact', io: { kind: 'DI', point: 0 }, wiring: 'Voltage/frequency sensing relay on the utility side of the ATS, contact to input I0 (closed = utility OK).' },
  { id: 'gen', label: 'Generator ready', kind: 'contact', io: { kind: 'DI', point: 1 }, wiring: 'Generator controller "ready / at rated" contact to input I1.' },
  { id: 'atsn', label: 'ATS normal', kind: 'contact', io: { kind: 'DI', point: 2 }, wiring: 'ATS position switch: closed in the Normal (utility) position, to input I2.' },
  { id: 'atse', label: 'ATS emergency', kind: 'contact', io: { kind: 'DI', point: 3 }, wiring: 'ATS position switch: closed in the Emergency (generator) position, to input I3.' },
  { id: 'air', label: 'CRAH airflow', kind: 'sensor', io: { kind: 'DI', point: 4 }, wiring: 'Differential-pressure airflow switch across the CRAH fan, to input I4 (proof the fan really moves air).' },
  { id: 'reset', label: 'Alarm reset', kind: 'pb-no', io: { kind: 'DI', point: 5 }, color: 'white', wiring: 'Reset pushbutton to input I5.' },
  { id: 'sat', label: 'Supply-air temp', kind: 'analog', io: { kind: 'AI', point: 0 }, wiring: '4–20 mA temperature transmitter (0–40 °C) in the CRAH discharge, to analog input 0.' },
  { id: 'genstart', label: 'Gen start', kind: 'coil', io: { kind: 'DO', point: 0 }, wiring: 'Output O0 to the generator controller\'s remote-start input (dry contact via an interposing relay).' },
  { id: 'xe', label: 'Transfer to Emergency', kind: 'coil', io: { kind: 'DO', point: 1 }, wiring: 'Output O1 to the ATS "transfer to emergency" input.' },
  { id: 'xn', label: 'Transfer to Normal', kind: 'coil', io: { kind: 'DO', point: 2 }, wiring: 'Output O2 to the ATS "transfer to normal" input.' },
  { id: 'faillt', label: 'Gen/ATS fail', kind: 'light', io: { kind: 'DO', point: 3 }, color: 'red', wiring: 'Alarm light (and a BMS alarm point) on output O3.' },
  { id: 'hitemp', label: 'High temp', kind: 'light', io: { kind: 'DO', point: 4 }, color: 'amber', wiring: 'Alarm light on output O4.' },
  { id: 'fan', label: 'CRAH fan', kind: 'coil', io: { kind: 'DO', point: 5 }, wiring: 'Output O5 to the CRAH fan starter (on the mechanical bus fed by the ATS).' },
  { id: 'valve', label: 'CHW valve', kind: 'analog', io: { kind: 'AO', point: 0 }, wiring: 'Analog output 0 to the chilled-water valve actuator (4–20 mA, fails closed).' },
];

export const DC_FAULTS: FaultDef[] = [
  { id: 'dc-gen', title: 'Generator fails to start', difficulty: 2, culprit: 'gen',
    complaint: 'During the utility outage test, the generator never came up and the CRAHs stayed off.',
    cause: 'The generator\'s starting battery is dead (a failed battery charger), so it never reaches rated voltage and frequency. The PLC asked for a start; nothing came back.',
    howToFind: 'Gen_Start (O0) is on, Gen_Ready (I1) never comes on, and the fail-to-start alarm latches after 15 s. The logic did its job — look at the generator.',
    readings: 'Output O0: closed (start requested). Generator ready contact (I1): open. Starting battery: well below its rated voltage under crank.',
    fix: 'Replace the battery, repair the charger, run a start test and a load test, and log it. Check the charger alarm made it to the BMS.',
    safety: 'Generators can start automatically at any moment: put the generator controller in OFF and lock out before working on it. Batteries can arc and vent hydrogen.' },
  { id: 'dc-ats', title: 'ATS fails to transfer', difficulty: 3, culprit: 'atse',
    complaint: 'The generator started fine on the test, but the load never moved over. Fail alarm.',
    cause: 'The ATS motor operator failed: the PLC commands a transfer, but the switch never leaves Normal.',
    howToFind: 'Gen ready (I1) is ON and Transfer-to-Emergency (O1) is ON, but neither position switch changes. The fail-to-transfer timer latches the alarm.',
    readings: 'Output O1: on. ATS position switches: Normal closed, Emergency open — no change.',
    fix: 'With the ATS isolated, repair the operator (motor, limit switches, fuses) per the maker\'s manual; test transfer and retransfer under supervision.',
    safety: 'An ATS has two live sources. Both must be isolated and locked out — and proven dead — before working inside. Follow the site\'s MOP.' },
  { id: 'dc-valve', title: 'Chilled-water valve stuck closed', difficulty: 2, culprit: 'valve',
    complaint: 'Hot aisle complaint: CRAH supply air keeps climbing, though the fan runs.',
    cause: 'The valve actuator failed with the valve closed. The PID drives its output to 100 % but no chilled water flows.',
    howToFind: 'CV and the AO signal are at 100 % (20 mA), the fan is proven, but supply air rises. The control system is fine; the final element isn\'t.',
    readings: 'AO0 at the actuator: 20 mA. Valve position indicator: closed. Coil leaving-air temperature ≈ entering air.',
    fix: 'Repair or replace the actuator, stroke-test 0–100 %, return to auto. Meanwhile, bring up a standby CRAH.',
    safety: 'Raised-floor and CRAH work happens next to live IT: follow the site MOP and change window, and never isolate a unit without a standby running.' },
  { id: 'dc-sat', title: 'Supply-air sensor failed high', difficulty: 1, culprit: 'sat',
    complaint: 'Supply air is ice-cold and the chilled-water valve is wide open.',
    cause: 'The supply-air transmitter failed (driving over 21 mA). The program treats it as a bad signal and fails to full cooling — safe for the IT, wasteful, and too cold.',
    howToFind: 'SAT_Bad is on and the AI reads above 21 mA. The valve is at 100 % by design. Check the transmitter and its wiring.',
    readings: 'AI0: about 22 mA (impossible for 0–40 °C). Real air temperature well below setpoint.',
    fix: 'Replace or recalibrate the transmitter and confirm a sane reading; the PID takes back over automatically.',
    safety: 'Work in the CRAH with the unit\'s isolator locked out only if a standby unit is carrying the load, per the MOP.' },
];

export function createDatacenterScene(): PlantScene<DcState> {
  let mo: ReturnType<typeof momentary<'resetPressed'>>;
  const init = (): DcState => {
    const s = { utility: true, itLoad: 100, genTime: -1, genReady: false, ats: 'N', atsTimer: 0, fanSpin: 1, valve: 50, temp: 20 } as unknown as DcState;
    mo = momentary(s, ['resetPressed']);
    return s;
  };
  const scene: PlantScene<DcState> = {
    id: 'datacenter',
    title: 'Data center: ATS + CRAH',
    summary: 'Utility loss, generator start, transfer and retransfer; CRAH chilled-water PID.',
    site: 'datacenter',
    devices: DC_DEVICES,
    state: init(),
    faults: DC_FAULTS,
    activeFault: null,
    program: dcProgram,
    sound: { hum: (s) => s.fanSpin * 0.6, contactor: (s) => s.ats === 'E' },
    setFault(id) { scene.activeFault = id; },
    reset() { scene.state = init(); scene.activeFault = null; },
    step(dtMs, io) {
      const s = scene.state;
      const f = scene.activeFault;
      const dt = dtMs / 1000;
      io.DI[5] = mo.held('resetPressed');
      mo.tick(dtMs);
      // Generator
      if (io.DO[0]) s.genTime = s.genTime < 0 ? 0 : s.genTime + dt;
      else s.genTime = -1;
      s.genReady = f !== 'dc-gen' && s.genTime >= GEN_READY_S;
      // ATS (motor operated, open transition)
      if (f !== 'dc-ats') {
        if (io.DO[1] && s.ats === 'N' && s.genReady) { s.ats = 'moving-E'; s.atsTimer = 0; }
        if (io.DO[2] && s.ats === 'E' && s.utility) { s.ats = 'moving-N'; s.atsTimer = 0; }
        if (s.ats.startsWith('moving')) { s.atsTimer += dt; if (s.atsTimer >= ATS_MOVE_S) s.ats = s.ats === 'moving-E' ? 'E' : 'N'; }
      }
      const busPowered = (s.ats === 'N' && s.utility) || (s.ats === 'E' && s.genReady);
      // CRAH fan + coil
      s.fanSpin = lag(s.fanSpin, busPowered && io.DO[5] ? 1 : 0, busPowered ? 3 : 6, dt);
      const cmd = f === 'dc-valve' ? 0 : clamp(io.AO[0], 0, 100);
      s.valve = lag(s.valve, cmd, 4, dt);
      const chwOK = busPowered ? 1 : 0.3; // chilled-water pumps on the same bus; some thermal storage in the loop
      const qCool = Math.max(0, (s.valve / 100) * UA * (s.temp - T_CHW) * s.fanSpin * chwOK);
      s.temp += ((s.itLoad - qCool) / HEAT_CAP) * dt;
      s.temp = clamp(s.temp, 5, 50);
      // Inputs
      io.DI[0] = s.utility;
      io.DI[1] = s.genReady;
      io.DI[2] = s.ats === 'N';
      io.DI[3] = s.ats === 'E';
      io.DI[4] = s.fanSpin > 0.7;
      io.AI[0] = f === 'dc-sat' ? 22 : mA(s.temp / 40);
    },
    meterPoints(io) {
      const s = scene.state;
      const v = (on: boolean) => ({ value: on ? 24 : 0, unit: 'VDC' as const });
      return [
        { id: 'psu', label: '24 VDC supply (+ to −)', read: () => ({ value: 24, unit: 'VDC' }) },
        { id: 'util', label: 'Utility side of the ATS, phase to phase (energized work)', read: () => ({ value: s.utility ? 480 : 0, unit: 'VAC' }) },
        { id: 'genv', label: 'Generator side of the ATS, phase to phase (energized work)', read: () => ({ value: s.genTime >= 2 && scene.activeFault !== 'dc-gen' ? Math.min(480, Math.round((s.genTime / GEN_READY_S) * 480)) : 0, unit: 'VAC' }) },
        { id: 'load', label: 'Load side of the ATS (mechanical bus)', read: () => ({ value: (s.ats === 'N' && s.utility) || (s.ats === 'E' && s.genReady) ? 480 : 0, unit: 'VAC' }) },
        { id: 'i1', label: 'Input I1 (generator ready)', read: () => v(io.DI[1]) },
        { id: 'i3', label: 'Input I3 (ATS emergency position)', read: () => v(io.DI[3]) },
        { id: 'ai0', label: 'Supply-air temp loop (AI0)', read: () => ({ value: Number(io.AI[0].toFixed(2)), unit: 'mA' }) },
        { id: 'ao0', label: 'CHW valve signal (AO0)', read: () => ({ value: Number(mA(clamp(io.AO[0], 0, 100) / 100).toFixed(2)), unit: 'mA' }) },
      ];
    },
    ui: {
      controls: [
        { kind: 'toggle', field: 'utility', label: 'Utility power', on: 'Normal', off: 'OUTAGE', hint: 'Simulate a utility outage' },
        { kind: 'momentary', field: 'resetPressed', label: 'Alarm reset', color: 'white', hint: 'Input I5' },
        { kind: 'slider', field: 'itLoad', label: 'IT heat load', min: 20, max: 150, step: 5, unit: 'kW', hint: 'Heat the servers put into the room' },
        { settings: true, kind: 'slider', field: 'tag:SAT_SP', label: 'Supply-air setpoint', min: 16, max: 26, step: 0.5, unit: '°C', hint: 'Tag SAT_SP' },
      ],
      indicators: [
        { kind: 'light', label: 'Gen/ATS fail', color: 'red', on: (_s, io) => io.DO[3] },
        { kind: 'light', label: 'High temp', color: 'amber', on: (_s, io) => io.DO[4] },
        { kind: 'light', label: 'CRAH air', color: 'green', on: (_s, io) => io.DI[4] },
        { kind: 'text', label: 'ATS', value: (s) => ({ N: 'NORMAL (utility)', E: 'EMERGENCY (generator)', 'moving-N': 'transferring…', 'moving-E': 'transferring…' })[s.ats] },
        { kind: 'text', label: 'Generator', value: (s) => (s.genTime < 0 ? 'Off' : s.genReady ? 'Ready — at rated' : `Starting… ${s.genTime.toFixed(0)} s`) },
        { kind: 'gauge', label: 'Supply air', unit: '°C', max: 40, value: (s) => s.temp, warn: 27 },
        { kind: 'gauge', label: 'CHW valve', unit: '%', max: 100, value: (s) => s.valve, digits: 0 },
      ],
      trend: [
        { label: 'Supply air °C × 2.5', color: 'var(--alarm)', value: (s) => s.temp * 2.5 },
        { label: 'Setpoint', color: 'var(--text-muted)', value: (_s, _io, tag) => tag('SAT_SP') * 2.5 },
        { label: 'Valve %', color: 'var(--blue-glow)', value: (s) => s.valve },
      ],
      trendMax: 100,
      settingsTitle: 'Setpoint (PLC tag)',
    },
  };
  return scene;
}
