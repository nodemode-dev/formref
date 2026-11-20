import { Dock } from '../dock/dock';
import { formrefDock, outsideAgents } from '../dock-adapter';
import { showPanel } from '../ui/dock';
import { S, consent, drawCamera, error, selection, setSelection, toast } from './editor';
import { commandForKey } from './keys';
import { registry } from './registry';

let dock: Dock<'antigravity'> | null = null;
let bare = false;

function context(): string {
  const board = S.state?.board;
  if (!board) return 'formref window: no board open';
  const where = `formref window: board id ${board.id}`;
  const ids = [...selection];
  if (!ids.length) return where;
  return `${where}; selection: item ${ids.length === 1 ? 'id' : 'ids'} ${ids.slice(0, 200).join(', ')}${ids.length > 200 ? ` and ${ids.length - 200} more` : ''}`;
}

export function mountDock(): Dock<'antigravity'> {
  if (dock) return dock;
  const made = new Dock(formrefDock({
    context: () => (bare ? '' : context()), fail: toast,
    note: () => { const n = selection.size; return n ? `with ${n} selected ${n === 1 ? 'item' : 'items'}` : ''; },
    claude: (prompt, resume) => { void made.claude(prompt, resume); },
    select: ids => { if (ids.length) setSelection(ids); },
    exists: id => !!S.state?.board.items.some(item => item.id === id),
    openSettings: () => { showPanel('agent'); document.getElementById('agent-outside')?.focus(); },
    passes: event => ['terminal', 'claude-code'].includes(commandForKey(event)?.id ?? ''),  }));
  let wasOpen = made.isOpen();
  made.onChange = () => {
    const open = made.isOpen();
    drawCamera();
    if (wasOpen && !open) document.querySelector<HTMLElement>('.stage')?.focus();
    wasOpen = open;
  };
  made.onResize = () => drawCamera();
  consent.ask = data => outsideAgents.refused(data);
  outsideAgents.onAllowed(() => {
    const box = document.getElementById('agent-outside');
    if (box instanceof HTMLInputElement) box.checked = true;
    toast('Outside agents may now edit boards. Turn this off in the Agent panel.');
  });
  made.mount(document.querySelector<HTMLElement>('.editor')!, document.querySelector('.editor > .statusbar'));
  dock = made;
  return made;
}

export function dockOpen(): boolean {
  return dock ? dock.isOpen() : document.documentElement.getAttribute('data-ft-dock') === 'open';
}

export async function toggleTerminal(): Promise<void> {
  mountDock().toggle();
}

export async function newTerminal(): Promise<void> {
  await mountDock().newTerminal();
}

export async function openClaudeCode(prompt?: string): Promise<void> {
  bare = !!prompt;
  try { await mountDock().claude(prompt); } finally { bare = false; }
}

export async function openChat(): Promise<void> {
  await mountDock().show('chat');
}

export function registerTerminal(): void {
  registry.add(
    { group: 'Terminal', id: 'chat', label: 'Chat with Claude', icon: 'comment', keys: ['mod+alt+j'], agent: 'window-only', mutates: false, run: () => openChat().catch(error), description: 'Opens the Chat tab in the terminal dock: Claude answers in formatted text, working on the board through FormRef\'s tools, with every tool call shown.' },
    { group: 'Terminal', id: 'terminal', label: 'Show Terminal', icon: 'terminal', keys: ['mod+j'], checked: dockOpen, agent: 'window-only', mutates: false, run: () => toggleTerminal().catch(error), description: 'Shows or hides the terminal dock under the canvas; its shells keep running while hidden.' },
    { group: 'Terminal', id: 'new-terminal', label: 'New Terminal', icon: 'plus', agent: 'window-only', mutates: false, run: () => newTerminal().catch(error), description: 'Opens another login shell tab in the terminal dock.' },
    { group: 'Terminal', id: 'claude-code', label: 'Claude Code', icon: 'agent', keys: ['mod+shift+j'], agent: 'window-only', mutates: false, run: params => openClaudeCode(typeof params?.prompt === 'string' ? params.prompt : undefined).catch(error), params: { prompt: { type: 'string', description: 'a first message for the session' } }, description: 'Starts the person\'s own Claude Code in a dock tab, connected to FormRef\'s tools.' },
  );
}
