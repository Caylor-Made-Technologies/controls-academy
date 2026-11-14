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

let users = 0;
/**
 * The texture cache is shared by every 3D view. A view calls this when it mounts and the returned
 * function when it unmounts; textures are freed only when the last view is gone. (A page transition
 * mounts the next view before the previous one unmounts, so freeing on every unmount blanked labels.)
 */
export function retainTextures(): () => void {
  users++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    users = Math.max(0, users - 1);
    if (users === 0) disposeTextures();
  };
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

/** A generic HMI overview screen (original artwork): header, status tiles, a level bar and an alarm banner. */
export function hmiTexture(aspect: number): Texture {
  const key = `hmi${aspect.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 512;
  const H = Math.round(W / aspect);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const font = (px: number, w = 700) => `${w} ${px}px Inter, system-ui, sans-serif`;
  g.fillStyle = '#0d1622';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#16324f';
  g.fillRect(0, 0, W, H * 0.12);
  g.fillStyle = '#dbe8ff';
  g.font = font(H * 0.06);
  g.textBaseline = 'middle';
  g.fillText('LINE 1 — OVERVIEW', 14, H * 0.06);
  g.textAlign = 'right';
  g.fillText('07:42', W - 14, H * 0.06);
  g.textAlign = 'left';
  const tile = (x: number, y: number, w: number, h: number, title: string, state: string, color: string) => {
    g.fillStyle = '#132236';
    g.beginPath();
    g.roundRect(x, y, w, h, 10);
    g.fill();
    g.fillStyle = color;
    g.beginPath();
    g.arc(x + 20, y + h / 2, Math.min(10, h * 0.16), 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#e8f1ff';
    g.font = font(h * 0.22);
    g.fillText(title, x + 40, y + h * 0.36);
    g.fillStyle = color;
    g.font = font(h * 0.2, 800);
    g.fillText(state, x + 40, y + h * 0.68);
  };
  const th = H * 0.2;
  tile(12, H * 0.16, W * 0.46, th, 'CONVEYOR 1', 'RUNNING', '#3ddc97');
  tile(W * 0.52, H * 0.16, W * 0.46, th, 'PUMP 2', 'STOPPED', '#94a3b8');
  tile(12, H * 0.4, W * 0.46, th, 'MIXER', 'RUNNING', '#3ddc97');
  // level bar
  const bx = W * 0.52;
  const by = H * 0.4;
  g.fillStyle = '#132236';
  g.beginPath();
  g.roundRect(bx, by, W * 0.46, th, 10);
  g.fill();
  g.fillStyle = '#e8f1ff';
  g.font = font(th * 0.22);
  g.fillText('TANK LEVEL  62 %', bx + 14, by + th * 0.3);
  g.fillStyle = '#0b1420';
  g.fillRect(bx + 14, by + th * 0.55, W * 0.46 - 28, th * 0.25);
  g.fillStyle = '#22d3ee';
  g.fillRect(bx + 14, by + th * 0.55, (W * 0.46 - 28) * 0.62, th * 0.25);
  // alarm banner
  g.fillStyle = '#5a3d0c';
  g.fillRect(0, H * 0.66, W, H * 0.12);
  g.fillStyle = '#ffb547';
  g.font = font(H * 0.055, 800);
  g.fillText('ALARM  Low air pressure — press ACK', 14, H * 0.72);
  // buttons
  ['START', 'STOP', 'RESET', 'ALARMS'].forEach((b, i) => {
    const w = (W - 60) / 4;
    const x = 12 + i * (w + 12);
    g.fillStyle = i === 1 ? '#7a1f1f' : i === 0 ? '#145c3e' : '#173253';
    g.beginPath();
    g.roundRect(x, H * 0.82, w, H * 0.13, 8);
    g.fill();
    g.fillStyle = '#e8f1ff';
    g.font = font(H * 0.05, 800);
    g.textAlign = 'center';
    g.fillText(b, x + w / 2, H * 0.885);
    g.textAlign = 'left';
  });
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/** How many procedural textures are cached (leak test reads this). */
export function textureCacheSize(): number {
  return cache.size;
}

/** Front of a server rack: rows of 1U/2U server faces with drive bays and a few status LEDs. One texture, shared. */
export function rackFrontTexture(): Texture {
  const hit = cache.get('rack');
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0b0f14';
  g.fillRect(0, 0, 128, 512);
  let y = 10;
  let i = 0;
  while (y < 490) {
    const h = i % 4 === 3 ? 34 : 17;
    g.fillStyle = i % 2 ? '#1b2330' : '#202a39';
    g.fillRect(8, y, 112, h - 3);
    // drive bays
    g.fillStyle = '#0f151d';
    for (let x = 14; x < 84; x += 10) g.fillRect(x, y + 3, 7, h - 9);
    // status LEDs: mostly green, the odd amber one
    g.fillStyle = i % 7 === 5 ? '#ffb547' : '#3ddc97';
    g.fillRect(100, y + 4, 4, 4);
    g.fillStyle = '#3d8bff';
    g.fillRect(108, y + 4, 4, 4);
    y += h;
    i++;
  }
  g.strokeStyle = '#3a4558';
  g.lineWidth = 4;
  g.strokeRect(2, 2, 124, 508);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  cache.set('rack', t);
  return t;
}
