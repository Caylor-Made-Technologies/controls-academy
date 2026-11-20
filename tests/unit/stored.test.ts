import { expect, test } from 'vitest';
import { MACHINES } from '../../src/plant';
import { erasableKeys, programKey } from '../../src/state/stored';

// B-020: "Erase all progress" removed only the motor program; other machines' programs survived.
test('erase covers every machine program and the day-one checklist', () => {
  const keys = erasableKeys();
  for (const m of MACHINES) expect(keys, m.id).toContain(programKey(m.id));
  expect(keys).toContain('sim-program');
  expect(keys).toContain('sim-program:conveyor');
  expect(keys).toContain('day-one');
});
