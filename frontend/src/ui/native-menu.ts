import { onLanguage, t } from '../lib/i18n';
import { itemsOf, type MenuCommands, type MenuDef, type MenuItem as MenuSpec } from './menu';

export const MENUS_IN_WINDOW_KEY = 'formref.menusInWindow';

export function menusInWindow(): boolean {
  try { return localStorage.getItem(MENUS_IN_WINDOW_KEY) === '1'; } catch { return false; }
}

export const isMacDesktop = (): boolean => '__TAURI_INTERNALS__' in window && /Mac/.test(navigator.platform);
export const wantsNativeMenus = (): boolean => isMacDesktop() && !menusInWindow();

const NAMES: Record<string, string> = {
  mod: 'CmdOrCtrl', alt: 'Alt', shift: 'Shift', ctrl: 'Ctrl', '=': '=', '-': '-', '[': '[', ']': ']', ',': ',', '.': '.', '/': '/', ';': ';', "'": "'", '\\': '\\', '`': '`',
  delete: 'Delete', backspace: 'Backspace', escape: 'Escape', enter: 'Enter', tab: 'Tab', space: 'Space',
  arrowup: 'ArrowUp', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight', pageup: 'PageUp', pagedown: 'PageDown',
};

/** FormRef's key combo ('mod+shift+s') as a Tauri accelerator ('CmdOrCtrl+Shift+S'); null for what Tauri has no name for,
 *  and for a key with neither Cmd nor Alt, which the menu bar would take from every text field. */
export function accelerator(combo: string | undefined): string | null {
  if (!combo) return null;
  const parts = combo.endsWith('++') ? [...combo.slice(0, -2).split('+'), 'plus'] : combo.split('+');
  const fkey = /^f([1-9]|1[0-2])$/.test(parts[parts.length - 1]);
  if (!fkey && !parts.some((p) => p === 'mod' || p === 'ctrl' || p === 'alt')) return null;
  const out: string[] = [];
  for (const p of parts) {
    if (NAMES[p]) out.push(NAMES[p]);
    else if (/^[a-z0-9]$/.test(p)) out.push(p.toUpperCase());
    else if (/^f([1-9]|1[0-2])$/.test(p)) out.push(p.toUpperCase());
    else if (p === 'plus') out.push(p.charAt(0).toUpperCase() + p.slice(1));
    else return null;
  }
  return out.join('+');
}

/** Edit commands a focused text field needs for itself: while one has focus the menu holds the system's own item. */
const TEXT_EDIT: Record<string, string> = { undo: 'undo', redo: 'redo', 'select-all': 'selectAll' };
const NOT_TEXT = new Set(['button', 'checkbox', 'radio', 'range', 'color', 'file', 'submit', 'reset', 'image']);

export function textFieldFocused(): boolean {
  const a = document.activeElement;
  if (a instanceof HTMLTextAreaElement) return !a.readOnly && !a.disabled;
  if (a instanceof HTMLInputElement) return !NOT_TEXT.has(a.type) && !a.readOnly && !a.disabled;
  return a instanceof HTMLElement && a.isContentEditable;
}

const anyDialogOpen = (): boolean => !!document.querySelector('dialog[open]');
const capital = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

interface Live { setEnabled(on: boolean): Promise<void>; setChecked?(on: boolean): Promise<void> }
interface ItemOptions { text: string; enabled?: boolean; checked?: boolean; accelerator?: string; action?: () => void }
interface Api {
  Menu: { 'new'(options: { items: unknown[] }): Promise<{ setAsAppMenu(): Promise<unknown> }> };
  Submenu: { 'new'(options: { text: string; items: unknown[] }): Promise<unknown> };
  MenuItem: { 'new'(options: ItemOptions): Promise<Live> };
  CheckMenuItem: { 'new'(options: ItemOptions): Promise<Live> };
  PredefinedMenuItem: { 'new'(options: { item: unknown; text?: string }): Promise<unknown> };
}

/** The page reaches the menu API through the global the shell injects (withGlobalTauri), so the window needs no package for it. */
function menuApi(): Api {
  const api = (window as unknown as { __TAURI__?: { menu?: Api } }).__TAURI__?.menu;
  if (!api) throw new Error('no menu api in this shell');
  return api;
}

export interface NativeCommands extends MenuCommands {
  /** The command a key event runs, if any. */
  forKey(event: KeyboardEvent): string | undefined;
  /** Commands that stay available while a text field has focus or a dialog is open. */
  always(id: string): boolean;
}

export class NativeMenus {
  private items: Array<{ id: string; item: Live }> = [];
  private building = false;
  private again = false;
  private stateTimer = 0;
  private textMode = false;
  private shape = '';
  private lastKey = { id: '', at: 0 };
  private lastMenu = { id: '', at: 0 };

