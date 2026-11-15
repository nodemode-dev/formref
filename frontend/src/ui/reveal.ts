import { nativeInvoke } from '../lib/host';

export function revealApp(): void {
  if (document.body.classList.contains('app-ready')) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.add('app-ready');
    requestAnimationFrame(() => {
      try {
        void nativeInvoke('app_ready')?.catch(() => undefined);
      } catch {
        return;
      }
    });
  }));
}

/** `first` is the launch decision (a board, or Home): the window shows once it is made, so neither flashes before the other. */
export function revealWhenReady(first?: Promise<unknown>): void {
  const fonts = document.fonts?.ready ?? Promise.resolve();
  void Promise.race([Promise.all([fonts, first]), new Promise(done => setTimeout(done, 2500))]).then(revealApp, revealApp);
}
