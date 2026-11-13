import type { ReactNode } from 'react';
import { Icon, type IconName } from '../Icon';

/** A full-width row that goes somewhere or does something: leading icon, title, optional detail, trailing mark. */
export function ListRow({ href, onClick, icon, lead, title, detail, trail, done, className }: { href?: string; onClick?: () => void; icon?: IconName; lead?: ReactNode; title: ReactNode; detail?: ReactNode; trail?: ReactNode; done?: boolean; className?: string }) {
  const inner = (
    <>
      {(lead || icon) && <span className="row-lead" data-done={done || undefined}>{lead ?? <Icon name={icon!} size={18} />}</span>}
      <span className="row-text"><span className="row-title">{title}</span>{detail && <span className="row-detail">{detail}</span>}</span>
      <span className="row-trail">{trail ?? ((href || onClick) && <Icon name="chevron" size={16} />)}</span>
    </>
  );
  const c = ['row', className].filter(Boolean).join(' ');
  if (href) return <a className={c} href={href}>{inner}</a>;
  if (onClick) return <button type="button" className={c} onClick={onClick}>{inner}</button>;
  return <div className={c}>{inner}</div>;
}
