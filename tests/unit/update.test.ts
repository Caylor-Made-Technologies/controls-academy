import { describe, expect, it } from 'vitest';
import { watchForUpdates } from '../../src/lib/update';

/** A tiny event target good enough for these tests. */
function target() {
  const fns = new Map<string, (() => void)[]>();
  return {
    addEventListener: (t: string, f: () => void) => { fns.set(t, [...(fns.get(t) ?? []), f]); },
    fire: (t: string) => { for (const f of fns.get(t) ?? []) f(); },
  };
}

function setup(hasController: boolean) {
  const sw = Object.assign(target(), { controller: hasController ? {} : null, updates: 0, getRegistration: async () => ({ update: async () => { sw.updates++; } }) });
  const doc = Object.assign(target(), { visibilityState: 'visible' as DocumentVisibilityState });
  const win = Object.assign(target(), { setInterval: () => 0 });
  let reloads = 0;
  watchForUpdates({ sw: sw as never, doc: doc as never, win: win as never, reload: () => { reloads++; } });
  return { sw, doc, win, reloads: () => reloads };
}

describe('installed app stays current (B-023)', () => {
  it('checks for an update when the app comes back to the screen', async () => {
    const { sw, doc } = setup(true);
    doc.fire('visibilitychange');
    await new Promise((r) => setTimeout(r, 0));
    expect(sw.updates).toBe(1);
  });
  it('reloads at the next screen change once a newer version has taken over, not before', () => {
    const { sw, win, reloads } = setup(true);
    win.fire('hashchange');
    expect(reloads()).toBe(0);
    sw.fire('controllerchange');
    expect(reloads()).toBe(0); // never in the middle of something
    win.fire('hashchange');
    expect(reloads()).toBe(1);
  });
  it('the very first install is not treated as an update', () => {
    const { sw, win, reloads } = setup(false);
    sw.fire('controllerchange');
    win.fire('hashchange');
    expect(reloads()).toBe(0);
  });
});
