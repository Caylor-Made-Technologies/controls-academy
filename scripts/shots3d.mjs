// Same-angle renders of every 3D scene for before/after comparison and the 3D rubric review.
//   node scripts/shots3d.mjs --label before     → test-results/3d/<label>/<view>.png  (phone-size canvas, high tier)
// Needs a build served on :4180 (or SITE_URL).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const label = arg('label', 'latest');
const theme = arg('theme', 'dark');
const BASE = process.env.SITE_URL ?? 'http://localhost:4180/controls-academy/';
const VIEWS = [['sim', 'panel'], ...['vfd', 'fwdrev', 'conveyor', 'tank', 'pumps', 'datacenter', 'mixer'].map((m) => [`sim?m=${m}`, m]),
  ['reference/hw/controllogix', 'hw-controllogix'], ['reference/hw/powerflex-525', 'hw-drive'], ['reference/inside/vfd', 'inside-vfd'], ['wiring/three-wire', 'wiring'], ['troubleshoot/tk-wire', 'meter']];
const dir = `test-results/3d/${label}`;
mkdirSync(dir, { recursive: true });
const b = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce', bypassCSP: true, serviceWorkers: 'block' });
await ctx.addInitScript((t) => { localStorage.setItem('ca:prefs', JSON.stringify({ onboarded: true, quality: 'high', theme: t })); sessionStorage.setItem('ca:powered', '1'); }, theme);
const p = await ctx.newPage();
for (const [route, name] of VIEWS) {
  if (arg('only') && !name.includes(arg('only'))) continue;
  await p.goto('about:blank');
  await p.goto(`${BASE}#/${route}`);
  await p.waitForSelector('canvas', { timeout: 30000 });
  await p.waitForFunction(() => { const s = window.__ca3d.stats(); return s.live > 0 && s.stages.every((x) => x.frames > 0); }, null, { timeout: 30000 });
  await p.waitForTimeout(2500);
  const el = name === 'meter' ? p.locator('section[aria-label="Multimeter"] .panel3d-bg') : p.locator('.panel3d-bg').first();
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: `${dir}/${name}.png` });
}
await b.close();
console.log(`✓ 3D renders → ${dir}/`);
