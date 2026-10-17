import { icon } from './icons';
import type { IconName } from './icons';

export type MenuEntry =
  | { separator: true }
  | { section: string }
  | { label: string; icon?: IconName; swatch?: string; shortcut?: string; disabled?: boolean; checked?: boolean; danger?: boolean; action?: () => void; children?: MenuEntry[] };

type ActionEntry = Extract<MenuEntry, { label: string }>;

const MARGIN = 8;

export class ContextMenu {
  private readonly layers: HTMLElement[] = [];
  private restoreFocus: HTMLElement | null = null;

  constructor(private readonly root: HTMLElement) {
    document.addEventListener('pointerdown', event => {
      if (this.layers.length && !this.layers.some(layer => layer.contains(event.target as Node))) this.close();
    }, true);
    window.addEventListener('blur', () => this.close());
    window.addEventListener('resize', () => this.close());
  }

  get open(): boolean {
    return this.layers.length > 0;
  }

  show(entries: MenuEntry[], x: number, y: number) {
    this.close();
    this.restoreFocus = document.activeElement as HTMLElement | null;
    const layer = this.layer(entries, 0);
    this.place(layer, x, y, null);
    this.focusFirst(layer);
  }

  close() {
    while (this.layers.length) this.layers.pop()!.remove();
    this.restoreFocus?.focus?.({ preventScroll: true });
    this.restoreFocus = null;
  }

  private layer(entries: MenuEntry[], depth: number): HTMLElement {
    const layer = document.createElement('div');
    layer.className = 'ctx-menu';
    layer.setAttribute('role', 'menu');
    layer.style.visibility = 'hidden';
    for (const entry of entries) layer.append(this.row(entry, depth));
    layer.addEventListener('keydown', event => this.keys(event, layer, depth));
    this.root.append(layer);
    this.layers.push(layer);
    return layer;
  }

  private row(entry: MenuEntry, depth: number): HTMLElement {
    if ('separator' in entry) {
      const line = document.createElement('div');
      line.className = 'ctx-sep';
      line.setAttribute('role', 'separator');
      return line;
    }
    if ('section' in entry) {
      const head = document.createElement('div');
      head.className = 'ctx-section';
      head.textContent = entry.section;
      return head;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ctx-item';
    button.setAttribute('role', 'menuitem');
    if (entry.danger) button.classList.add('danger');
    if (entry.checked) button.classList.add('checked');
    button.disabled = !!entry.disabled;
    const glyph = document.createElement('span');
    glyph.className = 'ctx-icon';
    if (entry.swatch) {
      // A colour entry shows its colour as a dot; the current colour gets a ring instead of the tick.
      const dot = document.createElement('span');
      dot.className = 'ctx-swatch';
      dot.style.setProperty('--swatch', entry.swatch);
      glyph.append(dot);
    } else if (entry.checked) glyph.append(icon('todo'));
    else if (entry.icon) glyph.append(icon(entry.icon));
    const label = document.createElement('span');
    label.className = 'ctx-label';
    label.textContent = entry.label;
    const hint = document.createElement('span');
    hint.className = 'ctx-hint';
    if (entry.children) hint.append(icon('chevron-right'));
    else hint.textContent = entry.shortcut || '';
    button.append(glyph, label, hint);
    if (entry.children) {
      button.setAttribute('aria-haspopup', 'menu');
      const openChild = () => this.openChild(button, entry, depth);
      button.addEventListener('pointerenter', openChild);
      button.addEventListener('click', openChild);
    } else {
      button.addEventListener('pointerenter', () => this.trim(depth + 1));
      button.addEventListener('click', () => {
        if (button.disabled) return;
        this.close();
        entry.action?.();
      });
    }
    return button;
  }

  private openChild(button: HTMLButtonElement, entry: ActionEntry, depth: number) {
    if (button.disabled || !entry.children) return;
    if (this.layers[depth + 1]?.dataset.owner === entry.label) return;
    this.trim(depth + 1);
    const child = this.layer(entry.children, depth + 1);
    child.dataset.owner = entry.label;
    const rect = button.getBoundingClientRect();
    this.place(child, rect.right - 2, rect.top - 5, rect);
  }

  private trim(depth: number) {
    while (this.layers.length > depth) this.layers.pop()!.remove();
  }

  private place(layer: HTMLElement, x: number, y: number, anchor: DOMRect | null) {
    const { width, height } = layer.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + width > window.innerWidth - MARGIN) left = anchor ? anchor.left - width + 2 : window.innerWidth - width - MARGIN;
    if (top + height > window.innerHeight - MARGIN) top = Math.max(MARGIN, window.innerHeight - height - MARGIN);
    layer.style.left = `${Math.max(MARGIN, left)}px`;
    layer.style.top = `${Math.max(MARGIN, top)}px`;
    layer.style.visibility = '';
  }

  private items(layer: HTMLElement): HTMLButtonElement[] {
    return [...layer.querySelectorAll<HTMLButtonElement>('.ctx-item:not(:disabled)')];
  }

  private focusFirst(layer: HTMLElement) {
    this.items(layer)[0]?.focus({ preventScroll: true });
  }

  private keys(event: KeyboardEvent, layer: HTMLElement, depth: number) {
    const items = this.items(layer);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      items[(index + step + items.length) % items.length]?.focus({ preventScroll: true });
    } else if (event.key === 'ArrowRight') {
      const current = items[index];
      if (current?.getAttribute('aria-haspopup')) {
        event.preventDefault();
        current.click();
        const child = this.layers[depth + 1];
        if (child) this.focusFirst(child);
      }
    } else if (event.key === 'ArrowLeft' && depth > 0) {
      event.preventDefault();
      this.trim(depth);
      const parent = this.layers[depth - 1];
      parent?.querySelector<HTMLElement>(`[aria-haspopup]`)?.focus({ preventScroll: true });
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (depth > 0) this.trim(depth);
      else this.close();
    }
  }
}
