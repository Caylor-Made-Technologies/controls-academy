/** Fault Hunt meter and scoring rules. Pure functions — tests/unit/scoring.test.ts. */

export type MeterMode = 'VDC' | 'VAC' | 'mA' | 'A' | 'OHM';
export type PointUnit = 'VDC' | 'VAC' | 'mA' | 'A';

export const MODE_LABEL: Record<MeterMode, string> = { VDC: 'V⎓', VAC: 'V~', mA: 'mA', A: 'Clamp A', OHM: 'Ω / ))))' };

export interface Penalty { why: string; pts: number; unsafe?: boolean }

/** What the meter shows when you measure a live point of `unit` with the meter in `mode`. */
export function meterResult(mode: MeterMode, unit: PointUnit, value: number): { display: string; valid: boolean; penalty?: Penalty } {
  const fmt = (v: number) => `${v.toFixed(v % 1 ? (Math.abs(v) < 10 ? 2 : 1) : 0)} ${unit === 'A' ? 'A' : unit}`;
  if (mode === unit) return { display: fmt(value), valid: true };
  if (mode === 'OHM') return { display: '-.-- Ω', valid: false, penalty: { why: 'Ohms/continuity on a live circuit: the meter pushes its own current into a powered circuit — a nonsense reading at best, a blown meter or an arc at worst. Volts first, always; ohms only dead and isolated.', pts: 20, unsafe: true } };
  if (mode === 'mA' && (unit === 'VDC' || unit === 'VAC')) return { display: 'FUSE', valid: false, penalty: { why: 'Leads in the amps jacks across a voltage is a short circuit through the meter. That blows the meter fuse — or, on a big supply, causes an arc flash in your hands.', pts: 20, unsafe: true } };
  if (mode === 'mA' && unit === 'A') return { display: 'FUSE', valid: false, penalty: { why: 'Breaking into a 480 V motor lead to put a meter in series is never done. Motor current is measured with a clamp around one conductor.', pts: 20, unsafe: true } };
  if (mode === 'A') return { display: '0.0 A', valid: false, penalty: { why: 'A clamp meter measures current through one conductor. This point is a voltage or a loop signal — use the right mode.', pts: 5 } };
  return { display: `0.0 ${mode === 'VDC' ? 'VDC' : mode === 'VAC' ? 'VAC' : 'mA'}`, valid: false, penalty: { why: `Wrong meter mode for this point (it's ${unit === 'A' ? 'a current' : unit}). A zero from the wrong setting proves nothing — it can make a live circuit look dead.`, pts: 5 } };
}

/**
 * Score: 50 base + up to 50 for speed − penalties, + 10 for proving the culprit with the meter first,
 * − 10 for naming it with no proof when proof was possible. Never below 10.
 */
export function huntScore(ms: number, penalties: Penalty[], proved: boolean, provable: boolean): number {
  const timeBonus = Math.max(0, 50 - Math.floor(ms / 6000));
  const method = proved ? 10 : provable ? -10 : 0;
  return Math.max(10, 50 + timeBonus + method - penalties.reduce((a, p) => a + p.pts, 0));
}
