/**
 * The PLC: an honest scan cycle.
 *   1. Read inputs  → copy field inputs (or forces) into input tags
 *   2. Solve logic  → main routine, rung by rung, left to right
 *   3. Write outputs→ copy output tags (or forces) to the field
 *   4. Housekeeping → scan counters, comms
 * Inputs that change during the logic solve are not seen until the next scan.
 */
import { evaluate } from './expr';
import { MajorFaultError, TagStore, wrap, DINT_MAX, DINT_MIN } from './tags';
import type {
  Branch, CounterValue, Elem, Instr, MajorFault, Mode, PidValue, Program, Routine, ScanPointer, TimerValue, Trace,
} from './types';

export interface ForceTable {
  DI: Map<number, boolean>;
  DO: Map<number, boolean>;
}

export interface PlcOptions {
  /** I/O points per kind on the virtual card (default 16 discrete, 8 analog). */
  discretePoints?: number;
  analogPoints?: number;
}

/** Fixed time per scan while single-stepping, so timers still advance predictably. */
export const STEP_SCAN_MS = 10;
/** Pretend execution cost, so the scan-time readout means something. */
const BASE_SCAN_US = 180;
const PER_INSTR_US = 6;

interface Ctx {
  dt: number;
  prescan: boolean;
  routine: string;
  rungId: string;
  depth: number;
  mcrActive: boolean;
  mcrFalse: boolean;
}

export class Plc {
  program: Program;
  tags: TagStore;
  mode: Mode = 'PROG';
  fault: MajorFault | null = null;
  minorFaults: string[] = [];

  /** Field side of the I/O: what the wiring sees. */
  fieldDI: boolean[];
  fieldDO: boolean[];
  fieldAI: number[];
  fieldAO: number[];

  forces: ForceTable = { DI: new Map(), DO: new Map() };
  forcesEnabled = true;

  scanCount = 0;
  /** Simulated scan time of the last complete scan, microseconds. */
  scanTimeUs = 0;
  /** Power-flow trace of the last solve, by element id. */
  trace = new Map<string, Trace>();
  /** Rung result (power at the right rail) of the last solve, by rung id. */
  rungTrue = new Map<string, boolean>();

  /** Single-step state. `null` when not mid-scan. */
  pointer: ScanPointer | null = null;
  private stepCtx: Ctx | null = null;
  private instrCount = 0;

  constructor(program: Program, opts: PlcOptions = {}) {
    const dn = opts.discretePoints ?? 16;
    const an = opts.analogPoints ?? 8;
    this.fieldDI = new Array(dn).fill(false);
    this.fieldDO = new Array(dn).fill(false);
    this.fieldAI = new Array(an).fill(0);
    this.fieldAO = new Array(an).fill(0);
    this.program = program;
    this.tags = new TagStore(program.tags);
  }

  /** Load a new program (a download). Controller goes to PROG, tags reset to initial values. */
  download(program: Program): void {
    this.program = program;
    this.tags = new TagStore(program.tags);
    this.mode = 'PROG';
    this.fault = null;
    this.minorFaults = [];
    this.pointer = null;
    this.stepCtx = null;
    this.trace.clear();
    this.rungTrue.clear();
    this.fieldDO.fill(false);
    this.fieldAO.fill(0);
  }

  routine(name: string): Routine | undefined {
    return this.program.routines.find((r) => r.name === name);
  }

  get mainRoutine(): Routine {
    const r = this.routine(this.program.main);
    if (!r) throw new MajorFaultError(`Main routine "${this.program.main}" is missing.`);
    return r;
  }

  // ---------- Mode changes ----------

  setMode(mode: Mode): void {
    if (mode === this.mode) return;
    if (mode === 'RUN') {
      if (this.fault) return; // must clear the fault first
      this.mode = 'RUN';
      this.prescan();
    } else {
      this.mode = 'PROG';
      this.pointer = null;
      this.stepCtx = null;
      // In PROG the outputs are turned off at the field.
      this.writeOutputs(true);
    }
  }

