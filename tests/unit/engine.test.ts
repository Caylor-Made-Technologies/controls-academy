import { describe, expect, it } from 'vitest';
import {
  Plc, program, parseRung, rungToText, verifyProgram, crossReference, evaluate, exprRefs,
  TagStore, wrap, roundHalfEven, DINT_MAX, DINT_MIN, STEP_SCAN_MS, OPS,
  type TagDecl, type TimerValue, type CounterValue, type PidValue,
} from '../../src/engine';

const DI = (name: string, point: number): TagDecl => ({ name, type: 'BOOL', io: { kind: 'DI', point } });
const DO = (name: string, point: number): TagDecl => ({ name, type: 'BOOL', io: { kind: 'DO', point } });
const B = (name: string): TagDecl => ({ name, type: 'BOOL' });
const N = (name: string, type: 'INT' | 'DINT' | 'REAL' = 'DINT', initial = 0): TagDecl => ({ name, type, initial });
const T = (name: string, pre: number): TagDecl => ({ name, type: 'TIMER', initial: pre });
const C = (name: string, pre: number): TagDecl => ({ name, type: 'COUNTER', initial: pre });

function run(p: ReturnType<typeof program>) {
  const plc = new Plc(p);
  plc.setMode('RUN');
  return plc;
}

describe('rung text', () => {
  it('parses and prints branches round-trip', () => {
    const t = 'XIC(Start)[XIC(A),XIC(B)[XIC(C),XIO(D)]]XIO(Stop)OTE(Motor)';
    expect(rungToText(parseRung(t))).toBe(t);
  });
  it('keeps commas inside CPT expressions', () => {
    const e = parseRung('CPT(Out,(A+B)*2)');
    expect(e[0].kind === 'instr' && e[0].args).toEqual(['Out', '(A+B)*2']);
  });
  it('rejects unknown instructions and bad brackets', () => {
    expect(() => parseRung('XYZ(A)')).toThrow();
    expect(() => parseRung('[XIC(A),XIC(B)OTE(C)')).toThrow();
    expect(() => parseRung('XIC(A')).toThrow();
  });
  it('every op has a spec', () => {
    for (const s of Object.values(OPS)) expect(s.summary.length).toBeGreaterThan(10);
  });
});

describe('scan cycle', () => {
  const motor = program('Motor', [DI('Start_PB', 0), DI('Stop_PB', 1), DO('Motor', 0)], [
    '[XIC(Start_PB),XIC(Motor)]XIC(Stop_PB)OTE(Motor)',
  ]);

  it('3-wire start/stop seals in and drops out', () => {
    const plc = run(motor);
    plc.fieldDI[1] = true; // NC stop button wired: input ON when not pressed
    plc.scan(10);
    expect(plc.fieldDO[0]).toBe(false);
    plc.fieldDI[0] = true;
    plc.scan(10);
    expect(plc.fieldDO[0]).toBe(true);
    plc.fieldDI[0] = false; // release start: sealed in
    plc.scan(10);
    expect(plc.fieldDO[0]).toBe(true);
    plc.fieldDI[1] = false; // press stop
    plc.scan(10);
    expect(plc.fieldDO[0]).toBe(false);
    plc.fieldDI[1] = true;
    plc.scan(10);
    expect(plc.fieldDO[0]).toBe(false);
  });

  it('does nothing in PROG and turns outputs off', () => {
    const plc = run(motor);
    plc.fieldDI[0] = plc.fieldDI[1] = true;
    plc.scan(10);
    expect(plc.fieldDO[0]).toBe(true);
    plc.setMode('PROG');
    expect(plc.fieldDO[0]).toBe(false);
    expect(plc.scan(10)).toBe(false);
  });

  it('an input change mid-scan is not seen until the next scan', () => {
    const plc = run(program('x', [DI('In', 0), DO('Out', 0)], ['XIC(In)OTE(Out)']));
    plc.step(); // pointer at input phase
    plc.step(); // inputs read (In = 0)
    plc.fieldDI[0] = true; // operator presses during logic solve
    plc.step(); // rung 0 solved with old image
    plc.step(); // outputs written
    expect(plc.fieldDO[0]).toBe(false);
    plc.step(); // housekeeping
    plc.scan(10);
    expect(plc.fieldDO[0]).toBe(true);
  });

  it('single-step walks input → each rung → output → housekeeping', () => {
    const plc = run(program('x', [B('A'), B('B')], ['OTE(A)', 'XIC(A)OTE(B)']));
    const phases: string[] = [];
    let p = plc.step();
    while (p) {
      phases.push(p.phase === 'logic' ? `rung${p.rung}` : p.phase);
      p = plc.step();
    }
    expect(phases).toEqual(['input', 'rung0', 'rung1', 'output', 'housekeeping']);
    expect(plc.scanCount).toBe(1);
  });

  it('a full scan finishes a half-stepped scan first', () => {
    const plc = run(program('x', [B('A')], ['OTE(A)']));
    plc.step();
    plc.step();
    plc.scan(10);
    expect(plc.pointer).toBeNull();
    expect(plc.scanCount).toBe(2);
  });

  it('timers advance a fixed amount per stepped scan', () => {
    const plc = run(program('x', [T('T1', 1000)], ['TON(T1)']));
    for (let k = 0; k < 5; k++) plc.step();
    expect((plc.tags.values.get('T1') as TimerValue).ACC).toBe(STEP_SCAN_MS);
  });

  it('duplicate destructive coils: the last rung wins', () => {
    const plc = run(program('dup', [B('A'), B('B'), DO('Out', 0)], ['XIC(A)OTE(Out)', 'XIC(B)OTE(Out)']));
    plc.tags.write('A', true);
    plc.scan(10);
    expect(plc.fieldDO[0]).toBe(false); // rung 1 wrote 0 after rung 0 wrote 1
    plc.tags.write('B', true);
    plc.tags.write('A', false);
    plc.scan(10);
    expect(plc.fieldDO[0]).toBe(true);
  });

  it('reports scan time and records power-flow trace', () => {
    const plc = run(program('x', [B('A'), B('Q')], ['XIC(A)OTE(Q)']));
    plc.scan(10);
    expect(plc.scanTimeUs).toBeGreaterThan(0);
    const r = plc.program.routines[0].rungs[0];
    expect(plc.rungTrue.get(r.id)).toBe(false);
    expect(plc.trace.get(r.elems[0].id)).toEqual({ in: true, out: false, cond: false });
  });

  it('branches OR their legs', () => {
    const plc = run(program('x', [B('A'), B('Bb'), B('Q')], ['[XIC(A),XIC(Bb)]OTE(Q)']));
    plc.scan(10);
    expect(plc.tags.read('Q')).toBe(false);
    plc.tags.write('Bb', true);
    plc.scan(10);
    expect(plc.tags.read('Q')).toBe(true);
  });

  it('outputs mid-rung pass the rung condition through', () => {
    const plc = run(program('x', [B('A'), B('Q1'), B('Q2')], ['XIC(A)OTE(Q1)OTE(Q2)']));
    plc.tags.write('A', true);
    plc.scan(10);
    expect(plc.tags.read('Q1')).toBe(true);
    expect(plc.tags.read('Q2')).toBe(true);
  });
});

