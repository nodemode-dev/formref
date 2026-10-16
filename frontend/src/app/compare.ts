import type { Item } from '../lib/types';
import { api } from '../lib/api';
import { paintImage } from '../lib/image-geometry';
import { $, selected, toast } from './editor';
import { registry } from './registry';

/** Compare (reference-board gap: checking a drawing against its reference): two selected pictures full screen, side by side, overlaid with an opacity slider (onion skin), with a swipe divider, or as a difference blend where matching areas go black. A view only; nothing on the board changes. */

type Mode = 'side' | 'overlay' | 'swipe' | 'difference';
const MODES: [Mode, string][] = [['side', 'Side by Side'], ['overlay', 'Onion Skin'], ['swipe', 'Swipe'], ['difference', 'Difference']];

const root = document.createElement('div');
root.className = 'compare-overlay';
root.hidden = true;
root.setAttribute('role', 'dialog');
root.setAttribute('aria-modal', 'true');
root.setAttribute('aria-label', 'Compare pictures');
const bar = document.createElement('div');
bar.className = 'compare-bar';
const modeButtons = new Map<Mode, HTMLButtonElement>();
for (const [mode, label] of MODES) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'button compact'; button.textContent = label; button.dataset.mode = mode;
  button.addEventListener('click', () => setMode(mode));
  modeButtons.set(mode, button);
  bar.append(button);
}
const sliderLabel = document.createElement('label');
sliderLabel.className = 'compare-slider';
const sliderText = document.createElement('span');
const slider = document.createElement('input');
slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.value = '50';
sliderLabel.append(sliderText, slider);
const swap = document.createElement('button');
swap.type = 'button'; swap.className = 'button compact'; swap.textContent = 'Swap';
const close = document.createElement('button');
close.type = 'button'; close.className = 'button compact'; close.textContent = 'Close';
const spacer = document.createElement('span');
spacer.className = 'compare-spacer';
bar.append(sliderLabel, spacer, swap, close);
const stage = document.createElement('div');
stage.className = 'compare-stage';
const divider = document.createElement('div');
divider.className = 'compare-divider';
interface Pane { box: HTMLDivElement; image: HTMLImageElement; caption: HTMLDivElement; item: Item | null }
function pane(): Pane {
  const box = document.createElement('div'); box.className = 'compare-box';
  const image = document.createElement('img'); image.className = 'reference-image'; image.alt = ''; image.decoding = 'async'; image.draggable = false;
  const caption = document.createElement('div'); caption.className = 'compare-caption';
  box.append(image, caption);
  return { box, image, caption, item: null };
}
const panes: [Pane, Pane] = [pane(), pane()];
stage.append(panes[0].box, panes[1].box, divider);
root.append(bar, stage);
let mode: Mode = 'side';
let mounted = false;

const aspect = (item: Item | null) => item ? Math.max(0.05, item.width / Math.max(1, item.height)) : 1;

function load(p: Pane, item: Item): void {
  p.item = item;
  p.caption.textContent = item.title;
  const src = api.assetUrl(item.asset_id!);
  const paint = () => paintImage(p.image, item);
  if (p.image.getAttribute('src') !== src) { p.image.onload = paint; p.image.src = src; } else paint();
}

/** Sizes both boxes from the pictures' shapes and the space left under the bar; every mode reuses the same two boxes. */
function layout(): void {
  const width = stage.clientWidth - 48, height = stage.clientHeight - 48;
  const [a, b] = panes, ra = aspect(a.item), rb = aspect(b.item);
  if (mode === 'side') {
    const h = Math.max(40, Math.min(height, (width - 24) / (ra + rb)));
    a.box.style.width = `${ra * h}px`; a.box.style.height = `${h}px`; b.box.style.width = `${rb * h}px`; b.box.style.height = `${h}px`;
  } else {
    const h = Math.max(40, Math.min(height, width / Math.max(ra, rb)));
    for (const p of panes) { p.box.style.width = `${aspect(p.item) * h}px`; p.box.style.height = `${h}px`; }
  }
  apply();
}

