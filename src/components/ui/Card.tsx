import type { CSSProperties, ElementType, ReactNode } from 'react';

/**
 * The one surface. `href` makes the whole card a link (with press and hover feedback); `glow` marks the one
 * recommended thing on a screen; `tone` outlines it in a state color.
 */
export function Card({ as, href, pad = true, glow, tone, className, style, children, ...rest }: { as?: ElementType; href?: string; pad?: boolean; glow?: boolean; tone?: 'live' | 'warn' | 'alarm' | 'safety'; className?: string; style?: CSSProperties; children: ReactNode } & Record<string, unknown>) {
  const Tag: ElementType = href ? 'a' : as ?? 'section';
  const c = ['card', pad && 'card-pad', href && 'card-link', glow && 'card-glow', tone && `card-${tone}`, className].filter(Boolean).join(' ');
  return <Tag className={c} href={href} style={style} {...rest}>{children}</Tag>;
}
