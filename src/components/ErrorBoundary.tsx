import { Component, type ErrorInfo, type ReactNode } from 'react';
import { href } from '../lib/router';
import { ErrorState } from './ui/States';

/** Did a lazy-loaded piece of the app fail to download (offline, or a new version replaced the file)? */
export function isChunkError(e: unknown): boolean {
  const msg = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  return /dynamically imported module|module script failed|Loading chunk|ChunkLoadError|Unable to preload|Failed to fetch/i.test(msg);
}

/**
 * Catches a crash or a failed download on one screen and offers a way back, instead of a blank page.
 * `resetKey` (the route) clears the error when the person navigates somewhere else.
 */
export class ErrorBoundary extends Component<{ resetKey: string; children: ReactNode }, { error: unknown; key: string }> {
  state = { error: null as unknown, key: this.props.resetKey };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  static getDerivedStateFromProps(props: { resetKey: string }, state: { error: unknown; key: string }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(_error: unknown, _info: ErrorInfo) {
    // Nothing is reported anywhere: the app makes no network calls. The message on screen is the report.
  }

  render() {
    if (!this.state.error) return this.props.children;
    const reload = () => window.location.reload();
    if (isChunkError(this.state.error)) {
      return (
        <ErrorState title="This screen didn't download" action={{ label: 'Try again', onClick: reload, icon: 'reset' }} secondary={{ label: 'Go to Learn', href: href('learn') }}>
          You look to be offline, and this part of the app hasn't been saved on this device yet. Open it once while you're online and it will work offline after that. Your progress is safe.
        </ErrorState>
      );
    }
    return (
      <ErrorState title="Something went wrong on this screen" action={{ label: 'Reload', onClick: reload, icon: 'reset' }} secondary={{ label: 'Go to Learn', href: href('learn') }}>
        That's a bug in the app, not something you did. Your progress is saved on this device. Reloading usually clears it.
      </ErrorState>
    );
  }
}
