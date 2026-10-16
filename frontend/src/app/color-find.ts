import { request } from '../lib/api';
import type { Board, Item } from '../lib/types';
import { $, S, boardOpened, matchFilters, matches, onState, scene, selected, selection, toast, updateOutline } from './editor';
import { registry } from './registry';

/** Find by Color: dims everything except the pictures and swatches that contain a chosen color (reference-board gap: PureRef, BeeRef and Milanote find by name only). The service judges each picture by its main colors; the board itself never changes. */

interface Found { color: string; tolerance: number; matches: { id: string; score: number }[] }

const DEFAULT_TOLERANCE = 20;
let wanted: { color: string; tolerance: number } | null = null;
let applied: string | null = null;
let matched = new Set<string>();
let signature = '';
let request_id = 0;
let pickerTimer = 0;

const swatchColor = (item: Item) => item.kind === 'swatch' && /^#[0-9a-f]{6}/i.test(item.color || '') ? item.color.slice(0, 7).toLowerCase() : null;

/** What a result depends on: the board, and which pictures and swatches are on it with which picture or color. */
function signatureOf(board: Board): string {
  return board.id + '|' + board.items.filter(i => !i.hidden && (i.kind === 'image' || i.kind === 'swatch')).map(i => `${i.id}:${i.asset_id || swatchColor(i) || ''}`).join(',');
}

function refilter(): void {
  if (!S.state) return;
  scene.render(S.state.board, selection, matches);
  updateOutline();
}

function showChip(): void {
  const field = $('filter-row');
  field.classList.toggle('has-color', !!wanted);
  if (wanted) field.style.setProperty('--find-color', wanted.color);
  else field.style.removeProperty('--find-color');
}

/** Asks the service which pictures contain the color; the board changes once, when the answer is in, and an answer overtaken by a newer request is dropped. */
async function load(announce: boolean, render = true): Promise<void> {
  const board = S.state?.board;
  if (!wanted || !board) return;
  const id = ++request_id;
  const { color, tolerance } = wanted;
  signature = signatureOf(board);
  const found = await request<Found>(`/boards/${board.id}/colors?color=${encodeURIComponent(color)}&tolerance=${tolerance}`);
  if (id !== request_id || !wanted || S.state?.board.id !== board.id) return;
  matched = new Set(found.matches.map(m => m.id));
  applied = found.color;
  if (render) refilter();
  if (announce) toast(found.matches.length ? `Pictures and swatches with this color: ${found.matches.length}.` : 'Nothing on this board contains that color.');
}

/** The color in use, for saved searches. */
export function colorFilter(): { color: string; tolerance: number } | null {
  return wanted ? { ...wanted } : null;
}

/** With render false the board is not redrawn; a caller setting several filters at once redraws once at the end. */
export function setColorFilter(color: string | null, tolerance = DEFAULT_TOLERANCE, announce = true, render = true): Promise<void> {
  if (color !== null && !/^#[0-9a-f]{6}$/i.test(color)) return Promise.reject(new Error('Give the color as #RRGGBB.'));
  if (!Number.isFinite(tolerance) || tolerance < 1 || tolerance > 100) return Promise.reject(new Error('Tolerance is from 1 to 100.'));
  if (color === null) {
    request_id++;
    const was = applied;
    wanted = null;
    applied = null;
    matched = new Set();
    showChip();
    if (was && render) refilter();
    return Promise.resolve();
  }
  wanted = { color: color.toLowerCase(), tolerance };
  showChip();
  return load(announce, render);
}

function openPicker(): void {
  const input = $<HTMLInputElement>('color-find-input');
  input.value = wanted?.color || '#c0392b';
  if (typeof input.showPicker === 'function') input.showPicker();
  else input.click();
}

export function registerColorFind(): void {
  matchFilters.push(item => !applied || matched.has(item.id));
  // New or changed pictures while a color is chosen are looked at again; until then they count as not containing it.
  onState(state => { if (wanted && signatureOf(state.board) !== signature) void load(false).catch(() => undefined); });
  boardOpened.push(() => { if (wanted) { applied = null; matched = new Set(); } });
  $('color-find').addEventListener('click', event => { event.preventDefault(); openPicker(); });
  $('color-find-clear').addEventListener('click', event => { event.preventDefault(); void setColorFilter(null); });
  const input = $<HTMLInputElement>('color-find-input');
  // Dragging in the picker narrows the board as it goes, at most every 150 ms; closing it gives the count.
  input.addEventListener('input', () => { window.clearTimeout(pickerTimer); pickerTimer = window.setTimeout(() => void setColorFilter(input.value, wanted?.tolerance, false).catch(reason => toast((reason as Error).message)), 150); });
  input.addEventListener('change', () => { window.clearTimeout(pickerTimer); void setColorFilter(input.value, wanted?.tolerance).catch(reason => toast((reason as Error).message)); });
  const swatch = () => selected().find(i => !!swatchColor(i));
  registry.add(
    { group: 'Edit', id: 'find-color', label: 'Find by Color…', icon: 'palette', mutates: false, agent: 'window-only', checked: () => !!wanted, enabled: () => !!S.state, run: p => { const color = typeof p?.color === 'string' ? p.color : null; if (!color) { openPicker(); return; } return setColorFilter(color, typeof p?.tolerance === 'number' ? p.tolerance : DEFAULT_TOLERANCE); }, params: { color: { type: 'string', description: '#RRGGBB; leave out to open the color picker' }, tolerance: { type: 'number', min: 1, max: 100, description: 'CIEDE2000 color difference, about 10 close, 20 default, 30 loose' } } },
    { group: 'Edit', id: 'find-swatch-color', label: 'Find This Swatch Color', icon: 'swatch', mutates: false, agent: 'window-only', enabled: () => !!swatch(), run: () => { const item = swatch(); if (item) return setColorFilter(swatchColor(item)); } },
    { group: 'Edit', id: 'clear-color-find', label: 'Clear Color Filter', icon: 'close', mutates: false, agent: 'window-only', enabled: () => !!wanted, run: () => setColorFilter(null) },
  );
}
