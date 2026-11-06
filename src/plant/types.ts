import type { Program } from '../engine/types';

export interface FieldIO {
  DI: boolean[];
  DO: boolean[];
  AI: number[];
  AO: number[];
}

export type DeviceKind = 'pb-no' | 'pb-nc' | 'estop' | 'selector' | 'sensor' | 'contact' | 'coil' | 'light' | 'analog';

export interface FieldDevice {
  id: string;
  label: string;
  kind: DeviceKind;
  /** Which I/O point the device is wired to. */
  io?: { kind: 'DI' | 'DO' | 'AI' | 'AO'; point: number };
  /** Short wiring explanation shown in the device sheet. */
  wiring: string;
  /** Light color for pilot lights. */
  color?: 'green' | 'amber' | 'red' | 'white';
}

export interface FaultDef {
  id: string;
  title: string;
  /** What the operator reports — the starting clue (the symptom). */
  complaint: string;
  /** What's actually wrong (revealed at the end): the root cause. */
  cause: string;
  /** How a tech finds it: the efficient path. */
  howToFind: string;
  /** What the meter shows at the key points with this fault. */
  readings: string;
  /** The correct fix. */
  fix: string;
  /** What a real tech does first to stay safe. */
  safety: string;
  /** The device or point at fault; the learner must pick this to solve the hunt. */
  culprit: string;
  /** Points awarded / difficulty. */
  difficulty: 1 | 2 | 3;
  /** Meter point ids whose reading proves this fault (Fault Hunt rewards measuring one before naming the culprit). */
  evidence?: string[];
}

/** A meter reading the learner can take in Fault-Hunt mode. */
export interface MeterPoint {
  id: string;
  label: string;
  /** Returns volts (DC or AC as labeled). */
  read(): { value: number; unit: 'VDC' | 'VAC' | 'mA' | 'A' };
}

/** Operator controls a generic machine panel can draw. `field` is a key of the machine's state. */
/** A control's `field` is a state key, or `tag:Name.Member` to read/write a PLC tag (setpoints, PID tuning).
 * `settings: true` puts a control in the collapsible settings box (drive parameters, tuning) instead of the operator station. */
export type PanelControl = { settings?: boolean } & (
  | { kind: 'momentary'; field: string; label: string; color: 'green' | 'red' | 'white'; hint: string }
  | { kind: 'toggle'; field: string; label: string; on: string; off: string; hint: string }
  | { kind: 'selector'; field: string; label: string; options: { value: string; label: string }[]; hint: string }
  | { kind: 'slider'; field: string; label: string; min: number; max: number; step: number; unit: string; hint: string });

/** Readouts: pilot lights follow a DO point; gauges and text read the machine state (or a PLC tag through `tag`). */
export type TagReader = (name: string) => number;
export type PanelIndicator<S = unknown> =
  | { kind: 'light'; label: string; color: 'green' | 'amber' | 'red'; on: (s: S, io: FieldIO, tag: TagReader) => boolean }
  | { kind: 'gauge'; label: string; unit: string; max: number; value: (s: S, io: FieldIO, tag: TagReader) => number; warn?: number; digits?: number }
  | { kind: 'text'; label: string; value: (s: S, io: FieldIO, tag: TagReader) => string };

export interface MachineUI<S = unknown> {
  controls: PanelControl[];
  indicators: PanelIndicator<S>[];
  /** Trend lines drawn under the panel (e.g. PV and SP). */
  trend?: { label: string; color: string; value: (s: S, io: FieldIO, tag: TagReader) => number }[];
  trendMax?: number;
  /** Title of the settings box (e.g. "Drive parameters"). */
  settingsTitle?: string;
  /** Buttons on the machine itself, e.g. "Reset overload" (returns false when refused). */
  actions?: { id: string; label: string; run: (scene: PlantScene<S>) => boolean | void; disabled?: (s: S) => string | null }[];
}

/**
 * A machine the simulator can run. Physics runs in SI units inside `step`; the PLC only sees `io`.
 * See docs/SIM-ARCHITECTURE.md.
 */
export interface PlantScene<S = unknown> {
  id: string;
  title: string;
  /** One line for pickers. */
  summary?: string;
  /** Which plant the example comes from. */
  site?: 'mill' | 'datacenter' | 'water' | 'general';
  /** Generic 2D operator panel. Machines without it (the motor station) have their own component. */
  ui?: MachineUI<S>;
  /** 3D hook: which 3D scene shows this machine, if any. */
  view3d?: 'motor-panel';
  /** Extra "this is the problem" choices in Fault Hunt (things that aren't a device, like a fuse or a force). */
  huntChoices?: { id: string; label: string }[];
  /** Arm a fault that needs the controller too (e.g. a force left installed). */
  armFault?(id: string, plc: { forces: { DI: Map<number, boolean>; DO: Map<number, boolean> }; tags: { write(name: string, v: number | boolean): void } }): void;
  /** Sound cues: motor hum level 0–1 and whether a contactor is pulled in (clunk on change). */
  sound?: { hum: (s: S) => number; contactor: (s: S) => boolean };
  devices: FieldDevice[];
  state: S;
  /** The working program that ships with the scene. */
  program(): Program;
  /** Physics step: reads the field outputs, updates the field inputs. */
  step(dtMs: number, io: FieldIO): void;
  faults: FaultDef[];
  activeFault: string | null;
  setFault(id: string | null): void;
  meterPoints(io: FieldIO): MeterPoint[];
  reset(): void;
  /** Manual reset of an overload relay; false while it is still too hot to reset. */
  resetOverload?(): boolean;
}
