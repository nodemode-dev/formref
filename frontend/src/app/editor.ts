import { api, request } from '../lib/api';
import type { Asset, Command, Item, Kind, Point, State, Summary, Viewport } from '../lib/types';
import { emptyTable } from '../lib/table';
import { embedUrl } from '../lib/media';
import { newItem } from '../lib/types';
import { HostLink } from '../lib/host';
import { itemBounds } from '../lib/geometry';
import { pdfSearchText } from './pdf-text';
import { icon } from '../ui/icons';
import { Scene } from '../ui/scene';
import { ReferenceView } from '../ui/reference-view';
import { SourceEditor } from '../ui/source-editor';
import { ColorPicker } from '../ui/color-picker';
import type { PixelSample } from '../ui/color-picker';
import { colorValues } from '../lib/color';

export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export interface Gesture {
  type: 'pan' | 'move' | 'resize' | 'rotate' | 'marquee' | 'pen' | 'shape' | 'erase';
  start: Point;
  screen: Point;
  current: Point;
  items: Item[];
  initial: Viewport;
  points: Point[];
  shift: boolean;
  angle?: number;
  snapSize?: number;
  snapAnchor?: Point;
}

export type Tool = 'select' | 'direct' | 'pen-path' | 'curvature' | 'pencil' | 'hand' | 'pen' | 'eraser' | 'shape' | 'connect' | 'sample';

export const defaultSettings = { grid_visible: true, grid_size: 24, snap_enabled: false, grayscale: false };

export const S = {
  state: null as State | null,
  camera: { x: 64, y: 64, zoom: 1 } as Viewport,
  tool: 'select' as Tool,
  space: false,
  gesture: null as Gesture | null,
  deferred: null as State | null,
  chosenConnection: null as string | null,
  connectionStart: null as string | null,
  events: null as EventSource | null,
  queue: Promise.resolve() as Promise<void>,
  pending: 0,
  viewportTimer: 0,
  toastTimer: 0,
  /** Set by the presenter: the audience's camera is never saved as the board's view. */
  presenting: false,
  shapeKind: 'rect' as 'rect' | 'ellipse' | 'line',
  pointer: null as Point | null,
  /** Mirror the view (not the board) to check a drawing with fresh eyes, as artists flip a canvas. */
  flipX: false,
  flipY: false,
  /** Set by the Home page while it covers the workspace: board commands, keys and paste rest until it leaves. */
  home: false,
};

export const selection = new Set<string>();
export const stage = $('stage');
export const world = $('world');
const boardRows = new Map<string, HTMLButtonElement>();
const outlineRows = new Map<string, HTMLButtonElement>();
const columnOptions = new Map<string, HTMLOptionElement>();

export const scene = new Scene($('items'), $('connections') as unknown as SVGSVGElement, $('navigator-map') as unknown as SVGSVGElement, {
  openEditor: id => openEditor(id),
  item: id => S.state?.board.items.find(i => i.id === id),
  edit: (id, patch) => void execute({ type: 'update', ids: [id], patch }),
});
export const referenceView = new ReferenceView(() => [...selection], toast, file => { void upload([file]).then(() => toast(`Kept ${file.name} on the board.`)).catch(error); });
export const sourceEditor = new SourceEditor({
  flush: () => S.queue,
  state: next => { if (S.state?.board.id === next.board.id) applyState(next); },
  notify: toast,
  grow: item => scene.grownHeight(item),
});
export const colorPicker = new ColorPicker({ exit: () => setTool('select'), create: createSwatch });
export const host = new HostLink(message => {
  setText('host-status', message);
  $<HTMLButtonElement>('host-assign').disabled = !host.ready;
});

export function setText(id: string, value: string) {
  const node = $(id);
  if (node.textContent !== value) node.textContent = value;
}

export function toast(message: string) {
  window.clearTimeout(S.toastTimer);
  const current = $('toast');
  if (!current.hidden && current.textContent !== message) {
    // A visible toast that changes width would slide sideways (it is centred); a fresh node appears instead of moving.
    const fresh = current.cloneNode() as HTMLElement;
    current.replaceWith(fresh);
  }
  setText('toast', message);
  $('toast').hidden = false;
  S.toastTimer = window.setTimeout(() => { $('toast').hidden = true; }, 6000);
}

export function error(reason: unknown) {
  toast(reason instanceof Error ? reason.message : String(reason));
  setText('save-status', 'Check action');
}

