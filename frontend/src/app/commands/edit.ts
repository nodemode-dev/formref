import type { Command } from '../../lib/types';
import { S, editable, execute, history, matches, selected, setSelection, setTool } from '../editor';
import type { CommandDef } from '../registry';
import { anyLocked, has, hasBoard } from './when';

function removeSelection() {
  if (S.chosenConnection) {
    const id = S.chosenConnection;
    S.chosenConnection = null;
    return execute({ type: 'disconnect', ids: [id] });
  }
  return execute({ type: 'remove', ids: editable() });
}

function selectAll() {
  setSelection(S.state?.board.items.filter(i => !i.hidden && matches(i)).map(i => i.id) || []);
}

function toggleLock() {
  const items = selected();
  if (!items.length) return;
  const lock = !items.some(i => i.locked);
  return execute({ type: 'update', ids: items.map(i => i.id), patch: { locked: lock } });
}

export function lockLabel(): string {
  return anyLocked() ? 'Unlock Selected' : 'Lock Selected';
}

export const EDIT_COMMANDS: CommandDef[] = [
  { group: 'Edit', id: 'undo', label: 'Undo', icon: 'undo', keys: ['mod+z'], run: () => history('undo'), enabled: () => !!S.state?.can_undo },
  { group: 'Edit', id: 'redo', label: 'Redo', icon: 'redo', keys: ['mod+y', 'mod+shift+z'], run: () => history('redo'), enabled: () => !!S.state?.can_redo },
  { group: 'Edit', id: 'select-all', label: 'Select All', icon: 'select-all', keys: ['mod+a'], run: selectAll, enabled: hasBoard },
  { group: 'Edit', id: 'deselect', label: 'Deselect All', icon: 'deselect', keys: ['escape'], run: () => { setSelection([]); setTool('select'); }, enabled: has },
  { group: 'Edit', id: 'duplicate', label: 'Duplicate', icon: 'duplicate', keys: ['mod+d'], run: () => execute({ type: 'duplicate', ids: editable() }), enabled: has },
  { group: 'Edit', id: 'duplicate-synced', label: 'Synced Copy', icon: 'sync', run: () => execute({ type: 'duplicate', ids: selected().filter(i => !i.locked && ['note', 'document'].includes(i.kind)).map(i => i.id), synced: true } as Command), enabled: () => selected().some(i => ['note', 'document'].includes(i.kind)) },
  { group: 'Edit', id: 'unsync', label: 'Stop Syncing', icon: 'unsync', run: () => execute({ type: 'update', ids: selected().filter(i => i.data.sync_id && !i.locked).map(i => i.id), patch: { data: { sync_id: null } } }), enabled: () => selected().some(i => !!i.data.sync_id) },
  { group: 'Edit', id: 'delete', label: 'Delete Selected', icon: 'trash', keys: ['delete', 'backspace'], run: removeSelection, enabled: () => has() || !!S.chosenConnection },
  { group: 'Edit', id: 'lock', label: 'Lock Selected', icon: 'lock', keys: ['l'], run: toggleLock, enabled: has },
];
