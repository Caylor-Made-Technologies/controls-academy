/**
 * Keeps an installed copy of the app current (B-023).
 *
 * An app added to an iPhone home screen is usually resumed, not reloaded, so it can keep running an old copy
 * for weeks even though the service worker has a newer one. This asks the service worker to check for an update
 * whenever the app comes back to the screen (and hourly while open). When a newer version has taken over, the
 * page reloads at the next screen change: that's a moment when nothing is half-done, and progress is saved on
 * the device anyway.
 */
interface SWContainer extends EventTarget { getRegistration(): Promise<{ update(): Promise<unknown> } | undefined>; controller: unknown }
export interface UpdateEnv {
  sw?: SWContainer;
  doc: Pick<Document, 'visibilityState' | 'addEventListener'>;
  win: Pick<Window, 'addEventListener' | 'setInterval'>;
  reload: () => void;
}

export function watchForUpdates(env: UpdateEnv): void {
  const { sw, doc, win, reload } = env;
  if (!sw) return;
  const check = () => { sw.getRegistration().then((r) => r?.update()).catch(() => undefined); };
  doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible') check(); });
  win.setInterval(check, 60 * 60 * 1000);
  // The first install also fires this (no controller before it); only a replacement means a new version.
  let hadController = Boolean(sw.controller);
  let newVersion = false;
  sw.addEventListener('controllerchange', () => {
    if (hadController) newVersion = true;
    hadController = true;
  });
  win.addEventListener('hashchange', () => { if (newVersion) reload(); });
}

export function startUpdateWatcher(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    watchForUpdates({ sw: navigator.serviceWorker as unknown as SWContainer, doc: document, win: window, reload: () => window.location.reload() });
  } catch { /* never let this break the app */ }
}
