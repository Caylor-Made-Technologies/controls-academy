import { expect, test } from 'vitest';
import { GLOSSARY } from '../../src/content/glossary';
import { HARDWARE } from '../../src/content/hardware';
import { EXAM_BANK_SIZE, GLOSSARY_COUNT, HARDWARE_BRAND_COUNT, HARDWARE_COUNT } from '../../src/content/counts';
import { EXAMS, bankFor } from '../../src/content/bank';

test('Reference index counts match the real lists (update src/content/counts.ts)', () => {
  expect(GLOSSARY_COUNT).toBe(GLOSSARY.length);
  expect(HARDWARE_COUNT).toBe(HARDWARE.length);
  expect(HARDWARE_BRAND_COUNT).toBe(new Set(HARDWARE.map((m) => m.brand)).size);
});

test('exam bank sizes shown before the bank loads match the bank', () => {
  expect(EXAM_BANK_SIZE).toEqual(Object.fromEntries(EXAMS.map((e) => [e.id, bankFor(e).length])));
});