describe('forces', () => {
  it('forced input overrides the field, forced output overrides logic', () => {
    const plc = run(program('x', [DI('In', 0), DO('Out', 0), DO('Lamp', 1)], ['XIC(In)OTE(Out)', 'OTE(Lamp)']));
    plc.forces.DI.set(0, true);
    plc.scan(10);
    expect(plc.fieldDO[0]).toBe(true);
    expect(plc.hasForces).toBe(true);
    plc.forces.DO.set(1, false);
    plc.scan(10);
    expect(plc.fieldDO[1]).toBe(false);
    plc.forcesEnabled = false;
    plc.scan(10);
    expect(plc.fieldDO[0]).toBe(false);
    expect(plc.fieldDO[1]).toBe(true);
  });
  it('forces still apply in PROG', () => {
    const plc = run(program('x', [DO('Out', 0)], ['OTE(Out)']));
    plc.forces.DO.set(0, true);
    plc.setMode('PROG');
    expect(plc.fieldDO[0]).toBe(true);
  });
});

describe('bit instructions', () => {
  it('XIO passes when bit is 0', () => {
    const plc = run(program('x', [B('A'), B('Q')], ['XIO(A)OTE(Q)']));
    plc.scan(10);
    expect(plc.tags.read('Q')).toBe(true);
  });
  it('OTL/OTU latch and survive a power cycle; OTE does not', () => {
    const plc = run(program('x', [B('Set'), B('Rst'), B('L'), B('Q')], ['XIC(Set)OTL(L)', 'XIC(Rst)OTU(L)', 'XIC(Set)OTE(Q)']));
    plc.tags.write('Set', true);
    plc.scan(10);
    expect(plc.tags.read('L')).toBe(true);
    expect(plc.tags.read('Q')).toBe(true);
    plc.tags.write('Set', false);
    plc.powerCycle(); // prescan runs with rungs false
    expect(plc.tags.read('L')).toBe(true);
    expect(plc.tags.read('Q')).toBe(false);
    plc.tags.write('Rst', true);
    plc.scan(10);
    expect(plc.tags.read('L')).toBe(false);
  });
  it('mode change PROG→RUN runs prescan: OTE clears, OTL keeps', () => {
    const plc = run(program('x', [B('L'), B('Q')], ['OTL(L)', 'OTE(Q)']));
    plc.scan(10);
    plc.setMode('PROG');
    plc.setMode('RUN');
    expect(plc.tags.read('Q')).toBe(false);
    expect(plc.tags.read('L')).toBe(true);
  });
  it('ONS passes for exactly one scan', () => {
    const plc = run(program('x', [B('PB'), B('Os'), C('C1', 100)], ['XIC(PB)ONS(Os)CTU(C1)']));
    const counts: boolean[] = [];
    plc.scan(10); // first scan with the button released
    plc.tags.write('PB', true);
    for (let k = 0; k < 3; k++) {
      plc.scan(10);
      counts.push(plc.trace.get(plc.program.routines[0].rungs[0].elems[1].id)!.out);
    }
    expect(counts).toEqual([true, false, false]);
  });
  it('ONS does not fire on the first scan if the rung is already true (prescan)', () => {
    const p = program('x', [B('PB', ), B('Os'), B('Hit')], ['XIC(PB)ONS(Os)OTL(Hit)']);
    p.tags[0].initial = true;
    const plc = run(p);
    plc.scan(10);
    expect(plc.tags.read('Hit')).toBe(false);
  });
  it('OSR and OSF pulse on rising and falling edges', () => {
    const plc = run(program('x', [B('In'), B('S1'), B('S2'), B('Up'), B('Down')], ['XIC(In)OSR(S1,Up)', 'XIC(In)OSF(S2,Down)']));
    plc.scan(10);
    plc.tags.write('In', true);
    plc.scan(10);
    expect([plc.tags.read('Up'), plc.tags.read('Down')]).toEqual([true, false]);
    plc.scan(10);
    expect(plc.tags.read('Up')).toBe(false);
    plc.tags.write('In', false);
    plc.scan(10);
    expect([plc.tags.read('Up'), plc.tags.read('Down')]).toEqual([false, true]);
    plc.scan(10);
    expect(plc.tags.read('Down')).toBe(false);
  });
  it('AFI forces the rung false; NOP passes power', () => {
    const plc = run(program('x', [B('Q1'), B('Q2')], ['AFI()OTE(Q1)', 'NOP()OTE(Q2)']));
    plc.scan(10);
    expect(plc.tags.read('Q1')).toBe(false);
    expect(plc.tags.read('Q2')).toBe(true);
  });
  it('bit-of-word addressing reads and writes single bits', () => {
    const plc = run(program('x', [N('W', 'INT'), B('Q')], ['XIC(W.3)OTE(Q)', 'OTL(W.0)']));
    plc.tags.write('W', 8);
    plc.scan(10);
    expect(plc.tags.read('Q')).toBe(true);
    expect(plc.tags.read('W')).toBe(9);
  });
});

