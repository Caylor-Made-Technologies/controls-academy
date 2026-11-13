/**
 * Flat front view of a hardware-library model, drawn as SVG from the same parametric shape as the
 * 3D model. Used for list thumbnails and as the no-WebGL / "2D only" view.
 */
import { useId } from 'react';
import { BODY_COLORS, type HwModel } from '../content/hardware';
import { PAL } from '../three/palette';

export function HwFront({ model, selected, onSelect, className, title }: { model: HwModel; selected?: number | null; onSelect?: (i: number) => void; className?: string; title?: string }) {
  const { shape } = model;
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const col = BODY_COLORS[shape.body];
  const pad = shape.mount === 'chassis' ? 8 : 6;
  let x = pad;
  const units = shape.units.map((u, i) => {
    const it = { u, i, x, w: u.w, h: u.h ?? shape.h };
    x += u.w + 0.6;
    return it;
  });
  const W = x + pad;
  const H = shape.h + pad * 2 + (shape.mount === 'panel' ? 0 : 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} {...(title === '' ? { 'aria-hidden': true } : { role: 'img', 'aria-label': title ?? `Front view of ${model.name}` })} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`b${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PAL.white} stopOpacity="0.16" />
          <stop offset="0.5" stopColor={PAL.white} stopOpacity="0" />
          <stop offset="1" stopColor={PAL.black} stopOpacity="0.22" />
        </linearGradient>
      </defs>
      {shape.mount === 'din' && <rect x={2} y={H / 2 - 17.5} width={W - 4} height={35} rx={2} fill={PAL.dinRail} opacity={0.7} />}
      {(shape.mount === 'plate' || shape.mount === 'panel') && <rect x={1} y={1} width={W - 2} height={H - 2} rx={3} fill={shape.mount === 'plate' ? PAL.backplate : PAL.panelPlate} opacity={0.35} />}
      {shape.mount === 'chassis' && <rect x={2} y={2} width={W - 4} height={H - 4} rx={3} fill={PAL.chassis} />}
      {units.map(({ u, i, x: ux, w, h }) => {
        const y = (H - h) / 2;
        const sel = selected === i;
        const leds = (u.inputs ?? 0) + (u.outputs ?? 0);
        return (
          <g key={i} onClick={onSelect ? () => onSelect(i) : undefined} style={onSelect ? { cursor: 'pointer' } : undefined}>
            <rect x={ux} y={y} width={w} height={h} rx={u.kind === 'hmi' ? 4 : 1.5} fill={u.kind === 'blank' ? col.face : col.body} stroke={sel ? PAL.select : PAL.outline} strokeWidth={sel ? 2 : 0.6} />
            <rect x={ux} y={y} width={w} height={h} rx={u.kind === 'hmi' ? 4 : 1.5} fill={`url(#b${gid})`} pointerEvents="none" />
            {u.kind === 'drive' && (
              <g>
                <rect x={ux + w * 0.19} y={y + h * 0.12} width={w * 0.62} height={h * 0.28} rx={3} fill={PAL.keypadBezel} />
                <rect x={ux + w * 0.25} y={y + h * 0.15} width={w * 0.5} height={h * 0.07} rx={1} fill={PAL.lcdGreen} />
                <circle cx={ux + w * 0.32} cy={y + h * 0.33} r={Math.min(4, w * 0.05)} fill={PAL.keyRun} />
                <circle cx={ux + w * 0.68} cy={y + h * 0.33} r={Math.min(4, w * 0.05)} fill={PAL.keyStop} />
                <rect x={ux + w * 0.2} y={y + h * 0.47} width={w * 0.6} height={6} fill={PAL.warningLabel} />
                <rect x={ux + w * 0.05} y={y + h * 0.62} width={w * 0.9} height={h * 0.34} rx={2} fill={PAL.terminalCover} />
              </g>
            )}
            {u.kind === 'relay' && [0, 1].map((k) => <circle key={k} cx={ux + w / 2} cy={y + h * 0.58 + k * 14} r={Math.min(5, w * 0.22)} fill={PAL.relayWindow} />)}
            {u.kind === 'hmi' && <rect x={ux + w * 0.07} y={y + h * 0.12} width={w * 0.86} height={h * 0.76} rx={2} fill={PAL.hmiGlass} />}
            {u.label && u.kind !== 'hmi' && w >= 12 && (
              <text x={ux + w / 2} y={y + (u.term === 'top-bottom' ? 19 : 9)} fontSize={Math.min(6, w / 4)} textAnchor="middle" fill={u.kind === 'safety' ? PAL.safetyText : col.text} fontWeight={700} fontFamily="Inter, system-ui, sans-serif">{w < 20 ? u.label.split(' ')[0] : u.label}</text>
            )}
            {u.term === 'top-bottom' && [y + 1.5, y + h - 11.5].map((ty) => <rect key={ty} x={ux + w * 0.02} y={ty} width={w * 0.96} height={10} fill={u.door ? PAL.terminalDoor : PAL.terminalBlock} />)}
            {u.term === 'front' && !u.door && <rect x={ux + w * 0.05} y={y + h * 0.36} width={w * 0.9} height={h * 0.5} fill={PAL.terminalBlock} />}
            {u.door && u.term !== 'top-bottom' && <rect x={ux + w * 0.05} y={y + h * 0.32} width={w * 0.9} height={h * 0.62} rx={1} fill={col.face} stroke={PAL.outlineSoft} strokeWidth={0.5} />}
            {u.term === 'spring' && Array.from({ length: 6 }, (_, r) => <rect key={r} x={ux + w * 0.25} y={y + h * 0.48 + r * 7} width={w * 0.5} height={3} fill={PAL.springClamp} />)}
            {u.screen && u.kind !== 'hmi' && <rect x={ux + w * 0.15} y={y + h * (u.screen === 'touch' ? 0.25 : 0.2)} width={w * 0.7} height={u.screen === 'touch' ? 26 : 7} rx={1} fill={u.screen === 'lcd' ? PAL.lcdPale : PAL.screenOff} />}
            {leds > 0 && Array.from({ length: Math.min(leds, 32) }, (_, k) => {
              const cols = w >= 30 ? 2 : 1;
              const brick = u.kind === 'brick' || u.kind === 'logic' || u.kind === 'bas';
              const nIn = u.inputs ?? 0;
              const j = k < nIn ? k : k - nIn;
              const n = k < nIn ? nIn : leds - nIn;
              const step = Math.min(3.6, (w * 0.8) / Math.max(1, n));
              const cx = brick ? ux + w / 2 - (n * step) / 2 + (j + 0.5) * step : ux + w / 2 + (cols === 2 ? ((k % 2) - 0.5) * 7 : 0);
              const cy = brick ? y + (k < (u.inputs ?? 0) ? 25 : h - 25) : y + 16 + Math.floor(k / cols) * 4;
              return <circle key={k} cx={cx} cy={cy} r={1.2} fill={k < (u.inputs ?? 0) ? PAL.ledInput : PAL.ledOutput} opacity={k % 3 === 0 ? 1 : 0.35} />;
            })}
          </g>
        );
      })}
    </svg>
  );
}
