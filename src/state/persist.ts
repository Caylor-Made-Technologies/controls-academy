/**
 * Durable storage: IndexedDB via idb-keyval, falling back to localStorage, then to memory.
 * Every read and write is wrapped so private mode or blocked storage never breaks the app.
 */
import { get, set, del } from 'idb-keyval';

const PREFIX = 'ca:';
const memory = new Map<string, string>();

export async function load<T>(key: string): Promise<T | undefined> {
  try {
    const v = await get(PREFIX + key);
    if (v !== undefined) return v as T;
  } catch {
    /* IndexedDB unavailable */
  }
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw != null) return JSON.parse(raw) as T;
  } catch {
    /* localStorage unavailable */
  }
  const m = memory.get(key);
  return m ? (JSON.parse(m) as T) : undefined;
}

export async function save<T>(key: string, value: T): Promise<void> {
  const json = JSON.stringify(value);
  memory.set(key, json);
  let ok = false;
  try {
    await set(PREFIX + key, value);
    ok = true;
  } catch {
    /* fall through */
  }
  try {
    localStorage.setItem(PREFIX + key, json);
    ok = true;
  } catch {
    /* quota or blocked */
  }
  void ok;
}

export async function remove(key: string): Promise<void> {
  memory.delete(key);
  try { await del(PREFIX + key); } catch { /* ignore */ }
  try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
}

/** Debounced saver so rapid edits don't hammer storage. */
export function debouncedSaver<T>(key: string, ms = 250): (v: T) => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  let last: T;
  return (v: T) => {
    last = v;
    if (t) clearTimeout(t);
    t = setTimeout(() => void save(key, last), ms);
  };
}
