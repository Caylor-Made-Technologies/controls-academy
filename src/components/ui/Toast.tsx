import { useEffect, useSyncExternalStore } from 'react';
import { Icon } from '../Icon';

export interface ToastItem { id: number; text: string; tone: 'info' | 'live' | 'warn' | 'alarm' }

let items: ToastItem[] = [];
let nextId = 1;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

/** Show a short message at the bottom of the screen. It leaves by itself; it never holds the only copy of important information. */
export function toast(text: string, tone: ToastItem['tone'] = 'info', ms = 3600): void {
  const id = nextId++;
  items = [...items.slice(-2), { id, text, tone }];
  emit();
  setTimeout(() => dismissToast(id), ms);
}
export function dismissToast(id: number): void {
  if (!items.some((t) => t.id === id)) return;
  items = items.filter((t) => t.id !== id);
  emit();
}

const ICONS = { info: 'info', live: 'check', warn: 'warn', alarm: 'x' } as const;

/** Mounted once in the app shell. A polite live region, so screen readers hear each message. */
export function Toaster() {
  const list = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => items, () => items);
  useEffect(() => () => { items = []; }, []);
  return (
    <div className="toaster" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`} data-enter="rise">
          <Icon name={ICONS[t.tone]} size={18} className="toast-icon" />
          <span className="toast-text">{t.text}</span>
          <button type="button" className="toast-close" onClick={() => dismissToast(t.id)} aria-label="Dismiss message"><Icon name="x" size={16} /></button>
        </div>
      ))}
    </div>
  );
}
