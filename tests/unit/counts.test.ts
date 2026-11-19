import { expect, test } from 'vitest';
import { GLOSSARY } from '../../src/content/glossary';
import { HARDWARE } from '../../src/content/hardware';
import { GLOSSARY_COUNT, HARDWARE_BRAND_COUNT, HARDWARE_COUNT } from '../../src/content/counts';

test('Reference index counts match the real lists (update src/content/counts.ts)', () => {
  expect(GLOSSARY_COUNT).toBe(GLOSSARY.length);
  expect(HARDWARE_COUNT).toBe(HARDWARE.length);
  expect(HARDWARE_BRAND_COUNT).toBe(new Set(HARDWARE.map((m) => m.brand)).size);
});
