import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalogSource } from '../../scripts/catalog-source';

describe('lesson catalog', () => {
  it('catalog.gen.ts matches the lesson files (run `npm run catalog` if this fails)', () => {
    expect(readFileSync(new URL('../../src/content/catalog.gen.ts', import.meta.url), 'utf8')).toBe(catalogSource());
  });
});
