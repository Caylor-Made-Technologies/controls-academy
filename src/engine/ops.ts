import type { OpCode } from './types';

export type ArgKind = 'bool' | 'num' | 'dest' | 'timer' | 'counter' | 'struct' | 'routine' | 'expr' | 'pid' | 'array' | 'storage' | 'const';

export interface ArgSpec {
  name: string;
  kind: ArgKind;
}

export type OpCategory = 'bit' | 'timer' | 'counter' | 'compare' | 'math' | 'move' | 'program' | 'process';

export interface OpSpec {
  op: OpCode;
  /** Generic, plain-English name. */
  title: string;
  category: OpCategory;
  /** Input instructions condition the rung; output instructions act on it. */
  role: 'input' | 'output';
  args: ArgSpec[];
  /** One-line beginner explanation. */
  summary: string;
}

const b = (name: string): ArgSpec => ({ name, kind: 'bool' });
const n = (name: string): ArgSpec => ({ name, kind: 'num' });
const d = (name: string): ArgSpec => ({ name, kind: 'dest' });

export const OPS: Record<OpCode, OpSpec> = {
  XIC: { op: 'XIC', title: 'Normally-open contact', category: 'bit', role: 'input', args: [b('Bit')], summary: 'Passes power when the bit is 1 (ON). "Examine if closed."' },
  XIO: { op: 'XIO', title: 'Normally-closed contact', category: 'bit', role: 'input', args: [b('Bit')], summary: 'Passes power when the bit is 0 (OFF). "Examine if open."' },
  OTE: { op: 'OTE', title: 'Output coil', category: 'bit', role: 'output', args: [d('Bit')], summary: 'Writes the rung result to the bit every scan: true → 1, false → 0.' },
  OTL: { op: 'OTL', title: 'Latch (set)', category: 'bit', role: 'output', args: [d('Bit')], summary: 'When the rung is true, sets the bit to 1. It stays 1 until something unlatches it.' },
  OTU: { op: 'OTU', title: 'Unlatch (reset)', category: 'bit', role: 'output', args: [d('Bit')], summary: 'When the rung is true, clears the bit to 0.' },
  ONS: { op: 'ONS', title: 'One-shot', category: 'bit', role: 'input', args: [{ name: 'Storage', kind: 'storage' }], summary: 'Passes power for exactly one scan when the rung goes false → true.' },
  OSR: { op: 'OSR', title: 'One-shot rising', category: 'bit', role: 'output', args: [{ name: 'Storage', kind: 'storage' }, d('Output')], summary: 'Turns Output on for one scan when the rung goes false → true.' },
  OSF: { op: 'OSF', title: 'One-shot falling', category: 'bit', role: 'output', args: [{ name: 'Storage', kind: 'storage' }, d('Output')], summary: 'Turns Output on for one scan when the rung goes true → false.' },
  TON: { op: 'TON', title: 'On-delay timer', category: 'timer', role: 'output', args: [{ name: 'Timer', kind: 'timer' }], summary: 'Counts up while the rung is true. Done when time reaches the preset. Resets when the rung goes false.' },
  TOF: { op: 'TOF', title: 'Off-delay timer', category: 'timer', role: 'output', args: [{ name: 'Timer', kind: 'timer' }], summary: 'Done bit is on while the rung is true and stays on for the preset after the rung goes false.' },
  RTO: { op: 'RTO', title: 'Retentive timer', category: 'timer', role: 'output', args: [{ name: 'Timer', kind: 'timer' }], summary: 'Like an on-delay timer, but keeps its time when the rung goes false. Needs a reset.' },
  CTU: { op: 'CTU', title: 'Count up', category: 'counter', role: 'output', args: [{ name: 'Counter', kind: 'counter' }], summary: 'Adds 1 each time the rung goes false → true. Done when count ≥ preset.' },
  CTD: { op: 'CTD', title: 'Count down', category: 'counter', role: 'output', args: [{ name: 'Counter', kind: 'counter' }], summary: 'Subtracts 1 each time the rung goes false → true.' },
  RES: { op: 'RES', title: 'Reset', category: 'counter', role: 'output', args: [{ name: 'Timer/Counter', kind: 'struct' }], summary: 'When the rung is true, clears a timer or counter (accumulated value and status bits).' },
  EQU: { op: 'EQU', title: 'Equal', category: 'compare', role: 'input', args: [n('A'), n('B')], summary: 'True when A = B. Careful with REAL values: they are rarely exactly equal.' },
  NEQ: { op: 'NEQ', title: 'Not equal', category: 'compare', role: 'input', args: [n('A'), n('B')], summary: 'True when A ≠ B.' },
  GRT: { op: 'GRT', title: 'Greater than', category: 'compare', role: 'input', args: [n('A'), n('B')], summary: 'True when A > B.' },
  GEQ: { op: 'GEQ', title: 'Greater or equal', category: 'compare', role: 'input', args: [n('A'), n('B')], summary: 'True when A ≥ B.' },
  LES: { op: 'LES', title: 'Less than', category: 'compare', role: 'input', args: [n('A'), n('B')], summary: 'True when A < B.' },
  LEQ: { op: 'LEQ', title: 'Less or equal', category: 'compare', role: 'input', args: [n('A'), n('B')], summary: 'True when A ≤ B.' },
  LIM: { op: 'LIM', title: 'Limit test', category: 'compare', role: 'input', args: [n('Low'), n('Test'), n('High')], summary: 'True when Low ≤ Test ≤ High. If Low > High it tests outside the band instead (circular).' },
  ADD: { op: 'ADD', title: 'Add', category: 'math', role: 'output', args: [n('A'), n('B'), d('Dest')], summary: 'Dest = A + B when the rung is true.' },
  SUB: { op: 'SUB', title: 'Subtract', category: 'math', role: 'output', args: [n('A'), n('B'), d('Dest')], summary: 'Dest = A − B when the rung is true.' },
  MUL: { op: 'MUL', title: 'Multiply', category: 'math', role: 'output', args: [n('A'), n('B'), d('Dest')], summary: 'Dest = A × B when the rung is true.' },
  DIV: { op: 'DIV', title: 'Divide', category: 'math', role: 'output', args: [n('A'), n('B'), d('Dest')], summary: 'Dest = A ÷ B. Dividing by zero raises a minor fault.' },
  MOD: { op: 'MOD', title: 'Modulo', category: 'math', role: 'output', args: [n('A'), n('B'), d('Dest')], summary: 'Dest = remainder of A ÷ B.' },
  CPT: { op: 'CPT', title: 'Compute', category: 'math', role: 'output', args: [d('Dest'), { name: 'Expression', kind: 'expr' }], summary: 'Dest = any arithmetic expression, e.g. (Raw − 4000) * 0.0125.' },
  SCP: { op: 'SCP', title: 'Scale with parameters', category: 'math', role: 'output', args: [n('Input'), n('In Min'), n('In Max'), n('Out Min'), n('Out Max'), d('Output')], summary: 'Linear scaling: turns raw counts into engineering units (gallons, psi, °F).' },
  NORM_X: { op: 'NORM_X', title: 'Normalize', category: 'math', role: 'output', args: [n('Min'), n('Value'), n('Max'), d('Out')], summary: 'Out = (Value − Min) / (Max − Min): a 0.0–1.0 fraction. Siemens pairs it with SCALE_X.' },
  SCALE_X: { op: 'SCALE_X', title: 'Scale', category: 'math', role: 'output', args: [n('Min'), n('Value'), n('Max'), d('Out')], summary: 'Out = Value × (Max − Min) + Min. Turns a 0.0–1.0 fraction into units.' },
  MOV: { op: 'MOV', title: 'Move', category: 'move', role: 'output', args: [n('Source'), d('Dest')], summary: 'Copies Source into Dest when the rung is true.' },
  COP: { op: 'COP', title: 'Copy array', category: 'move', role: 'output', args: [{ name: 'Source', kind: 'array' }, { name: 'Dest', kind: 'array' }, { name: 'Length', kind: 'const' }], summary: 'Copies Length elements from one array to another.' },
  CLR: { op: 'CLR', title: 'Clear', category: 'move', role: 'output', args: [d('Dest')], summary: 'Sets Dest to zero (or every element of an array).' },
  JSR: { op: 'JSR', title: 'Jump to subroutine', category: 'program', role: 'output', args: [{ name: 'Routine', kind: 'routine' }], summary: 'Runs another routine, then comes back. Rungs in a routine that is not called are not solved.' },
  MCR: { op: 'MCR', title: 'Master control reset', category: 'program', role: 'output', args: [], summary: 'Starts/ends a zone. When the zone is false, every rung in it is false. Never a substitute for a hardwired safety circuit.' },
  PID: { op: 'PID', title: 'PID loop', category: 'process', role: 'output', args: [{ name: 'PID', kind: 'pid' }], summary: 'Moves CV to hold PV at the setpoint SP using proportional, integral and derivative action.' },
  AFI: { op: 'AFI', title: 'Always false', category: 'bit', role: 'input', args: [], summary: 'Forces the rung false. Used to disable a rung while testing — document it!' },
  NOP: { op: 'NOP', title: 'No operation', category: 'bit', role: 'input', args: [], summary: 'Does nothing; passes power straight through.' },
};

export const OP_LIST = Object.values(OPS);
