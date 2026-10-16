import { newItem } from '../../lib/types';
import { askForUrl } from '../capture';
import { openLabels } from '../labels';
import { S, add, execute, inputDialog, openEditor, placement, setSelection, setTool, topZ } from '../editor';
import type { CommandDef } from '../registry';
import { hasBoard } from './when';

function addNoteHere() {
  return add('note');
}

async function addDocument() {
  if (!S.state) return;
  const boardId = S.state.board.id;
  const p = placement();
  const item = newItem('document', p.x, p.y, { title: 'New document', text: '# A new direction\n\nCollect your thoughts here.', width: 360, height: 300, data: { text_format: 'markdown' }, z: topZ() });
  await execute({ type: 'add', items: [item] }, boardId);
  if (S.state?.board.id === boardId && S.state.board.items.some(i => i.id === item.id)) {
    setSelection([item.id]);
    openEditor(item.id);
  }
}

async function addSwatch() {
  const form = await inputDialog('Add color swatch', { name: '#f97316', label: 'HEX color', description: 'Use #RRGGBB or #RRGGBBAA. Alpha remains part of the saved color.' });
  if (!form) return;
  if (!/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(form.name)) throw new Error('Enter exactly #RRGGBB or #RRGGBBAA.');
  const p = placement();
  const item = newItem('swatch', p.x, p.y, { title: 'Color swatch', color: form.name, width: 220, height: 200, z: topZ() });
  await execute({ type: 'add', items: [item] });
  setSelection([item.id]);
}

export const INSERT_COMMANDS: CommandDef[] = [
  { group: 'Insert', id: 'note', label: 'Add Note', icon: 'note', keys: ['n'], run: addNoteHere, enabled: hasBoard },
  { group: 'Insert', id: 'document', label: 'Add Document', icon: 'document', run: addDocument, enabled: hasBoard },
  { group: 'Insert', id: 'link', label: 'Add Link', icon: 'link', keys: ['shift+l'], run: () => add('link'), enabled: hasBoard },
  { group: 'Insert', id: 'table', label: 'Add Table', icon: 'table', run: () => add('table'), enabled: hasBoard },
  { group: 'Insert', id: 'from-web', label: 'Add Images from the Web…', icon: 'web-image', run: askForUrl, enabled: hasBoard },
  { group: 'Edit', id: 'edit-labels', label: 'Edit Board Labels', icon: 'label', run: openLabels, enabled: hasBoard },
  { group: 'Insert', id: 'todo', label: 'Add Task', icon: 'todo', run: () => add('todo'), enabled: hasBoard },
  { group: 'Insert', id: 'column', label: 'Add Column', icon: 'column', run: () => add('column'), enabled: hasBoard },
  { group: 'Insert', id: 'nested-board', label: 'Add Nested Board', icon: 'board', run: () => add('board'), enabled: hasBoard },
  { group: 'Insert', id: 'swatch', label: 'Add Color Swatch', icon: 'swatch', run: addSwatch, enabled: hasBoard },
  { group: 'Insert', id: 'pick-color', label: 'Sample Image Color', icon: 'pipette', keys: ['i'], run: () => setTool('sample'), enabled: hasBoard },
];
