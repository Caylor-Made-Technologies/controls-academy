import type { ReactNode } from 'react';
import { BUSINESS } from '../lib/business';
import { href } from '../lib/router';
import { Icon } from './Icon';
import { ROUTE_HEADS } from '../content/heads';

const BASE = import.meta.env.BASE_URL;

export function AppMark({ size = 32 }: { size?: number }) {
  return <img src={`${BASE}favicon.svg`} width={size} height={size} alt="" className="rounded-[22%]" />;
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex flex-col leading-none">
      <span className="font-head font-extrabold tracking-tight text-heading text-base">
        Controls <span className="grad-text">Academy</span>
      </span>
      {!compact && <span className="text-2xs font-semibold tracking-[0.14em] uppercase text-muted mt-1">by Caylor Made Technologies</span>}
    </span>
  );
}

/** Decorative circuit traces echoing the CM monogram (original artwork). */
export function Traces({ className = 'traces' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 90" fill="none" aria-hidden="true" focusable="false">
      <g strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 70 H70 L92 48 H150 L168 30 H214" stroke="url(#tg)" />
        <path d="M40 86 H96 L114 68 H190" stroke="url(#tg)" />
        <path d="M120 10 H160 L176 26" stroke="url(#tg)" />
      </g>
      <g fill="var(--cyan)">
        <circle cx="214" cy="30" r="4" /><circle cx="190" cy="68" r="4" /><circle cx="120" cy="10" r="3.5" />
      </g>
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="220" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--blue-glow)' }} stopOpacity="0.2" />
          <stop offset="1" style={{ stopColor: 'var(--cyan)' }} />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** `bare` leaves out the decorative traces (used by loading placeholders, so they don't redraw on swap). */
export function PageHead({ eyebrow, title, children, bare }: { eyebrow?: string; title: string; children?: ReactNode; bare?: boolean }) {
  return (
    <header className="page-head">
      {!bare && <Traces />}
      {eyebrow && <p className="eyebrow m-0 mb-1.5">{eyebrow}</p>}
      <h1 className="text-2xl sm:text-3xl font-extrabold">{title}</h1>
      {children && <div className="mt-2 text-muted max-w-[60ch]">{children}</div>}
    </header>
  );
}

/** The heading of a top-level screen, from the shared table (src/content/heads.ts). */
export function RouteHead({ seg, eyebrow, title, bare }: { seg: string; eyebrow?: string; title?: string; bare?: boolean }) {
  const h = ROUTE_HEADS[seg];
  return (
    <>
      {h.back && <a href={href(h.back[1])} className="btn btn-ghost btn-sm -ml-2 mb-2"><Icon name="back" size={16} /> {h.back[0]}</a>}
      <PageHead eyebrow={eyebrow ?? h.eyebrow} title={title ?? h.title} bare={bare}>{h.body}</PageHead>
    </>
  );
}

export function Disclaimer() {
  return (
    <p className="text-sm text-muted m-0">
      <strong className="text-body">Training only.</strong> Not a substitute for qualified training, manufacturer documentation, or your site's procedures. Never apply anything here to live equipment without authorization.
    </p>
  );
}

export function Footer() {
  return (
    <footer className="mt-12 border-t border-line pt-6 pb-2 text-sm text-muted space-y-3">
      <div className="flex items-center gap-3">
        <img src={`${BASE}brand/logo-mark.png`} width={40} height={40} alt="Caylor Made Technologies logo" />
        <div>
          <p className="m-0 font-head font-bold text-heading tracking-wide">CAYLOR MADE TECHNOLOGIES</p>
          <p className="m-0 grad-text font-semibold">Advanced Engineering. Built Different.</p>
        </div>
      </div>
      <Disclaimer />
      <p className="m-0">
        Not affiliated with or endorsed by Rockwell Automation, Siemens, Schneider Electric, Mitsubishi Electric, AutomationDirect, Omron, Emerson, Beckhoff, or any other manufacturer. All trademarks belong to their owners.
      </p>
      <p className="m-0">
        Built by {BUSINESS.name}, {BUSINESS.city} · <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> · <a href={BUSINESS.site} target="_blank" rel="noopener noreferrer">Website</a> · <a href={href('about')}>About &amp; privacy</a>
      </p>
    </footer>
  );
}
