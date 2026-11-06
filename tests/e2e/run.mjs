// E2E gate: serves dist/, visits every section on phone + desktop, fails on console errors or axe violations,
// and saves screenshots to test-results/. Usage: npm run build && npm run e2e
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const axeSrc = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const ROOT = new URL('../../dist/', import.meta.url).pathname;
const BASE = '/controls-academy/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.txt': 'text/plain', '.ico': 'image/x-icon' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (!p.startsWith(BASE)) { res.writeHead(302, { Location: BASE }); return res.end(); }
  p = normalize(join(ROOT, p.slice(BASE.length)));
  if (!p.startsWith(ROOT) || !existsSync(p) || statSync(p).isDirectory()) p = join(ROOT, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
const LIVE = process.env.SITE_URL;
if (!LIVE) await new Promise((r) => server.listen(4179, r));
const url = LIVE ?? `http://localhost:4179${BASE}`;
mkdirSync('test-results', { recursive: true });

const ROUTES = ['learn', 'skills', 'exam', 'exam/readiness', 'summary', 'summary/t0', 'lesson/z-series-parallel', 'lesson/three-wire', 'lesson/sinking-sourcing', 'sim', 'troubleshoot', 'reference', 'reference/brand/rockwell', 'reference/hardware', 'reference/hw/controllogix', 'reference/instructions', 'reference/glossary', 'profile', 'about', 'review', 'sim?m=tank', 'sim?m=datacenter', 'sim?m=vfd', 'troubleshoot/mx-dc'];
const VIEWPORTS = [{ name: 'phone', width: 375, height: 812, scale: 2 }, { name: 'desktop', width: 1440, height: 900, scale: 1 }];
const only = process.argv[2];
let failures = 0;
const browser = await pw.chromium.launch();
for (const theme of ['dark', 'light']) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ bypassCSP: true, viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: theme === 'dark' ? vp.scale : 1, reducedMotion: 'reduce' });
    await ctx.addInitScript((t) => {
      localStorage.setItem('ca:prefs', JSON.stringify({ onboarded: true, theme: t, skin: 'ab-logix', goal: 'maintenance', name: '' }));
    }, theme);
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    for (const r of ROUTES) {
      if (only && !r.includes(only)) continue;
      await page.goto(`${url}#/${r}`);
      await page.waitForSelector('main#main h1', { timeout: 10000 });
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 0) { failures++; console.log(`✗ ${theme}/${vp.name} ${r}: horizontal overflow ${overflow}px`); }
      await page.addScriptTag({ content: axeSrc });
      const res = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`));
      if (res.length) { failures += res.length; console.log(`✗ ${theme}/${vp.name} ${r} axe:\n  ${res.join('\n  ')}`); }
      if (theme === 'dark' || r === 'learn' || r === 'sim') await page.screenshot({ path: `test-results/${theme}-${vp.name}-${r.replace(/\//g, '_')}.png`, fullPage: vp.name === 'phone' && theme === 'dark' });
    }
    if (errors.length) { failures += errors.length; console.log(`✗ ${theme}/${vp.name} console:\n  ${[...new Set(errors)].join('\n  ')}`); }
    await ctx.close();
  }
}
await browser.close();
if (!LIVE) server.close();
console.log(failures ? `\n${failures} problem(s)` : '\n✓ all routes clean: no console errors, axe 0, no horizontal overflow');
process.exit(failures ? 1 : 0);
