import type { Item } from '../lib/types';
import { S, toast, world } from './editor';
import { registry } from './registry';

const NS = 'http://www.w3.org/2000/svg';
const STORE = 'formref-smart-guides';
const overlay = document.createElementNS(NS, 'svg');
overlay.classList.add('smart-guides');
const lines = document.createElementNS(NS, 'path');
overlay.append(lines);
world.append(overlay);

let enabled = true;
try { enabled = localStorage.getItem(STORE) !== 'off'; } catch { }

interface Box { left: number; top: number; right: number; bottom: number }

function box(item: Item): Box {
  const a = (item.rotation || 0) * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const w = item.width * c + item.height * s, h = item.width * s + item.height * c;
  const cx = item.x + item.width / 2, cy = item.y + item.height / 2;
  return { left: cx - w / 2, top: cy - h / 2, right: cx + w / 2, bottom: cy + h / 2 };
}

export function smartGuidesOn(): boolean {
  return enabled;
}

/** Illustrator's Smart Guides while moving: snaps the moving selection's edges and centres to other items' edges and centres within 6 screen pixels and draws the lines it lines up on. */
export function smartAdjust(moving: Item[], dx: number, dy: number): { dx: number; dy: number } {
  if (!enabled || !S.state || !moving.length) { clearGuides(); return { dx, dy }; }
  const ids = new Set(moving.map(i => i.id));
  const boxes = moving.map(box);
  const m: Box = { left: Math.min(...boxes.map(b => b.left)) + dx, top: Math.min(...boxes.map(b => b.top)) + dy, right: Math.max(...boxes.map(b => b.right)) + dx, bottom: Math.max(...boxes.map(b => b.bottom)) + dy };
  const others = S.state.board.items.filter(i => !ids.has(i.id) && !i.hidden).map(box);
  const tolerance = 6 / S.camera.zoom;
  const mx = [m.left, (m.left + m.right) / 2, m.right], my = [m.top, (m.top + m.bottom) / 2, m.bottom];
  let bestX: { d: number; at: number; o: Box } | null = null, bestY: { d: number; at: number; o: Box } | null = null;
  for (const o of others) {
    for (const t of [o.left, (o.left + o.right) / 2, o.right]) for (const v of mx) { const d = t - v; if (Math.abs(d) <= tolerance && (!bestX || Math.abs(d) < Math.abs(bestX.d))) bestX = { d, at: t, o }; }
    for (const t of [o.top, (o.top + o.bottom) / 2, o.bottom]) for (const v of my) { const d = t - v; if (Math.abs(d) <= tolerance && (!bestY || Math.abs(d) < Math.abs(bestY.d))) bestY = { d, at: t, o }; }
  }
  const ndx = dx + (bestX?.d ?? 0), ndy = dy + (bestY?.d ?? 0);
  const fx = { top: m.top + (bestY?.d ?? 0), bottom: m.bottom + (bestY?.d ?? 0) }, fy = { left: m.left + (bestX?.d ?? 0), right: m.right + (bestX?.d ?? 0) };
  const d: string[] = [];
  if (bestX) d.push(`M${bestX.at},${Math.min(fx.top, bestX.o.top)}V${Math.max(fx.bottom, bestX.o.bottom)}`);
  if (bestY) d.push(`M${Math.min(fy.left, bestY.o.left)},${bestY.at}H${Math.max(fy.right, bestY.o.right)}`);
  overlay.style.setProperty('--guide-line', `${1 / S.camera.zoom}px`);
  lines.setAttribute('d', d.join(''));
  return { dx: ndx, dy: ndy };
}

export function clearGuides(): void {
  if (lines.getAttribute('d')) lines.setAttribute('d', '');
}

document.addEventListener('pointerup', clearGuides);
document.addEventListener('pointercancel', clearGuides);

export function registerSmartGuides(): void {
  registry.add({
    group: 'View', id: 'smart-guides', label: 'Smart Guides', icon: 'snap', keys: ['mod+u'], checked: smartGuidesOn, mutates: false, agent: 'window-only',
    run: () => {
      enabled = !enabled;
      try { localStorage.setItem(STORE, enabled ? 'on' : 'off'); } catch { }
      toast(enabled ? 'Smart Guides on: moved items line up with the edges and centres of others.' : 'Smart Guides off.');
    },
    description: 'Turns Smart Guides on or off: while moving, items snap to the edges and centres of other items and show the line they align on.',
  });
}
