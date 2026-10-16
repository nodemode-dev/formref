import type { Item } from '../lib/types';
import { t } from '../lib/i18n';
import type { MenuEntry } from '../ui/context-menu';
import { icon } from '../ui/icons';
import { $, S, boardOpened, execute, matchFilters, matches, onInspector, scene, selected, selection, toast, updateOutline } from './editor';
import { menu } from './gestures';
import { registry } from './registry';

/** Star ratings (reference-board gap: Eagle's and Lightroom's 0 to 5 stars): pictures carry data.rating 1 to 5, set with the digit keys or the inspector stars, filtered from the star button beside the kind filter, kept by saved searches and written into exported files as xmp:Rating. */

export const ratingOf = (item: Item): number => (item.kind === 'image' && typeof item.data.rating === 'number' ? item.data.rating : 0);

const pictures = () => selected().filter(item => item.kind === 'image' && !!item.asset_id);

/** null shows everything, 0 keeps unrated pictures, 1 to 5 keeps pictures with at least that many stars. */
let filter: number | null = null;

export const ratingFilter = (): number | null => filter;

function refilter(): void {
  if (!S.state) return;
  scene.render(S.state.board, selection, matches);
  updateOutline();
}

function markButton(): void {
  const button = $('rating-find');
  $('filter-row').classList.toggle('has-rating', filter !== null);
  button.dataset.rating = filter === null ? '' : filter === 0 ? '0' : `${filter}+`;
  button.setAttribute('aria-pressed', String(filter !== null));
}

export function setRatingFilter(next: number | null, render = true): void {
  filter = next === null || !Number.isFinite(next) ? null : Math.max(0, Math.min(5, Math.round(next)));
  markButton();
  if (render) refilter();
}

export function filterLabel(value: number): string {
  return value === 0 ? t('Unrated') : value === 1 ? t('Rated') : value === 5 ? t('Five stars') : t('At least {0} stars', { 0: value });
}

async function rate(stars: number): Promise<void> {
  const items = pictures();
  if (!items.length) throw new Error('Select one or more pictures to rate.');
  const value = Math.max(0, Math.min(5, Math.round(stars)));
  await execute({ type: 'image', ids: items.map(item => item.id), set: { rating: value } });
}

function openMenu(): void {
  const button = $('rating-find');
  const box = button.getBoundingClientRect();
  const entries: MenuEntry[] = [
    { label: 'Any Rating', checked: filter === null, action: () => setRatingFilter(null) },
    { separator: true },
    ...[5, 4, 3, 2, 1].map(value => ({ label: filterLabel(value), icon: 'star' as const, checked: filter === value, action: () => setRatingFilter(value) })),
    { separator: true },
    { label: t('Unrated'), checked: filter === 0, action: () => setRatingFilter(0) },
  ];
  menu.show(entries, box.left, box.bottom + 4);
}

// Inspector stars: five buttons made once; a selection change only flips each button's pressed state.
const stars = document.createElement('div');
stars.className = 'rating-stars';
stars.setAttribute('role', 'group');
stars.setAttribute('aria-label', 'Rating');
const starButtons = [1, 2, 3, 4, 5].map(value => {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'icon-button small rating-star'; button.dataset.stars = String(value);
  button.title = `Rate ${value} of 5`;
  button.setAttribute('aria-label', button.title);
  button.append(icon('star'));
  button.addEventListener('click', () => {
    const current = pictures().length === 1 ? ratingOf(pictures()[0]) : -1;
    void rate(current === value ? 0 : value).catch(reason => toast((reason as Error).message));
  });
  return button;
});
stars.append(...starButtons);

function showStars(items: Item[]): void {
  const images = items.filter(item => item.kind === 'image');
  const values = new Set(images.map(ratingOf));
  const value = values.size === 1 ? [...values][0] : 0;
  starButtons.forEach((button, at) => {
    const on = at < value;
    if (button.classList.contains('on') !== on) button.classList.toggle('on', on);
    button.setAttribute('aria-pressed', String(on));
  });
  stars.classList.toggle('mixed', values.size > 1);
}

export function registerRating(): void {
  const row = document.createElement('div');
  row.className = 'field-row rating-row';
  const caption = document.createElement('span'); caption.textContent = 'Rating';
  row.append(caption, stars);
  $('image-properties').querySelector('.button-grid')?.before(row);
  onInspector(showStars);
  matchFilters.push(item => filter === null || (item.kind === 'image' && (filter === 0 ? ratingOf(item) === 0 : ratingOf(item) >= filter)));
  $('rating-find').addEventListener('click', event => { event.preventDefault(); openMenu(); });
  $('color-find-clear').addEventListener('click', () => { if (filter !== null) setRatingFilter(null); });
  boardOpened.push(() => { filter = null; markButton(); });
  markButton();
  registry.add(
    ...[0, 1, 2, 3, 4, 5].map(value => ({
      group: 'Images', id: `rate-${value}`, label: value === 0 ? 'Clear Rating' : value === 1 ? 'Rate 1 Star' : `Rate ${value} Stars`, icon: 'star' as const, keys: [String(value)],
      run: () => rate(value), enabled: () => pictures().length > 0,
    })),
    {
      group: 'Edit', id: 'filter-rating', label: 'Filter by Rating…', icon: 'star', mutates: false, agent: 'window-only',
      run: (p?: Record<string, unknown>) => { if (p && 'stars' in p) setRatingFilter(p.stars === null ? null : Number(p.stars)); else openMenu(); },
      enabled: () => !!S.state,
      params: { stars: { type: 'number', description: '1 to 5 keeps pictures with at least that many stars, 0 keeps unrated pictures, null shows everything; leave out to choose from a menu' } },
      description: 'Dims everything except pictures with at least the chosen number of stars, or only unrated pictures. The star button beside the kind filter shows it; the clear button beside it clears every filter.',
    },
  );
}
