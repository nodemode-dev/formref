import { $, arrange, editable, execute, inputDialog, selected, selection, targetIds } from '../editor';
import type { CommandDef } from '../registry';
import { has, hasBoard } from './when';

async function normalize() {
  const form = await inputDialog('Normalize selected references', { name: '300', normalize: true, label: 'Target size', description: 'Choose width, height or area. Each reference keeps its aspect ratio. Measurements use visible bounds after rotation.', submit: 'Apply' });
  if (!form) return;
  const value = Number(form.name);
  if (!Number.isFinite(value) || value <= 0) throw new Error('Enter a positive target size');
  await execute({ type: 'normalize', ids: editable(), mode: $<HTMLSelectElement>('normalize-mode').value, value });
}

function sortBy(key: 'filename' | 'aspect' | 'similarity' | 'color') {
  const ids = targetIds();
  if (ids.length < 2) throw new Error('Select at least two references to sort, or clear the selection to sort the board.');
  return execute({ type: 'sort', ids, key, gap: Number($<HTMLInputElement>('pack-gap').value) || 24 });
}

export const ORGANIZE_COMMANDS: CommandDef[] = [
  { group: 'Organize', id: 'pack', label: 'Pack', icon: 'pack', keys: ['mod+p'], run: () => arrange('pack'), enabled: hasBoard },
  { group: 'Organize', id: 'sort-aspect', label: 'Sort by Aspect Ratio', icon: 'sort', run: () => sortBy('aspect'), enabled: hasBoard },
  { group: 'Organize', id: 'sort-filename', label: 'Sort by Filename', icon: 'sort', run: () => sortBy('filename'), enabled: hasBoard },
  { group: 'Organize', id: 'sort-similarity', label: 'Sort by Similarity', icon: 'similarity', run: () => sortBy('similarity'), enabled: hasBoard },
  { group: 'Organize', id: 'sort-color', label: 'Sort by Color', icon: 'palette', run: () => sortBy('color'), enabled: hasBoard },
  { group: 'Organize', id: 'group', label: 'Group Selected', icon: 'group', keys: ['mod+g'], run: () => execute({ type: 'group', ids: editable() }), enabled: () => selection.size > 1 },
  { group: 'Organize', id: 'ungroup', label: 'Ungroup Selected', icon: 'ungroup', keys: ['mod+shift+g'], run: () => execute({ type: 'ungroup', ids: editable() }), enabled: () => selected().some(i => i.group_id) },
  { group: 'Organize', id: 'align', label: 'Align', icon: 'align-left', run: () => execute({ type: 'align', ids: editable(), mode: $<HTMLSelectElement>('align-mode').value }), enabled: () => selection.size > 1 },
  { group: 'Organize', id: 'distribute-x', label: 'Space Horizontally', icon: 'distribute-h', run: () => arrange('distribute', 'x'), enabled: () => selection.size > 1 },
  { group: 'Organize', id: 'distribute-y', label: 'Space Vertically', icon: 'distribute-v', run: () => arrange('distribute', 'y'), enabled: () => selection.size > 1 },
  { group: 'Organize', id: 'normalize', label: 'Normalize Sizes', icon: 'normalize', run: normalize, enabled: () => selection.size > 1 },
  { group: 'Organize', id: 'snap', label: 'Snap Selection to Grid', icon: 'snap', run: () => execute({ type: 'snap', ids: editable() }), enabled: has },
];
