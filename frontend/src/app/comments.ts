import { request } from '../lib/api';
import { relativeTime, t } from '../lib/i18n';
import type { Item, State } from '../lib/types';
import { icon } from '../ui/icons';
import { $, S, applyState, error, onInspector, setText } from './editor';

interface Comment { id: string; text: string; author: string; at: number; resolved?: boolean }

const section = $('comment-section');
const list = $('comment-list');
const input = $<HTMLTextAreaElement>('comment-input');
const addButton = $<HTMLButtonElement>('comment-add');
const rows = new Map<string, HTMLElement>();
let itemId: string | null = null;

const when = relativeTime;

async function send(path: string, method: string, body?: unknown) {
  const boardId = S.state?.board.id;
  if (!boardId || !itemId) return;
  await S.queue;
  const state = await request<State>(`/boards/${boardId}/items/${itemId}/comments${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
  applyState(state);
}

function button(label: string, name: string, act: () => Promise<void>): HTMLButtonElement {
  const node = document.createElement('button');
  node.className = 'icon-button small';
  node.title = label;
  node.setAttribute('aria-label', label);
  node.append(icon(name));
  node.addEventListener('click', () => void act().catch(error));
  return node;
}

function row(comment: Comment): HTMLElement {
  let node = rows.get(comment.id);
  if (!node) {
    node = document.createElement('div');
    node.className = 'comment';
    const head = document.createElement('div');
    head.className = 'comment-head';
    const author = document.createElement('strong');
    const time = document.createElement('small');
    const resolve = button('Resolve', 'resolve', () => send(`/${comment.id}/resolve`, 'POST', { resolved: !node!.classList.contains('resolved') }));
    const remove = button('Delete comment', 'delete', () => send(`/${comment.id}`, 'DELETE'));
    head.append(author, time, resolve, remove);
    const body = document.createElement('p');
    node.append(head, body);
    rows.set(comment.id, node);
  }
  const [head, body] = node.children as unknown as [HTMLElement, HTMLElement];
  const [author, time, resolve] = head.children as unknown as [HTMLElement, HTMLElement, HTMLButtonElement];
  if (author.textContent !== comment.author) author.textContent = comment.author;
  const stamp = when(comment.at) + (comment.resolved ? ' · ' + t('Resolved') : '');
  if (time.textContent !== stamp) time.textContent = stamp;
  if (body.textContent !== comment.text) body.textContent = comment.text;
  node.classList.toggle('resolved', !!comment.resolved);
  resolve.title = comment.resolved ? 'Reopen' : 'Resolve';
  resolve.setAttribute('aria-label', resolve.title);
  return node;
}

function render(items: Item[]) {
  const item = items.length === 1 ? items[0] : null;
  section.hidden = !item;
  if (!item) { itemId = null; return; }
  if (itemId !== item.id) { input.value = ''; itemId = item.id; }
  const comments = (Array.isArray(item.data.comments) ? item.data.comments : []) as Comment[];
  const keep = new Set(comments.map(c => c.id));
  for (const [id, node] of rows) if (!keep.has(id)) { node.remove(); rows.delete(id); }
  comments.forEach((comment, index) => {
    const node = row(comment);
    if (list.children[index] !== node) list.insertBefore(node, list.children[index] || null);
  });
  setText('comment-count', String(comments.filter(c => !c.resolved).length));
  addButton.disabled = item.locked;
}
onInspector(render);

async function add() {
  const text = input.value.trim();
  if (!text) return;
  addButton.disabled = true;
  try {
    await send('', 'POST', { text });
    input.value = '';
  } finally {
    addButton.disabled = false;
  }
}
addButton.addEventListener('click', () => void add().catch(error));
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    void add().catch(error);
  }
});