  /**
   * Prescan (on PROG → RUN and after power-up): every rung is solved as false once.
   * Non-retentive outputs (OTE) and on-delay timers clear; latched bits and RTO keep their values.
   */
  prescan(): void {
    const ctx = this.newCtx(0, true);
    try {
      this.solveRoutine(this.mainRoutine, ctx);
    } catch (e) {
      this.raise(e, ctx);
    }
  }

  /** Simulate losing and restoring power: tag values are retained, outputs drop, then prescan in RUN. */
  powerCycle(): void {
    const wasRun = this.mode === 'RUN';
    this.fieldDO.fill(false);
    this.fieldAO.fill(0);
    this.pointer = null;
    this.stepCtx = null;
    this.mode = 'PROG';
    if (wasRun && !this.fault) this.setMode('RUN');
  }

  clearFault(): void {
    this.fault = null;
    this.minorFaults = [];
  }

  // ---------- Scan ----------

  /** One complete scan. Returns false if not in RUN or faulted. */
  scan(dtMs: number): boolean {
    if (this.mode !== 'RUN' || this.fault) return false;
    if (this.pointer) this.finishStepScan();
    this.instrCount = 0;
    this.readInputs();
    const ctx = this.newCtx(dtMs, false);
    try {
      this.solveRoutine(this.mainRoutine, ctx);
    } catch (e) {
      this.raise(e, ctx);
      this.writeOutputs(true);
      return false;
    }
    this.writeOutputs(false);
    this.housekeeping();
    return true;
  }

  /**
   * Advance one step of the scan: input read, one rung, output write, or housekeeping.
   * Lets the learner watch the scan pointer move.
   */
  step(): ScanPointer | null {
    if (this.mode !== 'RUN' || this.fault) return null;
    const main = this.program.main;
    if (!this.pointer) {
      this.instrCount = 0;
      this.pointer = { phase: 'input', routine: main, rung: 0 };
      return this.pointer;
    }
    const p = this.pointer;
    try {
      switch (p.phase) {
        case 'input':
          this.readInputs();
          this.stepCtx = this.newCtx(STEP_SCAN_MS, false);
          this.pointer = { phase: 'logic', routine: main, rung: 0 };
          if (this.mainRoutine.rungs.length === 0) this.pointer = { phase: 'output', routine: main, rung: 0 };
          break;
        case 'logic': {
          const rungs = this.mainRoutine.rungs;
          const ctx = this.stepCtx ?? this.newCtx(STEP_SCAN_MS, false);
          this.solveRung(rungs[p.rung], ctx);
          const next = p.rung + 1;
          this.pointer = next < rungs.length ? { phase: 'logic', routine: main, rung: next } : { phase: 'output', routine: main, rung: 0 };
          break;
        }
        case 'output':
          this.writeOutputs(false);
          this.pointer = { phase: 'housekeeping', routine: main, rung: 0 };
          break;
        case 'housekeeping':
          this.housekeeping();
          this.pointer = null;
          this.stepCtx = null;
          break;
      }
    } catch (e) {
      this.raise(e, this.stepCtx ?? this.newCtx(0, false));
      this.writeOutputs(true);
      this.pointer = null;
      return null;
    }
    return this.pointer;
  }

  private finishStepScan(): void {
    let guard = 10000;
    while (this.pointer && guard-- > 0) this.step();
  }

  private newCtx(dt: number, prescan: boolean): Ctx {
    return { dt, prescan, routine: this.program.main, rungId: '', depth: 0, mcrActive: false, mcrFalse: false };
  }

  private raise(e: unknown, ctx: Ctx): void {
    if (e instanceof MajorFaultError) {
      this.fault = { message: e.message, rungId: ctx.rungId || undefined, routine: ctx.routine };
    } else {
      throw e;
    }
  }

