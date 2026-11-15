import { MenuBar, type MenuDef, type MenuItem } from '../ui/menu';
import { MENUS_IN_WINDOW_KEY, NativeMenus, isMacDesktop, menusInWindow, wantsNativeMenus, type NativeCommands } from '../ui/native-menu';
import { isEnabled, lockLabel, run } from './commands';
import { boardClosed, host, onState, toast } from './editor';
import { commandForKey, onKeysChanged, primaryKey } from './keys';
import { registry } from './registry';

/** The File and Help lists are exported so a feature adds its entry in one line: 'home' first in FILE_ITEMS, a Demos submenu in HELP_ITEMS. */
export const FILE_ITEMS: MenuItem[] = [
  'new-board', 'new-tab', 'new-from-template', '-',
  'open-file', 'open-file-tab', 'open-from-cloud', '-',
  'close-tab', '-',
  'save', 'save-to-cloud', 'save-template', '-',
  { label: 'Export', items: ['export', '-', 'export-png', 'export-all-images', 'export-selected'] }, '-',
  'rename', 'duplicate-board', 'delete-board', '-',
  'trash', '-',
  'copy-clip-token',
];

export const HELP_ITEMS: MenuItem[] = [
  'help', 'commands', '-',
  'sample',
];

const EDIT_ITEMS: MenuItem[] = [
  'undo', 'redo', '-',
  'paste', 'duplicate', 'duplicate-synced', 'unsync', 'delete', '-',
  'select-all', 'deselect', 'select-duplicates', '-',
  { label: 'Find references', items: ['find-color', 'find-swatch-color', 'find-similar', 'filter-rating', '-', 'clear-color-find', 'clear-similar-find', 'clear-tag-filter', 'clear-filters'] },
  { label: 'Saved Searches', items: ['saved-searches', 'save-search', 'save-shared-search'] }, '-',
  'edit-labels', 'open-source', 'format-note', '-',
  { label: 'Tools', items: [
    'tool-select', 'tool-hand', 'tool-direct', '-',
    'draw', 'tool-pencil', 'tool-pen-path', 'tool-curvature', 'tool-eraser', '-',
    'tool-rect', 'tool-circle', 'tool-line', 'tool-connect', '-',
    'measure', 'pick-color', '-',
    'pencil-fidelity',
  ] }, '-',
  'preferences',
];

const VIEW_ITEMS: MenuItem[] = [
  'zoom-in', 'zoom-out', 'reset-zoom', 'fit', 'fit-all', '-',
  'toggle-grid', 'smart-guides', 'navigator', 'focus', '-',
  'grayscale-canvas', 'flip-view-horizontal', 'flip-view-vertical', 'background', '-',
  'present', 'slideshow', 'reference-focus', '-',
  'compare', 'timed-practice', 'practice-log', '-',
  'menus-in-window',
];

const INSERT_ITEMS: MenuItem[] = [
  'note', 'document', 'link', 'todo', 'table', 'column', 'nested-board', 'swatch', '-',
  'images', 'from-web', 'file', '-',
  { label: 'Shapes', items: ['add-polygon', 'add-star', 'add-arc', 'add-spiral', 'add-rect-grid', 'add-polar-grid'] },
];

const IMAGE_ITEMS = (): MenuItem[] => [
  'flip-x', 'flip-y', 'rotate', 'rotate-selection', '-',
  'crop', 'crop-on-canvas', 'lasso-crop', 'clear-lasso', 'reset-crop', '-',
  'grayscale', 'sampling', 'opacity', 'reset-adjust', '-',
  'value-study', 'drawing-grid', 'extract-palette', 'picture-info', '-',
  'remove-background', 'restore-background', '-',
  { label: 'Rating', items: ['rate-1', 'rate-2', 'rate-3', 'rate-4', 'rate-5', '-', 'rate-0'] },
  { label: 'Video', items: ['video-set-in', 'video-set-out', 'video-clear-clip', '-', 'video-frame-back', 'video-frame-forward'] }, '-',
  'pdf-to-images', 'save-image', 'relink',
  ...(host.embedded ? ['-', 'assign'] : []),
];

