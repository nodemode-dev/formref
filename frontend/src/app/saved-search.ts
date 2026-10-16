import type { Board, SavedSearch, SharedSearch } from '../lib/types';
import type { MenuEntry } from '../ui/context-menu';
import { t } from '../lib/i18n';
import { $, S, execute, inputDialog, onState, toast } from './editor';
import { menu } from './gestures';
import { registry } from './registry';
import { colorFilter, setColorFilter } from './color-find';
import { clearSimilar, findSimilar, similarFilter } from './similar-find';
import { setTagFilter, tagFilter } from './tag-cloud';

/** Saved searches: named filters the board remembers in settings.searches (find text, kind, colour, a similar-picture sample), like smart folders in Eagle or saved searches in a photo library; PureRef, BeeRef and Milanote have none. Applying one sets every filter and redraws the board once. */

const MAX_SEARCHES = 24;
const DEFAULT_TOLERANCE = 20;

const MAX_SHARED = 48;

const searches = (board: Board | undefined = S.state?.board) => board?.settings?.searches || [];

/** Searches for all boards live in the data folder (searches.json), not in any board, so they have no undo. A similar picture belongs to one board and is left out; labels travel by name and match this board's labels ignoring case. */
let shared: SharedSearch[] = [];

async function loadShared(): Promise<void> {
  const response = await fetch('/api/searches').catch(() => null);
  if (response?.ok) shared = (await response.json()).searches || [];
  refreshButton();
}

async function storeShared(list: SharedSearch[]): Promise<void> {
  const response = await fetch('/api/searches', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ searches: list }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'The searches for all boards could not be saved.');
  shared = body.searches || [];
  refreshButton();
}

/** A search for all boards as this board would hold it, and the label names this board does not have. */
function fromShared(search: SharedSearch): { search: SavedSearch; missing: string[] } {
  const labels = S.state?.board.settings?.labels || [];
  const ids: string[] = [];
  const missing: string[] = [];
  for (const name of search.label_names || []) {
    const label = labels.find(l => l.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (label) ids.push(label.id); else missing.push(name);
  }
  const { label_names: _names, ...rest } = search;
  return { search: { ...rest, ...(ids.length ? { labels: ids } : {}) }, missing };
}
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()).replace(/-/g, '');

/** At most `max` UTF-8 bytes, cut on a character boundary (the engine counts bytes). */
function clip(text: string, max: number): string {
  const encoder = new TextEncoder();
  let out = '';
  for (const char of text) {
    if (encoder.encode(out + char).length > max) break;
    out += char;
  }
  return out;
}

/** The filters on screen now, as a search to save; null when nothing is filtered. */
function current(): Omit<SavedSearch, 'id' | 'name'> | null {
  const text = $<HTMLInputElement>('search').value.trim();
  const kind = $<HTMLSelectElement>('kind-filter').value;
  const color = colorFilter();
  const similar = similarFilter();
  const { tags, labels } = tagFilter();
  if (!text && !kind && !color && !similar && !tags.length && !labels.length) return null;
  return {
    ...(text ? { text: clip(text, 200) } : {}),
    ...(kind ? { kind } : {}),
    ...(color ? { color: color.color, ...(color.tolerance !== DEFAULT_TOLERANCE ? { tolerance: color.tolerance } : {}) } : {}),
    ...(similar ? { similar } : {}),
    ...(tags.length ? { tags: tags.map(t => clip(t, 60)) } : {}),
    ...(labels.length ? { labels } : {}),
  };
}

const sameSet = (a: string[] = [], b: string[] = [], fold = (s: string) => s) => a.length === b.length && a.every(x => b.some(y => fold(y) === fold(x)));

function isCurrent(search: SavedSearch): boolean {
  const now = current();
  if (!now) return false;
  return (now.text || '') === (search.text || '') && (now.kind || '') === (search.kind || '')
    && (now.color || '') === (search.color || '').toLowerCase() && (now.tolerance ?? DEFAULT_TOLERANCE) === (search.tolerance ?? DEFAULT_TOLERANCE)
    && (now.similar?.item_id || '') === (search.similar?.item_id || '') && (now.similar?.level || '') === (search.similar?.level || '')
    && sameSet(now.tags, search.tags, s => s.trim().toLowerCase()) && sameSet(now.labels, search.labels);
}

/** A name from the filters: the text in quotes, the kind as the filter shows it, the colour, and the sample picture's title. */
function suggestedName(): string {
  const now = current();
  if (!now) return '';
  const select = $<HTMLSelectElement>('kind-filter');
  const sample = now.similar ? S.state?.board.items.find(i => i.id === now.similar!.item_id) : undefined;
  const labelNames = (now.labels || []).map(id => S.state?.board.settings?.labels?.find(l => l.id === id)?.name).filter(Boolean);
  const parts = [now.text ? `“${now.text}”` : '', now.kind ? select.selectedOptions[0]?.textContent?.trim() || now.kind : '', ...labelNames, ...(now.tags || []).map(t => `#${t}`), now.color || '', sample ? `≈ ${sample.title || sample.kind}` : ''];
  return clip(parts.filter(Boolean).join(' · '), 60);
}

