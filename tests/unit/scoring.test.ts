import { describe, expect, it } from 'vitest';
import { huntScore, meterResult } from '../../src/features/troubleshoot/scoring';

describe('fault hunt meter and scoring', () => {
  it('right mode reads the value', () => {
    expect(meterResult('VDC', 'VDC', 24)).toEqual({ display: '24 VDC', valid: true });
    expect(meterResult('mA', 'mA', 12.4).display).toBe('12.4 mA');
    expect(meterResult('mA', 'mA', 4.25).display).toBe('4.25 mA');
  });
  it('ohms or amps-jacks on a live voltage are unsafe (−20)', () => {
    expect(meterResult('OHM', 'VAC', 120).penalty).toMatchObject({ pts: 20, unsafe: true });
    expect(meterResult('mA', 'VDC', 24).penalty).toMatchObject({ pts: 20, unsafe: true });
    expect(meterResult('mA', 'A', 9).penalty).toMatchObject({ pts: 20, unsafe: true });
  });
  it('wrong but harmless mode reads ~0 and costs 5', () => {
    const r = meterResult('VDC', 'VAC', 120);
    expect(r.valid).toBe(false);
    expect(r.display.startsWith('0.0')).toBe(true);
    expect(r.penalty?.pts).toBe(5);
    expect(meterResult('A', 'VDC', 24).penalty?.pts).toBe(5);
  });
  it('rewards proving the culprit before naming it, penalizes guessing', () => {
    expect(huntScore(0, [], true, true)).toBe(110);
    expect(huntScore(0, [], false, true)).toBe(90);
    expect(huntScore(0, [], false, false)).toBe(100);
    expect(huntScore(60000, [{ why: 'x', pts: 15 }], true, true)).toBe(50 + 40 + 10 - 15);
    expect(huntScore(10 * 60000, [{ why: 'x', pts: 200 }], false, true)).toBe(10);
  });
});
