import { api } from '../lib/api';
import { MarkdownView } from '../lib/markdown';
import { embedUrl, mediaKind, paintPlayer } from '../lib/media';
import { display, evaluate, readTable } from '../lib/table';
import type { Item, Viewport } from '../lib/types';
import { $, S, drawCamera, fit, setText, stage } from './editor';

/** Presenter view: the board full screen with editing hidden; click a card to enlarge it, arrows step through. */
const app = $('app');
const card = $<HTMLDialogElement>('present-dialog');
const media = $<HTMLImageElement>('present-image');
const textBox = $('present-text');
const markdown = new MarkdownView($('present-markdown'));
const SHOWN = new Set(['image', 'note', 'document', 'link', 'todo', 'swatch', 'board', 'file', 'table']);
let active = false;
let before: Viewport | null = null;
let order: Item[] = [];
let index = -1;

export const isPresenting = () => active;

function readingOrder(): Item[] {
  return (S.state?.board.items || []).filter(item => !item.hidden && SHOWN.has(item.kind))
    .sort((a, b) => (Math.abs(a.y - b.y) > 40 ? a.y - b.y : a.x - b.x));
}

function refit() {
  // Fit for the audience without saving that camera to the board (no viewport write, no history entry).
  requestAnimationFrame(() => { fit(); window.clearTimeout(S.viewportTimer); drawCamera(); });
}

export async function startPresenting() {
  if (active || !S.state) return;
  active = true;
  before = { ...S.camera };
  app.classList.add('presenting');
  $('present-exit').hidden = false;
  try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch { /* window mode still works */ }
  refit();
}

export async function stopPresenting() {
  if (!active) return;
  active = false;
  if (card.open) card.close();
  app.classList.remove('presenting');
  $('present-exit').hidden = true;
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
  if (before) { S.camera = before; before = null; }
  requestAnimationFrame(drawCamera);
}

export function togglePresenting() {
  return active ? stopPresenting() : startPresenting();
}

function show(next: number) {
  if (!order.length) return;
  index = (next + order.length) % order.length;
  const item = order[index];
  setText('present-title', item.title || (item.kind === 'image' ? '' : item.kind));
  setText('present-count', `${index + 1} of ${order.length}`);
  const image = item.kind === 'image' && !!item.asset_id;
  media.hidden = !image;
  textBox.hidden = image;
  if (image) {
    paintPlayer($('present-media'), '', '', { loop: false, autoplay: false, title: '' });
    const src = api.assetUrl(item.asset_id!);
    if (media.getAttribute('src') !== src) {
      const next = new Image();
      next.src = src;
      void next.decode().catch(() => undefined).then(() => { if (order[index] === item) media.src = src; });
    }
  } else {
    const kind = mediaKind(item.kind, item.data.mime, item.asset_id, item.url);
    const player = $('present-media');
    player.hidden = !kind;
    paintPlayer(player, kind, kind === 'embed' ? embedUrl(item.url) || '' : kind ? api.assetUrl(item.asset_id!) : '', { loop: !!item.data.loop, autoplay: false, title: item.title || 'Media' });
    const formatted = item.data.text_format === 'markdown';
    $('present-markdown').hidden = !formatted;
    $('present-plain').hidden = formatted;
    if (formatted) markdown.update(item.text);
    else if (item.kind === 'table') {
      const table = readTable(item.data.table);
      const values = evaluate(table);
      setText('present-plain', [table.columns.map(c => c.name).join('    '), ...values.map((row, r) => row.map((v, c) => (table.columns[c].type === 'checkbox' ? (table.rows[r][c] === 'true' ? 'Yes' : 'No') : display(v, table.columns[c].type))).join('    '))].join('\n'));
    } else setText('present-plain', kind ? '' : item.kind === 'link' ? `${item.text}\n${item.url}`.trim() : item.kind === 'swatch' ? item.color : item.text);
    textBox.style.setProperty('--paper', item.kind === 'note' ? item.color : '');
  }
  if (!card.open) card.showModal();
}

function enlarge(item: Item) {
  order = readingOrder();
  show(Math.max(0, order.findIndex(entry => entry.id === item.id)));
}

// While presenting, the canvas is read-only: a click enlarges, nothing edits, no menu opens.
stage.addEventListener('pointerdown', event => {
  if (!active || event.button !== 0) return;
  event.stopImmediatePropagation();
  event.preventDefault();
  const id = (event.target as HTMLElement).closest<HTMLElement>('.board-item')?.dataset.id;
  const item = S.state?.board.items.find(entry => entry.id === id);
  if (item && SHOWN.has(item.kind)) enlarge(item);
}, true);
for (const type of ['dblclick', 'contextmenu']) {
  stage.addEventListener(type, event => { if (active) { event.stopImmediatePropagation(); event.preventDefault(); } }, true);
}

window.addEventListener('keydown', event => {
  if (!active) return;
  // Zoom keys fall through to the canvas; every other key is held here so nothing edits the board.
  if (['+', '=', '-'].includes(event.key) && !card.open) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const items = readingOrder();
  if (event.key === 'Escape') {
    if (card.open) card.close(); else void stopPresenting();
  } else if (event.key === 'ArrowRight' && items.length) {
    if (card.open) show(index + 1); else enlarge(items[0]);
  } else if (event.key === 'ArrowLeft' && items.length) {
    if (card.open) show(index - 1); else enlarge(items[items.length - 1]);
  } else if (event.key === 'f' || event.key === 'F') {
    refit();
  }
}, true);

document.addEventListener('fullscreenchange', () => {
  if (active && !document.fullscreenElement) void stopPresenting();
  else if (active) refit();
});
$('present-exit').addEventListener('click', () => void stopPresenting());
$('present-next').addEventListener('click', () => show(index + 1));
$('present-prev').addEventListener('click', () => show(index - 1));
card.addEventListener('click', event => { if (event.target === card) card.close(); });
card.addEventListener('close', () => paintPlayer($('present-media'), '', '', { loop: false, autoplay: false, title: '' }));
