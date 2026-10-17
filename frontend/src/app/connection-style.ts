import type { Connection } from '../lib/types';
import type { MenuEntry } from '../ui/context-menu';
import { S, execute, inputDialog, scene, selected } from './editor';
import { registry } from './registry';
import { BY_ID, isEnabled, run } from './commands';

/** Connection styles (reference-board gap: Milanote and Miro let a line say which way it reads): solid, dashed or dotted lines and arrowheads at either end. The chosen connection is styled, otherwise every connection that touches the selection, in one undo step. */

type Line = NonNullable<Connection['line']>;
type Arrow = NonNullable<Connection['arrow']>;

const LINES: Array<[Line, string, string]> = [
  ['', 'solid', 'Solid Line'],
  ['dashed', 'dashed', 'Dashed Line'],
  ['dotted', 'dotted', 'Dotted Line'],
];
const ARROWS: Array<[Arrow, string, string]> = [
  ['', 'none', 'No Arrowheads'],
  ['end', 'end', 'Arrow at End'],
  ['start', 'start', 'Arrow at Start'],
  ['both', 'both', 'Arrows at Both Ends'],
];
/** Line colours (v0.29.0): orange is what new connections get. */
const COLORS: Array<[string, string, string]> = [
  ['#f97316', 'orange', 'Orange'],
  ['#ef4444', 'red', 'Red'],
  ['#eab308', 'yellow', 'Yellow'],
  ['#22c55e', 'green', 'Green'],
  ['#3b82f6', 'blue', 'Blue'],
  ['#a855f7', 'purple', 'Purple'],
  ['#8c97ad', 'grey', 'Grey'],
];
const sameColor = (a = '', b = '') => a.trim().toLowerCase() === b.toLowerCase();

/** One hidden colour input for Custom Color, made once and reused; it sits where the last menu opened so the browser's picker appears there. */
let picker: HTMLInputElement | null = null;
let menuPoint = { x: 0, y: 0 };
let pickerTargets: string[] = [];
function customColor(): void {
  const ids = targets().map(c => c.id);
  if (!ids.length) throw new Error('Choose a connection, or select references that have connections.');
  if (!picker) {
    picker = document.createElement('input');
    picker.type = 'color';
    picker.className = 'connection-color-input';
    picker.tabIndex = -1;
    picker.setAttribute('aria-hidden', 'true');
    picker.addEventListener('change', () => {
      if (pickerTargets.length && picker) void execute({ type: 'style_connections', ids: pickerTargets, color: picker.value });
    });
    document.body.append(picker);
  }
  pickerTargets = ids;
  const first = targets()[0]?.color || '';
  picker.value = /^#[0-9a-f]{6}$/i.test(first) ? first.toLowerCase() : '#f97316';
  picker.style.left = `${menuPoint.x}px`;
  picker.style.top = `${menuPoint.y}px`;
  if (typeof picker.showPicker === 'function') picker.showPicker(); else picker.click();
}

/** The connections a style applies to: the chosen one, or those touching a selected item or a group that has a selected member. */
function targets(): Connection[] {
  const connections = S.state?.board.connections || [];
  if (S.chosenConnection) return connections.filter(c => c.id === S.chosenConnection);
  const ends = new Set<string>();
  for (const item of selected()) { ends.add(item.id); if (item.group_id) ends.add('group:' + item.group_id); }
  return connections.filter(c => ends.has(c.from) || ends.has(c.to));
}

async function style(patch: { line?: Line; arrow?: Arrow; label?: string; color?: string; reverse?: boolean }): Promise<void> {
  const ids = targets().map(c => c.id);
  if (!ids.length) throw new Error('Choose a connection, or select references that have connections.');
  await execute({ type: 'style_connections', ids, ...patch });
}

/** Asks for a connection's label and saves it in place, keeping the connection's id and style. */
export function labelConnection(id: string): void {
  const record = S.state?.board.connections.find(c => c.id === id);
  if (!record) return;
  void inputDialog('Label connection', { name: record.label, submit: 'Save' }).then(form => {
    if (form) return execute({ type: 'style_connections', ids: [record.id], label: form.name });
  });
}

/** Chooses one connection: the selection clears and only that line is marked. */
export function chooseConnection(id: string): void {
  S.chosenConnection = id;
  scene.chooseLine(id);
}

function entry(id: string, swatch?: string): MenuEntry {
  const command = BY_ID.get(id)!;
  return { label: command.label, disabled: !isEnabled(command), checked: command.checked?.(), action: () => run(id), ...(swatch ? { swatch } : {}) };
}

const sep: MenuEntry = { separator: true };
const lineEntries = () => LINES.map(([, key]) => entry(`connection-line-${key}`));
const arrowEntries = () => ARROWS.map(([, key]) => entry(`connection-arrow-${key}`));
const colorMenu = (): MenuEntry => ({ label: 'Color', icon: 'palette', children: [...COLORS.map(([hex, key]) => entry(`connection-color-${key}`, hex)), sep, entry('connection-color-custom')] });

/** The board menu's submenu, offered when the selection touches connections. */
export function connectionStyleMenu(): MenuEntry[] {
  if (S.chosenConnection || !targets().length) return [];
  return [{ label: 'Connection Style', icon: 'connect', children: [...lineEntries(), sep, ...arrowEntries(), sep, colorMenu(), entry('reverse-connection')] }];
}

/** The menu for a right-clicked connection. */
export function connectionMenu(): MenuEntry[] {
  const remove = BY_ID.get('delete')!;
  return [
    { section: 'Connection' },
    ...lineEntries(), sep, ...arrowEntries(), sep,
    colorMenu(),
    entry('reverse-connection'),
    sep,
    { label: BY_ID.get('label-connection')!.label, icon: 'pen', action: () => run('label-connection') },
    sep,
    { label: 'Remove Connection', icon: remove.icon, danger: true, action: () => run('delete') },
  ];
}

export function registerConnectionStyle(): void {
  // Where the last right-click menu opened, so Custom Color's picker appears beside it.
  document.addEventListener('contextmenu', event => { menuPoint = { x: event.clientX, y: event.clientY }; }, true);
  const any = () => targets().length > 0;
  const every = (test: (c: Connection) => boolean) => () => { const list = targets(); return list.length > 0 && list.every(test); };
  registry.add(
    ...LINES.map(([line, key, label]) => ({ group: 'Organize', id: `connection-line-${key}`, label, icon: 'connect' as const, enabled: any, checked: every(c => (c.line || '') === line), run: () => style({ line }) })),
    ...ARROWS.map(([arrow, key, label]) => ({ group: 'Organize', id: `connection-arrow-${key}`, label, icon: 'connect' as const, enabled: any, checked: every(c => (c.arrow || '') === arrow), run: () => style({ arrow }) })),
    ...COLORS.map(([color, key, label]) => ({ group: 'Organize', id: `connection-color-${key}`, label, icon: 'connect' as const, enabled: any, checked: every(c => sameColor(c.color, color)), run: () => style({ color }) })),
    { group: 'Organize', id: 'connection-color-custom', label: 'Custom Color…', icon: 'palette', agent: 'window-only', enabled: any, run: () => customColor() },
    { group: 'Organize', id: 'reverse-connection', label: 'Reverse Direction', icon: 'connect', enabled: () => targets().some(c => c.arrow === 'end' || c.arrow === 'start'), run: () => style({ reverse: true }) },
    { group: 'Organize', id: 'label-connection', label: 'Label Connection…', icon: 'pen', agent: 'window-only', enabled: () => !!S.chosenConnection, run: () => { if (S.chosenConnection) labelConnection(S.chosenConnection); } },
  );
}
