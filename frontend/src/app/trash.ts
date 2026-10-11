import { request } from '../lib/api';
import type { State } from '../lib/types';
import { icon } from '../ui/icons';
import { $, S, applyState, error, open, refreshBoards, toast } from './editor';

interface TrashedBoard { id: string; title: string; item_count: number; deleted_at: number }
interface TrashedItems { id: string; at: number; count: number; names: string[]; kinds: string[] }
interface Trash { boards: TrashedBoard[]; items: TrashedItems[] }

const dialog = $<HTMLDialogElement>('trash-dialog');
const itemList = $('trash-items');
const boardList = $('trash-boards');

function when(seconds: number): string {
  const minutes = Math.round((Date.now() / 1000 - seconds) / 60);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return new Date(seconds * 1000).toLocaleDateString();
}

function row(kind: string, title: string, detail: string, actions: [string, string, () => Promise<void>][]): HTMLElement {
  const node = document.createElement('div');
  node.className = 'trash-row';
  const text = document.createElement('div');
  text.className = 'trash-text';
  const name = document.createElement('strong');
  name.textContent = title;
  const small = document.createElement('small');
  small.textContent = detail;
  text.append(name, small);
  node.append(icon(kind), text);
  for (const [label, iconName, act] of actions) {
    const button = document.createElement('button');
    button.className = iconName === 'delete' ? 'button compact danger' : 'button compact';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.append(icon(iconName), document.createTextNode(iconName === 'delete' ? 'Delete' : 'Restore'));
    button.addEventListener('click', () => {
      button.disabled = true;
      void act().catch(error).finally(() => void render());
    });
    node.append(button);
  }
  return node;
}

function empty(text: string): HTMLElement {
  const node = document.createElement('p');
  node.className = 'field-description';
  node.textContent = text;
  return node;
}

async function render() {
  const boardId = S.state?.board.id || '';
  const trash = await request<Trash>(`/trash${boardId ? `?board_id=${boardId}` : ''}`);
  const items = trash.items.map(entry => row(entry.kinds.length === 1 && entry.kinds[0] ? entry.kinds[0] : 'layers',
    entry.names.join(', ') + (entry.count > entry.names.length ? ` and ${entry.count - entry.names.length} more` : ''),
    `${entry.count} item${entry.count === 1 ? '' : 's'} · removed ${when(entry.at)}`, [
      ['Put back on the board', 'restore', async () => {
        const state = await request<State>(`/trash/items/${boardId}/${entry.id}/restore`, { method: 'POST' });
        applyState(state);
        toast(`Put back ${entry.count} item${entry.count === 1 ? '' : 's'}. Undo removes them again.`);
      }],
      ['Delete forever', 'delete', async () => { await request(`/trash/items/${boardId}/${entry.id}`, { method: 'DELETE' }); }],
    ]));
  const boards = trash.boards.map(board => row('board', board.title, `${board.item_count} item${board.item_count === 1 ? '' : 's'} · deleted ${when(board.deleted_at)}`, [
    ['Restore board', 'restore', async () => {
      await request(`/trash/boards/${board.id}/restore`, { method: 'POST' });
      await refreshBoards();
      dialog.close();
      await open(board.id);
      toast(`Restored ${board.title}.`);
    }],
    ['Delete forever', 'delete', async () => { await request(`/trash/boards/${board.id}`, { method: 'DELETE' }); }],
  ]));
  itemList.replaceChildren(...(items.length ? items : [empty(boardId ? 'Nothing has been removed from this board.' : 'Open a board to see what was removed from it.')]));
  boardList.replaceChildren(...(boards.length ? boards : [empty('No deleted boards.')]));
  $<HTMLButtonElement>('trash-empty').disabled = !items.length && !boards.length;
}

export async function openTrash() {
  await render();
  if (!dialog.open) dialog.showModal();
}

const emptyButton = $<HTMLButtonElement>('trash-empty');
const emptyLabel = emptyButton.lastChild!;
function disarm() {
  delete emptyButton.dataset.armed;
  emptyLabel.textContent = 'Empty Trash';
}
dialog.addEventListener('close', disarm);
emptyButton.addEventListener('click', () => {
  if (!emptyButton.dataset.armed) {
    emptyButton.dataset.armed = '1';
    emptyLabel.textContent = 'Click to confirm';
    return;
  }
  disarm();
  void (async () => {
    await request('/trash', { method: 'DELETE' });
    toast('Trash emptied.');
    await render();
  })().catch(error);
});
