/**
 * Machine — Flour-mill bag conveyor with two photo-eyes, bag counting and jam detection.
 *
 *   DI0 Start (NO)  DI1 Stop (NC)  DI2 Overload 95-96 (NC)  DI3 PE1 entry eye (ON = beam blocked)
 *   DI4 PE2 exit eye (ON = beam blocked)  DI5 Reset (NO)
 *   DO0 Conveyor contactor  DO1 Running light  DO2 Jam light  DO3 Pallet-full light
 * Belt 6 m long; 0.5 m/s at full motor speed; bags 0.4 m long fed every 3 s. PE1 at 1.0 m, PE2 at 5.5 m.
 */
import { program } from '../engine/text';
import { canResetOverload, momentary, motorStep, newMotor, type MotorSim } from './kit';
import { MOTOR_FLA, MOTOR_RPM } from './motor';
import type { FaultDef, FieldDevice, PlantScene } from './types';

export const BELT_M = 6;
export const BELT_SPEED = 0.5; // m/s at rated motor speed
export const BAG_M = 0.4;
export const FEED_S = 3;
export const PE1_AT = 1.0;
export const PE2_AT = 5.5;

export interface ConveyorState {
  startPressed: boolean;
  stopPressed: boolean;
  resetPressed: boolean;
  motor: MotorSim;
  contactor: boolean;
  /** Rear edge of each bag, m from the infeed. */
  bags: { x: number; stuck: boolean }[];
  feedTimer: number;
  /** Bags that reached the end of the belt (ground truth, for checking the PLC count). */
  delivered: number;
  feeder: boolean;
  /** Overload relay dial, × motor FLA. */
  olSetting: number;
}

export const blocks = (bags: { x: number }[], at: number) => bags.some((b) => b.x <= at && at <= b.x + BAG_M);

export function conveyorProgram() {
  return program(
    'Bag conveyor',
    [
      { name: 'Start_PB', type: 'BOOL', io: { kind: 'DI', point: 0 } },
      { name: 'Stop_PB', type: 'BOOL', io: { kind: 'DI', point: 1 }, description: 'NC — ON when not pressed' },
      { name: 'OL_OK', type: 'BOOL', io: { kind: 'DI', point: 2 } },
      { name: 'PE1', type: 'BOOL', io: { kind: 'DI', point: 3 }, description: 'Entry photo-eye, ON when blocked' },
      { name: 'PE2', type: 'BOOL', io: { kind: 'DI', point: 4 }, description: 'Exit photo-eye, ON when blocked' },
      { name: 'Reset_PB', type: 'BOOL', io: { kind: 'DI', point: 5 } },
      { name: 'Conv_Run', type: 'BOOL', io: { kind: 'DO', point: 0 } },
      { name: 'Run_Light', type: 'BOOL', io: { kind: 'DO', point: 1 } },
      { name: 'Jam_Light', type: 'BOOL', io: { kind: 'DO', point: 2 } },
      { name: 'Full_Light', type: 'BOOL', io: { kind: 'DO', point: 3 } },
      { name: 'PE1_Tmr', type: 'TIMER', initial: 3000, description: 'Entry eye blocked too long' },
      { name: 'PE2_Tmr', type: 'TIMER', initial: 3000, description: 'Exit eye blocked too long' },
      { name: 'Jam_Alarm', type: 'BOOL' },
      { name: 'Bag_Ctr', type: 'COUNTER', initial: 20, description: '20 bags = a full pallet' },
    ],
    [
      { text: '[XIC(Start_PB),XIC(Conv_Run)]XIC(Stop_PB)XIC(OL_OK)XIO(Jam_Alarm)OTE(Conv_Run)', comment: 'Start/stop. A jam drops the seal-in so the belt stops and stays stopped.' },
      { text: 'XIC(Conv_Run)XIC(PE1)TON(PE1_Tmr)', comment: 'A 0.4 m bag passes an eye in under a second at 0.5 m/s. Blocked for 3 s while running = jam.' },
      { text: 'XIC(Conv_Run)XIC(PE2)TON(PE2_Tmr)' },
      { text: '[XIC(PE1_Tmr.DN),XIC(PE2_Tmr.DN)]OTL(Jam_Alarm)', comment: 'Latch the jam so someone has to look.' },
      { text: 'XIC(Reset_PB)OTU(Jam_Alarm)' },
      { text: 'XIC(Conv_Run)XIC(PE2)CTU(Bag_Ctr)', comment: 'Count each bag once, on the leading edge at the exit eye (CTU counts false→true).' },
      { text: 'XIC(Reset_PB)RES(Bag_Ctr)' },
      { text: 'XIC(Conv_Run)OTE(Run_Light)' },
      { text: 'XIC(Jam_Alarm)OTE(Jam_Light)' },
      { text: 'XIC(Bag_Ctr.DN)OTE(Full_Light)' },
    ],
  );
}

