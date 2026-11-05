import { describe, expect, it } from 'vitest';
import { LESSON_BY_ID } from '../../src/content';
import { HP_WATTS, ohm, power, twoLoads } from '../../src/lib/circuits';

/** The correct choice for a question, by lesson id and question id. */
const answer = (lesson: string, q: string) => {
  const l = LESSON_BY_ID.get(lesson)!;
  const x = l.quiz.find((y) => y.id === `${lesson}.${q}`)!;
  return x.choices[x.answer];
};
const text = (lesson: string) => JSON.stringify(LESSON_BY_ID.get(lesson));

describe('every number in the lessons is checked', () => {
  it('Ohm\'s law and power examples (z-ohms-power)', () => {
    expect(ohm.current(24, 480)).toBeCloseTo(0.05);
    expect(answer('z-ohms-power', 'q1')).toContain('0.05 A');
    expect(power.vi(24, 0.05)).toBeCloseTo(1.2);
    expect(text('z-ohms-power')).toContain('**1.2 W**');
    expect(ohm.current(120, 60)).toBe(2);
    expect(power.vi(120, 2)).toBe(240);
    expect(power.v2r(120, 60)).toBe(240);
    expect(answer('z-ohms-power', 'q2')).toBe('240 W');
    expect(answer('z-ohms-power', 'q3')).toBe('240 W');
    expect(answer('z-ohms-power', 'q4')).toBe(`${HP_WATTS} W`);
    expect((10 * HP_WATTS) / 1000).toBeCloseTo(7.5, 1);
  });

  it('US voltages and three-phase power (z-ac-dc)', () => {
    expect(277 * Math.sqrt(3)).toBeCloseTo(480, -1);
    expect(120 * Math.sqrt(3)).toBeCloseTo(208, 0);
    expect(480 / Math.sqrt(3)).toBeCloseTo(277, 0);
    expect(power.threePhase(480, 10) / 1000).toBeCloseTo(8.3, 1);
    expect(answer('z-ac-dc', 'q3')).toBe('8.3 kW');
    expect(answer('z-ac-dc', 'q2')).toBe('277 V');
  });

  it('series and parallel example (z-series-parallel)', () => {
    const s = twoLoads(120, 60, 60, 'series');
    expect(s.iTotal).toBeCloseTo(1);
    expect(s.v[0]).toBeCloseTo(60);
    expect(s.p[0]).toBeCloseTo(60);
    expect(answer('z-series-parallel', 'q1')).toBe('1 A');
    const p = twoLoads(120, 60, 60, 'parallel');
    expect(p.rTotal).toBeCloseTo(30);
    expect(p.i[0]).toBeCloseTo(2);
    expect(p.iTotal).toBeCloseTo(4);
    expect(p.p[0]).toBeCloseTo(240);
    expect(answer('z-series-parallel', 'q2')).toBe('4 A');
  });

  it('volts-amps-ohms (Track 1)', () => {
    expect(ohm.current(24, 240)).toBeCloseTo(0.1);
    expect(answer('volts-amps-ohms', 'q1')).toContain('0.1 A');
  });
});