  constructor(private readonly commands: NativeCommands, private readonly menus: () => MenuDef[], private readonly preferencesId: string) {
    for (const ev of ['pointerup', 'keyup', 'focusin', 'focusout'] as const) window.addEventListener(ev, () => { if (this.items.length) this.refresh(); }, { passive: true });
    window.addEventListener('keydown', (e) => {
      const id = this.commands.forKey(e);
      if (!id || !this.items.length) return;
      if (this.lastMenu.id === id && performance.now() - this.lastMenu.at < 400) { this.lastMenu.id = ''; e.preventDefault(); e.stopImmediatePropagation(); return; }
      this.lastKey = { id, at: performance.now() };
    }, true);
    onLanguage(() => { void this.build().catch(() => undefined); });
  }

  private signature(): string {
    return JSON.stringify(this.menus().map((d) => [d.label, itemsOf(d, this.commands)]));
  }

  /** A shortcut the page and the menu bar both received runs once. */
  private act(id: string): void {
    const now = performance.now();
    if (this.lastKey.id === id && now - this.lastKey.at < 400) { this.lastKey.id = ''; return; }
    this.lastMenu = { id, at: now };
    this.commands.run(id);
    this.refresh();
  }

  /** Builds (or rebuilds) the menu bar; later calls while one is building are folded into one more build. */
  async build(): Promise<void> {
    if (this.building) { this.again = true; return; }
    this.building = true;
    try {
      const api = menuApi();
      const textMode = textFieldFocused();
      const items: typeof this.items = [];
      const predefined = (name: string, text?: string): Promise<unknown> => api.PredefinedMenuItem.new(text ? { item: capital(name), text } : { item: capital(name) });
      const make = async (spec: MenuSpec): Promise<unknown[]> => {
        if (spec === '-') return [await predefined('separator')];
        if (typeof spec === 'object') return [await api.Submenu.new({ text: t(spec.label), items: (await Promise.all(spec.items.map(make))).flat() })];
        const cmd = this.commands.get(spec);
        if (!cmd) return [];
        const text = t(this.commands.label(cmd));
        if (spec === 'paste') return [await predefined('cut'), await predefined('copy'), await predefined('paste', text)];
        if (textMode && TEXT_EDIT[spec]) return [await predefined(TEXT_EDIT[spec], text)];
        const acc = accelerator(this.commands.keyCombo(cmd));
        const opts: ItemOptions = { text, enabled: this.enabled(spec), action: () => this.act(spec) };
        let item: Live;
        if (cmd.checked) {
          const copts = { ...opts, checked: !!cmd.checked() };
          try { item = await api.CheckMenuItem.new(acc ? { ...copts, accelerator: acc } : copts); } catch { item = await api.CheckMenuItem.new(copts); }
        } else {
          try { item = await api.MenuItem.new(acc ? { ...opts, accelerator: acc } : opts); } catch { item = await api.MenuItem.new(opts); }
        }
        items.push({ id: spec, item });
        return [item];
      };
      const top: unknown[] = [];
      top.push(await api.Submenu.new({ text: 'FormRef', items: [
        await api.PredefinedMenuItem.new({ item: { About: { name: 'FormRef' } }, text: t('About FormRef') }),
        await predefined('separator'),
        ...(this.commands.get(this.preferencesId) ? await make(this.preferencesId) : []),
        await predefined('separator'),
        await predefined('hide'),
        await predefined('quit'),
      ] }));
      for (const def of this.menus()) {
        top.push(await api.Submenu.new({ text: t(def.label), items: (await Promise.all(itemsOf(def, this.commands).map(make))).flat() }));
      }
      const menu = await api.Menu.new({ items: top });
      await menu.setAsAppMenu();
      this.items = items;
      this.textMode = textMode;
      this.shape = this.signature();
      document.documentElement.classList.add('has-native-menus');
    } catch (reason) {
      if (!this.items.length) document.documentElement.classList.remove('has-native-menus');
      throw reason;
    } finally {
      this.building = false;
      if (this.again) { this.again = false; void this.build().catch(() => undefined); }
    }
  }

  /** A command's item is enabled when the command is; while a text field has focus or a dialog is open only the commands the page itself still answers to. */
  private enabled(id: string): boolean {
    const cmd = this.commands.get(id);
    if (!cmd || !this.commands.enabled(cmd)) return false;
    return this.commands.always(id) || !(textFieldFocused() || anyDialogOpen());
  }

  /** The enabled and tick states, refreshed a moment after the app changes (grouped, so a burst of changes is one pass);
   *  a changed menu model, or focus moving into or out of a text field, rebuilds instead. */
  refresh(): void {
    if (this.stateTimer || !this.items.length) return;
    this.stateTimer = window.setTimeout(() => {
      this.stateTimer = 0;
      if (this.signature() !== this.shape || textFieldFocused() !== this.textMode) { void this.build().catch(() => undefined); return; }
      for (const { id, item } of this.items) {
        const cmd = this.commands.get(id);
        if (!cmd) continue;
        void item.setEnabled(this.enabled(id)).catch(() => undefined);
        if (cmd.checked && item.setChecked) void item.setChecked(!!cmd.checked()).catch(() => undefined);
      }
    }, 150);
  }
}
