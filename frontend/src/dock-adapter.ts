import type { ConsentChoice, ConsentRequest, DockAdapter, DockAgentStatus, DockChannel, DockLegacy, DockOwnChat, DockTerminal, PtyKind, StoredChoice, StoredChoiceState } from './dock/adapter';
import { keyHeaders, windowKey } from './lib/window-key';
import { ChatPane } from './ui/chat-pane';

export const DOCK_KEY = 'formref.dock';
export const DOCK_OLD_HEIGHT = 'formref-term-dock-h';
export const DOCK_RIGHT_MIN = 1100;
export const DOCK_QUIET_MS = 60000;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

export class EngineError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) { super(message); }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, { method, headers: body === undefined ? keyHeaders() : { 'Content-Type': 'application/json', ...keyHeaders() }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({})) as { detail?: unknown; code?: unknown };
  if (!response.ok) throw new EngineError(typeof data.detail === 'string' ? data.detail : `Request failed (${response.status}).`, response.status, typeof data.code === 'string' ? data.code : '');
  return data as T;
}

export const oldHeight: DockLegacy = {
  keys: [DOCK_OLD_HEIGHT],
  read: (store) => {
    const found = /^(\d+)px$/.exec(store.getItem(DOCK_OLD_HEIGHT) ?? '');
    return found ? { h: Number(found[1]) } : null;
  },
};

interface Refusal { id?: unknown; agent?: unknown; what?: unknown }
const shown = new Map<string, string>();
const early: ConsentRequest[] = [];
let add: ((request: ConsentRequest) => void) | null = null;
let withdraw: (id: string) => void = () => undefined;
let deniedAt = 0;
let allowed: () => void = () => undefined;

export const outsideAgents = {
  onAllowed(fn: () => void): void { allowed = fn; },
  refused(data: Refusal): void {
    const id = typeof data.id === 'string' ? data.id : '';
    const agent = typeof data.agent === 'string' ? data.agent : '';
    if (!id || shown.has(id) || [...shown.values()].includes(agent) || Date.now() - deniedAt < DOCK_QUIET_MS) return;
    const request: ConsentRequest = {
      id, agent, what: typeof data.what === 'string' && data.what ? data.what : 'make a change', offers: ['deny', 'always'], always: 'all',
      notes: ['FormRef refused this request.', 'If you allow outside agents, the agent has to ask again.'],
    };
    shown.set(id, agent);
    if (add) add(request); else early.push(request);
  },
  subscribe(onAdd: (request: ConsentRequest) => void, onWithdraw: (id: string) => void): void {
    add = onAdd;
    withdraw = onWithdraw;
    for (const r of early.splice(0)) onAdd(r);
  },
  async answer(id: string, choice: ConsentChoice): Promise<void> {
    shown.delete(id);
    if (choice === 'deny') { deniedAt = Date.now(); return; }
    if (choice !== 'always') return;
    await outsideAgents.set('allowed');
    for (const other of [...shown.keys()]) { shown.delete(other); withdraw(other); }
    allowed();
  },
  async get(): Promise<StoredChoiceState> {
    const s = await call<{ outside_agents?: boolean; seal_broken?: boolean }>('GET', '/api/agent/settings');
    return { value: s.outside_agents ? 'allowed' : 'ask', changedOutside: s.seal_broken === true };
  },
  async set(value: StoredChoice): Promise<void> {
    await call('POST', '/api/agent/settings', { outside_agents: value === 'allowed' });
  },
};

