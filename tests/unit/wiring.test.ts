import { describe, expect, it } from 'vitest';
import { EXERCISES, checkWiring, nets, type Wire } from '../../src/lib/wiring';

const firstFail = (id: Parameters<typeof checkWiring>[0], w: Wire[]) => checkWiring(id, w).steps.find((s) => !s.ok)?.why ?? '';

describe('wiring trainer: nets', () => {
  it('joins terminals transitively', () => {
    const n = nets([['a', 'b'], ['b', 'c']], [['d', 'e']]);
    expect(n('a')).toBe(n('c'));
    expect(n('d')).toBe(n('e'));
    expect(n('a')).not.toBe(n('d'));
  });
});

describe('every exercise: the shown solution passes; terminals are unique', () => {
  for (const ex of EXERCISES) {
    it(ex.id, () => {
      expect(checkWiring(ex.id, ex.solution).pass).toBe(true);
      const ids = ex.devices.flatMap((d) => d.terminals.map((t) => t.id));
      expect(new Set(ids).size).toBe(ids.length);
      for (const [a, b] of ex.solution) expect(ids.includes(a) && ids.includes(b)).toBe(true);
    });
  }
});

describe('3-wire start/stop', () => {
  it('accepts another correct arrangement (Stop between the seal-in and the coil; OL on the hot side)', () => {
    const w: Wire[] = [['X1', 'OL.95'], ['OL.96', 'START.3'], ['START.3', 'M.13'], ['START.4', 'M.14'], ['M.14', 'STOP.1'], ['STOP.2', 'M.A1'], ['M.A2', 'X2']];
    expect(checkWiring('three-wire', w).pass).toBe(true);
  });
  it('no seal-in → explains the aux contact', () => {
    expect(firstFail('three-wire', [['X1', 'STOP.1'], ['STOP.2', 'START.3'], ['START.4', 'M.A1'], ['M.A2', 'OL.95'], ['OL.96', 'X2']])).toMatch(/seal-in/i);
  });
  it('seal-in across Stop and Start → Stop cannot drop it', () => {
    expect(firstFail('three-wire', [['X1', 'STOP.1'], ['X1', 'M.13'], ['STOP.2', 'START.3'], ['START.4', 'M.A1'], ['M.14', 'M.A1'], ['M.A2', 'OL.95'], ['OL.96', 'X2']])).toMatch(/Stop doesn't drop/);
  });
  it('overload left out → explains 95–96', () => {
    expect(firstFail('three-wire', [['X1', 'STOP.1'], ['STOP.2', 'START.3'], ['START.3', 'M.13'], ['START.4', 'M.14'], ['M.14', 'M.A1'], ['M.A2', 'X2']])).toMatch(/95–96/);
  });
  it('Stop only in the seal-in branch: held Start beats Stop → caught', () => {
    expect(firstFail('three-wire', [['X1', 'START.3'], ['X1', 'STOP.1'], ['STOP.2', 'M.13'], ['M.14', 'M.A1'], ['START.4', 'M.A1'], ['M.A2', 'OL.95'], ['OL.96', 'X2']])).toMatch(/Stop does nothing/);
  });
  it('overload only in the seal-in branch: Start still runs it → caught', () => {
    expect(firstFail('three-wire', [['X1', 'STOP.1'], ['STOP.2', 'START.3'], ['START.4', 'M.A1'], ['STOP.2', 'OL.95'], ['OL.96', 'M.13'], ['M.14', 'M.A1'], ['M.A2', 'X2']])).toMatch(/overload tripped/);
  });
  it('buttons on the grounded (X2) side → explained', () => {
    expect(firstFail('three-wire', [['X1', 'M.A1'], ['M.A2', 'STOP.1'], ['STOP.2', 'START.3'], ['START.3', 'M.13'], ['START.4', 'M.14'], ['M.14', 'OL.95'], ['OL.96', 'X2']])).toMatch(/grounded \(X2\) side/);
  });
  it('no Stop at all → says Stop is missing', () => {
    expect(firstFail('three-wire', [['X1', 'START.3'], ['X1', 'M.13'], ['START.4', 'M.A1'], ['M.14', 'M.A1'], ['M.A2', 'OL.95'], ['OL.96', 'X2']])).toMatch(/Stop isn't in the circuit/);
  });
  it('a short across the control transformer is caught', () => {
    // Start wired straight from the Stop circuit to X2: pressing Start shorts the supply.
    expect(checkWiring('three-wire', [['X1', 'STOP.1'], ['STOP.2', 'START.3'], ['START.4', 'X2']]).steps.at(-1)?.why).toMatch(/Dead short/);
  });
});

describe('prox sensors', () => {
  it('PNP with COM on +24 (sourcing wiring) never turns on → explains COM', () => {
    expect(firstFail('prox-pnp', [['P+', 'S.BN'], ['P-', 'S.BU'], ['S.BK', 'I.0'], ['I.COM', 'P+']])).toMatch(/COM goes to 0 V/);
  });
  it('NPN with COM on 0 V never turns on → explains COM', () => {
    expect(firstFail('prox-npn', [['P+', 'S.BN'], ['P-', 'S.BU'], ['S.BK', 'I.0'], ['I.COM', 'P-']])).toMatch(/COM goes to \+24 V/);
  });
  it('brown and blue swapped → reverse powered', () => {
    expect(firstFail('prox-pnp', [['P-', 'S.BN'], ['P+', 'S.BU'], ['S.BK', 'I.0'], ['I.COM', 'P-']])).toMatch(/swapped/);
  });
  it('PNP output tied to 0 V → dead short explained', () => {
    expect(firstFail('prox-pnp', [['P+', 'S.BN'], ['P-', 'S.BU'], ['S.BK', 'P-'], ['I.COM', 'P-']])).toMatch(/dead short/);
  });
  it('input wired across the supply → on with no target', () => {
    expect(firstFail('prox-pnp', [['P+', 'S.BN'], ['P-', 'S.BU'], ['P+', 'I.0'], ['I.COM', 'P-']])).toMatch(/no target/);
  });
});

describe('4–20 mA loop', () => {
  it('reads 3.00 V = 12 mA with the shunt on the 0 V side', () => {
    expect(checkWiring('loop', EXERCISES[3].solution).reading).toBe('3.00 V = 12.0 mA');
  });
  it('a high-side shunt is explained (needs an isolated/differential input)', () => {
    expect(firstFail('loop', [['P+', 'R.a'], ['R.a', 'AI+'], ['R.b', 'TX+'], ['R.b', 'AI-'], ['TX-', 'P-']])).toMatch(/isolated or differential/);
  });
  it('transmitter jumpered out → shunt across the supply', () => {
    expect(firstFail('loop', [...EXERCISES[3].solution, ['P+', 'TX-']])).toMatch(/jumpered out/);
  });
  it('input across the supply is not called "in series"', () => {
    expect(firstFail('loop', [['P+', 'TX+'], ['TX-', 'P-'], ['AI+', 'P+'], ['AI-', 'P-']])).toMatch(/no shunt/);
    expect(firstFail('loop', [['P+', 'TX+'], ['TX-', 'R.a'], ['R.b', 'P-'], ['AI+', 'P+'], ['AI-', 'P-']])).toMatch(/across the 24 V supply/);
  });
  it('input in series together with the shunt → explained', () => {
    expect(firstFail('loop', [['P+', 'TX+'], ['TX-', 'AI+'], ['AI-', 'R.a'], ['R.b', 'P-']])).toMatch(/in series in the loop/);
  });
  it('transmitter reversed → no current', () => {
    expect(firstFail('loop', [['P+', 'TX-'], ['TX+', 'R.a'], ['R.b', 'P-'], ['AI+', 'R.a'], ['AI-', 'R.b']])).toMatch(/reversed/);
  });
  it('input in series instead of the shunt → explains high resistance', () => {
    expect(firstFail('loop', [['P+', 'TX+'], ['TX-', 'AI+'], ['AI-', 'P-']])).toMatch(/in series/);
  });
  it('input leads reversed → −3 V', () => {
    expect(firstFail('loop', [['P+', 'TX+'], ['TX-', 'R.a'], ['R.b', 'P-'], ['AI-', 'R.a'], ['AI+', 'R.b']])).toMatch(/reversed across the shunt/);
  });
  it('input across the transmitter → wrong part', () => {
    expect(firstFail('loop', [['P+', 'TX+'], ['TX-', 'R.a'], ['R.b', 'P-'], ['AI+', 'TX+'], ['AI-', 'TX-']])).toMatch(/wrong part/);
  });
  it('shorted shunt → reads 0 V', () => {
    expect(firstFail('loop', [['P+', 'TX+'], ['TX-', 'R.a'], ['R.a', 'R.b'], ['R.b', 'P-']])).toMatch(/shorted out/);
  });
});
