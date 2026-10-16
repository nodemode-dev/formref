import type { Item } from '../lib/types';
import { api } from '../lib/api';
import { locale, t } from '../lib/i18n';
import { paintImage } from '../lib/image-geometry';
import { icon } from '../ui/icons';
import { $, S, selected, toast } from './editor';
import { registry } from './registry';

/** Timed Practice (reference-board gap: gesture and figure drawing sessions, as Line of Action, Quickposes or Croquis Cafe run them): the board's pictures one at a time, full screen, each for a set time, in shuffled or reading order, with pause, skip, mirror and grey. A view only; nothing on the board changes. */

const TIMES: [number, string][] = [[30, ''], [60, ''], [120, ''], [300, ''], [600, ''], [0, 'No time limit']];

/** "30 seconds", "2 minutes" in the interface language from the browser's own unit names, so no table carries them. */
function duration(seconds: number): string {
  const [value, unit] = seconds < 60 ? [seconds, 'second'] : [seconds / 60, 'minute'];
  try { return new Intl.NumberFormat(locale(), { style: 'unit', unit, unitDisplay: 'long' }).format(value); } catch { return `${value} ${unit}s`; }
}
const COUNTS: [number, string][] = [[0, 'All of them'], [5, '5'], [10, '10'], [20, '20'], [30, '30']];
const STORE = 'formref-practice';

interface Choice { seconds: number; count: number; shuffle: boolean; grey: boolean }

function remembered(): Choice {
  const fallback: Choice = { seconds: 60, count: 0, shuffle: true, grey: false };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || '{}');
    return {
      seconds: TIMES.some(([s]) => s === saved.seconds) ? saved.seconds : fallback.seconds,
      count: COUNTS.some(([c]) => c === saved.count) ? saved.count : fallback.count,
      shuffle: typeof saved.shuffle === 'boolean' ? saved.shuffle : fallback.shuffle,
      grey: typeof saved.grey === 'boolean' ? saved.grey : fallback.grey,
    };
  } catch { return fallback; }
}

function remember(choice: Choice): void {
  try { localStorage.setItem(STORE, JSON.stringify(choice)); } catch { }
}

const usable = (item: Item) => item.kind === 'image' && !!item.asset_id && !item.hidden && !item.data.unresolved;

/** Two or more selected pictures; otherwise the pictures the filters leave lit; otherwise every picture. */
function source(): { items: Item[]; from: 'selection' | 'filters' | 'board' } {
  const board = S.state?.board.items || [];
  const picked = selected().filter(usable);
  if (picked.length >= 2) return { items: picked, from: 'selection' };
  const dimmed = new Set([...document.querySelectorAll<HTMLElement>('#items .board-item.matched-out')].map(n => n.dataset.id));
  const all = board.filter(usable).sort((a, b) => (Math.abs(a.y - b.y) > 40 ? a.y - b.y : a.x - b.x));
  if (dimmed.size) return { items: all.filter(i => !dimmed.has(i.id)), from: 'filters' };
  return { items: all, from: 'board' };
}

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600), minutes = Math.floor(total / 60) % 60, seconds = total % 60;
  return (hours ? `${hours}:${String(minutes).padStart(2, '0')}` : String(minutes)) + `:${String(seconds).padStart(2, '0')}`;
}

function button(name: string, label: string, onClick: () => void): HTMLButtonElement {
  const node = document.createElement('button');
  node.type = 'button'; node.className = 'icon-button'; node.title = label; node.setAttribute('aria-label', label);
  node.append(icon(name));
  node.addEventListener('click', onClick);
  return node;
}

// Setup dialog --------------------------------------------------------------------------------------------------

