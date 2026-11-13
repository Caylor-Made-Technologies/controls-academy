// Static server for dist/ that gzips text like GitHub Pages does, so local Lighthouse numbers are comparable
// with the live site (vite preview sends files uncompressed).  node scripts/serve.mjs [port]
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = new URL('../dist/', import.meta.url).pathname;
const BASE = '/controls-academy/';
const PORT = Number(process.argv[2] ?? 4181);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.txt': 'text/plain', '.ico': 'image/x-icon' };
const cache = new Map();
createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (!p.startsWith(BASE)) { res.writeHead(302, { Location: BASE }); return res.end(); }
  p = normalize(join(ROOT, p.slice(BASE.length)));
  if (!p.startsWith(ROOT) || !existsSync(p) || statSync(p).isDirectory()) p = join(ROOT, 'index.html');
  const ext = extname(p);
  const zip = /\.(html|js|css|svg|json|webmanifest|txt)$/.test(ext) && /gzip/.test(req.headers['accept-encoding'] ?? '');
  const key = p + zip;
  if (!cache.has(key)) cache.set(key, zip ? gzipSync(readFileSync(p)) : readFileSync(p));
  res.writeHead(200, { 'Content-Type': TYPES[ext] ?? 'application/octet-stream', 'Cache-Control': 'max-age=600', ...(zip ? { 'Content-Encoding': 'gzip' } : {}) });
  res.end(cache.get(key));
}).listen(PORT, () => console.log(`dist/ on http://localhost:${PORT}${BASE} (gzip)`));
