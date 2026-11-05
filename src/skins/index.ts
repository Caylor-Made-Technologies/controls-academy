/**
 * Brand skins: same engine, different dialects. A skin changes addressing, instruction names,
 * structure member names and timer units — never behavior.
 *
 * Brand names are used descriptively only ("Allen-Bradley style addressing"). No logos or
 * copied screens. Details we are not certain of are marked VERIFY and listed in docs/VERIFY.md.
 */
import type { OpCode, Program, TagDecl } from '../engine/types';

export type SkinId =
  | 'iec' | 'ab-logix' | 'ab-slc' | 'ab-micro800' | 'siemens-tia' | 'siemens-classic'
  | 'modicon' | 'mitsubishi' | 'automationdirect' | 'omron';

export type AddrClass = 'DI' | 'DO' | 'AI' | 'AO' | 'BIT' | 'WORD' | 'REAL' | 'TIMER' | 'COUNTER' | 'PID';

export interface Skin {
  id: SkinId;
  /** Manufacturer, used descriptively only. */
  maker: string;
  /** Short labels printed on the generic 3D hardware, in this platform's addressing style. */
  hw: { cpu: string; din: string; dout: string };
  /** Short brand label used in pickers. */
  brand: string;
  /** Platform family, descriptive. */
  family: string;
  /** "Studio 5000 style" etc. — describes conventions, not a copy of the product. */
  style: string;
  /** Accent used for the skin chip (never a vendor brand color copy; just to tell skins apart). */
  hue: number;
  /** Is the tag name the primary thing you see (tag-based) or the address (address-based)? */
  tagBased: boolean;
  address(cls: AddrClass, n: number, decl: TagDecl): string;
  mnemonic: Partial<Record<OpCode, string>>;
  /** Structure member renames, e.g. Siemens IEC timer DN → Q. */
  members: Record<string, string>;
  /** How a timer preset (ms) is written on this platform. */
  timerPreset(ms: number): string;
  /** Where the logic lives (MainRoutine, OB1...). */
  mainName: string;
  numberNote?: string;
  notes: string[];
}

const pad = (n: number, w: number) => String(n).padStart(w, '0');
const octal = (n: number) => n.toString(8);
const secs = (ms: number) => {
  const s = ms / 1000;
  return Number.isInteger(s) ? `${s}` : s.toFixed(s < 1 ? 3 : 2).replace(/0+$/, '').replace(/\.$/, '');
};
/** IEC TIME literal: T#5S, T#1M30S, T#250MS. */
export function iecTime(ms: number, upper = true): string {
  if (ms === 0) return upper ? 'T#0MS' : 't#0ms';
  const parts: string[] = [];
  let r = Math.round(ms);
  const h = Math.floor(r / 3600000); r -= h * 3600000;
  const m = Math.floor(r / 60000); r -= m * 60000;
  const s = Math.floor(r / 1000); r -= s * 1000;
  if (h) parts.push(`${h}H`);
  if (m) parts.push(`${m}M`);
  if (s) parts.push(`${s}S`);
  if (r) parts.push(`${r}MS`);
  const out = `T#${parts.join('')}`;
  return upper ? out : out.toLowerCase();
}

const GENERIC: Partial<Record<OpCode, string>> = {};