  readInputs(): void {
    for (const d of this.tags.decls.values()) {
      if (!d.io) continue;
      if (d.io.kind === 'DI') {
        const forced = this.forcesEnabled ? this.forces.DI.get(d.io.point) : undefined;
        this.tags.write(d.name, forced ?? this.fieldDI[d.io.point] ?? false);
      } else if (d.io.kind === 'AI') {
        this.tags.write(d.name, this.fieldAI[d.io.point] ?? 0);
      }
    }
  }

  /** Copy output tags to the field. `off` = PROG/fault: discrete outputs go off (forces still apply). */
  writeOutputs(off: boolean): void {
    for (const d of this.tags.decls.values()) {
      if (!d.io) continue;
      if (d.io.kind === 'DO') {
        const forced = this.forcesEnabled ? this.forces.DO.get(d.io.point) : undefined;
        const logic = off ? false : this.tags.readBool(d.name);
        this.fieldDO[d.io.point] = forced ?? logic;
      } else if (d.io.kind === 'AO') {
        this.fieldAO[d.io.point] = off ? 0 : this.tags.readNum(d.name);
      }
    }
  }

  private housekeeping(): void {
    this.scanCount++;
    this.scanTimeUs = BASE_SCAN_US + this.instrCount * PER_INSTR_US;
  }

  get hasForces(): boolean {
    return this.forces.DI.size + this.forces.DO.size > 0;
  }

  // ---------- Logic solve ----------

  private solveRoutine(r: Routine, ctx: Ctx): void {
    const saved = { routine: ctx.routine, mcrActive: ctx.mcrActive, mcrFalse: ctx.mcrFalse };
    ctx.routine = r.name;
    ctx.mcrActive = false;
    ctx.mcrFalse = false;
    for (const rung of r.rungs) this.solveRung(rung, ctx);
    ctx.routine = saved.routine;
    ctx.mcrActive = saved.mcrActive;
    ctx.mcrFalse = saved.mcrFalse;
  }

  private solveRung(rung: Rung, ctx: Ctx): void {
    ctx.rungId = rung.id;
    const start = !ctx.prescan && !(ctx.mcrActive && ctx.mcrFalse);
    const out = this.solveSeries(rung.elems, start, ctx);
    this.rungTrue.set(rung.id, out);
  }

  private solveSeries(elems: Elem[], rc: boolean, ctx: Ctx): boolean {
    let p = rc;
    for (const e of elems) p = e.kind === 'branch' ? this.solveBranch(e, p, ctx) : this.exec(e, p, ctx);
    return p;
  }

  private solveBranch(b: Branch, rc: boolean, ctx: Ctx): boolean {
    let any = false;
    for (const leg of b.legs) {
      if (this.solveSeries(leg, rc, ctx)) any = true;
    }
    this.trace.set(b.id, { in: rc, out: any, cond: any });
    return any;
  }

