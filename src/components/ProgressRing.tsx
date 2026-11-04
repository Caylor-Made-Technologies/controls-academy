import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

export function ProgressRing({ pct, size = 56, stroke = 6, live = false, children, label }: { pct: number; size?: number; stroke?: number; live?: boolean; children?: ReactNode; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const reduce = useReducedMotion();
  const p = Math.max(0, Math.min(1, pct));
  return (
    <div className="relative inline-flex items-center justify-center flex-none" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(p * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={`rg-${live ? 'l' : 'b'}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={live ? '#3ddc97' : '#3d8bff'} />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeLinecap="round" strokeWidth={stroke}
          stroke={`url(#rg-${live ? 'l' : 'b'})`} strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - p) : c }}
          animate={{ strokeDashoffset: c * (1 - p) }}
          transition={{ duration: reduce ? 0 : 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[0.72rem] font-bold text-heading">{children}</div>
    </div>
  );
}