function channel(id: string): DockChannel {
  const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/terminal/${encodeURIComponent(id)}/ws`);
  let data = (_chunk: string | Uint8Array): void => undefined;
  let exit = (): void => undefined;
  let closed = (): void => undefined;
  const waiting: string[] = [];
  socket.binaryType = 'arraybuffer';
  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ type: 'key', key: windowKey(), frames: 'typed' }));
    for (const text of waiting.splice(0)) socket.send(text);
  });
  socket.addEventListener('message', (msg) => {
    if (typeof msg.data === 'string') { data(msg.data); return; }
    try { if ((JSON.parse(new TextDecoder().decode(msg.data as ArrayBuffer)) as { type?: string }).type === 'exit') exit(); } catch { return; }
  });
  socket.addEventListener('close', () => closed());
  const send = (text: string): void => {
    if (socket.readyState === WebSocket.OPEN) socket.send(text);
    else if (socket.readyState === WebSocket.CONNECTING) waiting.push(text);
  };
  return {
    send: (chunk) => send(JSON.stringify({ type: 'input', data: chunk })),
    resize: (cols, rows) => send(JSON.stringify({ type: 'resize', cols, rows })),
    onData: (handler) => { data = handler; },
    onExit: (handler) => { exit = handler; },
    onClose: (handler) => { closed = handler; },
    close: () => socket.close(),
  };
}

interface TermInfo { id: string; title: string; cwd?: string; kind?: string; alive?: boolean }
const KINDS: Array<PtyKind | 'antigravity'> = ['shell', 'claude', 'codex', 'cursor', 'antigravity'];
const record = (info: TermInfo): DockTerminal<'antigravity'> => ({
  id: info.id, title: info.title, alive: info.alive !== false, kind: KINDS.find((k) => k === info.kind) ?? 'shell', ...(info.cwd ? { tip: info.cwd } : {}),
});

export interface DockDeps {
  context(): string;
  note(): string;
  fail(message: string): void;
  claude(prompt?: string, resume?: string): void;
  select(ids: string[]): void;
  exists(id: string): boolean;
  openSettings(): void;
  passes(event: KeyboardEvent): boolean;
}

export function formrefDock(deps: DockDeps): DockAdapter<'antigravity'> {
  const mod = isMac ? 'Cmd' : 'Ctrl';
  return {
    words: {
      app: 'FormRef', noun: 'board', example: 'sort these references by colour and add a note under each group', start: './formref boot',
      lead: "Ask Claude about this board in the line below: sort references, write notes, build a layout. It works through FormRef's tools, every change shows on the canvas, and each one can be undone.",
    },
    strings: {
      chatAbout: `Chat with Claude about this board (Alt+${mod}+J)`,
      claudeCode: `Claude Code (Shift+${mod}+J)`,
      askPlaceholder: 'Ask Claude Code to work on this board',
      chatPlaceholder: 'Ask Claude about this board (Enter to send)',
      tourAskBody: 'If another AI program on this computer tries to change a board, FormRef refuses it and asks you in a box in the middle of the window. Choose Deny or Always allow; once allowed, the program has to ask again. You can change your answer later under Outside agents in the menu here.',
    },
    placement: {
      mode: 'own',
      storage: { key: DOCK_KEY, legacy: oldHeight },
      sizes: { minHeight: 140, maxHeightShare: 0.75, defaultHeight: 280, minWidth: 320, maxWidthShare: 0.4, defaultWidth: 420 },
      canDockRight: () => window.innerWidth >= DOCK_RIGHT_MIN,
    },
    passKey: (e) => (isMac ? e.metaKey : e.ctrlKey) && deps.passes(e),
    isDockChord: () => false,
    chordLabel: () => `${mod}+J`,
    tabs: () => ({ builtin: ['chat', 'shell', 'claude', 'codex', 'cursor', 'antigravity'] }),
    classes: { iconButton: 'icon-button small', button: 'button compact', primaryButton: 'primary', input: '', select: '', note: 'muted' },
    t: (_key, english) => english,
    onTheme: () => undefined,
    keyHeaders,
    errors: {
      message: (err) => (err instanceof EngineError ? err.message : null),
      kind: (err) => {
        if (err instanceof TypeError) return 'unreachable';
        if (!(err instanceof EngineError)) return null;
        if (err.code === 'not_installed') return 'notInstalled';
        if (err.status === 502 || err.status === 503 || err.status === 504) return 'unreachable';
        if (err.status === 403) return 'refused';
        return (err.status === 404 || err.status === 405) && /^(Not Found|Method Not Allowed)$/i.test(err.message) ? 'oldEngine' : null;
      },
    },
    terminal: {
      list: async () => (await call<{ terminals: TermInfo[] }>('GET', '/api/terminal')).terminals.map(record),
      open: async (kind, o) => {
        if (kind === 'shell') return record(await call<TermInfo>('POST', '/api/terminal', { cols: o.cols, rows: o.rows }));
        if (kind !== 'claude') return record(await call<TermInfo>('POST', '/api/terminal/agent', { kind, cols: o.cols, rows: o.rows }));
        const extra = o.prompt ? deps.context() : '';
        return record(await call<TermInfo>('POST', '/api/claudecode', { prompt: o.prompt && extra ? `${o.prompt} (${extra})` : o.prompt ?? '', cols: o.cols, rows: o.rows, resume: o.resume ?? '' }));
      },
      restart: async (id) => { await call('POST', `/api/terminal/${encodeURIComponent(id)}/restart`); },
      close: async (id) => { await call('DELETE', `/api/terminal/${encodeURIComponent(id)}`); },
      channel,
      scrollback: 5000,
    },
    agentStatus: () => call<DockAgentStatus<'antigravity'>>('GET', '/api/agent/status'),
    chat: {
      pane: (host): DockOwnChat => {
        const chat = new ChatPane({ fail: deps.fail, handoff: (session) => deps.claude(undefined, session), select: deps.select, exists: deps.exists });
        chat.root.hidden = false;
        host.append(chat.root);
        return {
          send: async (text) => {
            if (chat.isBusy()) return false;
            await chat.send(text, deps.context(), deps.note());
            return true;
          },
          shown: () => { void chat.load(); },
          busy: () => chat.isBusy(),
        };
      },
      ask: 'line',
    },
    consent: { subscribe: (onAdd, onWithdraw) => outsideAgents.subscribe(onAdd, onWithdraw), answer: (id, choice) => outsideAgents.answer(id, choice) },
    storedChoice: { get: () => outsideAgents.get(), set: (value) => outsideAgents.set(value) },
    openSettings: deps.openSettings,
  };
}
