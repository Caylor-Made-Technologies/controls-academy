// 3D performance budgets (Phase 3.8). Hardware-independent: draw calls and triangles per frame for every
// 3D view, plus idle frames. Also reports frame rate under 4× CPU throttle (information only: this runs on a
// software GPU, which says little about a real phone's GPU).
// Run after `npm run build` with `npx vite preview --port 4180`.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const BASE = process.env.SITE_URL ?? 'http://localhost:4180/controls-academy/';
const MAX_CALLS = 300;
const MAX_TRIS = 200_000;
const b = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, bypassCSP: true });
await ctx.addInitScript(() => { localStorage.setItem('ca:prefs', JSON.stringify({ onboarded: true, quality: 'high' })); sessionStorage.setItem('ca:powered', '1'); });
const p = await ctx.newPage();
const errors = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
const ok = (c, msg) => { console.log(c ? '✓' : '✗', msg); if (!c) process.exitCode = 1; };
const VIEWS = [
  ['sim', 'motor panel'], ...['vfd', 'fwdrev', 'conveyor', 'tank', 'pumps', 'datacenter', 'mixer'].map((m) => [`sim?m=${m}`, m]),
  ['reference/hw/controllogix', 'hardware viewer'], ['reference/inside/vfd', 'exploded VFD'], ['wiring/three-wire', 'wiring board'], ['troubleshoot/tk-wire', 'Fault Hunt (machine + meter)'],
];
const rows = [];
for (const [route, name] of VIEWS) {
  await p.goto(BASE + '#/' + route);
  await p.waitForSelector('canvas', { timeout: 30000 });
  await p.waitForFunction(() => { const s = window.__ca3d.stats(); return s.live > 0 && s.stages.every((x) => x.frames > 0 && x.calls > 0); }, null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  const s = await p.evaluate(() => window.__ca3d.stats());
  const worst = s.stages.reduce((a, x) => ({ calls: Math.max(a.calls, x.calls), triangles: Math.max(a.triangles, x.triangles) }), { calls: 0, triangles: 0 });
  rows.push([name, worst.calls, worst.triangles]);
  ok(worst.calls <= MAX_CALLS && worst.triangles <= MAX_TRIS, `${name}: ${worst.calls} draw calls, ${Math.round(worst.triangles / 1000)}k triangles (budget ${MAX_CALLS} / ${MAX_TRIS / 1000}k)`);
}
// Frame rate with the conveyor running, 4× CPU throttle (information).
const cdp = await ctx.newCDPSession(p);
await p.goto(BASE + '#/sim?m=conveyor');
await p.waitForSelector('canvas');
await p.getByRole('button', { name: /^Start/ }).first().click();
await p.waitForTimeout(1500);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const fps = await p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(n / 3); }; requestAnimationFrame(f); }));
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
console.log(`ℹ conveyor running, 4× CPU throttle, software GPU: ${fps.toFixed(0)} fps (information)`);
ok(errors.length === 0, `no console errors/warnings ${errors.slice(0, 3).join(' | ')}`);
await b.close();
