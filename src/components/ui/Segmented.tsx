import type { CSSProperties, ReactNode } from 'react';

export interface SegOption<T extends string> { value: T; label: ReactNode; name?: string }

/**
 * Segmented control / tabs: pick one of a few. Buttons carry `aria-pressed`; the highlight slides to the
 * chosen one. `wrap` lets many options flow onto a second row on a phone (no sliding highlight then).
 */
export function Segmented<T extends string>({ label, options, value, onChange, wrap, className }: { label: string; options: SegOption<T>[]; value: T; onChange: (v: T) => void; wrap?: boolean; className?: string }) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className={['seg', wrap ? 'seg-wrap' : 'seg-slide', className].filter(Boolean).join(' ')} role="group" aria-label={label} style={{ '--seg-i': i, '--seg-n': options.length } as CSSProperties}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} aria-label={o.name} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}