/** Every filter at once: colour and similar answers come in first without drawing, then setting the find text redraws the board one time. */
export async function applySearch(search: SavedSearch): Promise<void> {
  const board = S.state?.board;
  if (!board) return;
  const sample = search.similar ? board.items.find(i => i.id === search.similar!.item_id && i.kind === 'image' && !!i.asset_id && !i.hidden) : undefined;
  await Promise.all([
    setColorFilter(search.color ? search.color.toLowerCase() : null, search.tolerance ?? DEFAULT_TOLERANCE, false, false),
    sample ? findSimilar(sample, search.similar!.level, false, false) : Promise.resolve(clearSimilar(false)),
  ]);
  if (S.state?.board.id !== board.id) return;
  setTagFilter(search.tags, search.labels, false);
  const select = $<HTMLSelectElement>('kind-filter');
  select.value = [...select.options].some(o => o.value === search.kind) ? search.kind || '' : '';
  const input = $<HTMLInputElement>('search');
  input.value = search.text || '';
  input.dispatchEvent(new Event('input'));
  if (search.similar && !sample) toast('The picture this search started from is no longer on the board, so only its other filters apply.');
  refreshButton();
}

export async function clearFilters(): Promise<void> {
  await setColorFilter(null, DEFAULT_TOLERANCE, false, false);
  clearSimilar(false);
  setTagFilter([], [], false);
  $<HTMLSelectElement>('kind-filter').value = '';
  const input = $<HTMLInputElement>('search');
  input.value = '';
  input.dispatchEvent(new Event('input'));
  refreshButton();
}

async function saveSearch(params?: Record<string, unknown>): Promise<void> {
  const now = current();
  if (!now || !S.state) throw new Error('Set a find text, a kind, a color, a similar picture or a tag first, then save it.');
  let name = typeof params?.name === 'string' ? params.name : '';
  if (!name) {
    const form = await inputDialog('Save search', { name: suggestedName(), label: 'Name', description: 'The board keeps the find text, kind, color, similar picture and chosen tags under this name. A saved search with the same name is replaced.', submit: 'Save' });
    if (!form) return;
    name = form.name;
  }
  name = clip(name.trim(), 60) || suggestedName();
  const list = [...searches()];
  const at = list.findIndex(s => s.name.toLowerCase() === name.toLowerCase());
  if (at < 0 && list.length >= MAX_SEARCHES) throw new Error('A board can keep at most 24 saved searches. Delete one first.');
  const entry: SavedSearch = { id: at >= 0 ? list[at].id : newId(), name, ...now };
  if (at >= 0) list[at] = entry; else list.push(entry);
  await execute({ type: 'settings', patch: { searches: list } });
  refreshButton();
  toast(at >= 0 ? 'Saved search updated.' : 'Search saved. Find it under the bookmark beside the item count.');
}

function deleteSearch(search: SavedSearch): Promise<unknown> {
  return execute({ type: 'settings', patch: { searches: searches().filter(s => s.id !== search.id) } });
}

async function applyShared(search: SharedSearch): Promise<void> {
  const { search: local, missing } = fromShared(search);
  await applySearch(local);
  if (missing.length) toast(t('This board has no label named {0}, so that part of the search is left out.', { 0: missing.join(', ') }));
}

async function saveShared(params?: Record<string, unknown>): Promise<void> {
  const now = current();
  const labels = S.state?.board.settings?.labels || [];
  const labelNames = (now?.labels || []).map(id => labels.find(l => l.id === id)?.name).filter((n): n is string => !!n);
  const { similar: _similar, labels: _labels, ...rest } = now || {};
  if (!now || (!rest.text && !rest.kind && !rest.color && !rest.tags?.length && !labelNames.length)) throw new Error('Set a find text, a kind, a color or a tag first. A similar picture stays with its own board.');
  let name = typeof params?.name === 'string' ? params.name : '';
  if (!name) {
    const form = await inputDialog('Save Search for All Boards', { name: suggestedName(), label: 'Name', description: 'Every board lists it under the bookmark. The find text, kind, color, tags and label names are kept, and a similar picture stays with this board. A search for all boards with the same name is replaced.', submit: 'Save' });
    if (!form) return;
    name = form.name;
  }
  name = clip(name.trim(), 60) || suggestedName();
  const list = [...shared];
  const at = list.findIndex(s => s.name.toLowerCase() === name.toLowerCase());
  if (at < 0 && list.length >= MAX_SHARED) throw new Error('FormRef can keep at most 48 searches for all boards. Delete one first.');
  const entry: SharedSearch = { id: at >= 0 ? list[at].id : newId(), name, ...rest, ...(labelNames.length ? { label_names: labelNames } : {}) };
  if (at >= 0) list[at] = entry; else list.push(entry);
  await storeShared(list);
  toast(at >= 0 ? 'Search for all boards updated.' : (now.similar ? 'Search saved for all boards, without its similar picture.' : 'Search saved for all boards.'));
}

