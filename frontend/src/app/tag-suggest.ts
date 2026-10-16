import { $ } from './editor';
import { boardTagNames } from './tag-cloud';

/** Tag suggestions in the inspector: while typing in the tags field, the board's tags that start with (or contain) the word being typed are offered below it, most used first. Arrow keys move, Enter takes the highlighted one, Tab the highlighted or first one, Esc closes. The list floats in the overlay root, so nothing in the inspector moves. */

const MAX = 6;
let list: HTMLElement | null = null;
let options: string[] = [];
let at = -1;

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();

function input(): HTMLInputElement { return $<HTMLInputElement>('prop-tags'); }

/** The word being typed: the text after the last comma before the caret. */
function token(field: HTMLInputElement): { start: number; end: number; text: string } {
  const caret = field.selectionStart ?? field.value.length;
  const start = field.value.lastIndexOf(',', caret - 1) + 1;
  const after = field.value.indexOf(',', caret);
  const end = after < 0 ? field.value.length : after;
  return { start, end, text: field.value.slice(start, caret) };
}

function ensureList(): HTMLElement {
  if (list) return list;
  list = document.createElement('div');
  list.className = 'tag-suggest';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  list.addEventListener('pointerdown', event => {
    const option = (event.target as Element).closest<HTMLElement>('[data-index]');
    if (!option) return;
    event.preventDefault();
    take(Number(option.dataset.index));
  });
  $('overlay-root').append(list);
  return list;
}

function hide(): void {
  if (list && !list.hidden) list.hidden = true;
  options = [];
  at = -1;
  input().removeAttribute('aria-activedescendant');
}

/** Rows are reused; only their text and the highlighted one change. */
function show(field: HTMLInputElement): void {
  const box = ensureList();
  while (box.children.length < options.length) {
    const row = document.createElement('div');
    row.className = 'tag-suggest-option';
    row.setAttribute('role', 'option');
    row.dataset.noI18n = '';
    box.append(row);
  }
  [...box.children].forEach((row, index) => {
    const el = row as HTMLElement;
    const visible = index < options.length;
    el.hidden = !visible;
    if (!visible) return;
    el.dataset.index = String(index);
    el.id = `tag-suggest-${index}`;
    if (el.textContent !== options[index]) el.textContent = options[index];
    el.classList.toggle('active', index === at);
    el.setAttribute('aria-selected', String(index === at));
  });
  const rect = field.getBoundingClientRect();
  box.style.left = `${rect.left}px`;
  box.style.top = `${rect.bottom + 4}px`;
  box.style.width = `${rect.width}px`;
  if (box.hidden) box.hidden = false;
  if (at >= 0) field.setAttribute('aria-activedescendant', `tag-suggest-${at}`);
  else field.removeAttribute('aria-activedescendant');
}

function refresh(): void {
  const field = input();
  if (document.activeElement !== field) { hide(); return; }
  const word = fold(token(field).text);
  if (!word) { hide(); return; }
  const typed = new Set(field.value.split(',').map(fold).filter(Boolean));
  const tags = boardTagNames().filter(tag => !typed.has(fold(tag)) || fold(tag) === word);
  const starts = tags.filter(tag => fold(tag).startsWith(word) && fold(tag) !== word);
  const contains = tags.filter(tag => !fold(tag).startsWith(word) && fold(tag).includes(word));
  options = [...starts, ...contains].slice(0, MAX);
  if (!options.length) { hide(); return; }
  at = Math.min(at, options.length - 1);
  show(field);
}

/** Puts the chosen tag in place of the word being typed, followed by a comma for the next one. */
function take(index: number): void {
  const field = input();
  const tag = options[index];
  if (tag === undefined) return;
  const { start, end } = token(field);
  const before = field.value.slice(0, start).replace(/\s*$/, start ? ' ' : '');
  const after = field.value.slice(end);
  field.value = `${before}${tag}, ${after.replace(/^\s*,?\s*/, '')}`;
  const caret = (before + tag + ', ').length;
  field.setSelectionRange(caret, caret);
  hide();
}

export function registerTagSuggest(): void {
  const field = input();
  field.setAttribute('autocomplete', 'off');
  field.setAttribute('aria-autocomplete', 'list');
  field.addEventListener('input', () => { at = -1; refresh(); });
  field.addEventListener('keydown', event => {
    if (!options.length || !list || list.hidden) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      at = event.key === 'ArrowDown' ? (at + 1) % options.length : at <= 0 ? options.length - 1 : at - 1;
      show(field);
    } else if ((event.key === 'Enter' && at >= 0) || event.key === 'Tab') {
      // Enter takes a highlighted suggestion (otherwise it saves the field); Tab completes the first one when none is highlighted.
      event.preventDefault();
      take(at >= 0 ? at : 0);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      hide();
    }
  });
  field.addEventListener('blur', hide);
  field.addEventListener('change', hide);
  // The list is placed under the field once; if a panel scrolls or the window resizes, it closes rather than drift.
  document.addEventListener('scroll', () => { if (list && !list.hidden) hide(); }, { capture: true, passive: true });
  window.addEventListener('resize', hide);
}
