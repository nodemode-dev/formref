import { icon } from '../ui/icons';
import { $, S, error, leaveBoard, onState, open, start } from './editor';

const strip = $('board-tabs');
const nodes = new Map<string, HTMLDivElement>();
let order: string[] = [];
let saveTimer = 0;
let replaceNext = false;

function persist() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const active = S.state?.board.id || '';
    void fetch('/api/session', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ open: order, active: order.includes(active) ? active : '' }),
    }).catch(() => undefined);
  }, 300);
}

function node(id: string, title: string): HTMLDivElement {
  let tab = nodes.get(id);
  if (tab) return tab;
  tab = document.createElement('div');
  tab.className = 'board-tab';
  tab.setAttribute('role', 'tab');
  tab.dataset.id = id;
  const label = document.createElement('button');
  label.className = 'board-tab-label';
  label.textContent = title;
  label.addEventListener('click', () => { if (S.state?.board.id !== id) void open(id).catch(error); });
  label.addEventListener('dblclick', () => $('board-title').click());
  label.addEventListener('auxclick', event => { if (event.button === 1) close(id); });
  const shut = document.createElement('button');
  shut.className = 'board-tab-close icon-button small';
  shut.setAttribute('aria-label', `Close ${title}`);
  shut.title = 'Close tab';
  shut.append(icon('close'));
  shut.addEventListener('click', event => { event.stopPropagation(); close(id); });
  tab.append(label, shut);
  nodes.set(id, tab);
  return tab;
}

function place() {
  order.filter(id => nodes.has(id)).forEach((id, index) => {
    const tab = nodes.get(id)!;
    if (strip.children[index] !== tab) strip.insertBefore(tab, strip.children[index] || null);
  });
  for (const listener of tabListeners) listener();
}

const tabListeners: (() => void)[] = [];
/** The open boards in tab order, for the Home page's way back. */
export function openTabs(): { id: string; title: string }[] {
  return order.filter(id => nodes.has(id)).map(id => ({ id, title: nodes.get(id)!.firstElementChild!.textContent || '' }));
}
export function onTabs(listener: () => void) { tabListeners.push(listener); }

export function close(id: string) {
  const index = order.indexOf(id);
  if (index < 0) return;
  order.splice(index, 1);
  nodes.get(id)?.remove();
  nodes.delete(id);
  place();
  if (S.state?.board.id === id) {
    if (order.length) void open(order[Math.max(0, index - 1)]).catch(error);
    else void leaveBoard();
  }
  persist();
}

export function forget(id: string) {
  const index = order.indexOf(id);
  if (index < 0) return;
  order.splice(index, 1);
  nodes.get(id)?.remove();
  nodes.delete(id);
  place();
  persist();
}

export function replaceActiveWithNext() {
  replaceNext = true;
}

onState(state => {
  const id = state.board.id;
  if (!order.includes(id)) {
    const active = order.findIndex(other => nodes.get(other)?.classList.contains('active'));
    if (replaceNext && active >= 0) {
      const old = order[active];
      order[active] = id;
      nodes.get(old)?.remove();
      nodes.delete(old);
    } else {
      order.splice(active >= 0 ? active + 1 : order.length, 0, id);
    }
    replaceNext = false;
    persist();
  }
  if (!nodes.has(id)) {
    node(id, state.board.title);
    place();
  }
  for (const [tabId, tab] of nodes) {
    const isActive = tabId === id;
    if (tab.classList.contains('active') !== isActive) {
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
      if (isActive) persist();
    }
  }
  const label = nodes.get(id)!.firstElementChild!;
  if (label.textContent !== state.board.title) label.textContent = state.board.title;
});

export async function restore() {
  try {
    const response = await fetch('/api/session');
    const session = await response.json() as { open: string[]; active: string };
    if (session.open?.length) {
      const boards = await fetch('/api/boards').then(r => r.json()) as { id: string; title: string }[] | { boards: { id: string; title: string }[] };
      const titles = new Map((Array.isArray(boards) ? boards : boards.boards).map(b => [b.id, b.title]));
      order = session.open.filter(id => titles.has(id));
      for (const id of order) node(id, titles.get(id)!);
      place();
      if (order.length) {
        await open(order.includes(session.active) ? session.active : order[0]);
        return;
      }
    }
  } catch { }
  await start();
}
