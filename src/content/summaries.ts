import type { TrackId } from './types';

/**
 * Formulas for the printable track summaries. The math behind each one is checked in
 * tests/unit/lesson-math.test.ts and tests/unit/circuits.test.ts.
 */
export const FORMULAS: Partial<Record<TrackId, { name: string; formula: string; example?: string }[]>> = {
  t0: [
    { name: 'Ohm\'s law', formula: 'V = I × R   ·   I = V ÷ R   ·   R = V ÷ I', example: '24 V ÷ 480 Ω = 0.05 A' },
    { name: 'Power', formula: 'P = V × I = I² × R = V² ÷ R', example: '120 V × 2 A = 240 W' },
    { name: 'Horsepower', formula: '1 HP ≈ 746 W' },
    { name: 'Three-phase power (balanced)', formula: 'P = 1.732 × V(line-line) × I × PF', example: '1.732 × 480 V × 10 A ≈ 8.3 kW' },
    { name: 'Wye voltages', formula: 'V(line-line) = 1.732 × V(line-neutral)', example: '277 × 1.732 ≈ 480 V' },
    { name: 'Series', formula: 'R = R₁ + R₂ · same current · voltages add up' },
    { name: 'Parallel', formula: '1/R = 1/R₁ + 1/R₂ · same voltage · currents add up', example: 'Two 60 Ω → 30 Ω' },
  ],
  t1: [
    { name: 'Ohm\'s law (panel check)', formula: 'I = V ÷ R', example: '24 V ÷ 240 Ω = 0.1 A' },
  ],
  t4: [
    { name: 'Percent of a 4–20 mA signal', formula: '% = (mA − 4) ÷ 16 × 100', example: '12 mA = 50 %' },
    { name: 'Linear scaling', formula: 'EU = (raw − rawMin) × (EUmax − EUmin) ÷ (rawMax − rawMin) + EUmin', example: 'raw 8000 of 4000–20000 → 50 of 0–200 gal' },
    { name: '250 Ω loop resistor', formula: 'V = I × 250 Ω → 4–20 mA becomes 1–5 V' },
    { name: 'Octal I/O (FX, DirectLOGIC)', formula: 'X0…X7, X10…X17 (no 8 or 9)' },
  ],
  t5: [
    { name: 'Logix timer preset', formula: '.PRE in milliseconds', example: '2.5 s → 2500' },
    { name: 'Math every scan', formula: 'Executions ≈ time true ÷ scan time', example: '1 s at 10 ms ≈ 100 times' },
  ],
  t11: [
    { name: 'Alarm deadband', formula: 'Trip at the limit; reset only past (limit − deadband)', example: 'Trip ≥ 90 %, reset < 88 %' },
    { name: 'Loop check points', formula: '4 / 12 / 20 mA = 0 / 50 / 100 %' },
  ],
};
