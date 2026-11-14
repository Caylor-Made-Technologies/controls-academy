import type { ReactNode } from 'react';
import { Button } from './Button';
import type { IconName } from '../Icon';

/** Circuit-trace illustration for empty and error states (original artwork, decorative). */
function TraceArt({ broken }: { broken?: boolean }) {
  return (
    <svg className="state-art" viewBox="0 0 160 96" fill="none" aria-hidden="true" focusable="false" data-broken={broken || undefined}>
      <path className="state-trace" d="M8 72H44L60 56H88" />
      <path className="state-trace" d={broken ? 'M104 56H112L128 40H152' : 'M88 56H112L128 40H152'} />
      <path className="state-trace state-trace-2" d="M24 88H70L84 74H136" />
      <circle className="state-pad" cx="152" cy="40" r="5" />
      <circle className="state-pad" cx="136" cy="74" r="4" />
      <circle className="state-pad" cx="8" cy="72" r="4" />
      {broken && <path className="state-gap" d="M90 48l4 16M100 48l4 16" />}
    </svg>
  );
}

interface Action { label: string; href?: string; onClick?: () => void; icon?: IconName }

function StateBox({ kind, title, children, action, secondary, page }: { kind: 'empty' | 'error'; title: string; children?: ReactNode; action?: Action; secondary?: Action; page?: boolean }) {
  const Heading = page ? 'h1' : 'h2';
  return (
    <div className="state-box" role={kind === 'error' ? 'alert' : 'status'}>
      <TraceArt broken={kind === 'error'} />
      <Heading className="state-title">{title}</Heading>
      {children && <div className="state-body">{children}</div>}
      {(action || secondary) && (
        <div className="state-actions">
          {action && (action.href ? <Button variant="primary" href={action.href} icon={action.icon}>{action.label}</Button> : <Button variant="primary" onClick={action.onClick} icon={action.icon}>{action.label}</Button>)}
          {secondary && (secondary.href ? <Button href={secondary.href} icon={secondary.icon}>{secondary.label}</Button> : <Button onClick={secondary.onClick} icon={secondary.icon}>{secondary.label}</Button>)}
        </div>
      )}
    </div>
  );
}

/** Nothing here yet: say why, and offer the next step. `page` makes the title the screen's main heading. */
export function EmptyState(p: { title: string; children?: ReactNode; action?: Action; secondary?: Action; page?: boolean }) {
  return <StateBox kind="empty" {...p} />;
}

/** Something went wrong: say what, in plain words, and how to recover. */
export function ErrorState(p: { title: string; children?: ReactNode; action?: Action; secondary?: Action }) {
  return <StateBox kind="error" {...p} />;
}

/** A link that points at something that isn't there (an old bookmark, a typo): say so and offer the way back. */
export function NotFound({ what, backHref, backLabel }: { what: string; backHref: string; backLabel: string }) {
  return (
    <EmptyState page title={`${what} not found`} action={{ label: backLabel, href: backHref, icon: 'back' }}>
      The link may be old or mistyped. Nothing is lost; your progress is still on this device.
    </EmptyState>
  );
}
