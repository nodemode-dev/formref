export interface AssignFile { name: string; mime: string; width: number; height: number; dataUrl: string }
export class HostLink {
  embedded = window.parent !== window; ready = false; pluginId = 'formref'; origin = window.location.origin;
  constructor(onChange: (message: string) => void) {
    if (!this.embedded) return;
    try { if (document.referrer) this.origin = new URL(document.referrer).origin; } catch {}
    window.addEventListener('message', event => {
      if (event.source !== window.parent || event.origin !== this.origin) return;
      const message = event.data as { type?: unknown; pluginId?: unknown; theme?: unknown; tokens?: unknown };
      if (!message || typeof message.type !== 'string') return;
      if (message.type === 'init') { if (typeof message.pluginId === 'string') this.pluginId = message.pluginId; this.ready = true; onChange('NodeMode host connected. Selection assignment is available.'); }
      if (message.type === 'theme' && message.tokens && typeof message.tokens === 'object') for (const [key, value] of Object.entries(message.tokens)) { if (/^--(bg|text|accent|border|canvas|grid)-[a-z-]+$/.test(key) && typeof value === 'string' && CSS.supports('color', value)) document.documentElement.style.setProperty(key, value); }
      if (message.type === 'close') { this.ready = false; onChange('NodeMode host closed. This board remains saved locally.'); }
      if (message.type === `plugin:${this.pluginId}:assign:ack`) onChange('NodeMode acknowledged the image assignment.');
    });
    window.parent.postMessage({ type: 'ready', wantsLiveUpdates: false }, this.origin);
  }
  assign(files: AssignFile[]) { if (!this.ready) throw new Error('NodeMode host has not initialized'); window.parent.postMessage({ type: `plugin:${this.pluginId}:assign`, payload: { files } }, this.origin); }
}
export function dataUrl(blob: Blob): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read asset')); reader.readAsDataURL(blob); }); }
export interface NativeWindow { always_on_top: boolean; fullscreen: boolean; decorations: boolean; click_through: boolean }
export function nativeInvoke<T>(command: string, args: Record<string, unknown> = {}): Promise<T> | undefined {
  const tauri = (window as unknown as { __TAURI__?: { core?: { invoke<T>(command: string, args: Record<string, unknown>): Promise<T> } } }).__TAURI__;
  return tauri?.core?.invoke<T>(command, args);
}
