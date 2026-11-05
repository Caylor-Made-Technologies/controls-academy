// Writes src/content/catalog.gen.ts: the small lesson list the main bundle needs (no lesson bodies).
// Run: npm run catalog (the build runs it too). tests/unit/catalog.test.ts fails if it's stale.
import { writeFileSync } from 'node:fs';
import { catalogSource } from './catalog-source';

writeFileSync(new URL('../src/content/catalog.gen.ts', import.meta.url), catalogSource());
console.log('catalog written');
