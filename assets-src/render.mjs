// Renders assets-src/icon.svg to PNG icons with the pre-installed Playwright Chromium.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const svg = readFileSync(new URL('./icon.svg', import.meta.url), 'utf8');
const maskable = svg.replace('rx="112"', 'rx="0"').replace('<g fill="none" stroke-linecap="round" stroke-width="20">', '<g transform="translate(256 256) scale(0.8) translate(-256 -256)"><g fill="none" stroke-linecap="round" stroke-width="20">').replace('</svg>', '</g></svg>');
const out = new URL('../public/', import.meta.url);
writeFileSync(new URL('favicon.svg', out), svg);
const browser = await pw.chromium.launch();
const page = await browser.newPage();
async function render(src, size, file) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${src.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  writeFileSync(new URL(file, out), await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } }));
}
await render(svg, 512, 'icon-512.png');
await render(svg, 192, 'icon-192.png');
await render(svg, 180, 'apple-touch-icon.png');
await render(svg, 32, 'favicon-32.png');
await render(svg, 96, 'brand/app-mark.png');
await render(maskable, 512, 'icon-maskable-512.png');
await browser.close();
console.log('icons written');