const ORGANIZE_ITEMS: MenuItem[] = [
  'pack', 'sort-aspect', 'sort-filename', 'sort-similarity', 'sort-color', 'sort-rating', '-',
  'group', 'ungroup', 'name-group', 'collapse-group', 'expand-group', '-',
  'align', 'distribute-x', 'distribute-y', 'normalize', 'normalize-groups', 'snap', '-',
  { label: 'Layer', items: ['front', 'forward', 'backward', 'back', '-', 'lock-stacking'] }, '-',
  'lock', 'unlock-all', 'lock-drops', '-',
  'hide-selected', 'isolate-selected', 'show-all', '-',
  'connect-selected', 'disconnect-selected',
  { label: 'Connection Style', items: [
    'connection-line-solid', 'connection-line-dashed', 'connection-line-dotted', '-',
    'connection-arrow-none', 'connection-arrow-end', 'connection-arrow-start', 'connection-arrow-both', '-',
    { label: 'Route', items: ['connection-route-curved', 'connection-route-straight', 'connection-route-elbow'] },
    { label: 'Color', items: ['connection-color-orange', 'connection-color-red', 'connection-color-yellow', 'connection-color-green', 'connection-color-blue', 'connection-color-purple', 'connection-color-grey', '-', 'connection-color-custom'] }, '-',
    'reverse-connection', 'label-connection',
  ] }, '-',
  'copy-to-board', 'move-to-board', '-',
  { label: 'Path', items: [
    'convert-to-path', 'join-paths', 'cut-path', 'average-anchors', 'add-anchor-points', 'delete-segment', '-',
    'simplify-path', 'smooth-path', 'reverse-path', 'offset-path', 'outline-stroke', '-',
    'round-corners', 'square-corners',
  ] },
  { label: 'Pathfinder', items: ['pathfinder-unite', 'pathfinder-minus-front', 'pathfinder-intersect', 'pathfinder-exclude', 'pathfinder-minus-back', '-', 'pathfinder-divide', 'pathfinder-trim', 'pathfinder-merge', 'pathfinder-crop'] },
];

const WINDOW_ITEMS: MenuItem[] = [
  'left-dock', 'right-dock', '-',
  'agent', 'terminal', 'new-terminal', 'claude-code', 'chat', '-',
  'remember-window', 'forget-window',
];

export const MENUS: MenuDef[] = [
  { label: 'File', items: () => FILE_ITEMS },
  { label: 'Edit', items: EDIT_ITEMS },
  { label: 'View', items: VIEW_ITEMS },
  { label: 'Insert', items: INSERT_ITEMS },
  { label: 'Images', items: IMAGE_ITEMS },
  { label: 'Organize', items: ORGANIZE_ITEMS },
  { label: 'Window', items: WINDOW_ITEMS },
  { label: 'Help', items: () => HELP_ITEMS },
];

const LABELS: Record<string, () => string> = { lock: lockLabel };
const WHILE_TYPING = new Set(['save', 'commands', 'export', 'terminal', 'claude-code', 'chat', 'agent']);

const commands: NativeCommands = {
  get: id => registry.get(id),
  label: command => LABELS[command.id]?.() ?? registry.get(command.id)?.label ?? '',
  enabled: command => { const found = registry.get(command.id); return !!found && isEnabled(found); },
  keyLabel: command => { const found = registry.get(command.id); return found ? primaryKey(found) : ''; },
  keyCombo: command => registry.get(command.id)?.keys?.[0],
  run,
  shortcut: event => !!commandForKey(event),
  forKey: event => commandForKey(event)?.id,
  always: id => WHILE_TYPING.has(id),
};

function toggleMenusInWindow() {
  const next = !menusInWindow();
  try { localStorage.setItem(MENUS_IN_WINDOW_KEY, next ? '1' : '0'); } catch { return; }
  toast(next ? 'The menus stay in the window from the next start.' : 'The menus go to the menu bar from the next start.');
}

export function bindMenus(): void {
  if (isMacDesktop()) registry.add({ group: 'View', id: 'menus-in-window', label: 'Menus in Window', mutates: false, agent: 'window-only', checked: menusInWindow, run: toggleMenusInWindow, description: 'Keeps the menus in the window instead of the macOS menu bar, from the next start.' });
  const bar = document.querySelector<HTMLElement>('.menubar');
  if (bar) new MenuBar(bar, commands, MENUS);
  if (!wantsNativeMenus()) return;
  const native = new NativeMenus(commands, () => MENUS, 'preferences');
  void native.build().catch(() => undefined);
  onState(() => native.refresh());
  boardClosed.push(() => native.refresh());
  registry.onChange(() => native.refresh());
  onKeysChanged(() => { void native.build().catch(() => undefined); });
}
