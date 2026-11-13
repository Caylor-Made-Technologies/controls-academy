// One command for the whole gate. `npm run verify` runs every check against a fresh local build and prints one
// summary table; `npm run verify:live` (or SITE_URL=… node scripts/verify.mjs --live) runs the browser suites
// against the deployed site. Full logs go to test-results/verify/<step>.log. Exit code is non-zero on any failure.
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const LIVE = process.argv.includes('--live');
const SITE = process.env.SITE_URL ?? 'https://caylor-made-technologies.github.io/controls-academy/';
const OUT = 'test-results/verify';
mkdirSync(OUT, { recursive: true });

function run(name, cmd, env = {}) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(cmd, { shell: true, env: { ...process.env, FORCE_COLOR: '0', ...env } });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => {
      writeFileSync(`${OUT}/${name.replace(/\W+/g, '-')}.log`, out);
      const lines = out.trim().split('\n').filter(Boolean);
      const fails = lines.filter((l) => /^\s*(✗|FAIL|×)|error TS|\berror\b.*:\d+/.test(l));
      resolve({ name, ok: code === 0, secs: (Date.now() - t0) / 1000, note: code === 0 ? (lines.at(-1) ?? '') : (fails[0] ?? lines.at(-1) ?? `exit ${code}`), fails });
    });
  });
}

/** Fails if any commit that is not on origin/main yet names an AI tool in its message. */
function branding() {
  const t0 = Date.now();
  let log = '';
  try { log = execSync('git log origin/main..HEAD --format=%h%x09%B%x00', { encoding: 'utf8' }); } catch { log = execSync('git log -30 --format=%h%x09%B%x00', { encoding: 'utf8' }); }
  const bad = log.split('\0').map((c) => c.trim()).filter((c) => /claude|anthropic/i.test(c)).map((c) => c.split('\t')[0]);
  return { name: 'branding', ok: bad.length === 0, secs: (Date.now() - t0) / 1000, note: bad.length ? `commit message names an AI tool: ${bad.join(', ')}` : 'no AI-tool names in unpushed commit messages', fails: bad };
}

const results = [];
const step = async (name, cmd, env) => { const r = await run(name, cmd, env); results.push(r); process.stdout.write(`${r.ok ? '✓' : '✗'} ${name} (${r.secs.toFixed(0)} s)\n`); return r.ok; };
const E2E = [['e2e routes', 'node tests/e2e/run.mjs'], ['e2e flows', 'node tests/e2e/flows.mjs'], ['e2e 3d', 'node tests/e2e/three.mjs'], ['e2e perf', 'node tests/e2e/perf.mjs'], ['e2e features', 'node tests/e2e/features.mjs']];

let preview;
if (LIVE) {
  console.log(`verify:live → ${SITE}`);
  for (const [n, c] of E2E) await step(n, c, { SITE_URL: SITE });
} else {
  await step('unit', 'npx vitest run');
  await step('lint', 'npx eslint .');
  await step('typecheck', 'npx tsc --noEmit');
  const built = await step('build', 'npm run build');
  if (built) {
    await step('budget', 'node scripts/check-budget.mjs');
    preview = spawn('npx', ['vite', 'preview', '--port', '4180', '--strictPort'], { stdio: 'ignore', detached: true });
    await new Promise((r) => setTimeout(r, 2500));
    for (const [n, c] of E2E) await step(n, c);
    try { process.kill(-preview.pid); } catch { /* already gone */ }
  }
  results.push(branding());
}

const w = Math.max(...results.map((r) => r.name.length));
console.log('\n' + 'step'.padEnd(w) + '  result  time   note');
for (const r of results) console.log(`${r.name.padEnd(w)}  ${r.ok ? 'pass  ' : 'FAIL  '}  ${String(r.secs.toFixed(0)).padStart(3)} s  ${r.note.slice(0, 110)}`);
const failed = results.filter((r) => !r.ok);
for (const r of failed) for (const f of r.fails.slice(0, 12)) console.log(`  ${r.name}: ${String(f).slice(0, 200)}`);
console.log(failed.length ? `\n✗ verify failed: ${failed.map((r) => r.name).join(', ')} (logs in ${OUT}/)` : '\n✓ verify green');
process.exit(failed.length ? 1 : 0);