export const CONVEYOR_DEVICES: FieldDevice[] = [
  { id: 'start', label: 'Start', kind: 'pb-no', io: { kind: 'DI', point: 0 }, color: 'green', wiring: 'Normally-open pushbutton to input I0.' },
  { id: 'stop', label: 'Stop', kind: 'pb-nc', io: { kind: 'DI', point: 1 }, color: 'red', wiring: 'Normally-closed pushbutton to input I1.' },
  { id: 'ol', label: 'Overload', kind: 'contact', io: { kind: 'DI', point: 2 }, wiring: 'Overload 95-96 (NC) in series with the coil and to input I2. The dial sets the trip current.' },
  { id: 'pe1', label: 'PE1 entry', kind: 'sensor', io: { kind: 'DI', point: 3 }, wiring: 'Retroreflective photo-eye (PNP, dark-operate: output ON when the beam is blocked) to input I3. Brown +24 V, blue 0 V, black signal.' },
  { id: 'pe2', label: 'PE2 exit', kind: 'sensor', io: { kind: 'DI', point: 4 }, wiring: 'Same type as PE1, at the discharge end, to input I4.' },
  { id: 'reset', label: 'Reset', kind: 'pb-no', io: { kind: 'DI', point: 5 }, color: 'white', wiring: 'Reset pushbutton to input I5: clears the jam alarm and the bag count.' },
  { id: 'coil', label: 'Conveyor contactor', kind: 'coil', io: { kind: 'DO', point: 0 }, wiring: 'Output O0 → OL 95-96 → contactor coil.' },
  { id: 'runlt', label: 'Running', kind: 'light', io: { kind: 'DO', point: 1 }, color: 'green', wiring: 'Pilot light on output O1.' },
  { id: 'jamlt', label: 'Jam', kind: 'light', io: { kind: 'DO', point: 2 }, color: 'amber', wiring: 'Pilot light on output O2.' },
  { id: 'fulllt', label: 'Pallet full', kind: 'light', io: { kind: 'DO', point: 3 }, color: 'green', wiring: 'Pilot light on output O3.' },
];

