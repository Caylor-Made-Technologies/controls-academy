import type { ReactNode } from 'react';
import { Icon, type IconName } from '../Icon';

export type Tone = 'neutral' | 'live' | 'warn' | 'alarm' | 'blue' | 'safety';

/** A small status label. `onClick` or `href` makes it a 44 px control; `pressed` marks the chosen filter. */
export function Chip({ tone = 'neutral', icon, children, href, onClick, pressed, className, label }: { tone?: Tone; icon?: IconName; children: ReactNode; href?: string; onClick?: () => void; pressed?: boolean; className?: string; label?: string }) {
  const c = ['chip', tone !== 'neutral' && `chip-${tone}`, (href || onClick) && 'chip-action', className].filter(Boolean).join(' ');
  const inner = <>{icon && <Icon name={icon} size={14} />}{children}</>;
  if (href) return <a className={c} href={href} aria-label={label}>{inner}</a>;
  if (onClick) return <button type="button" className={c} onClick={onClick} aria-pressed={pressed} aria-label={label}>{inner}</button>;
  return <span className={c} aria-label={label}>{inner}</span>;
}
