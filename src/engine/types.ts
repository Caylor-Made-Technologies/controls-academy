/**
 * Core PLC data model. Generic (IEC / Logix-like) semantics; brand skins only change
 * how things are displayed, never how they behave.
 */

export type DataType = 'BOOL' | 'INT' | 'DINT' | 'REAL' | 'TIMER' | 'COUNTER' | 'PID';

export interface TimerValue {
  /** Preset, always stored in milliseconds. Skins convert for display. */
  PRE: number;
  /** Accumulated time in milliseconds. */
  ACC: number;
  EN: boolean;
  TT: boolean;
  DN: boolean;
}

export interface CounterValue {
  PRE: number;
  ACC: number;
  CU: boolean;
  CD: boolean;
  DN: boolean;
  OV: boolean;
  UN: boolean;
}

export interface PidValue {
  SP: number;
  PV: number;
  CV: number;
  /** Proportional gain (unitless). */
  KP: number;
  /** Integral gain, per second. */
  KI: number;
  /** Derivative gain, seconds. */
  KD: number;
  CVMIN: number;
  CVMAX: number;
  /** Direct acting: error = PV − SP (cooling, draining). Reverse acting (default): error = SP − PV. */
  DIRECT: boolean;
  /** Manual mode: CV = MANCV, integral tracks for bumpless return to auto. */
  MAN: boolean;
  MANCV: number;
  /** Internal integral term and last error (for derivative). */
  I: number;
  PE: number;
}

export type StructValue = TimerValue | CounterValue | PidValue;
export type TagValue = boolean | number | StructValue | number[] | boolean[];

export type IoKind = 'DI' | 'DO' | 'AI' | 'AO';

export interface IoBinding {
  kind: IoKind;
  /** Zero-based point number on the virtual I/O card. */
  point: number;
}

export interface TagDecl {
  name: string;
  type: DataType;
  /** Array length (makes this an array of `type`). Only BOOL/INT/DINT/REAL arrays. */
  dim?: number;
  io?: IoBinding;
  description?: string;
  /** Initial value (for BOOL/INT/DINT/REAL) or preset (TIMER/COUNTER, ms for timers). */
  initial?: number | boolean;
}

/** Every instruction the engine understands (generic names; skins rename them). */
export type OpCode =
  | 'XIC' | 'XIO' | 'OTE' | 'OTL' | 'OTU' | 'ONS' | 'OSR' | 'OSF'
  | 'TON' | 'TOF' | 'RTO' | 'CTU' | 'CTD' | 'RES'
  | 'EQU' | 'NEQ' | 'GRT' | 'GEQ' | 'LES' | 'LEQ' | 'LIM'
  | 'ADD' | 'SUB' | 'MUL' | 'DIV' | 'MOD' | 'CPT' | 'SCP' | 'NORM_X' | 'SCALE_X'
  | 'MOV' | 'COP' | 'CLR'
  | 'JSR' | 'MCR' | 'PID' | 'AFI' | 'NOP';

export interface Instr {
  kind: 'instr';
  id: string;
  op: OpCode;
  /** Operands: tag references (`Motor`, `T1.DN`, `Arr[2]`) or literals (`5`, `2.5`). */
  args: string[];
}

export interface Branch {
  kind: 'branch';
  id: string;
  /** Parallel legs, each a series of elements. Rung power out = OR of the legs. */
  legs: Elem[][];
}

export type Elem = Instr | Branch;

export interface Rung {
  id: string;
  comment?: string;
  elems: Elem[];
}

export interface Routine {
  name: string;
  rungs: Rung[];
}

export interface Program {
  name: string;
  description?: string;
  tags: TagDecl[];
  routines: Routine[];
  /** Name of the routine the scan starts in (MainRoutine / OB1). */
  main: string;
}

export type Mode = 'RUN' | 'PROG';

export interface MajorFault {
  /** Plain-English cause, shown in the fault viewer. */
  message: string;
  rungId?: string;
  routine?: string;
}

export type ScanPhase = 'input' | 'logic' | 'output' | 'housekeeping';

export interface ScanPointer {
  phase: ScanPhase;
  routine: string;
  /** Index of the rung about to be solved (logic phase). */
  rung: number;
}

/** Power-flow trace for one element on the last solve: what came in, what went out, own condition. */
export interface Trace {
  in: boolean;
  out: boolean;
  /** For contacts/compares: is the instruction's own condition true (highlight in online view). */
  cond: boolean;
}
