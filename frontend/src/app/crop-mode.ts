import { api } from '../lib/api';
import type { Command, Item, Point } from '../lib/types';
import { S, error, execute, selected, stage, toast, world, worldPoint } from './editor';
import { registry } from './registry';

/** On-canvas crop, as in PureRef: the whole picture shows faintly around a crop box with eight handles; drag edges, corners or the box (Shift keeps the aspect), Enter or double-click applies, Esc cancels. The item shrinks or grows with the crop so the picture keeps its scale. */
interface Crop { x: number; y: number; width: number; height: number }
interface Session { item: Item; full: { x: number; y: number; w: number; h: number }; box: { x: number; y: number; w: number; h: number }; drag: { handle: string; start: Point; box: Session['box'] } | null }

const root = document.createElement('div');
root.className = 'crop-mode';
root.hidden = true;
const ghost = document.createElement('img');
ghost.className = 'crop-ghost';
ghost.alt = '';
ghost.draggable = false;
const frame = document.createElement('div');
frame.className = 'crop-frame';
for (const handle of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
  const h = document.createElement('span');
  h.className = `crop-handle crop-${handle}`;
  h.dataset.handle = handle;
  frame.append(h);
}
const windowBox = document.createElement('div');
windowBox.className = 'crop-window';
const bright = document.createElement('img');
bright.className = 'crop-bright';
bright.alt = '';
bright.draggable = false;
windowBox.append(bright);
root.append(ghost, windowBox, frame);
world.append(root);
let session: Session | null = null;
let hidden: HTMLElement | null = null;

const cropOf = (item: Item): Crop => ({ x: 0, y: 0, width: 1, height: 1, ...(item.data.crop as Crop | undefined) });

/** Crop in display space (after the item's flips), which is what the person sees and drags. */
function displayCrop(item: Item): Crop {
  const c = cropOf(item);
  return { x: item.data.flip_x ? 1 - c.x - c.width : c.x, y: item.data.flip_y ? 1 - c.y - c.height : c.y, width: c.width, height: c.height };
}

function local(item: Item, p: Point): Point {
  const cx = item.x + item.width / 2, cy = item.y + item.height / 2, a = -(item.rotation || 0) * Math.PI / 180;
  const dx = p.x - cx, dy = p.y - cy;
  return { x: dx * Math.cos(a) - dy * Math.sin(a) + item.width / 2, y: dx * Math.sin(a) + dy * Math.cos(a) + item.height / 2 };
}

function draw() {
  if (!session) return;
  const { item, full, box } = session;
  Object.assign(root.style, { left: `${item.x}px`, top: `${item.y}px`, width: `${item.width}px`, height: `${item.height}px`, transform: `rotate(${item.rotation || 0}deg)` });
  Object.assign(ghost.style, { left: `${full.x}px`, top: `${full.y}px`, width: `${full.w}px`, height: `${full.h}px`, transform: `scale(${item.data.flip_x ? -1 : 1},${item.data.flip_y ? -1 : 1})` });
  Object.assign(frame.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });
  Object.assign(windowBox.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });
  Object.assign(bright.style, { left: `${full.x - box.x}px`, top: `${full.y - box.y}px`, width: `${full.w}px`, height: `${full.h}px`, transform: ghost.style.transform });
  root.style.setProperty('--crop-line', `${1 / S.camera.zoom}px`);
  root.style.setProperty('--crop-handle', `${10 / S.camera.zoom}px`);
}

export function startCrop(): void {
  const items = selected();
  const item = items.length === 1 ? items[0] : null;
  if (!item || item.kind !== 'image' || !item.asset_id) throw new Error('Select one image to crop.');
  if (item.locked) throw new Error('Unlock the image first.');
  const c = displayCrop(item);
  const fullW = item.width / c.width, fullH = item.height / c.height;
  session = { item, full: { x: -c.x * fullW, y: -c.y * fullH, w: fullW, h: fullH }, box: { x: 0, y: 0, w: item.width, h: item.height }, drag: null };
  const shown = document.querySelector<HTMLImageElement>(`.board-item[data-id="${CSS.escape(item.id)}"] .reference-image`);
  const src = shown?.getAttribute('src') || api.assetUrl(item.asset_id);
  if (ghost.getAttribute('src') !== src) { ghost.src = src; bright.src = src; }
  draw();
  root.hidden = false;
  hidden = document.querySelector<HTMLElement>(`.board-item[data-id="${CSS.escape(item.id)}"]`);
  hidden?.classList.add('cropping');
  toast('Drag the edges or corners (Shift keeps the shape), drag inside to move, Enter or double-click to crop, Esc to cancel.');
}

