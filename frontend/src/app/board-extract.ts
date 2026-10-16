import { request } from '../lib/api';
import type { State } from '../lib/types';
import { S, applyState, inputDialog, open, refreshBoards, selected, toast } from './editor';
import { registry } from './registry';

/** Selection to a new board: copy, or move, the selected items (with their column children and the connections between them) onto a new board in a new tab. Moving removes them here in one undoable step. */
async function toBoard(move: boolean, params?: Record<string, unknown>) {
  if (!S.state) return;
  const ids = selected().map(i => i.id);
  if (!ids.length) return;
  let title = typeof params?.title === 'string' ? params.title : '';
  if (!params) {
    const form = await inputDialog(move ? 'Move selection to a new board' : 'Copy selection to a new board', { name: `${S.state.board.title} selection`, submit: move ? 'Move' : 'Copy' });
    if (!form) return;
    title = form.name;
  }
  const result = await request<{ board_id: string; state: State; count: number; source?: State }>(`/boards/${S.state.board.id}/extract`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, title, move }) });
  if (result.source) applyState(result.source);
  await refreshBoards();
  await open(result.board_id, result.state);
  toast(move ? `Moved ${result.count} items to ${result.state.board.title}. Undo on the first board brings them back there.` : `Copied ${result.count} items to ${result.state.board.title}.`);
}

export function registerBoardExtract(): void {
  const has = () => selected().length > 0;
  const params = { title: { type: 'string' as const, description: 'title of the new board; default "<board> selection"' } };
  registry.add(
    { group: 'Organize', id: 'copy-to-board', label: 'Copy Selection to New Board', icon: 'board', run: p => toBoard(false, p), enabled: has, params, description: 'Copies the selected items, their column children and the connections between them onto a new board, opened in a new tab; this board is unchanged.' },
    { group: 'Organize', id: 'move-to-board', label: 'Move Selection to New Board', icon: 'board', run: p => toBoard(true, p), enabled: has, params, description: 'Moves the selected items, their column children and the connections between them onto a new board, opened in a new tab; they leave this board through the Trash, and Undo here brings them back.' },
  );
}
