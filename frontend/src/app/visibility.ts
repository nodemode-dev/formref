import { S, execute, selected, selection, setSelection, toast } from './editor';
import { registry } from './registry';

const items = () => S.state?.board.items || [];

async function hideSelected() {
  const ids = selected().map(i => i.id);
  if (!ids.length) return;
  await execute({ type: 'update', ids, patch: { hidden: true } });
  setSelection([]);
}

async function showAll() {
  const hidden = items().filter(i => i.hidden);
  if (!hidden.length) { toast('Nothing on this board is hidden.'); return; }
  await execute({ type: 'update', ids: hidden.map(i => i.id), patch: { hidden: false } });
  setSelection(hidden.map(i => i.id));
}

/** Isolate: hides every top-level item outside the selection and the selection's own children; Show All brings them back. */
async function isolate() {
  const keep = new Set(selection);
  for (const i of items()) if (i.parent_id && keep.has(i.parent_id)) keep.add(i.id);
  for (const i of items()) if (keep.has(i.id) && i.parent_id) keep.add(i.parent_id);
  const ids = items().filter(i => !keep.has(i.id) && !i.hidden).map(i => i.id);
  if (!ids.length) return;
  await execute({ type: 'update', ids, patch: { hidden: true } });
  toast(`Isolated: ${ids.length} other items hidden. Show All brings them back.`);
}

async function unlockAll() {
  const locked = items().filter(i => i.locked);
  if (!locked.length) { toast('Nothing on this board is locked.'); return; }
  await execute({ type: 'update', ids: locked.map(i => i.id), patch: { locked: false } });
  setSelection(locked.map(i => i.id));
}

export function registerVisibility(): void {
  const has = () => selection.size > 0;
  const board = () => !!S.state;
  registry.add(
    { group: 'Organize', id: 'hide-selected', label: 'Hide Selected', icon: 'eye', keys: ['mod+3'], run: hideSelected, enabled: has, description: 'Hides the selected items; they stay on the board and come back with Show All.' },
    { group: 'Organize', id: 'show-all', label: 'Show All', icon: 'eye', keys: ['mod+alt+3'], run: showAll, enabled: board, description: 'Shows every hidden item on the board and selects them.' },
    { group: 'Organize', id: 'isolate-selected', label: 'Isolate Selected', icon: 'fit', run: isolate, enabled: has, description: 'Hides everything except the selection (and the items inside selected columns) so a big board can be worked on piece by piece; Show All restores the rest.' },
    { group: 'Organize', id: 'unlock-all', label: 'Unlock All', icon: 'unlock', keys: ['mod+alt+2'], run: unlockAll, enabled: board, description: 'Unlocks every locked item on the board and selects them.' },
  );
}