export const SKINS: Record<SkinId, Skin> = {
  iec: {
    id: 'iec', maker: 'Vendor-neutral (IEC 61131-3)', hw: { cpu: 'IEC CPU', din: '%IX0.0–0.7', dout: '%QX0.0–0.7' }, brand: 'Generic IEC 61131-3', family: 'CODESYS-style / vendor-neutral', style: 'IEC 61131-3 conventions',
    hue: 200, tagBased: true, mainName: 'PLC_PRG (cyclic task)',
    address: (cls, n, d) => (cls === 'DI' ? `%IX0.${n}` : cls === 'DO' ? `%QX0.${n}` : cls === 'AI' ? `%IW${n * 2}` : cls === 'AO' ? `%QW${n * 2}` : d.name),
    mnemonic: {
      XIC: 'NO contact', XIO: 'NC contact', OTE: 'Coil', OTL: 'Set coil (S)', OTU: 'Reset coil (R)', ONS: 'R_TRIG', OSR: 'R_TRIG', OSF: 'F_TRIG',
      TON: 'TON', TOF: 'TOF', RTO: 'TONR*', CTU: 'CTU', CTD: 'CTD', RES: 'R input', EQU: 'EQ', NEQ: 'NE', GRT: 'GT', GEQ: 'GE', LES: 'LT', LEQ: 'LE',
      LIM: 'LIMIT*', ADD: 'ADD', SUB: 'SUB', MUL: 'MUL', DIV: 'DIV', MOD: 'MOD', CPT: 'ST expression', SCP: 'scaling (ST)', MOV: 'MOVE', CLR: ':= 0', JSR: 'call POU', PID: 'PID FB',
    },
    members: { DN: 'Q', ACC: 'ET', PRE: 'PT', EN: 'IN', 'C.DN': 'Q', 'C.ACC': 'CV', 'C.PRE': 'PV', 'C.CU': 'CU', 'C.CD': 'CD' },
    timerPreset: (ms) => `PT := ${iecTime(ms)}`,
    notes: [
      'Variables are declared in a VAR … END_VAR section with a data type; I/O uses %I / %Q direct addresses mapped to names.',
      'Timers and counters are function block instances (e.g. MyTimer : TON). Their outputs are Q (done) and ET (elapsed time).',
      'IEC has no standard retentive timer; vendors add their own (shown here as TONR*). LIMIT clamps a value; it is not the same as a limit test. // VERIFY',
      'Same ideas run in Structured Text, Function Block Diagram and ladder.',
    ],
  },

  'ab-logix': {
    id: 'ab-logix', maker: 'Allen-Bradley (Rockwell Automation)', hw: { cpu: 'Logix-style CPU', din: 'Local:1:I', dout: 'Local:2:O' }, brand: 'Allen-Bradley Logix', family: 'ControlLogix / CompactLogix', style: 'Studio 5000 Logix Designer style',
    hue: 0, tagBased: true, mainName: 'MainTask → MainProgram → MainRoutine',
    address: (cls, n, d) =>
      cls === 'DI' ? `Local:1:I.Data.${n}` : cls === 'DO' ? `Local:2:O.Data.${n}` : cls === 'AI' ? `Local:3:I.Ch${n}Data` : cls === 'AO' ? `Local:4:O.Ch${n}Data` : d.name,
    mnemonic: GENERIC,
    members: {},
    timerPreset: (ms) => `.PRE = ${ms} (ms)`,
    notes: [
      'Tag-based: you name the data (Start_PB) and alias it to the I/O point (Local:1:I.Data.0).',
      'TIMER is a data type with .PRE, .ACC, .EN, .TT and .DN. Time is in milliseconds: 5 s = 5000.',
      'Code lives in Tasks → Programs → Routines. The Main Routine calls the others with JSR.',
      'Local:1:I.Data.0 here means slot 1 of the local chassis; slot numbers depend on your rack. // VERIFY exact module tag format per module type',
    ],
  },

  'ab-slc': {
    id: 'ab-slc', maker: 'Allen-Bradley (Rockwell Automation)', hw: { cpu: 'SLC/MicroLogix-style', din: 'I:1/0–7', dout: 'O:2/0–7' }, brand: 'Allen-Bradley legacy', family: 'SLC 500 / MicroLogix', style: 'RSLogix 500 style',
    hue: 15, tagBased: false, mainName: 'LAD 2 (main program file)',
    address: (cls, n) => {
      switch (cls) {
        case 'DI': return `I:1/${n}`;
        case 'DO': return `O:2/${n}`;
        case 'AI': return `I:3.${n}`;
        case 'AO': return `O:4.${n}`;
        case 'BIT': return `B3:${Math.floor(n / 16)}/${n % 16}`;
        case 'WORD': return `N7:${n}`;
        case 'REAL': return `F8:${n}`;
        case 'TIMER': return `T4:${n}`;
        case 'COUNTER': return `C5:${n}`;
        case 'PID': return `N10:${n * 23}`;
      }
    },
    mnemonic: { ONS: 'OSR', OSR: 'OSR*', OSF: 'OSF*', NORM_X: 'SCP*', SCALE_X: 'SCP*', COP: 'COP', CLR: 'CLR', CPT: 'CPT' },
    members: {},
    timerPreset: (ms) => (ms <= 327670 ? `Time Base 0.01, Preset ${Math.round(ms / 10)}` : `Time Base 1.0, Preset ${Math.round(ms / 1000)}`),
    numberNote: 'Data table files: O0 outputs, I1 inputs, S2 status, B3 bits, T4 timers, C5 counters, R6 control, N7 integers, F8 floats.',
    notes: [
      'File-based: addresses are file:element/bit. I:1/0 = input slot 1, bit 0. B3:0/5 = bit file 3, word 0, bit 5.',
      'Timers live in file T4. Preset is a count of time-base ticks: with time base 0.01 s, 5 s = 500.',
      'Integers are 16-bit (N7: −32,768…32,767). Easy to overflow when you migrate to Logix DINTs.',
      'In SLC 500 the one-shot that conditions a rung is OSR; MicroLogix also has ONS. // VERIFY per processor',
      'The PID file shown as N10 is illustrative: SLC PID uses a 23-word control block in an integer file. // VERIFY',
    ],
  },

  'ab-micro800': {
    id: 'ab-micro800', maker: 'Allen-Bradley (Rockwell Automation)', hw: { cpu: 'Micro800-style', din: '_IO_EM_DI', dout: '_IO_EM_DO' }, brand: 'Allen-Bradley Micro800', family: 'Micro810 / 820 / 850 / 870', style: 'Connected Components Workbench style',
    hue: 30, tagBased: true, mainName: 'Prog1 (POU)',
    address: (cls, n, d) =>
      cls === 'DI' ? `_IO_EM_DI_${pad(n, 2)}` : cls === 'DO' ? `_IO_EM_DO_${pad(n, 2)}` : cls === 'AI' ? `_IO_EM_AI_${pad(n, 2)}` : cls === 'AO' ? `_IO_EM_AO_${pad(n, 2)}` : d.name,
    mnemonic: {
      XIC: 'Direct contact', XIO: 'Reverse contact', OTE: 'Direct coil', OTL: 'Set coil', OTU: 'Reset coil', ONS: 'R_TRIG', OSR: 'R_TRIG', OSF: 'F_TRIG',
      TON: 'TON', TOF: 'TOF', RTO: 'TONOFF / RTO*', CTU: 'CTU', CTD: 'CTD', RES: 'RST input', EQU: 'EQ', NEQ: 'NE', GRT: 'GT', GEQ: 'GE', LES: 'LT', LEQ: 'LE',
      MOV: 'MOV', JSR: 'call POU', PID: 'IPIDCONTROLLER*',
    },
    members: { DN: 'Q', ACC: 'ET', PRE: 'PT', EN: 'IN', 'C.DN': 'Q', 'C.ACC': 'CV', 'C.PRE': 'PV' },
    timerPreset: (ms) => `PT = ${iecTime(ms)}`,
    notes: [
      'Embedded I/O shows up as global variables like _IO_EM_DI_00 and _IO_EM_DO_00. // VERIFY exact naming per controller',
      'Uses IEC-style function blocks: timer outputs are Q and ET, preset is PT as a TIME value.',
      'Different software and conventions from Studio 5000 even though it is the same brand — don\'t assume Logix habits carry over.',
    ],
  },

  'siemens-tia': {
    id: 'siemens-tia', maker: 'Siemens', hw: { cpu: 'S7-1200/1500-style', din: '%I0.0–0.7', dout: '%Q0.0–0.7' }, brand: 'Siemens S7-1200/1500', family: 'S7-1200 / S7-1500', style: 'TIA Portal style',
    hue: 180, tagBased: true, mainName: 'OB1 "Main" (Program cycle)',
    address: (cls, n, d) => {
      switch (cls) {
        case 'DI': return `%I${Math.floor(n / 8)}.${n % 8}`;
        case 'DO': return `%Q${Math.floor(n / 8)}.${n % 8}`;
        case 'AI': return `%IW${64 + n * 2}`;
        case 'AO': return `%QW${64 + n * 2}`;
        case 'BIT': return `%M${10 + Math.floor(n / 8)}.${n % 8}`;
        case 'WORD': return d.type === 'INT' ? `%MW${20 + n * 2}` : `%MD${40 + n * 4}`;
        case 'REAL': return `%MD${100 + n * 4}`;
        case 'TIMER': return `"${d.name}_DB" (IEC_TIMER)`;
        case 'COUNTER': return `"${d.name}_DB" (IEC_COUNTER)`;
        case 'PID': return `"${d.name}" (PID_Compact)`;
      }
    },
    mnemonic: {
      XIC: '-| |-', XIO: '-|/|-', OTE: '-( )-', OTL: '-(S)-', OTU: '-(R)-', ONS: '-|P|-', OSR: 'P_TRIG', OSF: 'N_TRIG',
      TON: 'TON', TOF: 'TOF', RTO: 'TONR', CTU: 'CTU', CTD: 'CTD', RES: '-(RT)- / R input', EQU: 'CMP ==', NEQ: 'CMP <>', GRT: 'CMP >', GEQ: 'CMP >=',
      LES: 'CMP <', LEQ: 'CMP <=', LIM: 'IN_RANGE', ADD: 'ADD', SUB: 'SUB', MUL: 'MUL', DIV: 'DIV', MOD: 'MOD', CPT: 'CALCULATE', SCP: 'NORM_X + SCALE_X',
      MOV: 'MOVE', COP: 'MOVE_BLK', CLR: 'FILL_BLK / MOVE 0', JSR: 'CALL FC/FB', MCR: 'MCR< / MCR>*', PID: 'PID_Compact', AFI: '—', NOP: '—',
    },
    members: { DN: 'Q', ACC: 'ET', PRE: 'PT', EN: 'IN', 'C.DN': 'QU', 'C.ACC': 'CV', 'C.PRE': 'PV', 'C.CU': 'CU', 'C.CD': 'CD' },
    timerPreset: (ms) => `PT := ${iecTime(ms)}`,
    numberNote: 'Byte order: %MW0 = %MB0 (high byte) + %MB1 (low byte). %MW0 and %MW1 overlap — use even word addresses.',
    notes: [
      'OB1 runs every cycle; OB100 runs once at startup. Code goes in FCs (functions) and FBs (function blocks with memory in an instance DB).',
      'IEC timers need an instance data block. Outputs are Q and ET; preset PT is a TIME like T#5S.',
      'Tags show their symbol in quotes ("Start_PB") with the absolute address (%I0.0).',
      'Optimized block access (the default on S7-1200/1500) hides absolute DB addresses; use symbols.',
    ],
  },

  'siemens-classic': {
    id: 'siemens-classic', maker: 'Siemens', hw: { cpu: 'S7-300/400-style', din: 'I 0.0–0.7', dout: 'Q 4.0–4.7' }, brand: 'Siemens S7-300/400', family: 'S7-300 / S7-400', style: 'STEP 7 Classic style',
    hue: 170, tagBased: false, mainName: 'OB1',
    address: (cls, n) => {
      switch (cls) {
        case 'DI': return `I ${Math.floor(n / 8)}.${n % 8}`;
        case 'DO': return `Q ${4 + Math.floor(n / 8)}.${n % 8}`;
        case 'AI': return `PIW ${256 + n * 2}`;
        case 'AO': return `PQW ${256 + n * 2}`;
        case 'BIT': return `M ${Math.floor(n / 8)}.${n % 8}`;
        case 'WORD': return `MW ${20 + n * 2}`;
        case 'REAL': return `MD ${100 + n * 4}`;
        case 'TIMER': return `T ${n + 1}`;
        case 'COUNTER': return `C ${n + 1}`;
        case 'PID': return `DB${30 + n} (FB41 CONT_C)`;
      }
    },
    mnemonic: {
      XIC: '-| |- (A)', XIO: '-|/|- (AN)', OTE: '-( )- (=)', OTL: '-(S)-', OTU: '-(R)-', ONS: '-(P)- (FP)', OSR: 'FP', OSF: 'FN',
      TON: 'S_ODT', TOF: 'S_OFFDT', RTO: 'S_ODTS', CTU: 'S_CU', CTD: 'S_CD', RES: 'R input', EQU: 'CMP ==I', NEQ: 'CMP <>I', GRT: 'CMP >I',
      GEQ: 'CMP >=I', LES: 'CMP <I', LEQ: 'CMP <=I', ADD: 'ADD_I/ADD_DI/ADD_R', SUB: 'SUB_I', MUL: 'MUL_I', DIV: 'DIV_I', MOD: 'MOD_DI', MOV: 'MOVE',
      COP: 'SFC20 BLKMOV', CLR: 'MOVE 0', JSR: 'CALL FC', MCR: 'MCRA / MCR< / MCR>', PID: 'FB41 CONT_C', SCP: 'FC105 SCALE',
    },
    members: { DN: 'Q', ACC: 'BI (time left)', PRE: 'TV', EN: 'S' },
    timerPreset: (ms) => `S5T#${secs(ms)}S`,
    notes: [
      'Classic S5-style timers (T 1) count down and take an S5TIME preset like S5T#5S, range up to 2h46m30s. IEC timers (SFB4 TON) also exist. // VERIFY',
      'Default address plan in many S7-300 racks: inputs start at I 0.0, outputs at Q 4.0 — it depends on the slot. // VERIFY per hardware config',
      'Data blocks: DB10.DBX0.0 is bit 0 of byte 0 in DB10; DBW is a word, DBD a double word.',
      'Many plants still run these; you\'ll see STL (statement list) as often as ladder.',
    ],
  },

  modicon: {
    id: 'modicon', maker: 'Schneider Electric', hw: { cpu: 'Modicon-style', din: '%I0.1.0–7', dout: '%Q0.2.0–7' }, brand: 'Schneider Modicon', family: 'M340 / M580 / M221 / M241', style: 'Control Expert / Machine Expert style',
    hue: 140, tagBased: true, mainName: 'MAST task → main section',
    address: (cls, n, d) => {
      switch (cls) {
        case 'DI': return `%I0.1.${n}`;
        case 'DO': return `%Q0.2.${n}`;
        case 'AI': return `%IW0.3.${n}`;
        case 'AO': return `%QW0.4.${n}`;
        case 'BIT': return `%M${n}`;
        case 'WORD': return d.type === 'INT' ? `%MW${n}` : `%MD${100 + n * 2}`;
        case 'REAL': return `%MF${200 + n * 2}`;
        default: return d.name;
      }
    },
    mnemonic: {
      XIC: '-| |-', XIO: '-|/|-', OTE: '-( )-', OTL: '-(S)-', OTU: '-(R)-', ONS: '-|P|-', OSR: 'R_TRIG', OSF: 'F_TRIG', TON: 'TON', TOF: 'TOF', RTO: '—*',
      CTU: 'CTU', CTD: 'CTD', EQU: 'EQ', NEQ: 'NE', GRT: 'GT', GEQ: 'GE', LES: 'LT', LEQ: 'LE', MOV: 'MOVE', PID: 'PID FB',
    },
    members: { DN: 'Q', ACC: 'ET', PRE: 'PT', EN: 'IN', 'C.DN': 'Q', 'C.ACC': 'CV', 'C.PRE': 'PV' },
    timerPreset: (ms) => `PT := ${iecTime(ms, false)}`,
    numberNote: 'Modbus mapping: %MW0 is usually holding register 400001 (offset 0). Off-by-one is the #1 Modbus bug.',
    notes: [
      'Topological I/O: %I0.1.0 = rack 0, slot 1, channel 0 (M340/M580 style). M221 uses %I0.0 instead. // VERIFY per model',
      'Located memory: %M bits, %MW words. Many systems map %MW straight to Modbus holding registers.',
      'Uses IEC function blocks (TON with PT := t#5s).',
    ],
  },

  mitsubishi: {
    id: 'mitsubishi', maker: 'Mitsubishi Electric', hw: { cpu: 'FX-style', din: 'X0–X7', dout: 'Y0–Y7' }, brand: 'Mitsubishi', family: 'FX / iQ-F', style: 'GX Works style',
    hue: 350, tagBased: false, mainName: 'MAIN (scan program)',
    address: (cls, n) => {
      switch (cls) {
        case 'DI': return `X${octal(n)}`;
        case 'DO': return `Y${octal(n)}`;
        case 'AI': return `D${100 + n}`;
        case 'AO': return `D${200 + n}`;
        case 'BIT': return `M${n}`;
        case 'WORD': case 'REAL': return `D${n * 2}`;
        case 'TIMER': return `T${n}`;
        case 'COUNTER': return `C${n}`;
        case 'PID': return `PID (S3=D${500 + n * 25})`;
      }
    },
    mnemonic: {
      XIC: 'LD / AND', XIO: 'LDI / ANI', OTE: 'OUT', OTL: 'SET', OTU: 'RST', ONS: 'LDP / ANDP', OSR: 'PLS', OSF: 'PLF', TON: 'OUT T', TOF: '—*', RTO: 'OUT T (retentive)*',
      CTU: 'OUT C', CTD: '—*', RES: 'RST', EQU: 'LD=', NEQ: 'LD<>', GRT: 'LD>', GEQ: 'LD>=', LES: 'LD<', LEQ: 'LD<=', LIM: 'ZCP*', ADD: 'ADD', SUB: 'SUB',
      MUL: 'MUL', DIV: 'DIV', MOV: 'MOV', COP: 'BMOV', CLR: 'ZRST / MOV K0', JSR: 'CALL P', MCR: 'MC / MCR', PID: 'PID',
    },
    members: { DN: 'contact', ACC: 'current value', PRE: 'K setting' },
    timerPreset: (ms) => `K${Math.round(ms / 100)} (100 ms timer)`,
    numberNote: 'FX X and Y numbers are OCTAL: X0–X7, then X10. There is no X8 or X9.',
    notes: [
      'X = inputs, Y = outputs (octal on FX), M = internal relays, D = data registers, T = timers, C = counters.',
      'Timer preset is a K constant × the timer\'s time base; on FX, T0–T199 are commonly 100 ms timers, so K50 = 5 s. // VERIFY per series',
      'Retentive timers and up/down counters use specific number ranges on FX (e.g. T246–T255, C200+). // VERIFY per series',
      'iQ-R and Q series use hex I/O numbering instead of octal. // VERIFY',
    ],
  },

  automationdirect: {
    id: 'automationdirect', maker: 'AutomationDirect', hw: { cpu: 'CLICK-style', din: 'X001–X008', dout: 'Y001–Y008' }, brand: 'AutomationDirect', family: 'CLICK / Productivity / Do-more / DirectLOGIC', style: 'CLICK programming software style',
    hue: 45, tagBased: false, mainName: 'Main Program',
    address: (cls, n) => {
      switch (cls) {
        case 'DI': return `X${pad(n + 1, 3)}`;
        case 'DO': return `Y${pad(n + 1, 3)}`;
        case 'AI': return `DF${n + 1}`;
        case 'AO': return `DF${n + 101}`;
        case 'BIT': return `C${n + 1}`;
        case 'WORD': return `DS${n + 1}`;
        case 'REAL': return `DF${n + 11}`;
        case 'TIMER': return `T${n + 1}`;
        case 'COUNTER': return `CT${n + 1}`;
        case 'PID': return `(PID in Productivity / Do-more)`;
      }
    },
    mnemonic: {
      XIC: 'NO contact', XIO: 'NC contact', OTE: 'Out', OTL: 'Set', OTU: 'Reset', ONS: 'Edge contact ↑', OSR: 'Out (one shot)', OSF: 'Edge contact ↓',
      TON: 'TMR (on-delay)', TOF: 'TMR (off-delay)', RTO: 'TMR (retentive)', CTU: 'CNT (up)', CTD: 'CNT (down)', RES: 'Reset input', EQU: 'Compare ==',
      NEQ: 'Compare <>', GRT: 'Compare >', GEQ: 'Compare >=', LES: 'Compare <', LEQ: 'Compare <=', ADD: 'Math', SUB: 'Math', MUL: 'Math', DIV: 'Math', CPT: 'Math',
      MOV: 'Copy', COP: 'Copy (block)', CLR: 'Copy 0', JSR: 'Call', PID: 'PID (not on CLICK)*',
    },
    members: { DN: 'T (done bit)', ACC: 'TD (current)', PRE: 'setpoint', 'C.DN': 'CT (done bit)', 'C.ACC': 'CTD (current)' },
    timerPreset: (ms) => `Setpoint ${ms} (ms unit)`,
    numberNote: 'CLICK uses decimal addresses (X001). DirectLOGIC uses OCTAL (X0–X7, X10) and V-memory (V2000).',
    notes: [
      'CLICK: X/Y for I/O, C for internal control relays, DS for integers, DF for floats, T/TD and CT/CTD for timers and counters. // VERIFY ranges',
      'Productivity and Do-more are tag-based; CLICK and DirectLOGIC are address-based.',
      'The programming software for these families is a free download — handy for practicing at home (check current licensing on the vendor site).',
    ],
  },

  omron: {
    id: 'omron', maker: 'Omron', hw: { cpu: 'CP/CJ-style', din: 'CIO 0.00–07', dout: 'CIO 100.00–07' }, brand: 'Omron', family: 'CP / CJ (and NX/NJ)', style: 'CX-Programmer style',
    hue: 220, tagBased: false, mainName: 'Cyclic task 00',
    address: (cls, n) => {
      switch (cls) {
        case 'DI': return `0.${pad(n, 2)}`;
        case 'DO': return `100.${pad(n, 2)}`;
        case 'AI': return `D${100 + n}`;
        case 'AO': return `D${200 + n}`;
        case 'BIT': return `W0.${pad(n % 16, 2)}`.replace('W0', `W${Math.floor(n / 16)}`);
        case 'WORD': case 'REAL': return `D${n * 2}`;
        case 'TIMER': return `T${pad(n, 4)}`;
        case 'COUNTER': return `C${pad(n, 4)}`;
        case 'PID': return `PIDAT D${400 + n * 40}`;
      }
    },
    mnemonic: {
      XIC: 'LD / AND', XIO: 'LD NOT / AND NOT', OTE: 'OUT', OTL: 'SET', OTU: 'RSET', ONS: 'DIFU / @ (up)', OSR: 'DIFU', OSF: 'DIFD', TON: 'TIM',
      TOF: '—*', RTO: 'TTIM', CTU: 'CNT', CTD: 'CNTR*', RES: 'CNR / reset input', EQU: '=', NEQ: '<>', GRT: '>', GEQ: '>=', LES: '<', LEQ: '<=',
      ADD: '+ / +B', SUB: '- / -B', MUL: '*', DIV: '/', MOV: 'MOV', COP: 'XFER', CLR: 'BSET 0', JSR: 'SBS', MCR: 'IL / ILC', PID: 'PIDAT',
    },
    members: { DN: 'Completion flag', ACC: 'PV (present value)', PRE: 'SV (set value)' },
    timerPreset: (ms) => `#${Math.round(ms / 100)} (0.1 s units)`,
    numberNote: 'Classic Omron timers count DOWN from the set value and use BCD by default (#0050 = 5.0 s). // VERIFY per model/setting',
    notes: [
      'CIO area: 0.00 is word 0, bit 00. Work bits W, holding (retentive) bits H, data memory D.',
      'TIM is a down-counting 0.1 s timer; TIMH is 10 ms. NX/NJ (Sysmac Studio) uses IEC variables and timers instead.',
      'IL/ILC (interlock) is Omron\'s zone-control pair, similar in spirit to MCR.',
    ],
  },
};