  private exec(i: Instr, rc: boolean, ctx: Ctx): boolean {
    this.instrCount++;
    const t = this.tags;
    const a = i.args;
    let out = rc;
    let cond = rc;
    const cmp = (f: (x: number, y: number) => boolean) => {
      cond = f(t.readNum(a[0]), t.readNum(a[1]));
      out = rc && cond;
    };
    const math = (f: (x: number, y: number) => number) => {
      if (rc) this.store(a[2], f(t.readNum(a[0]), t.readNum(a[1])), [a[0], a[1]]);
    };

    switch (i.op) {
      case 'XIC':
        cond = t.readBool(a[0]);
        out = rc && cond;
        break;
      case 'XIO':
        cond = !t.readBool(a[0]);
        out = rc && cond;
        break;
      case 'OTE':
        t.write(a[0], rc);
        break;
      case 'OTL':
        if (rc) t.write(a[0], true);
        break;
      case 'OTU':
        if (rc) t.write(a[0], false);
        break;
      case 'ONS': {
        const prev = t.readBool(a[0]);
        out = rc && !prev;
        cond = out;
        // Prescan sets the storage bit so a rung that is already true doesn't fire on the first scan. // VERIFY
        t.write(a[0], ctx.prescan ? true : rc);
        break;
      }
      case 'OSR': {
        const prev = t.readBool(a[0]);
        t.write(a[1], rc && !prev && !ctx.prescan);
        t.write(a[0], ctx.prescan ? true : rc); // VERIFY: OSR prescan state
        break;
      }
      case 'OSF': {
        const prev = t.readBool(a[0]);
        t.write(a[1], !rc && prev && !ctx.prescan);
        t.write(a[0], ctx.prescan ? false : rc); // VERIFY: OSF prescan state
        break;
      }
      case 'TON':
        this.ton(t.struct<TimerValue>(a[0], 'TIMER'), rc, ctx.dt);
        break;
      case 'TOF':
        this.tof(t.struct<TimerValue>(a[0], 'TIMER'), rc, ctx.dt, ctx.prescan);
        break;
      case 'RTO':
        this.rto(t.struct<TimerValue>(a[0], 'TIMER'), rc, ctx.dt);
        break;
      case 'CTU':
        this.ctu(t.struct<CounterValue>(a[0], 'COUNTER'), rc, ctx.prescan);
        break;
      case 'CTD':
        this.ctd(t.struct<CounterValue>(a[0], 'COUNTER'), rc, ctx.prescan);
        break;
      case 'RES':
        if (rc) this.reset(a[0]);
        break;
      case 'EQU': cmp((x, y) => x === y); break;
      case 'NEQ': cmp((x, y) => x !== y); break;
      case 'GRT': cmp((x, y) => x > y); break;
      case 'GEQ': cmp((x, y) => x >= y); break;
      case 'LES': cmp((x, y) => x < y); break;
      case 'LEQ': cmp((x, y) => x <= y); break;
      case 'LIM': {
        const lo = t.readNum(a[0]);
        const v = t.readNum(a[1]);
        const hi = t.readNum(a[2]);
        cond = lo <= hi ? v >= lo && v <= hi : v >= lo || v <= hi;
        out = rc && cond;
        break;
      }
      case 'ADD': math((x, y) => x + y); break;
      case 'SUB': math((x, y) => x - y); break;
      case 'MUL': math((x, y) => x * y); break;
      case 'DIV':
        if (rc) {
          const y = t.readNum(a[1]);
          if (y === 0) {
            this.minor(`Divide by zero in rung ${ctx.rungId}. Destination left unchanged.`); // VERIFY: Logix sets Dest on /0
          } else {
            const x = t.readNum(a[0]);
            const intOnly = this.isIntegerOperand(a[0]) && this.isIntegerOperand(a[1]);
            const q = x / y;
            this.store(a[2], intOnly ? Math.trunc(q) : q, [a[0], a[1]]);
          }
        }
        break;
      case 'MOD':
        if (rc) {
          const y = t.readNum(a[1]);
          if (y === 0) this.minor(`MOD by zero in rung ${ctx.rungId}.`);
          else this.store(a[2], t.readNum(a[0]) % y, [a[0], a[1]]);
        }
        break;
      case 'CPT':
        if (rc) this.store(a[0], evaluate(a[1], (r) => t.readNum(r)), []);
        break;
      case 'SCP':
        if (rc) {
          const [inp, inMin, inMax, outMin, outMax] = a.slice(0, 5).map((x) => t.readNum(x));
          const span = inMax - inMin;
          if (span === 0) this.minor('SCP input range is zero.');
          else this.store(a[5], ((inp - inMin) * (outMax - outMin)) / span + outMin, []);
        }
        break;
      case 'NORM_X':
        if (rc) {
          const [mn, v, mx] = a.slice(0, 3).map((x) => t.readNum(x));
          if (mx === mn) this.minor('NORM_X range is zero.');
          else t.write(a[3], (v - mn) / (mx - mn));
        }
        break;
      case 'SCALE_X':
        if (rc) {
          const [mn, v, mx] = a.slice(0, 3).map((x) => t.readNum(x));
          this.store(a[3], v * (mx - mn) + mn, []);
        }
        break;
      case 'MOV':
        if (rc) this.store(a[1], t.readNum(a[0]), [a[0]]);
        break;
      case 'COP':
        if (rc) {
          const src = t.array(a[0]);
          const dst = t.array(a[1]);
          const len = Number(t.readNum(a[2]));
          if (len > dst.length || len > src.length) throw new MajorFaultError(`COP length ${len} runs past the end of an array.`);
          for (let k = 0; k < len; k++) dst[k] = src[k];
        }
        break;
      case 'CLR':
        if (rc) {
          const d = t.decls.get(a[0]);
          if (d?.dim) {
            const arr = t.array(a[0]);
            arr.fill(d.type === 'BOOL' ? false : 0);
          } else t.write(a[0], 0);
        }
        break;
      case 'JSR':
        if (rc || ctx.prescan) {
          const r = this.routine(a[0]);
          if (!r) throw new MajorFaultError(`JSR calls routine "${a[0]}", which doesn't exist.`);
          if (ctx.depth > 16) throw new MajorFaultError('Subroutine calls nested too deep (a routine may be calling itself).');
          ctx.depth++;
          const rungId = ctx.rungId;
          this.solveRoutine(r, ctx);
          ctx.rungId = rungId;
          ctx.depth--;
        }
        break;
      case 'MCR':
        if (ctx.mcrActive) {
          ctx.mcrActive = false;
          ctx.mcrFalse = false;
        } else {
          ctx.mcrActive = true;
          ctx.mcrFalse = !rc;
        }
        break;
      case 'PID':
        if (rc && !ctx.prescan) this.pid(t.struct<PidValue>(a[0], 'PID'), ctx.dt);
        break;
      case 'AFI':
        cond = false;
        out = false;
        break;
      case 'NOP':
        break;
    }
    this.trace.set(i.id, { in: rc, out, cond });
    return out;
  }

