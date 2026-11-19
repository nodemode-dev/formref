import { MarkdownStream } from './chat-markdown';
import { icon } from './icons';
import { formatLocale, t } from '../lib/i18n';
import { keyHeaders, streamTicket } from '../lib/window-key';

interface Part { kind: 'text' | 'tool'; text?: string; id?: string; name?: string; input?: string; status?: string; items?: string[]; images?: string[] }
interface Meta { seconds?: number; turns?: number | null; costUsd?: number | null; inputTokens?: number; outputTokens?: number }
interface Message { role: 'user' | 'assistant'; text?: string; note?: string; parts?: Part[]; error?: string; meta?: Meta }
interface Usage { input: number; output: number; costUsd: number; context: number; window: number; model: string }
interface ChatState { busy: boolean; messages: Message[]; turn: number; session: string; usage?: Usage }
type Event = Record<string, unknown> & { type: string };

export interface ChatHooks {
  fail: (message: string) => void;
  handoff: (session: string) => void;
  select: (ids: string[]) => void;
  exists: (id: string) => boolean;
}

function tokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k`;
  return String(n);
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, { method, headers: body === undefined ? keyHeaders() : { 'Content-Type': 'application/json', ...keyHeaders() }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (${response.status}).`);
  return data as T;
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
}

export class ChatPane {
  readonly root = node('div', 'chat-pane');
  private readonly status = node('span', 'chat-status muted');
  private readonly meter = node('span', 'chat-usage');
  private readonly stop = node('button', 'button compact quiet', 'Stop');
  private readonly sessionPick = node('select', 'chat-sessions');
  private readonly log = node('div', 'chat-log');
  private readonly empty = node('p', 'chat-empty muted', 'Ask Claude about this board in the line below: sort references, write notes, build a layout. It works through FormRef\'s tools, every change shows on the canvas, and each one can be undone.');
  private reply: HTMLElement | null = null;
  private md: MarkdownStream | null = null;
  private usage: Usage = { input: 0, output: 0, costUsd: 0, context: 0, window: 0, model: '' };
  private readonly chips = new Map<string, HTMLElement>();
  private busy = false;
  private loaded = false;
  private source: EventSource | null = null;
  private opening = false;

  constructor(private readonly hooks: ChatHooks) {
    const bar = node('div', 'chat-bar');
    const spacer = node('span', 'chat-spacer');
    const adopt = node('button', 'button compact quiet', 'From Claude Code...');
    adopt.title = 'Bring a conversation you had in a Claude Code tab into this chat';
    const handoff = node('button', 'button compact quiet', 'Open in Claude Code');
    handoff.title = 'Continue this conversation in a Claude Code terminal tab';
    const fresh = node('button', 'button compact quiet', 'New Chat');
    this.stop.hidden = true;
    this.sessionPick.hidden = true;
    this.sessionPick.setAttribute('aria-label', 'Claude Code conversation to continue');
    this.meter.title = 'Memory: how much of Claude\'s working memory this conversation uses. Reply: tokens written so far. Chat: everything sent and written in this conversation, and what it has cost.';
    bar.append(this.status, this.meter, spacer, this.stop, this.sessionPick, adopt, handoff, fresh);
    this.log.setAttribute('role', 'log');
    this.log.setAttribute('aria-live', 'polite');
    this.log.append(this.empty);
    this.root.append(bar, this.log);
    this.root.hidden = true;
    this.stop.addEventListener('click', () => void call('POST', '/api/chat/cancel').catch(e => hooks.fail(e.message)));
    fresh.addEventListener('click', () => void call('POST', '/api/chat/reset').catch(e => hooks.fail(e.message)));
    handoff.addEventListener('click', () => void this.handoff());
    adopt.addEventListener('click', () => void this.listSessions());
    this.sessionPick.addEventListener('change', () => {
      const id = this.sessionPick.value;
      this.sessionPick.hidden = true;
      if (id) void call('POST', '/api/chat/adopt', { session: id }).catch(e => hooks.fail(e.message));
    });
    this.log.addEventListener('click', e => {
      const strip = (e.target as HTMLElement).closest<HTMLElement>('.chat-items');
      if (strip?.dataset.ids) hooks.select(strip.dataset.ids.split(',').filter(hooks.exists));
    });
  }

  private connect(): void {
    if (this.source || this.opening) return;
    this.opening = true;
    void this.open();
  }

