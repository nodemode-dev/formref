import type { Board, Item } from '../lib/types';
import type { MenuEntry } from '../ui/context-menu';
import { $, S, boardOpened, matchFilters, matches, onState, scene, selection, toast, updateOutline } from './editor';
import { menu } from './gestures';
import { registry } from './registry';

/** Tag cloud: the board's labels and tags with how many items carry each, under the find box; clicking chips narrows the board to items carrying all of them (Milanote and Eagle show tags this way; PureRef and BeeRef have none). */

const SHOWN = 14;
interface Entry { key: string; kind: 'label' | 'tag'; name: string; color?: string; count: number }
const active = new Set<string>();
const chips = new Map<string, HTMLButtonElement>();
let more: HTMLButtonElement | null = null;
let entries: Entry[] = [];

const fold = (text: string) => text.trim().toLowerCase();
const tagsOf = (item: Item) => Array.isArray(item.data.tags) ? (item.data.tags as unknown[]).filter((t): t is string => typeof t === 'string' && !!t.trim()) : [];
const labelsOf = (item: Item) => Array.isArray(item.data.labels) ? (item.data.labels as unknown[]).filter((t): t is string => typeof t === 'string') : [];

/** Labels first (they are the board's own categories), then tags; each by how many items carry it, then by name. Tags differing only in case count as one, shown as first seen. */
function collect(board: Board): Entry[] {
  const labels = new Map((board.settings?.labels || []).map(l => [l.id, l]));
  const counts = new Map<string, Entry>();
  for (const item of board.items) {
    if (item.hidden) continue;
    for (const id of new Set(labelsOf(item))) {
      const label = labels.get(id);
      if (!label) continue;
      const key = `label:${id}`;
      const entry = counts.get(key) || { key, kind: 'label' as const, name: label.name, color: label.color, count: 0 };
      entry.count++;
      counts.set(key, entry);
    }
    for (const tag of new Set(tagsOf(item).map(t => t.trim()))) {
      const key = `tag:${fold(tag)}`;
      const entry = counts.get(key) || { key, kind: 'tag' as const, name: tag, count: 0 };
      entry.count++;
      counts.set(key, entry);
    }
  }
  return [...counts.values()].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'label' ? -1 : 1) || b.count - a.count || a.name.localeCompare(b.name));
}

function carries(item: Item, key: string): boolean {
  if (key.startsWith('label:')) return labelsOf(item).includes(key.slice(6));
  const wanted = key.slice(4);
  return tagsOf(item).some(t => fold(t) === wanted);
}

function refilter(): void {
  if (!S.state) return;
  scene.render(S.state.board, selection, matches);
  updateOutline();
}

function markRow(): void {
  $('filter-row').classList.toggle('has-tags', active.size > 0);
}

export function toggleTag(key: string, render = true): void {
  if (active.has(key)) active.delete(key); else active.add(key);
  markRow();
  draw();
  if (render) refilter();
}

/** For saved searches: the chosen tags (as typed) and label ids. */
export function tagFilter(): { tags: string[]; labels: string[] } {
  const tags: string[] = [], labels: string[] = [];
  for (const key of active) {
    if (key.startsWith('label:')) labels.push(key.slice(6));
    else tags.push(entries.find(e => e.key === key)?.name || key.slice(4));
  }
  return { tags, labels };
}

/** Replaces the chosen chips; with render false the caller redraws the board itself. */
export function setTagFilter(tags: string[] = [], labels: string[] = [], render = true): void {
  active.clear();
  for (const id of labels) active.add(`label:${id}`);
  for (const tag of tags) active.add(`tag:${fold(tag)}`);
  markRow();
  draw();
  if (render) refilter();
}