  private isIntegerOperand(s: string): boolean {
    const t = this.tags;
    if (/^[-+]?\d+$/.test(s.trim())) return true;
    const ty = t.destType(s);
    return ty === 'INT' || ty === 'DINT' || ty === 'BOOL';
  }

  /** Store a math result, applying integer rules (sources REAL → rounded; else truncated by caller). */
  private store(dest: string, value: number, _srcs: string[]): void {
    this.tags.write(dest, value);
  }

  private minor(msg: string): void {
    if (!this.minorFaults.includes(msg)) this.minorFaults.push(msg);
  }

  // ---------- Timers ----------

  private checkPreset(tm: TimerValue): void {
    if (tm.PRE < 0 || tm.ACC < 0) throw new MajorFaultError('Timer preset or accumulated value is negative.');
  }

  private ton(tm: TimerValue, rc: boolean, dt: number): void {
    this.checkPreset(tm);
    if (rc) {
      tm.EN = true;
      if (!tm.DN) {
        tm.ACC = Math.min(tm.ACC + dt, tm.PRE); // VERIFY: Logix clamps ACC at PRE when done
        if (tm.ACC >= tm.PRE) tm.DN = true;
      }
      tm.TT = !tm.DN;
    } else {
      tm.EN = false;
      tm.TT = false;
      tm.DN = false;
      tm.ACC = 0;
    }
  }