const setup = document.createElement('dialog');
setup.className = 'modal practice-setup';
setup.setAttribute('aria-labelledby', 'practice-setup-title');
const setupForm = document.createElement('form');
setupForm.method = 'dialog';
const setupHead = document.createElement('div');
setupHead.className = 'modal-head';
const setupTitle = document.createElement('strong');
setupTitle.id = 'practice-setup-title'; setupTitle.textContent = 'Timed Practice';
setupHead.append(setupTitle, button('close', 'Close', () => setup.close()));
const setupBody = document.createElement('div');
setupBody.className = 'modal-body';
const sourceLine = document.createElement('p');
sourceLine.className = 'field-description';
function selectField(label: string, options: [number, string][]): [HTMLLabelElement, HTMLSelectElement] {
  const field = document.createElement('label'); field.className = 'field';
  const caption = document.createElement('span'); caption.textContent = label;
  const select = document.createElement('select');
  for (const [value, text] of options) { const option = document.createElement('option'); option.value = String(value); option.textContent = text; select.append(option); }
  field.append(caption, select);
  return [field, select];
}
const [timeField, timeSelect] = selectField('Time per picture', TIMES);
const [countField, countSelect] = selectField('Pictures', COUNTS);
const fields = document.createElement('div'); fields.className = 'field-grid'; fields.append(timeField, countField);
function checkField(label: string): [HTMLLabelElement, HTMLInputElement] {
  const row = document.createElement('label'); row.className = 'check-row';
  const box = document.createElement('input'); box.type = 'checkbox';
  const text = document.createElement('span'); text.textContent = label;
  row.append(box, text);
  return [row, box];
}
const [shuffleRow, shuffleBox] = checkField('Shuffle');
const [greyRow, greyBox] = checkField('Show in grey');
const keysLine = document.createElement('p');
keysLine.className = 'field-description';
keysLine.textContent = 'Space pauses, the arrow keys step, H mirrors, G turns grey on or off and Esc ends the session. Nothing on the board changes.';
setupBody.append(sourceLine, fields, shuffleRow, greyRow, keysLine);
const setupFoot = document.createElement('div');
setupFoot.className = 'modal-footer';
const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'button'; cancel.textContent = 'Cancel';
cancel.addEventListener('click', () => setup.close());
const startButton = document.createElement('button'); startButton.type = 'submit'; startButton.className = 'button primary'; startButton.textContent = 'Start';
setupFoot.append(cancel, startButton);
setupForm.append(setupHead, setupBody, setupFoot);
setup.append(setupForm);

// Session view --------------------------------------------------------------------------------------------------

const root = document.createElement('div');
root.className = 'practice-overlay';
root.hidden = true;
root.setAttribute('role', 'dialog');
root.setAttribute('aria-modal', 'true');
root.setAttribute('aria-label', 'Timed Practice');
const bar = document.createElement('div');
bar.className = 'practice-bar';
const counter = document.createElement('span'); counter.className = 'practice-count';
const timeText = document.createElement('span'); timeText.className = 'practice-time';
const spacer = document.createElement('span'); spacer.className = 'compare-spacer';
const prevButton = button('chevron-left', 'Previous picture', () => step(-1));
const pauseButton = button('pause', 'Pause', () => setPaused(!paused));
const nextButton = button('chevron-right', 'Next picture', () => step(1));
const flipButton = button('flip', 'Mirror', () => setFlip(!flipped));
const greyButton = button('grayscale', 'Grey', () => setGrey(!grey));
const endButton = document.createElement('button'); endButton.type = 'button'; endButton.className = 'button compact'; endButton.textContent = 'End';
endButton.addEventListener('click', () => finish());
bar.append(counter, timeText, spacer, prevButton, pauseButton, nextButton, flipButton, greyButton, endButton);
const progress = document.createElement('div'); progress.className = 'practice-progress';
const progressFill = document.createElement('div'); progressFill.className = 'practice-progress-fill';
progress.append(progressFill);
const stageBox = document.createElement('div'); stageBox.className = 'practice-stage';
const frame = document.createElement('div'); frame.className = 'practice-frame';
let picture = document.createElement('img');
picture.className = 'reference-image'; picture.alt = ''; picture.draggable = false;
frame.append(picture);
const summary = document.createElement('div'); summary.className = 'practice-summary'; summary.hidden = true;
const summaryText = document.createElement('p');
const summaryActions = document.createElement('div'); summaryActions.className = 'practice-summary-actions';
const againButton = document.createElement('button'); againButton.type = 'button'; againButton.className = 'button'; againButton.textContent = 'Practice Again';
const closeButton = document.createElement('button'); closeButton.type = 'button'; closeButton.className = 'button primary'; closeButton.textContent = 'Close';
summaryActions.append(againButton, closeButton);
summary.append(summaryText, summaryActions);
stageBox.append(frame, summary);
root.append(bar, progress, stageBox);