export const CONVEYOR_FAULTS: FaultDef[] = [
  { id: 'cv-pe1-dirty', title: 'Dirty entry photo-eye', difficulty: 1, culprit: 'pe1',
    complaint: 'The conveyor starts, then stops on a jam alarm after a few seconds. There\'s no jam.',
    cause: 'Flour dust on the PE1 lens (or reflector) keeps the beam blocked, so the PLC sees a bag sitting at the eye.',
    howToFind: 'Input I3 is ON with nothing in front of the eye. Look at the eye\'s own LED and the lens before blaming the PLC.',
    readings: 'Input I3 terminal: 24 VDC with the belt empty. Eye supply (brown–blue): 24 VDC.',
    fix: 'Clean the lens and reflector, check alignment, consider an air knife or a dust hood, then test with a bag.',
    safety: 'Stop the conveyor and lock it out before reaching over the belt to clean an eye.' },
  { id: 'cv-pe2-aligned', title: 'Exit photo-eye knocked out of line', difficulty: 2, culprit: 'pe2',
    complaint: 'Bags are going out but the pallet counter never moves.',
    cause: 'PE2 was knocked out of alignment, so its beam misses the reflector and it never sees a bag.',
    howToFind: 'Watch input I4 while bags pass: it never turns on. The counter rung is fine — it just never gets an edge.',
    readings: 'Input I4 terminal: 0 V as bags pass. Eye supply: 24 VDC.',
    fix: 'Re-align the eye and reflector (use the eye\'s stability LED), tighten the bracket, test with a bag.',
    safety: 'Align eyes with the conveyor stopped where possible; if it must run, stay clear of nip points and pinch rollers.' },
  { id: 'cv-jam', title: 'Bag wedged at the transfer', difficulty: 1, culprit: 'jam',
    complaint: 'Jam light. Bags are piling up at the end of the belt.',
    cause: 'A torn bag wedged at the transfer plate. The exit eye stayed blocked for 3 s and the jam logic stopped the belt — doing its job.',
    howToFind: 'PE2 (I4) is ON and staying on; the PE2 timer is done. Go look at the discharge end.',
    readings: 'Input I4 terminal: 24 VDC continuously. Motor current was normal until the stop.',
    fix: 'Lock out, clear the bag and spilled product, check the transfer plate gap, reset and restart.',
    safety: 'Lock out before clearing a jam — a jammed belt can lurch when it frees. Flour dust in the air: clean up, don\'t blow it around.' },
  { id: 'cv-ol', title: 'Overload dial set too low', difficulty: 3, culprit: 'ol',
    complaint: 'The conveyor runs for a while, then stops by itself. Overload flag is showing. No jam.',
    cause: 'After a motor change, the overload dial was left at the old smaller motor\'s current, so normal running current slowly trips it.',
    howToFind: 'Clamp the motor current at normal load: it\'s below nameplate FLA, but above the overload dial setting.',
    readings: 'Motor running current about 9–10 A (normal for this load); overload dial set to about 7.7 A; motor nameplate FLA 14 A.',
    fix: 'Set the overload to the motor nameplate FLA per the overload maker\'s instructions (and the service factor), reset, test.',
    safety: 'Adjusting an overload dial means working inside the starter: lock out, or follow your energized-work rules with PPE. Never set it higher than nameplate allows.' },
];

