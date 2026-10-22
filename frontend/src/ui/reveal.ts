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

export function revealWhenReady(): void {
  const fonts = document.fonts?.ready ?? Promise.resolve();
  void Promise.race([fonts, new Promise(done => setTimeout(done, 2500))]).then(revealApp, revealApp);
}