export function setInput(id: string, value: string | number | boolean) {
  const input = $<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id);
  if (document.activeElement === input) return;
  if (input instanceof HTMLInputElement && input.type === 'checkbox') input.checked = Boolean(value);
  else input.value = String(value);
}

export function selected(): Item[] {
  return S.state?.board.items.filter(i => selection.has(i.id)) || [];
}

export function editable(): string[] {
  return selected().map(i => i.id);
}

export function targetIds(): string[] {
  if (selection.size) return editable();
  return S.state?.board.items.filter(i => !i.hidden && !i.locked && !i.parent_id && i.kind !== 'column').map(i => i.id) || [];
}

/** Further filters from feature modules (Find by Color); an item shows only when every one passes. */
export const matchFilters: Array<(item: Item) => boolean> = [];

export function matches(item: Item): boolean {
  if (!matchFilters.every(filter => filter(item))) return false;
  const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const term = fold($<HTMLInputElement>('search').value.trim());
  const kind = $<HTMLSelectElement>('kind-filter').value;
  const labels = Array.isArray(item.data.labels) ? (item.data.labels as string[]).map(id => S.state?.board.settings?.labels?.find(l => l.id === id)?.name || '').join(' ') : '';
  const comments = Array.isArray(item.data.comments) ? (item.data.comments as { text?: string }[]).map(c => c.text || '').join(' ') : '';
  const table = item.data.table ? JSON.stringify(item.data.table) : '';
  const haystack = fold(`${item.title} ${item.text} ${item.url} ${item.color} ${JSON.stringify(item.data.tags || '')} ${labels} ${comments} ${table} ${term ? pdfSearchText(item) : ''}`);
  return kindMatches(item, kind) && (!term || haystack.includes(term));
}

/** Picture shape as it shows on the board (a quarter turn swaps the sides); within 10% counts as square. */
export function shapeOf(item: Item): 'portrait' | 'landscape' | 'square' {
  const turned = Math.round(((item.rotation % 360) + 360) % 360 / 90) % 2 === 1;
  const [w, h] = turned ? [item.height, item.width] : [item.width, item.height];
  return h > w * 1.1 ? 'portrait' : w > h * 1.1 ? 'landscape' : 'square';
}

/** The kind filter: an item kind, or image-portrait, image-landscape or image-square for pictures of that shape. */
function kindMatches(item: Item, kind: string): boolean {
  if (!kind) return true;
  if (kind.startsWith('image-')) return item.kind === 'image' && shapeOf(item) === kind.slice(6);
  return item.kind === kind;
}

export function topZ(): number {
  return Math.max(0, ...(S.state?.board.items.map(i => i.z) || [])) + 1;
}

export function drawCamera() {
  const settings = S.state?.board.settings || defaultSettings;
  const c = S.camera;
  const tx = S.flipX ? stage.clientWidth - c.x : c.x, ty = S.flipY ? stage.clientHeight - c.y : c.y;
  world.style.transform = S.flipX || S.flipY ? `translate(${tx}px,${ty}px) scale(${S.flipX ? -c.zoom : c.zoom},${S.flipY ? -c.zoom : c.zoom})` : `translate(${c.x}px,${c.y}px) scale(${c.zoom})`;
  world.style.filter = settings.grayscale ? 'grayscale(1)' : 'none';
  stage.style.backgroundImage = settings.grid_visible ? '' : 'none';
  stage.style.backgroundSize = `${settings.grid_size * c.zoom}px ${settings.grid_size * c.zoom}px`;
  stage.style.backgroundPosition = `${tx}px ${ty}px`;
  setText('zoom-value', `${Math.round(c.zoom * 100)}%`);
  scene.detail(c.zoom, { x: -c.x / c.zoom, y: -c.y / c.zoom, w: stage.clientWidth / c.zoom, h: stage.clientHeight / c.zoom });
  if (S.state) scene.navigatorUpdate(S.state.board, c, stage);
}

export function rememberCamera() {
  window.clearTimeout(S.viewportTimer);
  const id = S.state?.board.id;
  if (!id || S.presenting) return;
  S.viewportTimer = window.setTimeout(() => {
    if (S.state?.board.id === id) void execute({ type: 'viewport', viewport: { ...S.camera } });
  }, 400);
}

