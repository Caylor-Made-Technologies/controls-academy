/**
 * Durable storage: IndexedDB via idb-keyval, falling back to localStorage, then to memory.
 * Every read and write is wrapped so private mode or blocked storage never breaks the app.
 */
import { get, set, del } from 'idb-keyval';

const PREFIX = 'ca:';
const memory = new Map<string, string>();

export async function load<T>(key: string): Promise<T | undefined> {
  // localStorage first: save() writes it synchronously before IndexedDB, so it is never older (B-013).
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw != null) return JSON.parse(raw) as T;
  } catch {
    /* localStorage unavailable or unreadable */
  }
  try {
    const v = await get(PREFIX + key);
    if (v !== undefined) return v as T;
  } catch {
    /* IndexedDB unavailable */
  }
  const m = memory.get(key);
  return m ? (JSON.parse(m) as T) : undefined;
}

export async function save<T>(key: string, value: T): Promise<void> {
  const json = JSON.stringify(value);
  memory.set(key, json);
  // The synchronous copy first: if the page is reloaded or closed before IndexedDB finishes, the change still
  // survives (B-013: a tick followed by a quick reload could be lost).
  try {
    localStorage.setItem(PREFIX + key, json);
  } catch {
    // Quota or blocked: drop any older copy so load() can't return it instead of the IndexedDB value.
    try { localStorage.removeItem(PREFIX + key); } catch { /* blocked */ }
  }
  try {
    await set(PREFIX + key, value);
  } catch {
    /* IndexedDB unavailable: the localStorage copy stands */
  }
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