function chip(entry: Entry): HTMLButtonElement {
  let button = chips.get(entry.key);
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'tag-chip';
    button.dataset.key = entry.key;
    const dot = document.createElement('span');
    dot.className = 'tag-dot';
    const name = document.createElement('span');
    name.className = 'tag-name';
    name.dataset.noI18n = '';
    const count = document.createElement('span');
    count.className = 'tag-count';
    button.append(dot, name, count);
    button.addEventListener('click', () => toggleTag(button!.dataset.key!));
    chips.set(entry.key, button);
  }
  const [dot, name, count] = button.children as unknown as HTMLElement[];
  dot.hidden = entry.kind !== 'label';
  if (entry.color && dot.style.background !== entry.color) dot.style.background = entry.color;
  if (name.textContent !== entry.name) name.textContent = entry.name;
  if (count.textContent !== String(entry.count)) count.textContent = String(entry.count);
  if (button.title !== entry.name) button.title = entry.name;
  button.classList.toggle('active', active.has(entry.key));
  button.setAttribute('aria-pressed', String(active.has(entry.key)));
  return button;
}

/** Updates the strip in place: chips are reused by key, only changed text is written, and nodes move only when the order changed. Chosen chips always show, even past the first fourteen. */
function draw(): void {
  const cloud = $('tag-cloud');
  const shown = entries.filter((e, i) => i < SHOWN || active.has(e.key));
  const rest = entries.length - shown.length;
  const want: HTMLElement[] = shown.map(chip);
  if (rest > 0) {
    if (!more) {
      more = document.createElement('button');
      more.type = 'button';
      more.className = 'tag-chip tag-more';
      more.addEventListener('click', () => { const box = more!.getBoundingClientRect(); menu.show(restMenu(), box.left, box.bottom + 4); });
    }
    const label = `+${rest}`;
    if (more.textContent !== label) more.textContent = label;
    more.title = 'More tags';
    want.push(more);
  }
  const current = [...cloud.children];
  if (current.length !== want.length || current.some((node, i) => node !== want[i])) cloud.replaceChildren(...want);
  for (const [key, button] of chips) if (!entries.some(e => e.key === key)) { chips.delete(key); button.remove(); }
  const empty = entries.length === 0;
  if (cloud.hidden !== empty) cloud.hidden = empty;
}

function restMenu(): MenuEntry[] {
  return entries.slice(SHOWN).filter(e => !active.has(e.key)).map(e => ({ label: `${e.name} (${e.count})`, checked: active.has(e.key), action: () => toggleTag(e.key) }));
}

function update(board: Board): void {
  entries = collect(board);
  // A chosen tag that no longer exists on the board stops filtering.
  let dropped = false;
  for (const key of [...active]) if (!entries.some(e => e.key === key)) { active.delete(key); dropped = true; }
  markRow();
  draw();
  if (dropped) refilter();
}

export function registerTagCloud(): void {
  matchFilters.push(item => { for (const key of active) if (!carries(item, key)) return false; return true; });
  onState(state => update(state.board));
  boardOpened.push(() => { active.clear(); markRow(); });
  $('color-find-clear').addEventListener('click', () => { if (active.size) setTagFilter([], []); });
  registry.add(
    { group: 'Edit', id: 'filter-by-tag', label: 'Filter by Tag', icon: 'label', mutates: false, agent: 'window-only', palette: false, enabled: () => entries.length > 0, run: p => { const tag = typeof p?.tag === 'string' ? p.tag : ''; const label = typeof p?.label === 'string' ? (S.state?.board.settings?.labels || []).find(l => l.id === p.label || fold(l.name) === fold(String(p.label))) : undefined; const key = label ? `label:${label.id}` : `tag:${fold(tag)}`; if (!entries.some(e => e.key === key)) throw new Error('No item on this board carries that tag or label.'); toggleTag(key); }, params: { tag: { type: 'string', description: 'a tag to add to or remove from the filter' }, label: { type: 'string', description: 'or a label name or id' } } },
    { group: 'Edit', id: 'clear-tag-filter', label: 'Clear Tag Filter', icon: 'close', mutates: false, agent: 'window-only', enabled: () => active.size > 0, run: () => { setTagFilter([], []); toast('Tag filter cleared.'); } },
  );
}
