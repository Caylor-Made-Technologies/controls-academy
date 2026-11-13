// Screenshots of every route in the router (src/routes.json), light and dark.
//   npm run shots                 375 px → docs/screens/latest/
//   npm run shots -- --grid       320 / 375 / 768 / 1440 px
//   npm run shots -- --label v0.9.0 --only sim
// Needs a build being served: `npm run build && npx vite preview --port 4180` (or set SITE_URL).
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }

const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : null; };
const GRID = process.argv.includes('--grid');
const label = arg('label') ?? 'latest';
const only = arg('only');
const BASE = process.env.SITE_URL ?? 'http://localhost:4180/controls-academy/';
const routes = Object.values(JSON.parse(readFileSync(new URL('../src/routes.json', import.meta.url), 'utf8'))).flatMap((r) => r.samples).filter((r) => !only || r.includes(only));
const widths = GRID ? [320, 375, 768, 1440] : [375];
const dir = `docs/screens/${label}`;
mkdirSync(dir, { recursive: true });

const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let n = 0;
const failed = [];
for (const theme of ['dark', 'light']) {
  for (const width of widths) {
    const ctx = await browser.newContext({ viewport: { width, height: width >= 1440 ? 900 : width >= 768 ? 1024 : 812 }, deviceScaleFactor: width <= 375 ? 2 : 1, reducedMotion: 'reduce', bypassCSP: true });
    await ctx.addInitScript((t) => {
      localStorage.setItem('ca:prefs', JSON.stringify({ onboarded: true, theme: t, skin: 'ab-logix', goal: 'maintenance', name: '' }));
      sessionStorage.setItem('ca:powered', '1');
    }, theme);
    const page = await ctx.newPage();
    for (const r of routes) {
      await page.goto(`${BASE}#/${r}`);
      await page.waitForSelector('main#main h1', { timeout: 15000 });
      // Give lazy 3D a moment to draw its first frame; pages without 3D just wait briefly.
      await page.waitForFunction(() => !window.__ca3d || window.__ca3d.stats().stages.every((s) => s.frames > 0), null, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(700);
      // Animations are frozen for the capture; a route that still can't be captured is reported, not fatal.
      try {
        await page.screenshot({ path: `${dir}/${r.replace(/[/?=]/g, '_')}-${width}-${theme}.png`, fullPage: width <= 375, animations: 'disabled', timeout: 60000 });
        n++;
      } catch (e) {
        failed.push(`${r} @${width} ${theme}: ${String(e.message).split('\n')[0]}`);
      }
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`${failed.length ? '✗' : '✓'} ${n} screenshots → ${dir}/`);
for (const f of failed) console.log(`  not captured: ${f}`);
process.exit(failed.length ? 1 : 0);