describe('timers', () => {
  const tm = (plc: Plc, n = 'T1') => plc.tags.values.get(n) as TimerValue;

  it('TON: EN, TT, DN and ACC through a full cycle', () => {
    const plc = run(program('x', [B('Go'), T('T1', 1000)], ['XIC(Go)TON(T1)']));
    plc.tags.write('Go', true);
    plc.scan(400);
    expect(tm(plc)).toMatchObject({ EN: true, TT: true, DN: false, ACC: 400 });
    plc.scan(400);
    plc.scan(400);
    expect(tm(plc)).toMatchObject({ EN: true, TT: false, DN: true, ACC: 1000 });
    plc.tags.write('Go', false);
    plc.scan(10);
    expect(tm(plc)).toMatchObject({ EN: false, TT: false, DN: false, ACC: 0 });
  });
  it('TON resets if the rung drops before done', () => {
    const plc = run(program('x', [B('Go'), T('T1', 1000)], ['XIC(Go)TON(T1)']));
    plc.tags.write('Go', true);
    plc.scan(600);
    plc.tags.write('Go', false);
    plc.scan(10);
    plc.tags.write('Go', true);
    plc.scan(600);
    expect(tm(plc).DN).toBe(false);
  });
  it('TON with preset 0 is done on the first true scan', () => {
    const plc = run(program('x', [T('T1', 0)], ['TON(T1)']));
    plc.scan(10);
    expect(tm(plc).DN).toBe(true);
  });
  it('TOF: DN on while true, holds for preset after false', () => {
    const plc = run(program('x', [B('Go'), T('T1', 500)], ['XIC(Go)TOF(T1)']));
    plc.scan(10);
    expect(tm(plc).DN).toBe(false);
    plc.tags.write('Go', true);
    plc.scan(10);
    expect(tm(plc)).toMatchObject({ EN: true, DN: true, TT: false, ACC: 0 });
    plc.tags.write('Go', false);
    plc.scan(300);
    expect(tm(plc)).toMatchObject({ EN: false, DN: true, TT: true, ACC: 300 });
    plc.scan(300);
    expect(tm(plc)).toMatchObject({ DN: false, TT: false, ACC: 500 });
    plc.tags.write('Go', true);
    plc.scan(10);
    expect(tm(plc).ACC).toBe(0);
  });
  it('RTO keeps time when the rung goes false; RES clears it', () => {
    const plc = run(program('x', [B('Go'), B('Rst'), T('T1', 1000)], ['XIC(Go)RTO(T1)', 'XIC(Rst)RES(T1)']));
    plc.tags.write('Go', true);
    plc.scan(600);
    plc.tags.write('Go', false);
    plc.scan(10);
    expect(tm(plc)).toMatchObject({ ACC: 600, EN: false, TT: false });
    plc.tags.write('Go', true);
    plc.scan(500);
    expect(tm(plc).DN).toBe(true);
    plc.tags.write('Go', false);
    plc.scan(10);
    expect(tm(plc).DN).toBe(true); // still done — retentive
    plc.tags.write('Rst', true);
    plc.scan(10);
    expect(tm(plc)).toMatchObject({ ACC: 0, DN: false });
  });
  it('RTO keeps its time through a power cycle; TON does not', () => {
    const plc = run(program('x', [B('Go'), T('R', 1000), T('O', 1000)], ['XIC(Go)RTO(R)', 'XIC(Go)TON(O)']));
    plc.tags.write('Go', true);
    plc.scan(300);
    plc.tags.write('Go', false);
    plc.powerCycle();
    expect(tm(plc, 'R').ACC).toBe(300);
    expect(tm(plc, 'O').ACC).toBe(0);
  });
  it('negative preset is a major fault', () => {
    const plc = run(program('x', [T('T1', 0)], ['TON(T1)']));
    tm(plc).PRE = -5;
    expect(plc.scan(10)).toBe(false);
    expect(plc.fault?.message).toMatch(/negative/);
    expect(plc.scan(10)).toBe(false);
    plc.clearFault();
    tm(plc).PRE = 5;
    expect(plc.scan(10)).toBe(true);
  });
});

