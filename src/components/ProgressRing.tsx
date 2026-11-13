import { useEffect, useState, type ReactNode } from 'react';

/** Circular progress. The arc sweeps to its value on mount (a CSS transition; instant with reduced motion). */
export function ProgressRing({ pct, size = 56, stroke = 6, live = false, children, label }: { pct: number; size?: number; stroke?: number; live?: boolean; children?: ReactNode; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  const [drawn, setDrawn] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setDrawn(true)); return () => cancelAnimationFrame(id); }, []);
  return (
    <div className="relative inline-flex items-center justify-center flex-none" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(p * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeLinecap="round" strokeWidth={stroke}
          className={`ring-arc ${live ? 'ring-live' : ''}`} strokeDasharray={c} strokeDashoffset={drawn ? c * (1 - p) : c}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-heading">{children}</div>
    </div>
  );
}
