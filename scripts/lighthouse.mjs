// Lighthouse mobile on the key routes. Prints the four category scores plus LCP / TBT / CLS (median of N runs)
// and fails if a budget is missed.
//   node scripts/lighthouse.mjs                      local preview on :4180
//   SITE_URL=https://… node scripts/lighthouse.mjs   the live site
//   RUNS=3 ROUTES=sim,wiring node scripts/lighthouse.mjs
//   THROTTLE=devtools …   really slow the network and CPU down instead of simulating it. Use this against
//                         localhost, where simulation can't tell what loaded before the first paint.
// Lighthouse is not a project dependency (it is large): set LIGHTHOUSE_BIN, or it is fetched with npx.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const BASE = process.env.SITE_URL ?? 'http://localhost:4180/controls-academy/';
const RUNS = Number(process.env.RUNS ?? 3);
const ROUTES = (process.env.ROUTES ?? 'learn,sim,troubleshoot,wiring,reference,profile').split(',');
const BIN = process.env.LIGHTHOUSE_BIN;
const CHROME = process.env.CHROME_PATH ?? ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium'].find((p) => existsSync(p));
const BUDGET = { lcp: 2500, tbt: 200, cls: 0.05, score: Number(process.env.MIN_SCORE ?? 90) };
mkdirSync('test-results/lighthouse', { recursive: true });

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
let failed = false;
const rows = [];
for (const route of ROUTES) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const out = `test-results/lighthouse/${route.replace(/\W+/g, '_')}-${i}.json`;
    const args = [`${BASE}#/${route}`, '--quiet', '--output=json', `--output-path=${out}`, '--form-factor=mobile', '--only-categories=performance,accessibility,best-practices,seo', '--chrome-flags=--headless=new --no-sandbox --disable-gpu', ...(process.env.THROTTLE ? [`--throttling-method=${process.env.THROTTLE}`] : [])];
    const env = { ...process.env, ...(CHROME ? { CHROME_PATH: CHROME } : {}) };
    if (BIN) execFileSync(BIN, args, { env, stdio: 'ignore' }); else execFileSync('npx', ['--yes', 'lighthouse@12', ...args], { env, stdio: 'ignore' });
    const r = JSON.parse(readFileSync(out, 'utf8'));
    const c = r.categories;
    runs.push({ perf: c.performance.score * 100, a11y: c.accessibility.score * 100, bp: c['best-practices'].score * 100, seo: c.seo.score * 100, lcp: r.audits['largest-contentful-paint'].numericValue, tbt: r.audits['total-blocking-time'].numericValue, cls: r.audits['cumulative-layout-shift'].numericValue, el: r.audits['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet ?? '' });
  }
  const m = Object.fromEntries(['perf', 'a11y', 'bp', 'seo', 'lcp', 'tbt', 'cls'].map((k) => [k, median(runs.map((r) => r[k]))]));
  const worstLcp = Math.max(...runs.map((r) => r.lcp));
  const ok = worstLcp < BUDGET.lcp && m.tbt < BUDGET.tbt && m.cls < BUDGET.cls && Math.min(m.perf, m.a11y, m.bp, m.seo) >= BUDGET.score;
  if (!ok) failed = true;
  rows.push({ route, ...m, worstLcp, ok, el: runs[0].el });
  console.log(`${ok ? '✓' : '✗'} ${route.padEnd(14)} perf ${m.perf.toFixed(0)} · a11y ${m.a11y.toFixed(0)} · best ${m.bp.toFixed(0)} · seo ${m.seo.toFixed(0)} · LCP ${(m.lcp / 1000).toFixed(2)} s (worst ${(worstLcp / 1000).toFixed(2)}) · TBT ${m.tbt.toFixed(0)} ms · CLS ${m.cls.toFixed(3)}  ${runs[0].el.slice(0, 70)}`);
}
writeFileSync('test-results/lighthouse/summary.json', JSON.stringify({ base: BASE, runs: RUNS, rows }, null, 2));
console.log(failed ? `\n✗ Lighthouse budgets missed (LCP < ${BUDGET.lcp} ms in every run, TBT < ${BUDGET.tbt} ms, CLS < ${BUDGET.cls}, scores ≥ ${BUDGET.score})` : '\n✓ Lighthouse budgets met');
process.exit(failed ? 1 : 0);
