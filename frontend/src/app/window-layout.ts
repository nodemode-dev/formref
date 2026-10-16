import type { State, WindowLayout } from '../lib/types';
import { nativeInvoke } from '../lib/host';
import type { NativeWindow } from '../lib/host';
import { $, S, boardOpened, execute, toast } from './editor';
import { registry } from './registry';

interface Placement { x: number; y: number; width: number; height: number }

const desktop = () => !!(window as unknown as { __TAURI__?: { core?: unknown } }).__TAURI__?.core;

/** Puts the window where the board was saved: position and size through the shell, on top and opacity through the same Preferences controls a person uses, so those stay honest. */
async function apply(layout: WindowLayout): Promise<void> {
  await nativeInvoke<Placement>('window_place', { x: layout.x, y: layout.y, width: layout.width, height: layout.height });
  const top = $<HTMLInputElement>('native-top');
  if (top.checked !== layout.always_on_top) { top.checked = layout.always_on_top; top.dispatchEvent(new Event('change')); }
  const opacity = $<HTMLInputElement>('native-opacity');
  const value = String(Math.round(layout.opacity * 100));
  if (opacity.value !== value) { opacity.value = value; opacity.dispatchEvent(new Event('input')); }
}

async function remember(): Promise<void> {
  const placement = await nativeInvoke<Placement>('window_layout');
  const state = await nativeInvoke<NativeWindow>('window_state');
  if (!placement || !state) return;
  const window: WindowLayout = { ...placement, always_on_top: state.always_on_top, opacity: Number($<HTMLInputElement>('native-opacity').value) / 100 };
  await execute({ type: 'settings', patch: { window } });
  toast('This board will open in this window size and place.');
}

async function forget(): Promise<void> {
  await execute({ type: 'settings', patch: { window: null } });
  toast('This board no longer moves the window.');
}

export function registerWindowLayout(): void {
  boardOpened.push((state: State) => {
    const layout = state.board.settings?.window;
    if (layout && desktop()) void apply(layout).catch(() => undefined);
  });
  registry.add(
    { group: 'View', id: 'remember-window', label: 'Save Window Layout with Board', icon: 'fit', run: remember, enabled: () => !!S.state && desktop(), agent: 'window-only', description: 'Desktop app: saves the window position, size, Always on Top and window opacity with this board, and restores them whenever the board opens.' },
    { group: 'View', id: 'forget-window', label: 'Forget Board Window Layout', icon: 'fit', run: forget, enabled: () => !!S.state?.board.settings?.window, agent: 'window-only', description: 'Stops this board from moving or resizing the window when it opens.' },
  );
}