/** Skins grouped by manufacturer, for pickers. */
export function skinsByMaker(): { maker: string; skins: Skin[] }[] {
  const out: { maker: string; skins: Skin[] }[] = [];
  for (const sk of SKIN_LIST) {
    let g = out.find((x) => x.maker === sk.maker);
    if (!g) out.push((g = { maker: sk.maker, skins: [] }));
    g.skins.push(sk);
  }
  return out;
}

export const SKIN_LIST: Skin[] = [
  SKINS['ab-logix'], SKINS['siemens-tia'], SKINS['ab-slc'], SKINS['ab-micro800'], SKINS['siemens-classic'],
  SKINS.modicon, SKINS.mitsubishi, SKINS.automationdirect, SKINS.omron, SKINS.iec,
];

/** The address class a tag lands in for a skin's address map. */
export function addrClass(d: TagDecl): AddrClass {
  if (d.io) return d.io.kind;
  switch (d.type) {
    case 'BOOL': return 'BIT';
    case 'INT': case 'DINT': return 'WORD';
    case 'REAL': return 'REAL';
    case 'TIMER': return 'TIMER';
    case 'COUNTER': return 'COUNTER';
    case 'PID': return 'PID';
  }
}

export interface AddressInfo {
  /** What you'd see on this platform as the main label. */
  primary: string;
  /** Secondary label (the other of symbol/address), if different. */
  secondary?: string;
  address: string;
}

