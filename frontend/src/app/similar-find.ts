import { api, request } from '../lib/api';
import type { Board, Item } from '../lib/types';
import type { MenuEntry } from '../ui/context-menu';
import { $, S, boardOpened, matchFilters, matches, onState, scene, selected, selection, toast, updateOutline } from './editor';
import { registry } from './registry';

/** Find Similar: dims everything except the pictures that look like a chosen one (reference-board gap: PureRef and BeeRef have no image search; Milanote searches text only). The service scores colour mix, the layout of light and dark (mirrored copies count) and the colour layout; the board itself never changes. */

type Level = 'close' | 'related' | 'loose';
interface Found { item_id: string; level: Level; matches: { id: string; score: number }[] }

export const LEVELS: Level[] = ['close', 'related', 'loose'];
const LEVEL_LABELS: Record<Level, string> = { close: 'Near Copies', related: 'Similar Pictures', loose: 'Loosely Similar' };
let sample: { id: string; asset: string; level: Level } | null = null;
let applied = false;
let matched = new Set<string>();
let signature = '';
let request_id = 0;

const pictureOf = (item: Item | undefined) => item && item.kind === 'image' && item.asset_id ? item : undefined;
const onePicture = () => { const items = selected(); return items.length === 1 ? pictureOf(items[0]) : undefined; };

function signatureOf(board: Board): string {
  return board.id + '|' + board.items.filter(i => !i.hidden && i.kind === 'image').map(i => `${i.id}:${i.asset_id || ''}`).join(',');
}

function refilter(): void {
  if (!S.state) return;
  scene.render(S.state.board, selection, matches);
  updateOutline();
}

function showButton(): void {
  const row = $('filter-row');
  row.classList.toggle('has-similar', !!sample);
  if (sample) row.style.setProperty('--similar-thumb', `url("${api.assetUrl(sample.asset)}")`);
  else row.style.removeProperty('--similar-thumb');
}

/** The board changes once, when the answer is in; an answer overtaken by a newer request is dropped. */
async function load(announce: boolean): Promise<void> {
  const board = S.state?.board;
  if (!sample || !board) return;
  const id = ++request_id;
  const { id: itemId, level } = sample;
  signature = signatureOf(board);
  const found = await request<Found>(`/boards/${board.id}/items/${itemId}/similar?level=${level}`);
  if (id !== request_id || !sample || sample.id !== itemId || S.state?.board.id !== board.id) return;
  matched = new Set(found.matches.map(m => m.id));
  applied = true;
  refilter();
  if (announce) toast(found.matches.length ? `Pictures like this one: ${found.matches.length}.` : 'No other picture on this board looks like this one.');
}

export function findSimilar(item: Item, level: Level = 'related', announce = true): Promise<void> {
  if (!pictureOf(item)) return Promise.reject(new Error('Select one picture to find pictures like it.'));
  if (!LEVELS.includes(level)) return Promise.reject(new Error('Choose close, related or loose.'));
  sample = { id: item.id, asset: item.asset_id!, level };
  showButton();
  return load(announce);
}

export function clearSimilar(): void {
  request_id++;
  const was = applied;
  sample = null;
  applied = false;
  matched = new Set();
  showButton();
  if (was) refilter();
}

/** Right-click submenu: the three strictness levels, checked at the one in use. */
export function similarMenu(): MenuEntry {
  const picture = onePicture();
  const run = (level: Level) => () => { const item = onePicture(); if (item) void findSimilar(item, level).catch(reason => toast((reason as Error).message)); };
  return { label: 'Find Similar', icon: 'similarity', disabled: !picture, children: LEVELS.map(level => ({ label: LEVEL_LABELS[level], checked: !!sample && sample.id === picture?.id && sample.level === level, action: run(level) })) };
}

export function registerSimilarFind(): void {
  matchFilters.push(item => !applied || item.id === sample?.id || matched.has(item.id));
  onState(state => {
    if (!sample) return;
    if (!state.board.items.some(i => i.id === sample!.id && !i.hidden)) { clearSimilar(); return; }
    if (signatureOf(state.board) !== signature) void load(false).catch(() => undefined);
  });
  boardOpened.push(() => clearSimilar());
  $('similar-find').addEventListener('click', event => {
    event.preventDefault();
    const item = onePicture();
    if (item && item.id !== sample?.id) void findSimilar(item, sample?.level).catch(reason => toast((reason as Error).message));
    else if (sample) clearSimilar();
    else toast('Select one picture to find pictures like it.');
  });
  $('color-find-clear').addEventListener('click', () => clearSimilar());
  registry.add(
    { group: 'Images', id: 'find-similar', label: 'Find Similar Pictures', icon: 'similarity', mutates: false, agent: 'window-only', enabled: () => !!onePicture(), checked: () => !!sample, run: p => { const item = onePicture(); if (!item) throw new Error('Select one picture to find pictures like it.'); const level = typeof p?.level === 'string' ? p.level as Level : sample?.level || 'related'; return findSimilar(item, level); }, params: { level: { type: 'string', enum: LEVELS, description: 'close finds near copies, related (default) also edited or cropped versions, loose also pictures of a similar kind' } } },
    { group: 'Images', id: 'clear-similar-find', label: 'Clear Similar Filter', icon: 'close', mutates: false, agent: 'window-only', enabled: () => !!sample, run: clearSimilar },
  );
}
