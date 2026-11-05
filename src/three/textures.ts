/**
 * Procedural textures drawn on canvas: labels, glow halos and a brushed-metal map.
 * No downloaded images, no font CDN — everything works offline under a strict CSP.
 */
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';

const cache = new Map<string, Texture>();

export function labelTexture(text: string, opts: { fg?: string; bg?: string; size?: number; bold?: boolean; w?: number; h?: number } = {}): Texture {
  const key = JSON.stringify([text, opts]);
  const hit = cache.get(key);
  if (hit) return hit;
  const w = opts.w ?? 256;
  const h = opts.h ?? 64;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  if (opts.bg && opts.bg !== '#00000000') {
    g.fillStyle = opts.bg;
    g.beginPath();
    g.roundRect(2, 2, w - 4, h - 4, 10);
    g.fill();
  }
  g.fillStyle = opts.fg ?? '#1a2230';
  // Shrink the font until the text fits, so long platform names stay legible.
  let size = opts.size ?? 34;
  const weight = opts.bold === false ? 500 : 800;
  g.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
  while (size > 8 && g.measureText(text).width > w - 12) {
    size -= 1;
    g.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

export function haloTexture(): Texture {
  const hit = cache.get('halo');
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  cache.set('halo', t);
  return t;
}

/** Subtle brushed-steel streaks used as a roughness/color map on the enclosure. */
export function brushedTexture(): Texture {
  const hit = cache.get('brushed');
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#c4cbd3';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    const y = Math.random() * 256;
    const l = 30 + Math.random() * 140;
    const x = Math.random() * 256;
    const v = 170 + Math.floor(Math.random() * 60);
    g.strokeStyle = `rgba(${v},${v + 4},${v + 10},0.35)`;
    g.lineWidth = Math.random() * 1.2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + l, y);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  cache.set('brushed', t);
  return t;
}

/** Sealed-concrete floor: speckle plus faint slab joints. */
export function floorTexture(): Texture {
  const hit = cache.get('floor');
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#7d8693';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const v = 95 + Math.floor(Math.random() * 60);
    g.fillStyle = `rgba(${v},${v + 4},${v + 10},${0.12 + Math.random() * 0.2})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
  }
  g.strokeStyle = 'rgba(30,36,44,0.55)';
  g.lineWidth = 2;
  g.strokeRect(1, 1, 510, 510);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(4, 3);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  cache.set('floor', t);
  return t;
}

export function disposeTextures() {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}

/** Wire-label card for module doors: ruled lines with terminal numbers, like a printed I/O label. */
export function doorLabelTexture(): Texture {
  const hit = cache.get('doorlabel');
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 64, 160);
  g.strokeStyle = 'rgba(30, 40, 55, 0.35)';
  g.lineWidth = 1;
  g.fillStyle = 'rgba(30, 40, 55, 0.7)';
  g.font = '600 9px Inter, system-ui, sans-serif';
  for (let i = 0; i < 16; i++) {
    const y = 6 + i * 9.5;
    g.beginPath();
    g.moveTo(4, y + 4);
    g.lineTo(60, y + 4);
    g.stroke();
    g.fillText(String(i), 5, y + 2);
    g.fillRect(20, y - 1, 10 + ((i * 7) % 24), 2);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  cache.set('doorlabel', t);
  return t;
}
