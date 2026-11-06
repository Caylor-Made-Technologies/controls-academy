// Bundle budget gate. Fails if the main entry chunk (gzip) grows past the ceiling.
// The ceiling was set from the Phase 0 baseline (v0.5.0) and may only go down. Run after `npm run build`.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

export const MAIN_GZIP_CEILING_KB = 118;

const dir = new URL('../dist/assets/', import.meta.url);
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const entry = html.match(/assets\/(index-[\w-]+\.js)/)?.[1];
if (!entry) { console.error('✗ budget: no entry chunk found in dist/index.html'); process.exit(1); }
const kb = gzipSync(readFileSync(new URL(entry, dir)), { level: 9 }).length / 1024;
const css = readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => gzipSync(readFileSync(new URL(f, dir))).length / 1024).reduce((a, b) => a + b, 0);
console.log(`main JS ${kb.toFixed(1)} KB gz (ceiling ${MAIN_GZIP_CEILING_KB} KB) · CSS ${css.toFixed(1)} KB gz`);
if (kb > MAIN_GZIP_CEILING_KB) { console.error(`✗ budget: main bundle over the ceiling by ${(kb - MAIN_GZIP_CEILING_KB).toFixed(1)} KB`); process.exit(1); }
console.log('✓ bundle within budget');