/** A pointer position in the stage's own unflipped coordinates, the ones the camera is kept in. */
export function stagePoint(event: { clientX: number; clientY: number }): Point {
  const rect = stage.getBoundingClientRect();
  const x = event.clientX - rect.left, y = event.clientY - rect.top;
  return { x: S.flipX ? rect.width - x : x, y: S.flipY ? rect.height - y : y };
}

export function worldPoint(event: { clientX: number; clientY: number }): Point {
  const p = stagePoint(event);
  return { x: (p.x - S.camera.x) / S.camera.zoom, y: (p.y - S.camera.y) / S.camera.zoom };
}

export function center(): Point {
  return { x: (stage.clientWidth / 2 - S.camera.x) / S.camera.zoom - 120, y: (stage.clientHeight / 2 - S.camera.y) / S.camera.zoom - 90 };
}

export function placement(): Point {
  return S.pointer ? { ...S.pointer } : center();
}

export function setSelection(ids: string[]) {
  selection.clear();
  ids.forEach(id => selection.add(id));
  S.chosenConnection = null;
  scene.chooseLine(null);
  scene.selection(selection);
  updateInspector();
  updateOutline();
}

export function expanded(items: Item[]): string[] {
  const groups = new Set(items.map(i => i.group_id).filter(Boolean));
  return S.state?.board.items.filter(i => items.some(s => s.id === i.id) || (i.group_id && groups.has(i.group_id))).map(i => i.id) || [];
}

export function descendants(items: Item[]): Item[] {
  if (!S.state) return items;
  const ids = new Set(items.map(i => i.id));
  let added = true;
  while (added) {
    added = false;
    const groups = new Set(S.state.board.items.filter(i => ids.has(i.id)).map(i => i.group_id).filter(Boolean));
    for (const item of S.state.board.items) {
      if (!ids.has(item.id) && ((item.parent_id && ids.has(item.parent_id)) || (item.group_id && groups.has(item.group_id)))) {
        ids.add(item.id);
        added = true;
      }
    }
  }
  return S.state.board.items.filter(item => ids.has(item.id));
}

export function updateOutline() {
  if (!S.state) return;
  const ids = new Set(S.state.board.items.map(i => i.id));
  for (const [id, row] of outlineRows) {
    if (!ids.has(id)) { row.remove(); outlineRows.delete(id); }
  }
  for (const item of S.state.board.items) {
    let row = outlineRows.get(item.id);
    if (!row) {
      row = document.createElement('button');
      row.className = 'sidebar-row';
      const name = document.createElement('span');
      const status = document.createElement('span');
      status.className = 'outline-state';
      row.append(icon(item.kind), name, status);
      row.dataset.id = item.id;
      row.addEventListener('click', event => {
        const current = S.state?.board.items.find(i => i.id === item.id);
        if (!current) return;
        if (event.shiftKey) setSelection([...selection, ...expanded([current])]);
        else setSelection(expanded([current]));
      });
      row.addEventListener('dblclick', () => fit([item]));
      outlineRows.set(item.id, row);
      $('outline').append(row);
    }
    const name = row.children[1];
    const label = item.title || (item.kind === 'note' ? item.text.split('\n')[0] : item.kind);
    if (name.textContent !== label) name.textContent = label;
    row.classList.toggle('selected', selection.has(item.id));
    row.classList.toggle('dim', item.hidden);
    row.hidden = !matches(item);
    const flags = `${item.locked ? 'L' : ''}${item.hidden ? 'H' : ''}`;
    if (row.children[2].textContent !== flags) row.children[2].textContent = flags;
  }
  setText('outline-count', String(S.state.board.items.length));
}

const inspectorListeners: ((items: Item[]) => void)[] = [];
export function onInspector(listener: (items: Item[]) => void) { inspectorListeners.push(listener); }

