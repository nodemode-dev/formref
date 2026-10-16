import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { icon, type IconName } from './icons';

export interface TermInfo { id: string; title: string; kind?: string; alive?: boolean }

export interface DockHooks {
  context: () => string;
  fail: (message: string) => void;
  onHide: () => void;
}

interface Tab { id: string; term: Terminal; fit: FitAddon; host: HTMLElement; tab: HTMLElement; socket: WebSocket | null; kind: string }

const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const EXIT = '{"type": "exit"}';

function token(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function isDockToggle(e: KeyboardEvent): boolean {
  return (isMac ? e.metaKey : e.ctrlKey) && !e.altKey && e.code === 'KeyJ';
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, { method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (${response.status}).`);
  return data as T;
}

function button(cls: string, name: IconName, label: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `icon-button small ${cls}`;
  b.title = label;
  b.setAttribute('aria-label', label);
  b.append(icon(name));
  return b;
}

export class TerminalDock {
  private readonly tabsEl: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly empty: HTMLElement;
  private readonly ask: HTMLInputElement;
  private readonly restartButton: HTMLButtonElement;
  private readonly tabs = new Map<string, Tab>();
  private active: string | null = null;

  constructor(readonly root: HTMLElement, private readonly hooks: DockHooks) {
    const resize = document.createElement('div');
    resize.className = 'term-dock-resize';
    resize.setAttribute('role', 'separator');
    resize.setAttribute('aria-orientation', 'horizontal');
    resize.setAttribute('aria-label', 'Resize the terminal');
    const head = document.createElement('div');
    head.className = 'term-dock-head';
    this.tabsEl = document.createElement('div');
    this.tabsEl.className = 'term-dock-tabs';
    this.tabsEl.setAttribute('role', 'tablist');
    this.tabsEl.setAttribute('aria-label', 'Terminals');
    const spacer = document.createElement('span');
    spacer.className = 'term-dock-spacer';
    const mod = isMac ? 'Cmd' : 'Ctrl';
    const add = button('term-dock-new', 'plus', 'New Terminal');
    const claude = button('term-dock-claude', 'agent', `Claude Code (Shift+${mod}+J)`);
    this.restartButton = button('term-dock-restart', 'restart', 'Restart this tab');
    const hide = button('term-dock-hide', 'close', `Hide Terminal (${mod}+J); programs keep running`);
    head.append(this.tabsEl, spacer, add, claude, this.restartButton, hide);
    this.stage = document.createElement('div');
    this.stage.className = 'term-dock-stage';
    this.empty = document.createElement('p');
    this.empty.className = 'term-dock-empty muted';
    this.empty.textContent = 'No terminal is open. Start a shell with the plus button or Claude Code with the sparkle.';
    this.empty.hidden = true;
    this.stage.append(this.empty);
    const form = document.createElement('form');
    form.className = 'term-dock-ask';
    form.autocomplete = 'off';
    const mark = document.createElement('span');
    mark.className = 'term-dock-ask-mark';
    mark.append(icon('agent'));
    this.ask = document.createElement('input');
    this.ask.type = 'text';
    this.ask.spellcheck = false;
    this.ask.placeholder = 'Ask Claude Code to work on this board';
    this.ask.setAttribute('aria-label', 'Ask Claude Code');
    const send = button('term-dock-send', 'send', 'Send to Claude Code');
    send.type = 'submit';
    form.append(mark, this.ask, send);
    root.append(resize, head, this.stage, form);

    add.addEventListener('click', () => void this.open());
    claude.addEventListener('click', () => void this.claude());
    this.restartButton.addEventListener('click', () => void this.restart());
    hide.addEventListener('click', () => hooks.onHide());
    form.addEventListener('submit', e => { e.preventDefault(); void this.send(); });
    this.stage.addEventListener('keydown', e => { if (!isDockToggle(e)) e.stopPropagation(); });
    root.addEventListener('keydown', e => { if (!isDockToggle(e) && (e.target as HTMLElement).closest('.term-dock-ask')) e.stopPropagation(); });
    new ResizeObserver(() => this.fitActive()).observe(this.stage);
    this.bindResize(resize);
  }

  private bindResize(handle: HTMLElement): void {
    handle.addEventListener('pointerdown', e => {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      handle.classList.add('dragging');
      const startY = e.clientY;
      const startH = this.root.getBoundingClientRect().height;
      const move = (ev: PointerEvent) => {
        const h = Math.max(140, Math.min(window.innerHeight * 0.75, startH + startY - ev.clientY));
        document.documentElement.style.setProperty('--term-dock-h', `${Math.round(h)}px`);
      };
      const up = () => {
        handle.classList.remove('dragging');
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        try { localStorage.setItem('formref-term-dock-h', document.documentElement.style.getPropertyValue('--term-dock-h')); } catch { }
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    });
  }

  async ensure(): Promise<void> {
    const listed = await call<{ terminals: TermInfo[] }>('GET', '/api/terminal').catch(() => ({ terminals: [] as TermInfo[] }));
    for (const t of listed.terminals) if (!this.tabs.has(t.id)) this.mount(t, false);
    if (!this.tabs.size) await this.open();
    else if (!this.active) this.select([...this.tabs.keys()][0]);
    else this.fitActive();
    this.focus();
  }

  focus(): void {
    if (this.active) this.tabs.get(this.active)?.term.focus();
    else this.ask.focus();
  }

  async open(): Promise<void> {
    try {
      this.mount(await call<TermInfo>('POST', '/api/terminal', { cols: 100, rows: 20 }), true);
    } catch (err) { this.hooks.fail((err as Error).message); }
  }

  async claude(prompt?: string): Promise<void> {
    const size = this.size();
    try {
      const info = await call<TermInfo>('POST', '/api/claudecode', { prompt: prompt || '', cols: size.cols, rows: size.rows });
      if (this.tabs.has(info.id)) this.select(info.id);
      else this.mount(info, true);
    } catch (err) { this.hooks.fail((err as Error).message); }
  }

  private async send(): Promise<void> {
    const text = this.ask.value.trim();
    if (!text) return;
    const extra = this.hooks.context();
    this.ask.value = '';
    await this.claude(extra ? `${text} (${extra})` : text);
  }

  private size(): { cols: number; rows: number } {
    const t = this.active ? this.tabs.get(this.active) : null;
    return t ? { cols: t.term.cols, rows: t.term.rows } : { cols: 100, rows: 20 };
  }

  private theme() {
    return {
      background: token('--bg-primary', '#111111'),
      foreground: token('--text-primary', '#f7f7f7'),
      cursor: token('--accent-color', '#f97316'),
      cursorAccent: token('--bg-primary', '#111111'),
      selectionBackground: token('--accent-soft', '#f9731633'),
    };
  }

  retheme(): void {
    const theme = this.theme();
    for (const t of this.tabs.values()) t.term.options.theme = theme;
  }

  private mount(info: TermInfo, show: boolean): void {
    const kind = info.kind ?? 'shell';
    const term = new Terminal({ fontFamily: token('--font-mono', 'monospace'), fontSize: 12, lineHeight: 1.2, cursorBlink: true, scrollback: 5000, allowProposedApi: false, theme: this.theme(), overviewRuler: { width: 0 } });
    term.attachCustomKeyEventHandler(e => !isDockToggle(e));
    const fit = new FitAddon();
    term.loadAddon(fit);
    const host = document.createElement('div');
    host.className = 'term-host';
    host.hidden = true;
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = `term-dock-tab${kind === 'claude' ? ' is-claude' : ''}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    const title = document.createElement('span');
    title.className = 'term-dock-tab-title';
    title.textContent = info.title;
    title.dataset.noI18n = '';
    const x = document.createElement('span');
    x.className = 'term-dock-tab-x';
    x.setAttribute('role', 'button');
    x.setAttribute('aria-label', 'Close this tab');
    x.append(icon('close'));
    tab.append(icon(kind === 'claude' ? 'agent' : 'terminal'), title, x);
    tab.addEventListener('click', e => {
      if ((e.target as HTMLElement).closest('.term-dock-tab-x')) void this.close(info.id);
      else this.select(info.id);
    });
    this.stage.append(host);
    this.tabsEl.append(tab);
    const t: Tab = { id: info.id, term, fit, host, tab, socket: null, kind };
    this.tabs.set(info.id, t);
    this.empty.hidden = true;
    term.open(host);
    if (show || !this.active) this.select(info.id);
    this.connect(t);
  }

  private connect(t: Tab): void {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${proto}//${location.host}/api/terminal/${encodeURIComponent(t.id)}/ws`);
    t.socket = socket;
    socket.addEventListener('open', () => this.sendSize(t));
    socket.addEventListener('message', msg => {
      const data = String(msg.data);
      if (data === EXIT) {
        t.term.write(`\r\n\x1b[2m[${t.kind === 'claude' ? 'Claude Code' : 'shell'} exited · Restart runs it again]\x1b[0m\r\n`);
        return;
      }
      t.term.write(data);
    });
    t.term.onData(data => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'input', data })); });
  }

  private sendSize(t: Tab): void {
    if (t.socket?.readyState === WebSocket.OPEN) t.socket.send(JSON.stringify({ type: 'resize', cols: t.term.cols, rows: t.term.rows }));
  }

  fitActive(): void {
    const t = this.active ? this.tabs.get(this.active) : null;
    if (!t || t.host.hidden || this.stage.clientHeight < 20) return;
    const before = `${t.term.cols}x${t.term.rows}`;
    t.fit.fit();
    if (`${t.term.cols}x${t.term.rows}` !== before) this.sendSize(t);
  }

  private select(id: string): void {
    this.active = id;
    for (const [tid, t] of this.tabs) {
      const on = tid === id;
      t.host.hidden = !on;
      t.tab.classList.toggle('active', on);
      t.tab.setAttribute('aria-selected', String(on));
    }
    this.restartButton.disabled = !this.tabs.has(id);
    this.fitActive();
    this.focus();
  }

  private async restart(): Promise<void> {
    const t = this.active ? this.tabs.get(this.active) : null;
    if (!t) return;
    try {
      await call('POST', `/api/terminal/${encodeURIComponent(t.id)}/restart`);
      this.sendSize(t);
      t.term.focus();
    } catch (err) { this.hooks.fail((err as Error).message); }
  }

  private async close(id: string): Promise<void> {
    const t = this.tabs.get(id);
    if (!t) return;
    t.socket?.close();
    t.term.dispose();
    t.host.remove();
    t.tab.remove();
    this.tabs.delete(id);
    await call('DELETE', `/api/terminal/${encodeURIComponent(id)}`).catch(() => undefined);
    if (this.active === id) {
      this.active = null;
      const next = [...this.tabs.keys()].pop();
      if (next) this.select(next);
      else this.restartButton.disabled = true;
    }
    this.empty.hidden = this.tabs.size > 0;
  }
}