describe('counters', () => {
  const ct = (plc: Plc) => plc.tags.values.get('C1') as CounterValue;

  it('CTU counts rising edges only and sets DN at preset', () => {
    const plc = run(program('x', [B('Eye'), C('C1', 3)], ['XIC(Eye)CTU(C1)']));
    plc.scan(10);
    for (let k = 0; k < 3; k++) {
      plc.tags.write('Eye', true);
      plc.scan(10);
      plc.scan(10); // held true: no extra count
      plc.tags.write('Eye', false);
      plc.scan(10);
    }
    expect(ct(plc)).toMatchObject({ ACC: 3, DN: true });
  });
  it('CTD counts down; DN follows ACC ≥ PRE', () => {
    const plc = run(program('x', [B('Up'), B('Dn'), C('C1', 2)], ['XIC(Up)CTU(C1)', 'XIC(Dn)CTD(C1)']));
    plc.scan(10);
    const pulse = (tag: string) => {
      plc.tags.write(tag, true); plc.scan(10); plc.tags.write(tag, false); plc.scan(10);
    };
    pulse('Up'); pulse('Up');
    expect(ct(plc).DN).toBe(true);
    pulse('Dn');
    expect(ct(plc)).toMatchObject({ ACC: 1, DN: false });
  });
  it('CTU overflow wraps to the negative limit and sets OV', () => {
    const plc = run(program('x', [B('Eye'), C('C1', 10)], ['XIC(Eye)CTU(C1)']));
    ct(plc).ACC = DINT_MAX;
    plc.scan(10);
    plc.tags.write('Eye', true);
    plc.scan(10);
    expect(ct(plc)).toMatchObject({ ACC: DINT_MIN, OV: true });
  });
  it('CTD underflow wraps and sets UN', () => {
    const plc = run(program('x', [B('Eye'), C('C1', 10)], ['XIC(Eye)CTD(C1)']));
    ct(plc).ACC = DINT_MIN;
    plc.scan(10);
    plc.tags.write('Eye', true);
    plc.scan(10);
    expect(ct(plc)).toMatchObject({ ACC: DINT_MAX, UN: true });
  });
  it('RES clears ACC, DN, OV and UN', () => {
    const plc = run(program('x', [B('R'), C('C1', 1)], ['XIC(R)RES(C1)']));
    Object.assign(ct(plc), { ACC: 9, DN: true, OV: true, UN: true });
    plc.tags.write('R', true);
    plc.scan(10);
    expect(ct(plc)).toMatchObject({ ACC: 0, DN: false, OV: false, UN: false });
  });
  it('a counter rung already true at startup does not count (prescan)', () => {
    const p = program('x', [B('Eye'), C('C1', 10)], ['XIC(Eye)CTU(C1)']);
    p.tags[0].initial = true;
    const plc = run(p);
    plc.scan(10);
    expect(ct(plc).ACC).toBe(0);
  });
  it('RES on a non-structure faults', () => {
    const plc = run(program('x', [B('X')], ['RES(X)']));
    plc.scan(10);
    expect(plc.fault).not.toBeNull();
  });
});

