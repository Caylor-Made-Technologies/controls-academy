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
  /** What the operator reports — the starting clue. */
  complaint: string;
  /** What's actually wrong (revealed at the end). */
  cause: string;
  /** How a tech finds it: the efficient path. */
  howToFind: string;
  /** The device or point at fault; the learner must pick this to solve the hunt. */
  culprit: string;
  /** Points awarded / difficulty. */
  difficulty: 1 | 2 | 3;
}

/** A meter reading the learner can take in Fault-Hunt mode. */
export interface MeterPoint {
  id: string;
  label: string;
  /** Returns volts (DC or AC as labeled). */
  read(): { value: number; unit: 'VDC' | 'VAC' | 'mA' };
}

export interface PlantScene<S = unknown> {
  id: string;
  title: string;
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