/** The top picture's opacity, clip and blend for the current mode and slider; the bottom picture is never changed. */
function apply(): void {
  const top = panes[1].box, value = Number(slider.value);
  top.style.opacity = mode === 'overlay' ? String(value / 100) : '';
  top.style.clipPath = mode === 'swipe' ? `inset(0 0 0 ${value}%)` : '';
  top.style.mixBlendMode = mode === 'difference' ? 'difference' : '';
  divider.hidden = mode !== 'swipe';
  if (mode === 'swipe') {
    const r = top.getBoundingClientRect(), s = stage.getBoundingClientRect();
    divider.style.left = `${r.left - s.left + r.width * value / 100}px`; divider.style.top = `${r.top - s.top}px`; divider.style.height = `${r.height}px`;
  }
}

function setMode(next: Mode): void {
  mode = next;
  root.dataset.mode = next;
  for (const [m, button] of modeButtons) button.classList.toggle('active', m === next);
  sliderLabel.hidden = next === 'side' || next === 'difference';
  sliderText.textContent = next === 'swipe' ? 'Divider' : 'Opacity';
  layout();
}

function open(params?: Record<string, unknown>): void {
  const pictures = selected().filter(i => i.kind === 'image' && i.asset_id);
  if (pictures.length !== 2) throw new Error('Select exactly two pictures to compare.');
  if (!mounted) { $('overlay-root').append(root); mounted = true; }
  load(panes[0], pictures[0]); load(panes[1], pictures[1]);
  root.hidden = false;
  const asked = MODES.find(([m]) => m === params?.mode)?.[0];
  setMode(asked || mode);
  close.focus();
}

function shut(): void { root.hidden = true; }

slider.addEventListener('input', apply);
swap.addEventListener('click', () => { const [a, b] = [panes[0].item, panes[1].item]; if (a && b) { load(panes[0], b); load(panes[1], a); layout(); } });
close.addEventListener('click', shut);
addEventListener('resize', () => { if (!root.hidden) layout(); });
// Dragging on the pictures moves the swipe divider or the overlay opacity, as the slider does.
stage.addEventListener('pointermove', event => {
  if (root.hidden || !(event.buttons & 1) || (mode !== 'swipe' && mode !== 'overlay')) return;
  const r = panes[1].box.getBoundingClientRect();
  slider.value = String(Math.round(Math.max(0, Math.min(1, (event.clientX - r.left) / r.width)) * 100));
  apply();
});
// While open, keys belong to the comparison: Esc closes, 1 to 4 pick a mode, S swaps; nothing reaches the board.
addEventListener('keydown', event => {
  if (root.hidden) return;
  if (event.target instanceof HTMLInputElement && event.key !== 'Escape') return;
  const index = Number(event.key) - 1;
  if (event.key === 'Escape') shut();
  else if (index >= 0 && index < MODES.length) setMode(MODES[index][0]);
  else if (event.key.toLowerCase() === 's') swap.click();
  else return;
  event.preventDefault(); event.stopImmediatePropagation();
}, true);

export function registerCompare(): void {
  registry.add({
    group: 'View', id: 'compare', label: 'Compare Pictures', icon: 'image', keys: ['alt+c'], agent: 'window-only', mutates: false,
    run: p => { try { open(p); } catch (reason) { toast((reason as Error).message); } },
    enabled: () => selected().filter(i => i.kind === 'image' && i.asset_id).length === 2,
    params: { mode: { type: 'string', enum: MODES.map(([m]) => m), description: 'side, overlay, swipe or difference' } },
    description: 'Shows the two selected pictures full screen to check one against the other: side by side, overlaid with an opacity slider, with a swipe divider, or as a difference where matching areas go black. Keys 1 to 4 pick the view, S swaps, Esc closes. Nothing on the board changes.',
  });
}