let mounted = false;
let order: Item[] = [];
let index = 0;
let seconds = 60;
let remaining = 0;
let last = 0;
let spent = 0;
let seen = new Set<string>();
let paused = false;
let flipped = false;
let grey = false;
let loading = 0;
let frameRequest = 0;
let shownClock = '';
let lastChoice: Choice | null = null;

function mount(): void {
  if (mounted) return;
  $('overlay-root').append(root);
  document.body.append(setup);
  mounted = true;
}

/** Sizes the frame to the picture's shape inside the space under the bar. */
function layout(): void {
  const item = order[index];
  if (!item) return;
  const ratio = Math.max(0.05, item.width / Math.max(1, item.height));
  const width = stageBox.clientWidth - 48, height = stageBox.clientHeight - 48;
  const h = Math.max(40, Math.min(height, width / ratio));
  frame.style.width = `${ratio * h}px`; frame.style.height = `${h}px`;
}

function setPaused(next: boolean): void {
  paused = next;
  pauseButton.replaceChildren(icon(next ? 'play' : 'pause'));
  const label = next ? 'Resume' : 'Pause';
  pauseButton.title = label; pauseButton.setAttribute('aria-label', label);
  root.classList.toggle('paused', next);
  last = performance.now();
}

function setFlip(next: boolean): void {
  flipped = next;
  frame.classList.toggle('flipped', next);
  flipButton.setAttribute('aria-pressed', String(next));
}

function setGrey(next: boolean): void {
  grey = next;
  frame.classList.toggle('grey', next);
  greyButton.setAttribute('aria-pressed', String(next));
}

/** Writes the clock and bar only when they change: the clock once a second, the bar as a transform. */
function paintClock(): void {
  const text = seconds ? clock(remaining) : clock(spent);
  if (text !== shownClock) { shownClock = text; timeText.textContent = text; }
  timeText.classList.toggle('ending', !!seconds && remaining <= 5000);
  progressFill.style.transform = `scaleX(${seconds ? Math.max(0, remaining / (seconds * 1000)) : 0})`;
}

function tick(now: number): void {
  frameRequest = requestAnimationFrame(tick);
  const passed = now - last;
  last = now;
  if (paused || loading || root.hidden || !summary.hidden) return;
  spent += passed;
  if (seconds) {
    remaining -= passed;
    if (remaining <= 0) { remaining = 0; paintClock(); step(1, true); return; }
  }
  paintClock();
}

/** The next picture is decoded off screen and swapped in as one node, so the old one stays until the new one can paint. */
async function show(next: number): Promise<void> {
  index = next;
  const item = order[index];
  const ticket = ++loading;
  const incoming = new Image();
  incoming.className = 'reference-image'; incoming.alt = ''; incoming.draggable = false;
  incoming.src = api.assetUrl(item.asset_id!);
  await incoming.decode().catch(() => undefined);
  if (ticket !== loading || root.hidden) return;
  paintImage(incoming, item);
  layout();
  picture.replaceWith(incoming);
  picture = incoming;
  counter.textContent = `${index + 1} / ${order.length}`;
  seen.add(item.id);
  remaining = seconds * 1000;
  shownClock = '';
  paintClock();
  last = performance.now();
  loading = 0;
}

function step(direction: number, timedOut = false): void {
  if (!order.length || !summary.hidden) return;
  const next = index + direction;
  if (next >= order.length) { if (timedOut || direction > 0) finish(); return; }
  if (next < 0) return;
  void show(next);
}

function finish(): void {
  if (root.hidden) return;
  if (!summary.hidden || !seen.size) { close(); return; }
  loading = 0;
  frame.hidden = true;
  summary.hidden = false;
  root.classList.add('finished');
  summaryText.textContent = t('Done: {0} pictures in {1}.', { 0: seen.size, 1: clock(spent) });
  progressFill.style.transform = 'scaleX(0)';
  closeButton.focus();
}

function close(): void {
  root.hidden = true;
  cancelAnimationFrame(frameRequest);
  loading = 0;
}