  private async open(): Promise<void> {
    const ticket = await streamTicket().catch(() => '');
    const source = new EventSource(`/api/chat/events?ticket=${encodeURIComponent(ticket)}`);
    this.source = source;
    this.opening = false;
    source.addEventListener('error', () => {
      if (source.readyState !== EventSource.CLOSED || this.source !== source) return;
      this.source = null;
      window.setTimeout(() => this.connect(), 1500);
    });
    source.addEventListener('message', msg => {
      try { this.event(JSON.parse(msg.data) as Event); } catch { }
    });
  }

  private event(e: Event): void {
    if (e.type === 'chat.start') { this.user(String(e.text ?? ''), String(e.note ?? '')); this.begin(); }
    else if (e.type === 'chat.delta') this.delta(String(e.text ?? ''));
    else if (e.type === 'chat.tool') this.tool({ kind: 'tool', id: String(e.id ?? ''), name: String(e.name ?? ''), input: String(e.input ?? ''), status: 'running', items: Array.isArray(e.items) ? e.items as string[] : [] });
    else if (e.type === 'chat.toolDone') {
      const chip = this.chips.get(String(e.id ?? ''));
      if (!chip) return;
      this.mark(chip, String(e.status ?? 'done'));
      if (Array.isArray(e.images) && e.images.length) this.images(chip, e.images as string[]);
    } else if (e.type === 'chat.usage') this.showUsage({ ...this.usage, context: Number(e.context ?? 0), window: Number(e.window ?? 0) || this.usage.window, model: String(e.model ?? this.usage.model) }, Number(e.output ?? 0));
    else if (e.type === 'chat.done') { this.close(String(e.error ?? ''), (e.meta ?? {}) as Meta); if (e.usage) this.showUsage(e.usage as Usage, -1); }
    else if (e.type === 'chat.reset') { this.clear(); this.showUsage({ input: 0, output: 0, costUsd: 0, context: 0, window: 0, model: '' }, -1); }
    else if (e.type === 'chat.adopted') { this.clear(); this.loaded = false; void this.load(); }
  }

  private clear(): void {
    this.log.replaceChildren(this.empty);
    this.empty.hidden = false;
    this.reply = null;
    this.md = null;
    this.chips.clear();
    this.setBusy(false);
  }

  async load(): Promise<void> {
    this.connect();
    if (this.loaded) return;
    this.loaded = true;
    try {
      const s = await call<ChatState>('GET', '/api/chat');
      for (const m of s.messages) {
        if (m.role === 'user') { this.user(m.text ?? '', m.note ?? ''); continue; }
        this.begin();
        for (const p of m.parts ?? []) {
          if (p.kind === 'text') this.delta(p.text ?? '');
          else this.tool(p);
        }
        this.close(m.error ?? '', m.meta ?? {});
      }
      if (s.usage) this.showUsage(s.usage, -1);
      if (s.busy) { this.begin(); this.setBusy(true); }
    } catch (err) { this.loaded = false; this.hooks.fail((err as Error).message); }
  }

  async send(text: string, context = '', note = ''): Promise<void> {
    try { await call('POST', '/api/chat', { text, context, note }); } catch (err) { this.hooks.fail((err as Error).message); }
  }

  isBusy(): boolean { return this.busy; }

  private setBusy(on: boolean): void {
    this.busy = on;
    this.stop.hidden = !on;
    const text = on ? 'Claude is working...' : '';
    if (this.status.textContent !== text) this.status.textContent = text;
  }

  private scroll(): void {
    const l = this.log;
    if (l.scrollHeight - l.scrollTop - l.clientHeight < 80) l.scrollTop = l.scrollHeight;
  }

  private user(text: string, note = ''): void {
    this.empty.hidden = true;
    const n = node('div', 'chat-msg is-user');
    const said = node('span', '', text);
    said.dataset.noI18n = '';
    n.append(said);
    if (note) n.append(node('span', 'chat-note', note));
    this.log.append(n);
    this.scroll();
  }

  private begin(): void {
    this.empty.hidden = true;
    this.endText();
    this.reply = node('div', 'chat-msg is-claude');
    this.reply.dataset.noI18n = '';
    this.log.append(this.reply);
    this.setBusy(true);
    this.scroll();
  }

  private delta(text: string): void {
    if (!this.reply) this.begin();
    if (!this.md) { this.md = new MarkdownStream('chat-text fl-md'); this.reply?.append(this.md.root); }
    this.md.push(text);
    this.scroll();
  }

  private endText(): void {
    this.md?.end();
    this.md = null;
  }