function cancel() {
  session = null;
  root.hidden = true;
  hidden?.classList.remove('cropping');
  hidden = null;
}

async function apply() {
  if (!session) return;
  const { item, full, box } = session;
  cancel();
  if (Math.abs(box.x) < 0.01 && Math.abs(box.y) < 0.01 && Math.abs(box.w - item.width) < 0.01 && Math.abs(box.h - item.height) < 0.01) return;
  const disp = { x: (box.x - full.x) / full.w, y: (box.y - full.y) / full.h, width: box.w / full.w, height: box.h / full.h };
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const rect = { x: clamp(item.data.flip_x ? 1 - disp.x - disp.width : disp.x), y: clamp(item.data.flip_y ? 1 - disp.y - disp.height : disp.y), width: Math.min(1, disp.width), height: Math.min(1, disp.height) };
  rect.width = Math.min(rect.width, 1 - rect.x);
  rect.height = Math.min(rect.height, 1 - rect.y);
  const a = (item.rotation || 0) * Math.PI / 180;
  const ox = box.x + box.w / 2 - item.width / 2, oy = box.y + box.h / 2 - item.height / 2;
  const cx = item.x + item.width / 2 + ox * Math.cos(a) - oy * Math.sin(a), cy = item.y + item.height / 2 + ox * Math.sin(a) + oy * Math.cos(a);
  const commands: Command[] = [
    { type: 'crop', ids: [item.id], rect },
    { type: 'update', ids: [item.id], patch: { x: cx - box.w / 2, y: cy - box.h / 2, width: box.w, height: box.h } },
  ];
  await execute({ type: 'batch', commands });
}

frame.addEventListener('pointerdown', event => {
  if (!session || event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  frame.setPointerCapture(event.pointerId);
  const handle = (event.target as HTMLElement).dataset.handle || 'move';
  session.drag = { handle, start: local(session.item, worldPoint(event)), box: { ...session.box } };
});

frame.addEventListener('pointermove', event => {
  const s = session;
  if (!s?.drag) return;
  const p = local(s.item, worldPoint(event));
  const dx = p.x - s.drag.start.x, dy = p.y - s.drag.start.y, b = s.drag.box, f = s.full, min = 8 / S.camera.zoom;
  let { x, y, w, h } = b;
  const hd = s.drag.handle;
  if (hd === 'move') {
    x = Math.max(f.x, Math.min(f.x + f.w - w, b.x + dx));
    y = Math.max(f.y, Math.min(f.y + f.h - h, b.y + dy));
  } else {
    if (hd.includes('w')) { x = Math.max(f.x, Math.min(b.x + b.w - min, b.x + dx)); w = b.x + b.w - x; }
    if (hd.includes('e')) { w = Math.max(min, Math.min(f.x + f.w - b.x, b.w + dx)); }
    if (hd.includes('n')) { y = Math.max(f.y, Math.min(b.y + b.h - min, b.y + dy)); h = b.y + b.h - y; }
    if (hd.includes('s')) { h = Math.max(min, Math.min(f.y + f.h - b.y, b.h + dy)); }
    if (event.shiftKey && hd.length === 2) {
      const ratio = b.w / b.h;
      if (w / h > ratio) w = h * ratio; else h = w / ratio;
      if (hd.includes('w')) x = b.x + b.w - w;
      if (hd.includes('n')) y = b.y + b.h - h;
    }
  }
  s.box = { x, y, w, h };
  draw();
});

frame.addEventListener('pointerup', () => { if (session) session.drag = null; });
frame.addEventListener('dblclick', event => { event.stopPropagation(); void apply().catch(error); });
stage.addEventListener('pointerdown', event => { if (session && !(event.target as Element).closest('.crop-mode')) void apply().catch(error); }, true);
stage.addEventListener('wheel', () => { if (session) requestAnimationFrame(draw); }, { passive: true });

window.addEventListener('keydown', event => {
  if (!session) return;
  if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); cancel(); }
  else if (event.key === 'Enter') { event.preventDefault(); event.stopImmediatePropagation(); void apply().catch(error); }
}, true);

export function registerCropMode(): void {
  registry.add({ group: 'Images', id: 'crop-on-canvas', label: 'Crop on Canvas', icon: 'crop', agent: 'window-only', run: startCrop, enabled: () => selected().length === 1 && selected()[0].kind === 'image', description: 'Shows the whole picture around a crop box on the board: drag the edges, corners or the box, then Enter or double-click to crop. The image keeps its scale, so it shrinks or grows with the crop. Crop works again later to bring cropped parts back.' });
}