function begin(choice: Choice): void {
  const { items } = source();
  if (!items.length) throw new Error('There are no pictures to practise with. Add some pictures, or clear the filters.');
  mount();
  lastChoice = choice;
  order = [...items];
  if (choice.shuffle) for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  if (choice.count) order = order.slice(0, choice.count);
  seconds = choice.seconds;
  spent = 0;
  seen = new Set();
  frame.hidden = false;
  summary.hidden = true;
  root.classList.remove('finished');
  root.classList.toggle('untimed', !seconds);
  setPaused(false);
  setFlip(false);
  setGrey(choice.grey);
  root.hidden = false;
  shownClock = '';
  timeText.textContent = seconds ? clock(seconds * 1000) : clock(0);
  progressFill.style.transform = 'scaleX(1)';
  void show(0);
  cancelAnimationFrame(frameRequest);
  last = performance.now();
  frameRequest = requestAnimationFrame(tick);
  endButton.focus();
}

function openSetup(params?: Record<string, unknown>): void {
  const { items, from } = source();
  if (!items.length) { toast('There are no pictures to practise with. Add some pictures, or clear the filters.'); return; }
  const choice = remembered();
  if (params && (params.seconds !== undefined || params.count !== undefined || params.shuffle !== undefined)) {
    const asked = Number(params.seconds);
    begin({
      seconds: Number.isFinite(asked) && asked >= 0 ? Math.min(3600, Math.round(asked)) : choice.seconds,
      count: Number.isFinite(Number(params.count)) && Number(params.count) > 0 ? Math.round(Number(params.count)) : 0,
      shuffle: params.shuffle === undefined ? choice.shuffle : !!params.shuffle,
      grey: params.grey === undefined ? choice.grey : !!params.grey,
    });
    return;
  }
  mount();
  sourceLine.textContent = from === 'selection' ? t('Selected pictures: {0}.', { 0: items.length }) : from === 'filters' ? t('Pictures the filters show: {0}.', { 0: items.length }) : t('Pictures on this board: {0}.', { 0: items.length });
  for (const option of timeSelect.options) if (option.value !== '0') option.textContent = duration(Number(option.value));
  timeSelect.value = String(choice.seconds);
  countSelect.value = String(choice.count);
  shuffleBox.checked = choice.shuffle;
  greyBox.checked = choice.grey;
  setup.showModal();
  startButton.focus();
}

setupForm.addEventListener('submit', event => {
  event.preventDefault();
  const choice: Choice = { seconds: Number(timeSelect.value), count: Number(countSelect.value), shuffle: shuffleBox.checked, grey: greyBox.checked };
  remember(choice);
  setup.close();
  try { begin(choice); } catch (reason) { toast((reason as Error).message); }
});
againButton.addEventListener('click', () => { if (lastChoice) { try { begin(lastChoice); } catch (reason) { toast((reason as Error).message); } } });
closeButton.addEventListener('click', close);
addEventListener('resize', () => { if (!root.hidden) layout(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !root.hidden && summary.hidden) setPaused(true); });
// While open, keys belong to the session; nothing reaches the board.
addEventListener('keydown', event => {
  if (root.hidden) return;
  const key = event.key.toLowerCase();
  if (event.key === 'Escape') finish();
  else if (event.key === ' ') { if (summary.hidden) setPaused(!paused); }
  else if (event.key === 'ArrowRight') step(1);
  else if (event.key === 'ArrowLeft') step(-1);
  else if (key === 'h') setFlip(!flipped);
  else if (key === 'g') setGrey(!grey);
  else if (event.key === 'Tab' || event.key === 'Enter') return;
  event.preventDefault(); event.stopImmediatePropagation();
}, true);

export function registerPractice(): void {
  registry.add({
    group: 'View', id: 'timed-practice', label: 'Timed Practice…', icon: 'play', keys: ['alt+t'], agent: 'window-only', mutates: false,
    run: p => openSetup(p),
    enabled: () => !!S.state,
    params: {
      seconds: { type: 'number', description: 'seconds per picture: 30, 60, 120, 300 or 600; 0 for no limit; leave out with the others to be asked' },
      count: { type: 'number', description: 'how many pictures; 0 or left out for all' },
      shuffle: { type: 'boolean', description: 'shuffle the order instead of reading order' },
      grey: { type: 'boolean', description: 'show the pictures in grey' },
    },
    description: 'Shows the pictures one at a time full screen for drawing practice, each for a set time: the selection when two or more pictures are selected, otherwise the pictures the filters show, otherwise every picture. Space pauses, arrows step, H mirrors, G turns grey on or off, Esc ends with a summary. Nothing on the board changes.',
  });
}