describe('compare', () => {
  const cases: [string, number, number, boolean][] = [
    ['EQU', 5, 5, true], ['EQU', 5, 6, false], ['NEQ', 5, 6, true], ['NEQ', 5, 5, false],
    ['GRT', 6, 5, true], ['GRT', 5, 5, false], ['GEQ', 5, 5, true], ['GEQ', 4, 5, false],
    ['LES', 4, 5, true], ['LES', 5, 5, false], ['LEQ', 5, 5, true], ['LEQ', 6, 5, false],
  ];
  it.each(cases)('%s(%d,%d) → %s', (op, a, b, want) => {
    const plc = run(program('x', [N('A'), N('Bv'), B('Q')], [`${op}(A,Bv)OTE(Q)`]));
    plc.tags.write('A', a);
    plc.tags.write('Bv', b);
    plc.scan(10);
    expect(plc.tags.read('Q')).toBe(want);
  });
  it('LIM inside band, and circular when low > high', () => {
    const plc = run(program('x', [N('V'), B('In'), B('Out')], ['LIM(10,V,20)OTE(In)', 'LIM(20,V,10)OTE(Out)']));
    const at = (v: number) => { plc.tags.write('V', v); plc.scan(10); return [plc.tags.read('In'), plc.tags.read('Out')]; };
    expect(at(15)).toEqual([true, false]);
    expect(at(10)).toEqual([true, true]);
    expect(at(25)).toEqual([false, true]);
    expect(at(5)).toEqual([false, true]);
  });
});