/** Assign every tag of a program an address in the given skin. */
export function addressMap(p: Program, skin: Skin): Map<string, AddressInfo> {
  const counters: Record<string, number> = {};
  const out = new Map<string, AddressInfo>();
  for (const d of p.tags) {
    const cls = addrClass(d);
    let n: number;
    if (d.io) n = d.io.point;
    else {
      n = counters[cls] ?? 0;
      counters[cls] = n + 1;
    }
    const address = skin.address(cls, n, d);
    if (skin.id === 'siemens-tia') out.set(d.name, { primary: `"${d.name}"`, secondary: address, address });
    else if (skin.tagBased) out.set(d.name, { primary: d.name, secondary: address !== d.name ? address : undefined, address });
    else out.set(d.name, { primary: address, secondary: d.name, address });
  }
  return out;
}

/** Display an operand reference (with member) in a skin, e.g. T1.DN → "T4:0/DN" or "T1_DB".Q */
export function displayRef(ref: string, p: Program, skin: Skin, map = addressMap(p, skin)): string {
  const m = /^([A-Za-z_][A-Za-z0-9_]*)(\[[^\]]+\])?(?:\.([A-Za-z0-9_]+))?$/.exec(ref);
  if (!m) return ref;
  const [, base, idx = '', member] = m;
  const info = map.get(base);
  if (!info) return ref;
  const decl = p.tags.find((t) => t.name === base);
  const head = info.primary + idx;
  if (!member) return head;
  const key = decl?.type === 'COUNTER' ? `C.${member}` : member;
  const mm = skin.members[key] ?? skin.members[member] ?? member;
  if (skin.id === 'ab-slc' && (decl?.type === 'TIMER' || decl?.type === 'COUNTER')) {
    return ['PRE', 'ACC'].includes(member) ? `${info.address}.${member}` : `${info.address}/${member}`;
  }
  if (skin.id === 'siemens-tia' && (decl?.type === 'TIMER' || decl?.type === 'COUNTER')) return `"${base}_DB".${mm}`;
  if (/^\d+$/.test(member)) return skin.tagBased ? `${head}.${member}` : `${head}/${member}`;
  return `${head}.${mm}`;
}

export function mnemonic(op: OpCode, skin: Skin): string {
  return skin.mnemonic[op] ?? op;
}