function deleteShared(search: SharedSearch): Promise<void> {
  return storeShared(shared.filter(s => s.id !== search.id));
}

/** The saved searches, then Save, Clear and Delete; used by the bookmark button and the right-click menu. */
export function savedSearchEntries(): MenuEntry[] {
  const list = searches();
  const now = current();
  const run = (fn: () => Promise<unknown>) => () => void fn().catch(reason => toast((reason as Error).message));
  const everywhere: MenuEntry[] = shared.length ? [{ section: 'All Boards' }, ...shared.map(search => ({ label: search.name, icon: 'bookmark' as const, checked: isCurrent(fromShared(search).search), action: run(() => applyShared(search)) }))] : [];
  const deletable: MenuEntry[] = [
    ...list.map(search => ({ label: search.name, danger: true, action: run(() => deleteSearch(search)) })),
    ...(list.length && shared.length ? [{ separator: true } as const] : []),
    ...shared.map(search => ({ label: search.name, icon: 'bookmark' as const, danger: true, action: run(() => deleteShared(search)) })),
  ];
  return [
    ...(list.length || shared.length ? [] : [{ label: 'No saved searches yet', disabled: true }]),
    ...(list.length && shared.length ? [{ section: 'This Board' }] : []),
    ...list.map(search => ({ label: search.name, icon: 'bookmark' as const, checked: isCurrent(search), action: run(() => applySearch(search)) })),
    ...everywhere,
    { separator: true },
    { label: 'Save Current Search…', icon: 'plus', disabled: !now, action: run(() => saveSearch()) },
    { label: 'Save Search for All Boards…', icon: 'plus', disabled: !now, action: run(() => saveShared()) },
    { label: 'Clear All Filters', icon: 'close', disabled: !now, action: run(clearFilters) },
    { label: 'Delete Saved Search', icon: 'trash', disabled: !list.length && !shared.length, children: deletable },
  ];
}

export function savedSearchMenu(): MenuEntry {
  return { label: 'Saved Searches', icon: 'bookmark', children: savedSearchEntries() };
}

function openMenu(): void {
  const button = $('saved-searches');
  const box = button.getBoundingClientRect();
  if (box.width) menu.show(savedSearchEntries(), box.left, box.bottom + 4);
  else menu.show(savedSearchEntries(), window.innerWidth / 2, window.innerHeight / 3);
}

/** The bookmark takes the accent while the filters on screen are one of the saved searches. */
function refreshButton(): void {
  const match = searches().some(isCurrent) || shared.some(search => isCurrent(fromShared(search).search));
  const button = $('saved-searches');
  button.classList.toggle('active', !!match);
}

export function registerSavedSearch(): void {
  $('saved-searches').addEventListener('click', event => { event.preventDefault(); openMenu(); });
  $('search').addEventListener('input', refreshButton);
  $('kind-filter').addEventListener('change', refreshButton);
  // The colour and similar filters mark the filter row; watching it keeps those modules unaware of this one.
  new MutationObserver(refreshButton).observe($('filter-row'), { attributes: true, attributeFilter: ['class', 'style'] });
  new MutationObserver(refreshButton).observe($('tag-cloud'), { subtree: true, attributes: true, attributeFilter: ['aria-pressed'] });
  onState(() => refreshButton());
  void loadShared();
  registry.add(
    { group: 'Edit', id: 'saved-searches', label: 'Saved Searches…', icon: 'bookmark', mutates: false, agent: 'window-only', enabled: () => !!S.state, run: openMenu },
    { group: 'Edit', id: 'save-search', label: 'Save Current Search…', icon: 'bookmark', enabled: () => !!S.state && !!current(), run: p => saveSearch(p), params: { name: { type: 'string', description: 'name for the search; leave out to be asked; an existing search with the same name is replaced' } } },
    { group: 'Edit', id: 'save-shared-search', label: 'Save Search for All Boards…', icon: 'bookmark', mutates: false, enabled: () => !!S.state && !!current(), run: p => saveShared(p), params: { name: { type: 'string', description: 'name for the search; leave out to be asked; a search for all boards with the same name is replaced' } } },
    { group: 'Edit', id: 'clear-filters', label: 'Clear All Filters', icon: 'close', mutates: false, agent: 'window-only', enabled: () => !!current(), run: () => clearFilters() },
    { group: 'Edit', id: 'apply-saved-search', label: 'Apply Saved Search', icon: 'bookmark', mutates: false, agent: 'window-only', palette: false, enabled: () => searches().length + shared.length > 0, run: p => { const name = String(p?.name || '').toLowerCase(); const search = searches().find(s => s.name.toLowerCase() === name || s.id === p?.id); if (search) return applySearch(search); const everywhere = shared.find(s => s.name.toLowerCase() === name || s.id === p?.id); if (!everywhere) throw new Error('No saved search on this board or for all boards has that name.'); return applyShared(everywhere); }, params: { name: { type: 'string', description: 'the saved search name' }, id: { type: 'string', description: 'or its id' } } },
  );
}