export function createConveyorScene(): PlantScene<ConveyorState> {
  let mo: ReturnType<typeof momentary<'startPressed' | 'stopPressed' | 'resetPressed'>>;
  const init = (): ConveyorState => {
    const s = { motor: newMotor(), contactor: false, bags: [], feedTimer: 0, delivered: 0, feeder: true, olSetting: 1 } as unknown as ConveyorState;
    mo = momentary(s, ['startPressed', 'stopPressed', 'resetPressed']);
    return s;
  };
  const scene: PlantScene<ConveyorState> = {
    id: 'conveyor',
    title: 'Bag conveyor with photo-eyes',
    summary: 'Two photo-eyes, bag counting, jam detection and a pallet counter.',
    site: 'mill',
    devices: CONVEYOR_DEVICES,
    state: init(),
    faults: CONVEYOR_FAULTS,
    activeFault: null,
    program: conveyorProgram,
    huntChoices: [{ id: 'jam', label: 'A real jam on the belt' }, { id: 'logic', label: 'The program is wrong' }],
    sound: { hum: (s) => s.motor.rpm / MOTOR_RPM, contactor: (s) => s.contactor },
    setFault(id) {
      scene.activeFault = id;
      if (id === 'cv-ol') scene.state.olSetting = 0.55;
    },
    reset() { scene.state = init(); scene.activeFault = null; },
    step(dtMs, io) {
      const s = scene.state;
      const f = scene.activeFault;
      const dt = dtMs / 1000;
      io.DI[0] = mo.held('startPressed');
      io.DI[1] = !mo.held('stopPressed');
      io.DI[5] = mo.held('resetPressed');
      mo.tick(dtMs);
      s.contactor = io.DO[0] && !s.motor.tripped;
      // The overload sees current relative to its dial setting.
      s.motor = motorStep(s.motor, { dir: s.contactor ? 1 : 0, loadPU: 0.6, olFla: MOTOR_FLA * s.olSetting }, dt);
      io.DI[2] = !s.motor.tripped;
      // Belt and bags
      const v = (BELT_SPEED * Math.max(0, s.motor.rpm)) / MOTOR_RPM;
      if (s.feeder && v > 0.05) {
        s.feedTimer += dt;
        if (s.feedTimer >= FEED_S && !s.bags.some((b) => b.x < BAG_M + 0.2)) { s.feedTimer = 0; s.bags.push({ x: 0, stuck: false }); }
      }
      // Move from the front of the belt back, so a stuck bag holds the ones behind it.
      s.bags.sort((a, b) => b.x - a.x);
      let limit = Infinity;
      for (const b of s.bags) {
        if (f === 'cv-jam' && !b.stuck && b.x >= 5.3 && b.x < PE2_AT) b.stuck = true; // covers the exit eye
        if (!b.stuck) b.x = Math.min(b.x + v * dt, limit - BAG_M - 0.02);
        limit = b.x;
      }
      const before = s.bags.length;
      s.bags = s.bags.filter((b) => b.x < BELT_M);
      s.delivered += before - s.bags.length;
      io.DI[3] = f === 'cv-pe1-dirty' ? true : blocks(s.bags, PE1_AT);
      io.DI[4] = f === 'cv-pe2-aligned' ? false : blocks(s.bags, PE2_AT);
    },
    meterPoints(io) {
      const s = scene.state;
      const v = (on: boolean) => ({ value: on ? 24 : 0, unit: 'VDC' as const });
      return [
        { id: 'psu', label: '24 VDC supply (+ to −)', read: () => ({ value: 24, unit: 'VDC' }) },
        { id: 'pe1sup', label: 'PE1 supply (brown to blue)', read: () => v(true) },
        { id: 'i3', label: 'Input I3 (PE1 signal)', read: () => v(io.DI[3]) },
        { id: 'pe2sup', label: 'PE2 supply (brown to blue)', read: () => v(true) },
        { id: 'i4', label: 'Input I4 (PE2 signal)', read: () => v(io.DI[4]) },
        { id: 'i2', label: 'Input I2 (OL 96)', read: () => v(io.DI[2]) },
        { id: 'o0', label: 'Output O0 (contactor)', read: () => ({ value: io.DO[0] ? 120 : 0, unit: 'VAC' }) },
        { id: 'amps', label: 'Clamp meter on T1 (motor current)', read: () => ({ value: Number(s.motor.amps.toFixed(1)), unit: 'A' }) },
      ];
    },
    ui: {
      controls: [
        { kind: 'momentary', field: 'startPressed', label: 'Start', color: 'green', hint: 'Input I0' },
        { kind: 'momentary', field: 'stopPressed', label: 'Stop', color: 'red', hint: 'Normally closed, input I1' },
        { kind: 'momentary', field: 'resetPressed', label: 'Reset', color: 'white', hint: 'Clears jam and count, input I5' },
        { kind: 'toggle', field: 'feeder', label: 'Bag feeder', on: 'Feeding', off: 'Off', hint: 'Bags arrive every 3 s while the belt runs' },
      ],
      indicators: [
        { kind: 'light', label: 'Running', color: 'green', on: (_s, io) => io.DO[1] },
        { kind: 'light', label: 'Jam', color: 'amber', on: (_s, io) => io.DO[2] },
        { kind: 'light', label: 'Pallet full', color: 'green', on: (_s, io) => io.DO[3] },
        { kind: 'text', label: 'Bags counted (PLC)', value: (_s, _io, tag) => `${tag('Bag_Ctr.ACC')} of ${tag('Bag_Ctr.PRE')}` },
        { kind: 'text', label: 'Bags delivered (real)', value: (s) => String(s.delivered) },
        { kind: 'text', label: 'Belt', value: (s) => `${s.bags.length} bag${s.bags.length === 1 ? '' : 's'} · ${((BELT_SPEED * Math.max(0, s.motor.rpm)) / MOTOR_RPM).toFixed(2)} m/s` },
        { kind: 'gauge', label: 'Motor current', unit: 'A', max: MOTOR_FLA * 1.5, value: (s) => s.motor.amps },
        { kind: 'gauge', label: 'Overload heat', unit: '%', max: 100, value: (s) => s.motor.heat * 100, warn: 80, digits: 0 },
      ],
      actions: [{ id: 'olreset', label: 'Reset overload', run: (sc) => { const m = sc.state.motor; if (!canResetOverload(m)) return false; sc.state.motor = { ...m, tripped: false }; return true; }, disabled: (s) => (!s.motor.tripped ? 'Overload OK' : canResetOverload(s.motor) ? null : 'Overload cooling…') }],
    },
  };
  return scene;
}