export function updateInspector() {
  const items = selected();
  const first = items[0];
  inspectorListeners.forEach(listener => listener(items));
  setText('selection-status', items.length ? `${items.length} selected` : 'No selection');
  setText('selection-badge', items.length ? String(items.length) : 'Board');
  $('board-details').hidden = !!first;
  $('selection-details').hidden = !first;
  if (!first) return;
  setText('item-kind', items.length > 1 ? `${items.length} REFERENCES SELECTED` : first.kind.toUpperCase());
  for (const key of ['title', 'text', 'x', 'y', 'width', 'height', 'rotation', 'opacity', 'color', 'locked', 'hidden'] as const) {
    let value = first[key];
    if (key === 'color' && first.kind === 'swatch') value = first.color.slice(0, 7);
    if (key === 'opacity') value = Math.round(first.opacity * 100);
    if (typeof value === 'number') value = Math.round(value * 100) / 100;
    setInput(`prop-${key}`, value);
    $<HTMLInputElement>(`prop-${key}`).disabled = first.locked && key !== 'locked';
  }
  $('note-properties').hidden = !['note', 'document'].includes(first.kind);
  setInput('note-font', typeof first.data.font === 'string' ? first.data.font : '');
  $('note-font').closest('label')!.hidden = first.kind !== 'note';
  $('swatch-properties').hidden = !items.every(i => i.kind === 'swatch');
  $<HTMLTextAreaElement>('prop-text').readOnly = first.kind === 'document' || first.kind === 'swatch' || (first.kind === 'note' && first.data.text_format === 'markdown');
  setInput('swatch-value', first.color);
  $<HTMLInputElement>('swatch-value').disabled = first.locked;
  if (first.kind === 'swatch') {
    const values = colorValues(first.color)!;
    setText('swatch-values', `RGB ${values.rgb.join(' · ')} · HSV ${values.hsv.map(v => v.toFixed(1)).join(' · ')}`);
  }
  setInput('prop-tags', Array.isArray(first.data.tags) ? (first.data.tags as string[]).join(', ') : '');
  setInput('prop-blend', typeof first.data.blend === 'string' ? first.data.blend : 'normal');
  $<HTMLSelectElement>('prop-blend').disabled = first.locked;
  $('image-properties').hidden = !items.every(i => i.kind === 'image');
  $<HTMLButtonElement>('restore-background').disabled = !items.some(i => i.kind === 'image' && i.data.cutout);
  const cutout = first.data.cutout as { tolerance?: number } | null | undefined;
  if (cutout && typeof cutout.tolerance === 'number') { setInput('cutout-tolerance', cutout.tolerance); setText('cutout-tolerance-value', $<HTMLInputElement>('cutout-tolerance').value); }
  $('shape-properties').hidden = first.kind !== 'shape';
  $('drawing-properties').hidden = !['shape', 'stroke'].includes(first.kind);
  setInput('shape-kind', String(first.data.shape || 'rect'));
  setInput('stroke-width', Number(first.data.stroke_width || 3));
  if (['shape', 'stroke'].includes(first.kind)) inspectorHooks.drawing(first);
  setInput('shape-fill-enabled', !!first.data.fill && first.data.fill !== 'none');
  setInput('shape-fill', /^#[0-9a-f]{6}$/i.test(String(first.data.fill)) ? String(first.data.fill) : '#f97316');
  const crop = (first.data.crop || { x: 0, y: 0, width: 1, height: 1 }) as Record<string, number>;
  for (const key of ['x', 'y', 'width', 'height']) setInput(`crop-${key}`, Math.round(crop[key] * 10000) / 100);
  const columns = S.state?.board.items.filter(i => i.kind === 'column' && !selection.has(i.id)) || [];
  const ids = new Set(columns.map(i => i.id));
  for (const [id, option] of columnOptions) {
    if (!ids.has(id)) { option.remove(); columnOptions.delete(id); }
  }
  for (const column of columns) {
    let option = columnOptions.get(column.id);
    if (!option) {
      option = document.createElement('option');
      option.value = column.id;
      columnOptions.set(column.id, option);
      $('prop-parent').append(option);
    }
    const label = column.title || 'Untitled column';
    option.toggleAttribute('data-no-i18n', !!column.title);
    if (option.textContent !== label) option.textContent = label;
  }
  setInput('prop-parent', first.parent_id || '');
}

export const consent = { ask: (_refusal: Record<string, unknown>) => undefined as void };

const stateListeners: ((state: State) => void)[] = [];
export function onState(listener: (state: State) => void) { stateListeners.push(listener); }

/** Modules that act when a different board comes up (the desktop window layout, for one). */
export const boardOpened: Array<(state: State) => void> = [];

/** Modules that act when no board is open any more (the Home page comes up). */
export const boardClosed: Array<() => unknown> = [];

export async function leaveBoard() {
  window.clearTimeout(S.viewportTimer);
  S.events?.close();
  S.events = null;
  S.state = null;
  selection.clear();
  document.title = 'formref';
  document.querySelectorAll<HTMLButtonElement>('[data-action="undo"],[data-action="redo"]').forEach(b => { b.disabled = true; });
  await Promise.all(boardClosed.map(hook => hook()));
}

export function applyState(next: State, switchBoard = false) {
  if (S.state && S.state.board.id === next.board.id && next.board.revision < S.state.board.revision) return;
  if (S.gesture && !switchBoard) { S.deferred = next; return; }
  if (switchBoard || !S.state || S.state.board.id !== next.board.id) {
    selection.clear();
    S.camera = { ...next.board.viewport };
    S.connectionStart = null;
    for (const hook of boardOpened) hook(next);
  }
  S.state = next;
  const ids = new Set(next.board.items.map(i => i.id));
  for (const id of selection) if (!ids.has(id)) selection.delete(id);
  const settings = next.board.settings || defaultSettings;
  setInput('grid-visible', settings.grid_visible);
  setInput('grid-size', settings.grid_size);
  setInput('snap-enabled', settings.snap_enabled);
  setInput('canvas-grayscale', settings.grayscale);
  referenceView.update(next.board);
  sourceEditor.update(next.board);
  colorPicker.update(next.board);
  scene.render(next.board, selection, matches);
  drawCamera();
  updateOutline();
  updateInspector();
  const board = next.board;
  setText('board-title', board.title);
  setText('detail-title', board.title);
  setText('canvas-label', board.title.toUpperCase());
  setText('canvas-count', `${board.items.length} REFERENCES`);
  setText('stat-images', String(board.items.filter(i => i.kind === 'image').length));
  setText('stat-notes', String(board.items.filter(i => i.kind === 'note').length));
  setText('stat-total', String(board.items.length));
  const row = boardRows.get(board.id);
  if (row) {
    const count = board.items.length ? String(board.items.length) : '';
    if (row.children[1].textContent !== board.title) row.children[1].textContent = board.title;
    if (row.children[2].textContent !== count) row.children[2].textContent = count;
  }
  setInput('background', /^#[0-9a-f]{6}$/i.test(board.background) ? board.background : '#1c1b1d');
  stage.style.backgroundColor = board.background === '#1c1b1d' ? '' : board.background;
  $('empty-state').hidden = board.items.length > 0;
  setText('save-status', 'Saved locally');
  setText('connection-state', 'Rust engine connected');
  document.title = `formref · ${board.title}`;
  document.querySelectorAll<HTMLButtonElement>('[data-action="undo"]').forEach(b => { b.disabled = !next.can_undo; });
  document.querySelectorAll<HTMLButtonElement>('[data-action="redo"]').forEach(b => { b.disabled = !next.can_redo; });
  for (const [id, row] of boardRows) {
    row.classList.toggle('active', id === board.id);
    if (id === board.id && row.children[1].textContent !== board.title) row.children[1].textContent = board.title;
  }
  stateListeners.forEach(listener => listener(next));
}

export async function refreshBoards(): Promise<Summary[]> {
  const result = await api.list();
  const boards: Summary[] = Array.isArray(result) ? result : result.boards;
  const ids = new Set(boards.map(b => b.id));
  for (const [id, row] of boardRows) {
    if (!ids.has(id)) { row.remove(); boardRows.delete(id); }
  }
  for (const board of boards) {
    let row = boardRows.get(board.id);
    if (!row) {
      row = document.createElement('button');
      row.className = 'sidebar-row';
      const name = document.createElement('span');
      const count = document.createElement('span');
      count.className = 'board-row-count';
      row.append(icon('board'), name, count);
      row.addEventListener('click', () => void open(board.id).catch(error));
      boardRows.set(board.id, row);
      $('board-list').append(row);
    }
    if (row.children[1].textContent !== board.title) row.children[1].textContent = board.title;
    const count = board.item_count ? String(board.item_count) : '';
    if (row.children[2].textContent !== count) row.children[2].textContent = count;
    row.classList.toggle('active', board.id === S.state?.board.id);
  }
  return boards;
}

export async function open(id: string, next?: State) {
  referenceView.stop(true);
  if (S.tool === 'sample') setTool('select');
  if ($<HTMLDialogElement>('document-dialog').open) $<HTMLDialogElement>('document-dialog').close();
  window.clearTimeout(S.viewportTimer);
  await S.queue;
  const loaded = next || await api.get(id);
  applyState(loaded, true);
  try { localStorage.setItem('formref-last-board', id); } catch { }
  S.events?.close();
  S.events = api.events(id);
  S.events.addEventListener('revision', event => {
    const data = JSON.parse((event as MessageEvent).data) as { revision: number };
    if (S.state?.board.id === id && data.revision > S.state.board.revision) {
      void api.get(id).then(result => { if (S.state?.board.id === id) applyState(result); }).catch(error);
    }
  });
  S.events.addEventListener('deleted', () => {
    referenceView.stop(true);
    if (S.tool === 'sample') setTool('select');
    if ($<HTMLDialogElement>('document-dialog').open) $<HTMLDialogElement>('document-dialog').close();
    toast('This board was deleted by another client.');
    void start();
  });
  S.events.addEventListener('consent', event => {
    try { consent.ask(JSON.parse((event as MessageEvent<string>).data) as Record<string, unknown>); } catch { return; }
  });
  S.events.onopen = () => setText('connection-state', 'Rust engine connected');
  S.events.onerror = () => setText('connection-state', 'Live updates reconnecting');
  await refreshBoards();
}

export function execute(command: Command, id = S.state?.board.id): Promise<void> {
  if (!id) {
    toast('Start the local FormRef service to create a board.');
    return Promise.resolve();
  }
  S.pending++;
  setText('save-status', 'Saving…');
  const task = S.queue.then(async () => {
    try {
      const result = await api.command(id, command);
      if (S.state?.board.id === id) applyState(result);
    } catch (reason) {
      error(reason);
      if (S.state?.board.id === id) scene.render(S.state.board, selection, matches);
    } finally {
      S.pending--;
    }
  });
  S.queue = task;
  return task;
}

export async function history(direction: 'undo' | 'redo') {
  await S.queue;
  const id = S.state?.board.id;
  if (id) applyState(await api.history(id, direction));
}

export function fit(items = S.state?.board.items.filter(i => !i.hidden) || []) {
  S.camera = fitCamera(items);
  drawCamera();
  rememberCamera();
}

/** The camera that shows the items whole in the stage, above the floating controls; without items, the origin at full size. */
export function fitCamera(items: Item[]): Viewport {
  if (!items.length) return { x: 64, y: 64, zoom: 1 };
  const bounds = items.map(itemBounds);
  const minX = Math.min(...bounds.map(b => b.left));
  const minY = Math.min(...bounds.map(b => b.top));
  const maxX = Math.max(...bounds.map(b => b.right));
  const maxY = Math.max(...bounds.map(b => b.bottom));
  const bar = document.querySelector<HTMLElement>('.floating-controls');
  const below = bar && bar.offsetParent === stage && getComputedStyle(bar).visibility !== 'hidden' ? Math.max(60, stage.clientHeight - bar.offsetTop + 12) : 60;
  const room = stage.clientHeight - 60 - below;
  const zoom = Math.max(.05, Math.min(2, (stage.clientWidth - 96) / (maxX - minX), room / (maxY - minY)));
  return { x: stage.clientWidth / 2 - (minX + maxX) / 2 * zoom, y: 60 + room / 2 - (minY + maxY) / 2 * zoom, zoom };
}

export function zoom(factor: number, point = { x: stage.clientWidth / 2, y: stage.clientHeight / 2 }) {
  const next = Math.max(.05, Math.min(8, S.camera.zoom * factor));
  const ratio = next / S.camera.zoom;
  S.camera = { x: point.x - (point.x - S.camera.x) * ratio, y: point.y - (point.y - S.camera.y) * ratio, zoom: next };
  drawCamera();
  rememberCamera();
}

const TOOL_STATUS: Record<Tool, string> = {
  select: 'Select and move references',
  direct: 'Drag anchors, handles or corner widgets; Alt-click a widget to change the corner style',
  'pen-path': 'Click for corner points, drag for smooth points; click the first point to close, Enter to finish',
  pencil: 'Draw freehand; the line becomes a smooth editable path. End near the start to close it',
  curvature: 'Click to place points and the curve bends through them; double-click or Alt-click for a corner point, Enter to finish',
  hand: 'Drag to pan',
  pen: 'Drag to draw freehand',
  eraser: 'Drag across drawings to erase them',
  shape: 'Drag to draw a shape',
  connect: 'Click two references to connect them',
  sample: 'Click a managed image to sample original pixels · Esc to exit',
};

export function setTool(next: Tool) {
  S.tool = next;
  colorPicker.setActive(next === 'sample');
  S.connectionStart = null;
  document.querySelectorAll<HTMLElement>('[data-tool]').forEach(button => {
    const active = button.dataset.tool === next && (next !== 'shape' || !button.dataset.shape || button.dataset.shape === S.shapeKind);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  stage.classList.toggle('pan', next === 'hand');
  stage.classList.toggle('drawing', ['pen', 'pen-path', 'curvature', 'pencil', 'eraser', 'shape', 'connect', 'sample'].includes(next));
  setText('tool-status', next === 'shape' ? `Drag to draw a ${S.shapeKind === 'rect' ? 'rectangle' : S.shapeKind === 'ellipse' ? 'circle' : 'line'}` : TOOL_STATUS[next]);
}

export function closeOverlays() {
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(dialog => dialog.close());
}

let dialogResolve: ((result: { name: string; text: string; url: string } | null) => void) | null = null;

export const inspectorHooks: { drawing: (item: Item) => void } = { drawing: () => undefined };

export interface DialogOptions {
  name?: string; text?: string; url?: string; showText?: boolean; showUrl?: boolean;
  normalize?: boolean; label?: string; description?: string; submit?: string; confirm?: boolean;
}

export function inputDialog(title: string, opts: DialogOptions = {}): Promise<{ name: string; text: string; url: string } | null> {
  closeOverlays();
  setText('dialog-title', title);
  setText('dialog-name-label', opts.label || 'Title');
  setText('dialog-description', opts.description || '');
  setText('dialog-submit', opts.submit || 'Create');
  setInput('dialog-name', opts.name || '');
  setInput('dialog-text', opts.text || '');
  setInput('dialog-url', opts.url || '');
  $('dialog-text-field').hidden = !opts.showText;
  $('dialog-url-field').hidden = !opts.showUrl;
  $('dialog-mode-field').hidden = !opts.normalize;
  $('dialog-name-field').hidden = !!opts.confirm;
  $<HTMLDialogElement>('input-dialog').showModal();
  if (opts.confirm) $('dialog-submit').focus(); else $('dialog-name').focus();
  return new Promise(resolve => { dialogResolve = resolve; });
}

$('input-form').addEventListener('submit', event => {
  event.preventDefault();
  const result = { name: $<HTMLInputElement>('dialog-name').value.trim(), text: $<HTMLTextAreaElement>('dialog-text').value, url: $<HTMLInputElement>('dialog-url').value };
  const resolve = dialogResolve;
  dialogResolve = null;
  $<HTMLDialogElement>('input-dialog').close();
  resolve?.(result);
});
$('input-dialog').addEventListener('close', () => {
  dialogResolve?.(null);
  dialogResolve = null;
});

export function openEditor(id: string, markdown = false) {
  const item = S.state?.board.items.find(i => i.id === id);
  if (!S.state || !item || !['note', 'document'].includes(item.kind)) return;
  closeOverlays();
  setTool('select');
  sourceEditor.open(S.state.board, item, markdown);
}

async function createSwatch(sample: PixelSample) {
  if (!S.state || sample.board_id !== S.state.board.id) return;
  const boardId = S.state.board.id;
  const p = center();
  const item = newItem('swatch', p.x, p.y, {
    title: 'Captured color', color: sample.hex, width: 220, height: 200, z: topZ(),
    data: { sample_source: { asset_id: sample.asset_id, item_id: sample.item_id, x: sample.x, y: sample.y, frame: sample.frame } },
  });
  await execute({ type: 'add', items: [item] }, boardId);
  if (S.state?.board.id === boardId && S.state.board.items.some(i => i.id === item.id)) {
    setSelection([item.id]);
    toast(`Created ${sample.hex} swatch.`);
  }
}

const KIND_NAMES: Record<Kind, string> = {
  image: 'Image', note: 'Note', document: 'Document', swatch: 'Swatch', link: 'Link', todo: 'Task',
  board: 'Board', column: 'Column', shape: 'Shape', stroke: 'Drawing', file: 'File', table: 'Table',
};

export async function add(kind: Kind) {
  const form = await inputDialog(`Add ${KIND_NAMES[kind].toLowerCase()}`, {
    showText: ['note', 'link', 'todo', 'column'].includes(kind),
    showUrl: kind === 'link',
    name: kind === 'note' ? 'A new idea' : kind === 'column' ? 'Collection' : '',
  });
  if (!form) return;
  if (kind === 'link' && !/^https?:\/\//i.test(form.url)) throw new Error('Enter a complete http or https URL');
  const p = placement();
  const data: Record<string, unknown> = {};
  if (kind === 'board') {
    const child = await api.create(form.name || 'Untitled board');
    data.board_id = child.board.id;
  }
  if (kind === 'todo') data.checked = false;
  if (kind === 'table') data.table = emptyTable();
  const player = kind === 'link' && !!embedUrl(form.url);
  const item = newItem(kind, p.x, p.y, {
    title: form.name || KIND_NAMES[kind], text: form.text, url: form.url, z: topZ(),
    color: kind === 'note' ? '#e7d4b4' : '#191919',
    width: kind === 'column' ? 300 : kind === 'table' ? 380 : player ? 420 : 260,
    height: kind === 'column' ? 480 : kind === 'todo' ? 150 : kind === 'table' ? 230 : player ? 320 : 190,
    data,
  });
  await execute({ type: 'add', items: [item] });
  setSelection([item.id]);
  if (kind === 'board') await refreshBoards();
}

export async function upload(files: File[], at = placement()) {
  if (!S.state || !files.length) return;
  const boards = files.filter(file => /\.bee$/i.test(file.name));
  for (const file of boards) {
    const result = await api.import(file);
    await open(result.board.id, result);
    toast(`Opened the BeeRef board ${file.name} as a new board.`);
  }
  files = files.filter(file => !boards.includes(file));
  if (!files.length) return;
  setText('save-status', 'Importing…');
  const assets: { asset: Asset; name: string }[] = [];
  for (const file of files) assets.push({ asset: await api.upload(file), name: file.name });
  await placeAssets(assets, at);
}

/** Put already-registered assets on the board as images or files, one undo step. */
export async function placeAssets(assets: { asset: Asset; name: string; url?: string }[], at = placement()) {
  if (!S.state || !assets.length) return;
  const boardId = S.state.board.id;
  const items: Item[] = [];
  const initialZ = topZ() - 1;
  for (const [index, { asset, name: sourceName, url }] of assets.entries()) {
    const file = { name: sourceName };
    const image = asset.mime.startsWith('image/');
    const video = asset.mime.startsWith('video/'), audio = asset.mime.startsWith('audio/');
    const width = image ? Math.min(400, asset.width || 300) : video ? 400 : audio ? 320 : 260;
    const height = image ? width * ((asset.height || 200) / (asset.width || 300)) : video ? 300 : audio ? 150 : 140;
    items.push(newItem(image ? 'image' : 'file', at.x + index * 28, at.y + index * 28, {
      title: asset.name, asset_id: asset.id, width, height, z: initialZ + index + 1, url: url || '',
      // Keywords stored in the picture file arrive as its tags.
      data: { mime: asset.mime, size: asset.size, source_name: file.name, natural_width: asset.width, natural_height: asset.height, ...(image && asset.keywords?.length ? { tags: asset.keywords } : {}), ...(image && asset.rating ? { rating: asset.rating } : {}) },
    }));
  }
  await execute({ type: 'add', items }, boardId);
  if (S.state?.board.id === boardId) setSelection(items.map(i => i.id));
}

export function selectedImages(): Item[] {
  const images = selected().filter(i => i.kind === 'image');
  if (!images.length) throw new Error('Select at least one image.');
  return images;
}

export function arrange(type: 'pack' | 'distribute', axis?: 'x' | 'y') {
  const input = $<HTMLInputElement>(type === 'pack' ? 'pack-gap' : 'distribute-gap');
  const value = input.value.trim();
  const gap = value ? Number(value) : undefined;
  if ((type === 'pack' && gap === undefined) || (gap !== undefined && (!Number.isFinite(gap) || gap < 0 || gap > 1000000))) {
    toast('Choose a gap from 0 to 1,000,000 pixels. Leave spacing blank for automatic distribution.');
    return;
  }
  return execute({ type, ids: type === 'pack' ? targetIds() : editable(), ...(axis ? { axis } : {}), ...(gap !== undefined ? { gap } : {}) });
}

export async function start() {
  try {
    await request('/health');
    const boards = await refreshBoards();
    let id: string | null = null;
    try { id = localStorage.getItem('formref-last-board'); } catch { }
    if (!id || !boards.some(b => b.id === id)) id = boards[0]?.id || null;
    if (id) await open(id);
    else await leaveBoard();
  } catch (reason) {
    setText('connection-state', 'Service unavailable');
    setText('save-status', 'Disconnected');
    setText('tool-status', 'Start FormRef backend on port 8320, then reload');
    toast(`Could not connect to the local service: ${reason instanceof Error ? reason.message : String(reason)}`);
  }
}
