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
const stats = () => p.evaluate(() => window.__ca3d.stats());
const frames = async () => (await stats()).stages[0]?.frames ?? 0;

// Render on change (B-001): an idle panel draws (almost) nothing.
await p.getByRole('button', { name: 'X-ray current' }).click(); // X-ray off
await p.getByRole('button', { name: 'Explode contactor' }).click(); // explode off
await p.waitForTimeout(2500); // camera glides settle
let f0 = await frames();
await p.waitForTimeout(2000);
let idle = (await frames()) - f0;
ok(idle <= 4, `idle 3D panel draws ≤ 4 frames in 2 s (drew ${idle})`);

// Pause off-screen: run the motor (shaft spins → animating), then scroll the canvas away.
await p.getByRole('button', { name: /^Start/ }).first().click();
await p.waitForTimeout(800);
f0 = await frames();
await p.waitForTimeout(1000);
const running = (await frames()) - f0;
ok(running >= 4, `spinning motor animates (${running} frames in 1 s; software GPU)`);
await p.evaluate(() => { document.body.style.paddingBottom = '3000px'; window.scrollTo(0, document.body.scrollHeight); });
await p.waitForTimeout(500);
f0 = await frames();
await p.waitForTimeout(1000);
const offscreen = (await frames()) - f0;
ok(offscreen <= 1, `off-screen panel pauses (${offscreen} frames in 1 s)`);
await p.evaluate(() => { document.body.style.paddingBottom = ''; window.scrollTo(0, 0); });
await p.getByRole('button', { name: /^Stop/ }).first().click();

// Leak test: open and close the 3D panel 20 times.
const first = await stats();
for (let i = 0; i < 20; i++) {
  await p.getByRole('button', { name: '2D', exact: true }).click();
  await p.waitForFunction(() => window.__ca3d.stats().live === 0);
  await p.getByRole('button', { name: '3D panel' }).click();
  await p.waitForSelector('section[aria-label="3D control panel"] canvas');
  await p.waitForFunction(() => window.__ca3d.stats().live === 1);
}
await p.waitForTimeout(1500); // R3F releases the old contexts shortly after unmount
const last = await stats();
const glLive = await p.evaluate(() => window.__gl);
ok(last.opened - first.opened === 20 && last.closed - first.closed === 20, `20 opens and 20 closes counted (${last.opened - first.opened}/${last.closed - first.closed})`);
ok(last.live === 1, `one live 3D stage after 20 cycles (found ${last.live})`);
ok(glLive <= 1, `WebGL contexts released after 20 cycles (live: ${glLive})`);
const g0 = first.stages[0], g1 = last.stages[0];
ok(g1.geometries <= g0.geometries && g1.textures <= g0.textures, `GPU memory flat: geometries ${g0.geometries}→${g1.geometries}, textures ${g0.textures}→${g1.textures}`);
ok(last.cachedTextures <= first.cachedTextures, `texture cache flat (${first.cachedTextures}→${last.cachedTextures})`);
const canvases = await p.locator('canvas').count();
ok(canvases === 1, `one canvas after 20 switches (found ${canvases})`);

// Hardware library viewer: 20 opens via page navigation, no leak.
const base = (process.env.SITE_URL ?? 'http://localhost:4180/controls-academy/');
for (let i = 0; i < 20; i++) {
  await p.goto(base + '#/reference/hardware');
  await p.locator('a[href*="#/reference/hw/"]').nth(i % 6).click();
  await p.waitForSelector('canvas', { timeout: 20000 });
}
await p.goto(base + '#/learn');
await p.waitForTimeout(1500);
const hwStats = await stats();
const hwGl = await p.evaluate(() => window.__gl);
ok(hwStats.live === 0 && hwGl === 0, `hardware viewer: 20 opens, nothing left live (stages ${hwStats.live}, contexts ${hwGl})`);
const leakWarn = errors.some((e) => /Too many active WebGL contexts/.test(e));
ok(!leakWarn, 'no WebGL context leak warning');
ok(errors.length === 0, `no console errors/warnings ${errors.slice(0, 3).join(' | ')}`);
await b.close();