  private tof(tm: TimerValue, rc: boolean, dt: number, prescan: boolean): void {
    this.checkPreset(tm);
    if (prescan) {
      // Prescan sets the TOF to its idle (timed-out) state.
      tm.EN = false;
      tm.TT = false;
      tm.DN = false;
      tm.ACC = tm.PRE;
      return;
    }
    if (rc) {
      tm.EN = true;
      tm.TT = false;
      tm.DN = true;
      tm.ACC = 0;
    } else {
      tm.EN = false;
      if (tm.DN) {
        tm.ACC = Math.min(tm.ACC + dt, tm.PRE);
        tm.TT = tm.ACC < tm.PRE;
        if (tm.ACC >= tm.PRE) {
          tm.DN = false;
          tm.TT = false;
        }
      } else {
        tm.TT = false;
      }
    }
  }

  private rto(tm: TimerValue, rc: boolean, dt: number): void {
    this.checkPreset(tm);
    if (rc) {
      tm.EN = true;
      if (!tm.DN) {
        tm.ACC = Math.min(tm.ACC + dt, tm.PRE);
        if (tm.ACC >= tm.PRE) tm.DN = true;
      }
      tm.TT = !tm.DN;
    } else {
      tm.EN = false;
      tm.TT = false;
      // ACC and DN are kept: that's what "retentive" means.
    }
  }

  // ---------- Counters ----------

  private ctu(c: CounterValue, rc: boolean, prescan: boolean): void {
    if (!prescan && rc && !c.CU) {
      const w = wrap(c.ACC + 1, 32);
      c.ACC = w.value;
      if (w.overflow) c.OV = true; // wraps from 2,147,483,647 to −2,147,483,648
    }
    // Prescan sets CU so a rung that is already true at startup doesn't count.  // VERIFY: Logix prescan sets .CU
    c.CU = prescan ? true : rc;
    c.DN = c.ACC >= c.PRE;
  }

  private ctd(c: CounterValue, rc: boolean, prescan: boolean): void {
    if (!prescan && rc && !c.CD) {
      const w = wrap(c.ACC - 1, 32);
      c.ACC = w.value;
      if (w.overflow) c.UN = true;
    }
    c.CD = prescan ? true : rc;
    c.DN = c.ACC >= c.PRE;
  }

  private reset(ref: string): void {
    const d = this.tags.decls.get(ref);
    if (d?.type === 'TIMER') {
      const tm = this.tags.struct<TimerValue>(ref, 'TIMER');
      tm.ACC = 0;
      tm.EN = tm.TT = tm.DN = false;
    } else if (d?.type === 'COUNTER') {
      const c = this.tags.struct<CounterValue>(ref, 'COUNTER');
      c.ACC = 0;
      c.DN = c.OV = c.UN = false; // VERIFY: whether RES also clears CU/CD
    } else {
      throw new MajorFaultError(`RES needs a timer or counter, not "${ref}".`);
    }
  }

  // ---------- PID ----------

  /**
   * Simplified independent-gains PID with output clamping and anti-windup.
   * Real PID / PIDE instructions have many more options (dependent gains, deadband, feed-forward).
   */
  private pid(p: PidValue, dtMs: number): void {
    const dt = dtMs / 1000;
    if (dt <= 0) return;
    const e = p.DIRECT ? p.PV - p.SP : p.SP - p.PV;
    if (p.MAN) {
      p.CV = clamp(p.MANCV, p.CVMIN, p.CVMAX);
      // Bumpless: make the integral hold what CV is now.
      p.I = p.CV - p.KP * e;
      p.PE = e;
      return;
    }
    const d = p.KD * ((e - p.PE) / dt);
    const iNext = p.I + p.KI * e * dt;
    const raw = p.KP * e + iNext + d;
    const cv = clamp(raw, p.CVMIN, p.CVMAX);
    // Anti-windup: only keep integrating if we're not pushing further into a limit.
    if (raw === cv || (raw > p.CVMAX && e < 0) || (raw < p.CVMIN && e > 0)) p.I = iNext;
    p.CV = cv;
    p.PE = e;
  }
}

type Rung = Routine['rungs'][number];

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export { DINT_MAX, DINT_MIN };
