import type { ReactNode } from 'react';
import { Icon, type IconName } from '../Icon';

export type CalloutTone = 'tip' | 'safety' | 'gotcha' | 'brand';
const ICON: Record<CalloutTone, IconName> = { tip: 'info', safety: 'shield', gotcha: 'warn', brand: 'book' };

/** A boxed note. `safety` is the only place safety yellow is used; `gotcha` is amber; `tip` is brand blue. */
export function Callout({ tone = 'tip', title, children, className, role }: { tone?: CalloutTone; title?: string; children: ReactNode; className?: string; role?: 'status' | 'alert' | 'note' }) {
  return (
    <div className={['callout', `callout-${tone}`, 'callout-row', className].filter(Boolean).join(' ')} role={role}>
      <Icon name={ICON[tone]} size={18} className="callout-icon" />
      <div className="min-w-0">
        {title && <p className="callout-title">{title}</p>}
        <div className="callout-body">{children}</div>
      </div>
    </div>
  );
}
