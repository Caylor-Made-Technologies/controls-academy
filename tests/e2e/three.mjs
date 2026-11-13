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
// Let the motor coast to a stop first: a spinning scene holds a few extra objects (arc, motion parts), and the
// memory comparison below must look at the same state both times.
await p.getByText('Motor stopped').first().waitFor({ timeout: 30000 });

// Leak test: open and close the 3D panel 20 times.
const first = await stats();
let fresh = null; // GPU counts of the first fresh mount: the same conditions as the 20th
for (let i = 0; i < 20; i++) {
  await p.getByRole('button', { name: '2D', exact: true }).click();
  await p.waitForFunction(() => window.__ca3d.stats().live === 0);
  await p.getByRole('button', { name: '3D panel' }).click();
  await p.waitForSelector('section[aria-label="3D control panel"] canvas');
  await p.waitForFunction(() => window.__ca3d.stats().live === 1);
  if (i === 2) { await p.waitForTimeout(1500); fresh = (await stats()).stages[0]; } // steady state
}
await p.waitForTimeout(1500); // R3F releases the old contexts shortly after unmount
const last = await stats();
const glLive = await p.evaluate(() => window.__gl);
ok(last.opened - first.opened === 20 && last.closed - first.closed === 20, `20 opens and 20 closes counted (${last.opened - first.opened}/${last.closed - first.closed})`);
ok(last.live === 1, `one live 3D stage after 20 cycles (found ${last.live})`);
ok(glLive <= 1, `WebGL contexts released after 20 cycles (live: ${glLive})`);
const g0 = fresh, g1 = last.stages[0];
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
// Machine scenes (3.3): each machine opens its own 3D view, live readout, no errors.
const MACHINES = ['vfd', 'fwdrev', 'conveyor', 'tank', 'pumps', 'datacenter', 'mixer'];
for (const id of MACHINES) {
  await p.goto(base + '#/sim?m=' + id);
  await p.waitForSelector('section[aria-label="3D machine view"] canvas', { timeout: 30000 });
  const ro = await p.locator('section[aria-label="3D machine view"] [role="status"]').first().textContent();
  ok(Boolean(ro && ro.length > 5), `3D ${id}: renders with live readout "${ro}"`);
}
const vMachine = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map((x) => x.id)).catch(async () => {
  await p.addScriptTag({ content: axeSrc });
  return p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map((x) => x.id));
});
ok(vMachine.length === 0, `axe clean with a machine 3D view open ${vMachine.join(', ')}`);
await p.goto(base + '#/sim?m=fwdrev');
await p.waitForSelector('section[aria-label="3D machine view"] canvas');
await p.waitForTimeout(2500);
f0 = await frames();
await p.waitForTimeout(2000);
idle = (await frames()) - f0;
ok(idle <= 4, `idle machine scene draws ≤ 4 frames in 2 s (drew ${idle})`);
await p.getByRole('button', { name: /^Forward/ }).first().click();
await p.waitForTimeout(1500);
f0 = await frames();
await p.waitForTimeout(1000);
const screwFrames = (await frames()) - f0;
ok(screwFrames >= 4, `running screw animates (${screwFrames} frames in 1 s)`);
// Leak test: 20 machine switches, each tearing down one scene and building another.
const m0 = await stats();
for (let i = 0; i < 20; i++) {
  await p.goto(base + '#/sim?m=' + MACHINES[i % MACHINES.length]);
  await p.waitForSelector('section[aria-label="3D machine view"] canvas', { timeout: 30000 });
  await p.waitForFunction(() => window.__ca3d.stats().live === 1);
}
await p.goto(base + '#/learn');
// the old page finishes its exit animation before it unmounts
await p.waitForFunction(() => window.__ca3d.stats().live === 0, null, { timeout: 10000 }).catch(() => {});
await p.waitForTimeout(1500);
const m1 = await stats();
ok(m1.live === 0 && (await p.evaluate(() => window.__gl)) === 0, `machine scenes: 20 switches, nothing left live (stages ${m1.live})`);
ok(m1.opened - m0.opened >= 20 && m1.opened === m1.closed, `every 3D stage opened this session was closed (${m1.opened} opened, ${m1.closed} closed)`);

// Wiring board and 3D meter: 20 open/close each.
await p.goto(base + '#/wiring/loop');
for (let i = 0; i < 20; i++) {
  await p.getByRole('button', { name: '3D board' }).click();
  await p.waitForFunction(() => window.__ca3d.stats().live === 1, null, { timeout: 30000 });
  await p.getByRole('button', { name: 'Terminals' }).click();
  await p.waitForFunction(() => window.__ca3d.stats().live === 0);
}
await p.goto(base + '#/troubleshoot/tk-wire');
await p.waitForSelector('section[aria-label="Multimeter"] canvas', { timeout: 30000 });
await p.waitForTimeout(500);
const withProbes = (await stats()).live;
for (let i = 0; i < 20; i++) {
  await p.getByRole('button', { name: 'Hide 3D probes' }).click();
  await p.waitForFunction((n) => window.__ca3d.stats().live === n - 1, withProbes);
  await p.getByRole('button', { name: '3D probes' }).click();
  await p.waitForFunction((n) => window.__ca3d.stats().live === n, withProbes, { timeout: 30000 });
}
await p.goto(base + '#/learn');
await p.waitForFunction(() => window.__ca3d.stats().live === 0, null, { timeout: 10000 }).catch(() => {});
await p.waitForTimeout(1500);
const w1 = await stats();
ok(w1.live === 0 && (await p.evaluate(() => window.__gl)) === 0 && w1.opened === w1.closed, `wiring board + 3D meter: 20 cycles each, nothing left live (${w1.opened} opened, ${w1.closed} closed)`);

const leakWarn = errors.some((e) => /Too many active WebGL contexts/.test(e));
ok(!leakWarn, 'no WebGL context leak warning');
ok(errors.length === 0, `no console errors/warnings ${errors.slice(0, 3).join(' | ')}`);
await b.close();
