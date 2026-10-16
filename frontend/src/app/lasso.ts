import type { Item, Point } from '../lib/types';
import { simplifyPoints } from '../lib/vector/path';
import { S, error, execute, selected, stage, toast, world, worldPoint } from './editor';
import { registry } from './registry';

/** Lasso crop (researched wishlist, BeeRef and PureRef): draw around the part of an image to keep; the rest turns transparent on the board and in PNG, SVG and PDF exports. The mask is stored in source-normalized coordinates (data.mask), so later crops, flips and resizes keep it in place, and Clear Lasso brings the picture back. */
const NS = 'http://www.w3.org/2000/svg';
const overlay = document.createElementNS(NS, 'svg');
overlay.classList.add('lasso-overlay');
const line = document.createElementNS(NS, 'polyline');
overlay.append(line);
world.append(overlay);
let target: Item | null = null;
let points: Point[] = [];
let drawing = false;

function image(): Item | null {
  const items = selected();
  const item = items.length === 1 ? items[0] : null;
  return item && item.kind === 'image' && item.asset_id && !item.locked ? item : null;
}

/** World point to the picture's source-normalized coordinates, through rotation, crop and flips. */
function toSource(item: Item, p: Point): [number, number] {
  const cx = item.x + item.width / 2, cy = item.y + item.height / 2, a = -(item.rotation || 0) * Math.PI / 180;
  const dx = p.x - cx, dy = p.y - cy;
  const lx = (dx * Math.cos(a) - dy * Math.sin(a)) / item.width + 0.5, ly = (dx * Math.sin(a) + dy * Math.cos(a)) / item.height + 0.5;
  const c = { x: 0, y: 0, width: 1, height: 1, ...(item.data.crop as object | undefined) } as { x: number; y: number; width: number; height: number };
  const dispX = (item.data.flip_x ? 1 - c.x - c.width : c.x) + lx * c.width, dispY = (item.data.flip_y ? 1 - c.y - c.height : c.y) + ly * c.height;
  const u = item.data.flip_x ? 1 - dispX : dispX, v = item.data.flip_y ? 1 - dispY : dispY;
  return [Math.max(0, Math.min(1, u)), Math.max(0, Math.min(1, v))];
}

function stop() {
  target = null; drawing = false; points = [];
  line.setAttribute('points', '');
  overlay.style.display = 'none';
  stage.classList.remove('lassoing');
}

export function startLasso(): void {
  const item = image();
  if (!item) throw new Error('Select one unlocked image to lasso.');
  target = item;
  overlay.style.display = '';
  overlay.style.setProperty('--lasso-line', `${1.5 / S.camera.zoom}px`);
  stage.classList.add('lassoing');
  toast('Draw around the part of the image to keep. Esc cancels.');
}

stage.addEventListener('pointerdown', event => {
  if (!target || event.button !== 0) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  stage.setPointerCapture(event.pointerId);
  drawing = true;
  points = [worldPoint(event)];
}, true);

stage.addEventListener('pointermove', event => {
  if (!target || !drawing) return;
  event.stopImmediatePropagation();
  const p = worldPoint(event), last = points[points.length - 1];
  if (Math.hypot(p.x - last.x, p.y - last.y) * S.camera.zoom < 2) return;
  points.push(p);
  line.setAttribute('points', points.map(q => `${q.x},${q.y}`).join(' '));
}, true);

stage.addEventListener('pointerup', event => {
  if (!target || !drawing) return;
  event.stopImmediatePropagation();
  const item = target, drawn = points;
  stop();
  if (drawn.length < 3) { toast('Draw around the part to keep; the lasso needs more than a click.'); return; }
  const simple = simplifyPoints([...drawn, drawn[0]], 1 / S.camera.zoom).slice(0, -1).slice(0, 2000);
  const mask = simple.map(p => toSource(item, p).map(n => Math.round(n * 10000) / 10000));
  void execute({ type: 'update', ids: [item.id], patch: { data: { ...item.data, mask } } }).catch(error);
}, true);

window.addEventListener('keydown', event => {
  if (target && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); stop(); }
}, true);

export function registerLasso(): void {
  stop();
  registry.add(
    { group: 'Images', id: 'lasso-crop', label: 'Lasso Crop', icon: 'crop', agent: 'window-only', run: startLasso, enabled: () => !!image(), description: 'Draw around the part of the selected image to keep; the rest becomes transparent on the board and in exports. Clear Lasso brings it back.' },
    { group: 'Images', id: 'clear-lasso', label: 'Clear Lasso', icon: 'restore', run: () => { const item = selected().find(i => i.kind === 'image' && Array.isArray(i.data.mask)); if (!item) throw new Error('Select an image with a lasso crop.'); return execute({ type: 'update', ids: [item.id], patch: { data: { ...item.data, mask: null } } }); }, enabled: () => selected().some(i => i.kind === 'image' && Array.isArray(i.data.mask)), description: 'Removes the lasso crop from the selected image so the whole picture shows again.' },
  );
}
