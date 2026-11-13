import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '../Icon';

type Variant = 'default' | 'primary' | 'ghost' | 'danger';
interface Common { variant?: Variant; size?: 'md' | 'sm'; icon?: IconName; iconEnd?: IconName; children?: ReactNode; className?: string }

function cls(variant: Variant, size: 'md' | 'sm', iconOnly: boolean, extra?: string) {
  return ['btn', variant !== 'default' && `btn-${variant}`, size === 'sm' && 'btn-sm', iconOnly && 'icon-btn', extra].filter(Boolean).join(' ');
}

/**
 * The one button. Give it `href` and it is a link that looks like a button. An icon-only button must have an
 * `aria-label`. Every size is at least 44 px tall.
 */
export function Button(props: Common & ({ href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'> | { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>)) {
  const { variant = 'default', size = 'md', icon, iconEnd, children, className, ...rest } = props;
  const px = size === 'sm' ? 16 : 18;
  const inner = <>{icon && <Icon name={icon} size={children ? px : 22} />}{children}{iconEnd && <Icon name={iconEnd} size={px} />}</>;
  const c = cls(variant, size, !children, className);
  if (rest.href !== undefined) return <a className={c} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>{inner}</a>;
  return <button type="button" className={c} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>{inner}</button>;
}
