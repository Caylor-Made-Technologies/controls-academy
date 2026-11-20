/* global localStorage, sessionStorage, window */
// README images and the demo animation, from a served build (node scripts/serve.mjs 4180).
//   node scripts/readme-media.mjs   → docs/readme/*.webp (stills and the demo animation) (via scripts/anim.py)
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const { chromium } = pw;

const BASE = process.env.SITE_URL ?? 'http://localhost:4180/controls-academy/';
const OUT = 'docs/readme';
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const ctxFor = async (w, h, prefs = {}) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  await ctx.addInitScript((p) => { localStorage.setItem('ca:prefs', JSON.stringify({ onboarded: true, ...p })); sessionStorage.setItem('ca:powered', '1'); }, prefs);
  return ctx;
};
const shot = async (route, file, { w = 390, h = 844, prefs, wait = 1500, act } = {}) => {
  const ctx = await ctxFor(w, h, prefs);
  const p = await ctx.newPage();
  await p.goto(BASE + '#/' + route);
  await p.waitForSelector('main#main h1', { timeout: 20000 });
  if (act) await act(p);
  await p.waitForTimeout(wait);
  await p.screenshot({ path: `${OUT}/${file}`, animations: 'disabled' });
  await ctx.close();
};

await shot('learn', 'learn-phone.png');
await shot('sim', 'sim-desktop.png', { w: 1440, h: 900, prefs: { quality: 'high' }, wait: 4000, act: async (p) => { await p.getByRole('button', { name: /^Start/ }).first().click(); await p.waitForTimeout(500); await p.evaluate(() => window.scrollTo(0, 0)); } });
await shot('troubleshoot/mx-dc', 'hunt-phone.png', { prefs: { quality: '2d' } });
await shot('reference/device/estop', 'device-phone.png', { prefs: { quality: 'high' }, wait: 4000 });
await shot('lesson/three-wire', 'lesson-phone.png', { prefs: { quality: '2d' } });

// Demo: press Start, the logic seals in, the motor runs in 3D; press Stop. Desktop layout, where the 3D panel,
// the buttons and the ladder are on screen together.
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
await ctx.addInitScript(() => { localStorage.setItem('ca:prefs', JSON.stringify({ onboarded: true, quality: 'high' })); sessionStorage.setItem('ca:powered', '1'); });
const p = await ctx.newPage();
await p.goto(BASE + '#/sim');
await p.waitForSelector('section[aria-label="3D control panel"] canvas', { timeout: 30000 });
await p.waitForTimeout(3000);
await p.evaluate(() => window.scrollTo(0, 140));
await p.waitForTimeout(1500);
const frames = `${OUT}/.frames`;
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });
let n = 0;
const grab = async (count, gap = 120) => { for (let i = 0; i < count; i++) { await p.screenshot({ path: `${frames}/${String(n++).padStart(3, '0')}.png` }); await p.waitForTimeout(gap); } };
await grab(4);
await p.getByRole('button', { name: /^Start/ }).first().click();
await grab(16);
await p.getByRole('button', { name: /^Stop/ }).first().click();
await grab(10);
await ctx.close();
await b.close();
execFileSync('python3', ['scripts/anim.py', frames, `${OUT}/demo.webp`], { stdio: 'inherit' });
// Stills as WebP too (a quarter of the PNG size).
execFileSync('python3', ['-c', "import glob,os\nfrom PIL import Image\nfor f in glob.glob('docs/readme/*.png'):\n    Image.open(f).convert('RGB').save(f[:-4]+'.webp', quality=80, method=6); os.remove(f)"], { stdio: 'inherit' });
rmSync(frames, { recursive: true, force: true });
console.log(`✓ README media → ${OUT}/`);