describe('math and move', () => {
  it('ADD/SUB/MUL/MOD into DINT', () => {
    const plc = run(program('x', [N('A', 'DINT', 7), N('Bv', 'DINT', 3), N('S'), N('D'), N('M'), N('R')],
      ['ADD(A,Bv,S)', 'SUB(A,Bv,D)', 'MUL(A,Bv,M)', 'MOD(A,Bv,R)']));
    plc.scan(10);
    expect([plc.tags.read('S'), plc.tags.read('D'), plc.tags.read('M'), plc.tags.read('R')]).toEqual([10, 4, 21, 1]);
  });
  it('DIV: integers truncate, REAL sources round into an integer dest', () => {
    const plc = run(program('x', [N('A', 'DINT', 7), N('Bv', 'DINT', 2), N('Q'), N('F', 'REAL', 7), N('G', 'REAL', 2), N('Q2'), N('QR', 'REAL')],
      ['DIV(A,Bv,Q)', 'DIV(F,G,Q2)', 'DIV(F,G,QR)']));
    plc.scan(10);
    expect(plc.tags.read('Q')).toBe(3);
    expect(plc.tags.read('Q2')).toBe(4); // 3.5 → 4 (half to even)
    expect(plc.tags.read('QR')).toBe(3.5);
  });
  it('divide by zero is a minor fault, not a stop', () => {
    const plc = run(program('x', [N('A', 'DINT', 1), N('Z'), N('Q', 'DINT', 42)], ['DIV(A,Z,Q)', 'MOD(A,Z,Q)']));
    expect(plc.scan(10)).toBe(true);
    expect(plc.minorFaults.length).toBe(2);
    expect(plc.tags.read('Q')).toBe(42);
  });
  it('INT overflow wraps and flags overflow', () => {
    const plc = run(program('x', [N('A', 'INT', 32767), N('Q', 'INT')], ['ADD(A,1,Q)']));
    plc.scan(10);
    expect(plc.tags.read('Q')).toBe(-32768);
    expect(plc.tags.overflow).toBe(true);
  });
  it('math only runs when the rung is true', () => {
    const plc = run(program('x', [B('En'), N('Q')], ['XIC(En)ADD(Q,1,Q)']));
    plc.scan(10);
    expect(plc.tags.read('Q')).toBe(0);
    plc.tags.write('En', true);
    plc.scan(10); plc.scan(10);
    expect(plc.tags.read('Q')).toBe(2);
  });
  it('CPT evaluates expressions with precedence, MOD, power and functions', () => {
    const plc = run(program('x', [N('A', 'REAL', 3), N('Q', 'REAL')], ['CPT(Q,(A+1)*2-ABS(-1)+SQR(16)+7 MOD 4+2**3)']));
    plc.scan(10);
    expect(plc.tags.read('Q')).toBe(8 - 1 + 4 + 3 + 8);
  });
  it('SCP scales 4–20 mA raw counts to engineering units', () => {
    // Typical: 4 mA = 4000, 20 mA = 20000 counts → 0–100 %
    const plc = run(program('x', [N('Raw', 'DINT', 12000), N('Pct', 'REAL')], ['SCP(Raw,4000,20000,0,100,Pct)']));
    plc.scan(10);
    expect(plc.tags.read('Pct')).toBe(50);
  });
  it('NORM_X + SCALE_X (Siemens style) scale 0–27648 to 0–150 psi', () => {
    const plc = run(program('x', [N('Raw', 'INT', 13824), N('Norm', 'REAL'), N('Psi', 'REAL')], ['NORM_X(0,Raw,27648,Norm)', 'SCALE_X(0,Norm,150,Psi)']));
    plc.scan(10);
    expect(plc.tags.read('Norm')).toBe(0.5);
    expect(plc.tags.read('Psi')).toBe(75);
  });
  it('zero span ranges raise minor faults', () => {
    const plc = run(program('x', [N('Q', 'REAL')], ['SCP(1,5,5,0,1,Q)', 'NORM_X(3,1,3,Q)']));
    plc.scan(10);
    expect(plc.minorFaults.length).toBe(2);
  });
  it('MOV and CLR', () => {
    const plc = run(program('x', [N('Q'), N('Z', 'DINT', 9)], ['MOV(55,Q)', 'CLR(Z)']));
    plc.scan(10);
    expect([plc.tags.read('Q'), plc.tags.read('Z')]).toEqual([55, 0]);
  });
  it('MOV a REAL into an INT rounds half to even', () => {
    const plc = run(program('x', [N('Q', 'INT'), N('Q2', 'INT')], ['MOV(2.5,Q)', 'MOV(3.5,Q2)']));
    plc.scan(10);
    expect([plc.tags.read('Q'), plc.tags.read('Q2')]).toEqual([2, 4]);
  });
  it('COP copies arrays; past the end is a major fault', () => {
    const p = program('x', [{ name: 'Src', type: 'DINT', dim: 3 }, { name: 'Dst', type: 'DINT', dim: 3 }], ['COP(Src,Dst,3)']);
    const plc = run(p);
    (plc.tags.values.get('Src') as number[]).splice(0, 3, 1, 2, 3);
    plc.scan(10);
    expect(plc.tags.values.get('Dst')).toEqual([1, 2, 3]);
    const bad = run(program('x', [{ name: 'Src', type: 'DINT', dim: 3 }, { name: 'Dst', type: 'DINT', dim: 2 }], ['COP(Src,Dst,3)']));
    bad.scan(10);
    expect(bad.fault?.message).toMatch(/past the end/);
  });
  it('CLR clears whole arrays', () => {
    const plc = run(program('x', [{ name: 'Arr', type: 'REAL', dim: 2 }, { name: 'Bits', type: 'BOOL', dim: 2 }], ['CLR(Arr)', 'CLR(Bits)']));
    (plc.tags.values.get('Arr') as number[])[1] = 4;
    (plc.tags.values.get('Bits') as boolean[])[0] = true;
    plc.scan(10);
    expect(plc.tags.values.get('Arr')).toEqual([0, 0]);
    expect(plc.tags.values.get('Bits')).toEqual([false, false]);
  });
  it('indirect array index and out-of-range major fault', () => {
    const plc = run(program('x', [{ name: 'Arr', type: 'DINT', dim: 3 }, N('Idx', 'DINT', 1)], ['MOV(7,Arr[Idx])']));
    plc.scan(10);
    expect((plc.tags.values.get('Arr') as number[])[1]).toBe(7);
    plc.tags.write('Idx', 3);
    plc.scan(10);
    expect(plc.fault?.message).toMatch(/out of range/);
    expect(plc.fault?.rungId).toBe('r0');
  });
});

