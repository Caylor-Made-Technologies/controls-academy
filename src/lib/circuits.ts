/** Circuit math used by lesson figures and checked by tests/unit/circuits.test.ts. SI units. */

export const ohm = {
  current: (v: number, r: number) => v / r,
  voltage: (i: number, r: number) => i * r,
  resistance: (v: number, i: number) => v / i,
};

export const power = {
  vi: (v: number, i: number) => v * i,
  i2r: (i: number, r: number) => i * i * r,
  v2r: (v: number, r: number) => (v * v) / r,
  /** Balanced three-phase: P = √3 × V(line-line) × I(line) × PF. */
  threePhase: (vLL: number, i: number, pf = 1) => Math.sqrt(3) * vLL * i * pf,
};

export const HP_WATTS = 746;

export interface TwoLoadResult {
  rTotal: number;
  iTotal: number;
  /** Per-load voltage, current and power. Index 0 = load 1, 1 = load 2. */
  v: [number, number];
  i: [number, number];
  p: [number, number];
}

/** Two resistive loads on a supply, wired in series or parallel; load 2 can be open (burned out / removed). */
export function twoLoads(supply: number, r1: number, r2: number, mode: 'series' | 'parallel', open2 = false): TwoLoadResult {
  if (mode === 'series') {
    if (open2) return { rTotal: Infinity, iTotal: 0, v: [0, supply], i: [0, 0], p: [0, 0] };
    const rT = r1 + r2;
    const i = supply / rT;
    return { rTotal: rT, iTotal: i, v: [i * r1, i * r2], i: [i, i], p: [i * i * r1, i * i * r2] };
  }
  const i1 = supply / r1;
  const i2 = open2 ? 0 : supply / r2;
  const rT = open2 ? r1 : 1 / (1 / r1 + 1 / r2);
  return { rTotal: rT, iTotal: i1 + i2, v: [supply, supply], i: [i1, i2], p: [supply * i1, supply * i2] };
}
