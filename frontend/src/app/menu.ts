import type { MenuEntry } from '../ui/context-menu';
import { BY_ID, SNAP_SCALES, isEnabled, lockLabel, primaryKey, run, snapScale, snapScaleNow } from './commands';
import { S, defaultSettings, selection } from './editor';

function item(id: string, label?: string): MenuEntry {
  const command = BY_ID.get(id)!;
  return {
    label: label || command.label,
    icon: command.icon,
    shortcut: primaryKey(command),
    disabled: !isEnabled(command),
    danger: id === 'delete',
    ...(command.checked ? { checked: command.checked() } : {}),
    action: () => run(id),
  };
}

const sep: MenuEntry = { separator: true };

function snapMenu(): MenuEntry[] {
  const now = snapScaleNow();
  return SNAP_SCALES.map(scale => ({
    label: scale ? `${scale}x` : 'Off',
    checked: Math.abs(now - scale) < 1e-6,
    action: () => void snapScale(scale),
  }));
}

export function boardMenu(): MenuEntry[] {
  const settings = S.state?.board.settings || defaultSettings;
  return [
    { section: 'File' },
    item('new-board'),
    item('new-tab'),
    item('open-file'),
    item('open-file-tab'),
    item('images'),
    item('paste'),
    sep,
    { label: 'Save / Export', icon: 'save', children: [item('save'), sep, item('export-png'), item('export-all-images'), item('export-selected'), sep, item('export'), sep, item('save-to-cloud'), item('open-from-cloud')] },
    sep,
    { section: 'Edit' },
    item('undo'),
    item('redo'),
    sep,
    item('select-all'),
    item('deselect'),
    sep,
    {
      label: 'Canvas', icon: 'grid', children: [
        { ...item('toggle-grid'), checked: settings.grid_visible },
        { label: 'Snap Grid', icon: 'snap', children: snapMenu() },
        { ...item('grayscale-canvas'), checked: settings.grayscale },
        item('flip-view-horizontal'),
        item('flip-view-vertical'),
        item('background'),
        sep,
        item('fit'),
        item('fit-all'),
        item('reset-zoom'),
      ],
    },
    {
      label: 'Organize', icon: 'pack', children: [
        item('pack'),
        sep,
        item('sort-aspect'),
        item('sort-filename'),
        item('sort-similarity'),
        sep,
        item('group'),
        item('ungroup'),
        sep,
        item('align'),
        item('distribute-x'),
        item('distribute-y'),
        item('normalize'),
        item('snap'),
        sep,
        item('select-duplicates'),
        item('hide-selected'),
        item('isolate-selected'),
        item('show-all'),
        item('unlock-all'),
      ],
    },
    {
      label: 'Images', icon: 'image', children: [
        item('flip-x'),
        item('flip-y'),
        sep,
        item('pdf-to-images'),
        sep,
        item('grayscale'),
        item('sampling'),
        sep,
        item('opacity'),
        sep,
        item('crop'),
        item('reset-crop'),
        sep,
        item('remove-background'),
        item('restore-background'),
        sep,
        item('rotate'),
        sep,
        item('save-image'),
        item('relink'),
      ],
    },
    { label: 'Layer', icon: 'layers', children: [item('front'), item('forward'), item('backward'), item('back')] },
    sep,
    { ...item('lock', lockLabel()), icon: lockLabel().startsWith('Unlock') ? 'unlock' : 'lock' },
    item('note'),
    {
      label: 'Insert', icon: 'plus', children: [
        item('document'), item('link'), item('todo'), item('table'), item('column'), item('nested-board'), item('swatch'), item('file'), item('from-web'), sep, item('duplicate-synced'), item('unsync'), sep, item('pick-color'),
      ],
    },
    item('draw'),
    item('slideshow'),
    item('present'),
    { label: selection.size ? 'Ask Agent About Selection' : 'Ask Agent', icon: 'agent', shortcut: primaryKey(BY_ID.get('agent')!), action: () => run('agent') },
    sep,
    item('delete'),
  ];
}
