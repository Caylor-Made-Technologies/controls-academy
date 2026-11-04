// 3D gate: the panel renders, HUD actions work, and switching 2D/3D repeatedly leaks no WebGL contexts.
// Run after `npm run build` with `npx vite preview --port 4180`.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const b = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 900, height: 800 }, bypassCSP: true });
const axeSrc = require('fs').readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
await ctx.addInitScript(() => {
  localStorage.setItem('ca:prefs', JSON.stringify({ onboarded: true, quality: 'low' }));
  sessionStorage.setItem('ca:powered', '1');
  // count live WebGL contexts
  window.__gl = 0;
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const c = orig.call(this, type, ...rest);
    if (c && /webgl/.test(type) && !this.__counted) { this.__counted = true; window.__gl++; c.canvas.addEventListener('webglcontextlost', () => window.__gl--); }
    return c;
  };
});
const p = await ctx.newPage();
const errors = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
p.on('pageerror', (e) => errors.push(e.message));
const ok = (c, msg) => { console.log(c ? '✓' : '✗', msg); if (!c) process.exitCode = 1; };

await p.goto((process.env.SITE_URL ?? 'http://localhost:4180/controls-academy/') + '#/sim');
await p.waitForSelector('section[aria-label="3D control panel"] canvas', { timeout: 30000 });
ok(true, '3D panel renders');
for (const name of ['PLC rack', 'Overload for M1', 'X-ray current', 'Explode contactor', 'Whole panel']) {
  await p.getByRole('button', { name }).click();
  await p.waitForTimeout(400);
}
ok(true, 'tours, X-ray and explode run');
await p.addScriptTag({ content: axeSrc });
const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map((x) => `${x.id}: ${x.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`));
ok(v.length === 0, `axe clean with the 3D view open ${v.join('; ')}`);
for (let i = 0; i < 5; i++) {
  await p.getByRole('button', { name: '2D', exact: true }).click();
  await p.waitForTimeout(250);
  await p.getByRole('button', { name: '3D panel' }).click();
  await p.waitForSelector('section[aria-label="3D control panel"] canvas');
  await p.waitForTimeout(250);
}
const canvases = await p.locator('canvas').count();
ok(canvases === 1, `one canvas after 5 switches (found ${canvases})`);
const leakWarn = errors.some((e) => /Too many active WebGL contexts/.test(e));
ok(!leakWarn, 'no WebGL context leak warning');
ok(errors.length === 0, `no console errors/warnings ${errors.slice(0, 3).join(' | ')}`);
await b.close();