describe('program control', () => {
  it('JSR runs a subroutine; uncalled routines are not solved', () => {
    const p = program('x', [B('Call'), B('Q'), B('Z')], ['XIC(Call)JSR(Sub)'], { Sub: ['OTE(Q)'], Never: ['OTE(Z)'] });
    const plc = run(p);
    plc.scan(10);
    expect(plc.tags.read('Q')).toBe(false);
    plc.tags.write('Call', true);
    plc.scan(10);
    expect(plc.tags.read('Q')).toBe(true);
    expect(plc.tags.read('Z')).toBe(false);
    // Note: when Call goes false the subroutine stops being scanned, so Q stays ON — a classic gotcha.
    plc.tags.write('Call', false);
    plc.scan(10);
    expect(plc.tags.read('Q')).toBe(true);
  });
  it('JSR to a missing routine is a major fault', () => {
    const plc = run(program('x', [], ['JSR(Nope)']));
    expect(plc.fault?.message).toMatch(/doesn't exist/); // caught at prescan
  });
  it('recursive JSR faults instead of hanging', () => {
    const plc = run(program('x', [], ['JSR(Loop)'], { Loop: ['JSR(Loop)'] }));
    expect(plc.fault?.message).toMatch(/nested/);
  });
  it('MCR zone false forces every rung inside false', () => {
    const plc = run(program('x', [B('Zone'), B('Q'), B('After')], ['XIC(Zone)MCR()', 'OTE(Q)', 'MCR()', 'OTE(After)']));
    plc.scan(10);
    expect(plc.tags.read('Q')).toBe(false);
    expect(plc.tags.read('After')).toBe(true);
    plc.tags.write('Zone', true);
    plc.scan(10);
    expect(plc.tags.read('Q')).toBe(true);
  });
  it('cannot go to RUN while faulted', () => {
    const plc = new Plc(program('x', [], ['JSR(Nope)']));
    plc.setMode('RUN');
    expect(plc.fault).not.toBeNull();
    plc.setMode('PROG');
    plc.setMode('RUN');
    expect(plc.mode).toBe('PROG');
  });
  it('download resets tags and returns to PROG', () => {
    const plc = run(program('x', [B('Q')], ['OTE(Q)']));
    plc.scan(10);
    plc.download(program('y', [B('Q')], ['XIO(Q)OTE(Q)']));
    expect(plc.mode).toBe('PROG');
    expect(plc.tags.read('Q')).toBe(false);
  });
});

describe('PID', () => {
  it('drives a simple first-order process to setpoint', () => {
    const plc = run(program('x', [{ name: 'Loop', type: 'PID' }], ['PID(Loop)']));
    const p = plc.tags.values.get('Loop') as PidValue;
    Object.assign(p, { SP: 50, KP: 2, KI: 0.5, KD: 0 });
    let pv = 0;
    for (let k = 0; k < 2000; k++) {
      p.PV = pv;
      plc.scan(100);
      pv += (p.CV - pv) * 0.05; // process lag
    }
    expect(Math.abs(pv - 50)).toBeLessThan(0.5);
  });
  it('clamps CV and does not wind up', () => {
    const plc = run(program('x', [{ name: 'Loop', type: 'PID' }], ['PID(Loop)']));
    const p = plc.tags.values.get('Loop') as PidValue;
    Object.assign(p, { SP: 100, PV: 0, KP: 1, KI: 1 });
    for (let k = 0; k < 100; k++) plc.scan(100);
    expect(p.CV).toBe(100);
    expect(p.I).toBeLessThan(200);
  });
  it('direct acting reverses the error sign; manual is bumpless', () => {
    const plc = run(program('x', [{ name: 'Loop', type: 'PID' }], ['PID(Loop)']));
    const p = plc.tags.values.get('Loop') as PidValue;
    Object.assign(p, { SP: 20, PV: 30, KP: 2, KI: 0, DIRECT: true });
    plc.scan(100);
    expect(p.CV).toBe(20);
    Object.assign(p, { MAN: true, MANCV: 40 });
    plc.scan(100);
    expect(p.CV).toBe(40);
    p.MAN = false;
    plc.scan(100);
    expect(Math.abs(p.CV - 40)).toBeLessThan(1e-9);
  });
  it('does nothing with zero dt or false rung', () => {
    const plc = run(program('x', [B('En'), { name: 'Loop', type: 'PID' }], ['XIC(En)PID(Loop)']));
    const p = plc.tags.values.get('Loop') as PidValue;
    p.SP = 10;
    plc.scan(100);
    expect(p.CV).toBe(0);
    plc.tags.write('En', true);
    plc.scan(0);
    expect(p.CV).toBe(0);
  });
});

describe('analog I/O', () => {
  it('reads AI into tags and writes AO to the field', () => {
    const plc = run(program('x', [{ name: 'Level', type: 'INT', io: { kind: 'AI', point: 0 } }, { name: 'Speed', type: 'INT', io: { kind: 'AO', point: 0 } }], ['MOV(Level,Speed)']));
    plc.fieldAI[0] = 1234;
    plc.scan(10);
    expect(plc.fieldAO[0]).toBe(1234);
    plc.setMode('PROG');
    expect(plc.fieldAO[0]).toBe(0);
  });
});

describe('tag store', () => {
  const s = new TagStore([N('W', 'INT'), T('Tm', 100), { name: 'A', type: 'DINT', dim: 2 }, N('Ix')]);
  it('validates references', () => {
    expect(s.isValidRef('W')).toBe(true);
    expect(s.isValidRef('W.15')).toBe(true);
    expect(s.isValidRef('W.16')).toBe(false);
    expect(s.isValidRef('Tm.DN')).toBe(true);
    expect(s.isValidRef('Tm.XX')).toBe(false);
    expect(s.isValidRef('A[1]')).toBe(true);
    expect(s.isValidRef('A[Ix]')).toBe(true);
    expect(s.isValidRef('A[Nope]')).toBe(false);
    expect(s.isValidRef('W[0]')).toBe(false);
    expect(s.isValidRef('A')).toBe(true);
    expect(s.isValidRef('Nope')).toBe(false);
    expect(s.isValidRef('1.5')).toBe(true);
    expect(s.isValidRef('bad name')).toBe(false);
  });
  it('reads give useful errors', () => {
    expect(() => s.read('Tm')).toThrow(/structure/);
    expect(() => s.read('A')).toThrow(/array/);
    expect(() => s.read('Nope')).toThrow(/Unknown/);
    expect(() => s.read('Tm.XX')).toThrow(/member/);
    expect(() => s.write('bad name', 1)).toThrow();
  });
  it('wrap and rounding helpers', () => {
    expect(wrap(32768, 16)).toEqual({ value: -32768, overflow: true });
    expect(wrap(-32769, 16)).toEqual({ value: 32767, overflow: true });
    expect(wrap(5, 32)).toEqual({ value: 5, overflow: false });
    expect(roundHalfEven(0.5)).toBe(0);
    expect(roundHalfEven(1.5)).toBe(2);
    expect(roundHalfEven(-2.5)).toBe(-2);
    expect(roundHalfEven(2.6)).toBe(3);
  });
  it('snapshot and restore', () => {
    s.write('W', 5);
    const snap = s.snapshot();
    s.write('W', 9);
    s.restore(snap);
    expect(s.read('W')).toBe(5);
  });
});

describe('expressions', () => {
  it('evaluates and lists refs', () => {
    expect(evaluate('-(2+3)*4', () => 0)).toBe(-20);
    expect(evaluate('Tm.ACC / 1000', (r) => (r === 'Tm.ACC' ? 2500 : 0))).toBe(2.5);
    expect(exprRefs('A + ABS(B[2]) * T.PRE')).toEqual(['A', 'B[2]', 'T.PRE']);
    expect(exprRefs('1 +* $')).toEqual([]);
  });
  it('rejects junk', () => {
    expect(() => evaluate('1 +', () => 0)).toThrow();
    expect(() => evaluate('(1', () => 0)).toThrow();
    expect(() => evaluate('1 2', () => 0)).toThrow();
    expect(() => evaluate('$', () => 0)).toThrow();
  });
});

describe('verify', () => {
  it('flags duplicate coils, unused tags, zero presets, unconditional outputs', () => {
    const p = program('x', [B('A'), B('Bb'), B('Out'), B('Spare'), T('T1', 0)], ['XIC(A)OTE(Out)', 'XIC(Bb)OTE(Out)', 'TON(T1)']);
    const codes = verifyProgram(p).map((i) => i.code);
    expect(codes).toContain('duplicate-coil');
    expect(codes).toContain('unused-tag');
    expect(codes).toContain('zero-preset');
    expect(codes).toContain('unconditional-output');
  });
  it('flags a momentary start with no seal-in, and passes a sealed one', () => {
    const bad = program('x', [DI('Start_PB', 0), DI('Stop_PB', 1), DO('Motor', 0)], ['XIC(Start_PB)XIC(Stop_PB)OTE(Motor)']);
    expect(verifyProgram(bad).map((i) => i.code)).toContain('no-seal-in');
    const good = program('x', [DI('Start_PB', 0), DI('Stop_PB', 1), DO('Motor', 0)], ['[XIC(Start_PB),XIC(Motor)]XIC(Stop_PB)OTE(Motor)']);
    expect(verifyProgram(good)).toEqual([]);
  });
  it('flags bad operands, missing routines, writes to inputs, AFI, empty rungs and missing outputs', () => {
    const p = program('x', [DI('In', 0)], ['XIC(Ghost)OTE(In)', 'JSR(Nope)', 'AFI()XIC(In)', 'CPT(In,Ghost2+1)']);
    p.routines[0].rungs.push({ id: 'empty', elems: [] });
    const codes = verifyProgram(p).map((i) => i.code);
    for (const c of ['bad-operand', 'unknown-routine', 'input-written', 'afi', 'empty-rung', 'missing-args']) expect(codes).toContain(c);
  });
  it('cross-reference finds reads and writes', () => {
    const p = program('x', [B('A'), B('Q'), N('V')], ['XIC(A)OTE(Q)', 'XIC(Q)CPT(V,V+1)']);
    const xr = crossReference(p, 'Q');
    expect(xr).toEqual([
      { routine: 'MainRoutine', rungIndex: 0, op: 'OTE', write: true },
      { routine: 'MainRoutine', rungIndex: 1, op: 'XIC', write: false },
    ]);
    expect(crossReference(p, 'V').length).toBe(2);
  });
});
