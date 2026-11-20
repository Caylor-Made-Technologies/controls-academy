import { expect, test } from 'vitest';
import { parsePath } from '../../src/lib/router';

// B-016: a malformed % escape in a link (#/lesson/%E0%A4%A) threw "URI malformed" outside the error boundary: blank page.
test('route segments decode, and a malformed escape is kept as typed instead of throwing', () => {
  expect(parsePath('lesson/three-wire')).toEqual(['lesson', 'three-wire']);
  expect(parsePath('reference/brand/allen%20bradley')).toEqual(['reference', 'brand', 'allen bradley']);
  expect(parsePath('lesson/%E0%A4%A')).toEqual(['lesson', '%E0%A4%A']);
  expect(parsePath('lesson/%')).toEqual(['lesson', '%']);
  expect(parsePath('//sim//')).toEqual(['sim']);
});

// B-017: ids come from links; inherited object names ("constructor", "toString") matched plain-object lookups.
test('inherited names are not ids', async () => {
  const { HARDWARE_BY_ID } = await import('../../src/content/hardware');
  const { headFor } = await import('../../src/content/heads');
  for (const id of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    expect(HARDWARE_BY_ID.get(id), id).toBeUndefined();
    expect(headFor([id]), id).toBeUndefined();
  }
});