  private images(after: HTMLElement, names: string[]): void {
    const row = node('div', 'chat-images');
    for (const name of names.slice(0, 6)) {
      const img = node('img');
      img.alt = 'What Claude looked at';
      img.decoding = 'async';
      img.src = `/api/chat/image/${encodeURIComponent(name)}`;
      row.append(img);
    }
    after.after(row);
    this.scroll();
  }

  private showUsage(u: Usage, reply: number): void {
    this.usage = u;
    const parts: string[] = [];
    if (u.context) parts.push(`Memory ${tokens(u.context)}${u.window ? ` of ${tokens(u.window)}` : ''}`);
    if (reply >= 0) parts.push(`Reply ${tokens(reply)} tokens`);
    if (u.input || u.output) parts.push(`Chat ${tokens(u.input + u.output)} tokens${u.costUsd ? ` · $${u.costUsd.toFixed(u.costUsd < 1 ? 3 : 2)}` : ''}`);
    const text = !u.context && !u.input && reply < 0 ? '' : parts.join(' · ');
    if (this.meter.textContent !== text) this.meter.textContent = text;
    this.meter.classList.toggle('high', !!u.window && u.context / u.window > 0.8);
  }

  private async handoff(): Promise<void> {
    try {
      const s = await call<ChatState>('GET', '/api/chat');
      if (!s.session) { this.hooks.fail('Start a conversation here first; then it can continue in Claude Code.'); return; }
      if (s.busy) { this.hooks.fail('Wait for Claude to finish, or press Stop, before moving the conversation.'); return; }
      this.hooks.handoff(s.session);
    } catch (err) { this.hooks.fail((err as Error).message); }
  }

  private async listSessions(): Promise<void> {
    try {
      const r = await call<{ sessions: Array<{ id: string; title: string; modified: number; current: boolean }> }>('GET', '/api/chat/sessions');
      if (!r.sessions.length) { this.hooks.fail('No Claude Code conversation in FormRef yet: open one with the Claude Code button first.'); return; }
      const when = (t: number) => new Date(t * 1000).toLocaleString(formatLocale(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const first = node('option', '', 'Continue a conversation...');
      first.value = '';
      this.sessionPick.replaceChildren(first, ...r.sessions.map(s => { const o = node('option', '', `${when(s.modified)} · ${s.title || 'untitled'}${s.current ? ' (this chat)' : ''}`); o.value = s.id; return o; }));
      this.sessionPick.hidden = false;
      this.sessionPick.focus();
    } catch (err) { this.hooks.fail((err as Error).message); }
  }

  private tool(p: Part): void {
    if (!this.reply) this.begin();
    this.endText();
    const chip = node('div', 'chat-tool');
    const mark = node('span', 'chat-tool-mark');
    mark.append(icon('terminal'));
    chip.append(mark, node('span', 'chat-tool-name', p.name ?? ''), node('span', 'chat-tool-input', p.input ?? ''));
    chip.title = p.input ?? '';
    this.mark(chip, p.status ?? 'running');
    if (p.id) this.chips.set(p.id, chip);
    this.reply?.append(chip);
    const ids = (p.items ?? []).filter(this.hooks.exists);
    if (ids.length) {
      const strip = node('button', 'chat-items button compact quiet', ids.length === 1 ? t('Select this item') : t('Select these {0} items', { 0: ids.length }));
      strip.dataset.ids = ids.join(',');
      this.reply?.append(strip);
    }
    if (p.images?.length) this.images(chip, p.images);
    this.scroll();
  }

  private mark(chip: HTMLElement, s: string): void {
    for (const k of ['running', 'done', 'error']) chip.classList.toggle(`is-${k}`, s === k);
  }

  private close(error: string, meta: Meta): void {
    if (!this.reply) this.begin();
    this.endText();
    for (const c of this.reply?.querySelectorAll<HTMLElement>('.chat-tool.is-running') ?? []) this.mark(c, 'done');
    if (error) this.reply?.append(node('div', 'chat-error', error));
    if (meta.seconds !== undefined) {
      const used = meta.inputTokens || meta.outputTokens ? ` · ${tokens((meta.inputTokens ?? 0) + (meta.outputTokens ?? 0))} tokens` : '';
      this.reply?.append(node('div', 'chat-meta', `${meta.seconds} s${meta.turns ? ` · ${meta.turns} steps` : ''}${used}${meta.costUsd ? ` · $${meta.costUsd.toFixed(3)}` : ''}`));
    }
    this.reply = null;
    this.setBusy(false);
    this.scroll();
  }
}
