import type { Item, Point } from '../lib/types';
import { addAnchor, convertAnchor, cornerPlan, cutAt, deleteAnchor, isCorner, pathData, type Anchor, type CornerStyle, type Vector } from '../lib/vector/path';
import { newItem } from '../lib/types';
import { S, error, execute, onState, selection, setSelection, stage, topZ, world, worldPoint } from './editor';
import { registry } from './registry';
import { asVector, withVector } from './vector';

const NS = 'http://www.w3.org/2000/svg';
const STYLES: CornerStyle[] = ['round', 'inverted', 'chamfer'];

type Hit = { kind: 'anchor' | 'in' | 'out' | 'corner'; path: number; index: number };
interface Drag { hit: Hit; item: Item; vector: Vector; start: Point; origin: Vector; moved: boolean; only: boolean }

const overlay = document.createElementNS(NS, 'svg');
overlay.classList.add('anchor-overlay');
const preview = document.createElementNS(NS, 'path');
preview.classList.add('anchor-preview');
const lines = document.createElementNS(NS, 'path');
lines.classList.add('anchor-lines');
overlay.append(preview, lines);
world.append(overlay);
const pool: SVGElement[] = [];
let drag: Drag | null = null;
let frame = 0;
let chosen: { item: string; path: number; index: number } | null = null;

function el(index: number): SVGElement {
  while (pool.length <= index) { const node = document.createElementNS(NS, 'rect'); node.classList.add('anchor-mark'); overlay.append(node); pool.push(node); }
  return pool[index];
}

function target(): Item | null {
  if (S.tool !== 'direct' || selection.size !== 1 || !S.state) return null;
  const item = S.state.board.items.find(i => selection.has(i.id));
  return item && (item.kind === 'shape' || item.kind === 'stroke') && !item.locked ? item : null;
}

function mapper(item: Item, vector: Vector) {
  const sx = item.width / vector.w, sy = item.height / vector.h;
  const cx = item.x + item.width / 2, cy = item.y + item.height / 2;
  const a = (item.rotation || 0) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  return {
    toWorld: (p: Point): Point => { const x = item.x + p.x * sx - cx, y = item.y + p.y * sy - cy; return { x: cx + x * cos - y * sin, y: cy + x * sin + y * cos }; },
    toLocal: (p: Point): Point => { const x = p.x - cx, y = p.y - cy; const rx = x * cos + y * sin, ry = -x * sin + y * cos; return { x: (rx + cx - item.x) / sx, y: (ry + cy - item.y) / sy }; },
  };
}

function bisector(anchors: Anchor[], i: number, closed: boolean) {
  const n = anchors.length, v = anchors[i];
  const prev = anchors[(i - 1 + n) % n], next = anchors[(i + 1) % n];
  if (!closed && (i === 0 || i === n - 1)) return null;
  const p = prev.out || prev, q = next.in || next;
  const u1 = { x: p.x - v.x, y: p.y - v.y }, u2 = { x: q.x - v.x, y: q.y - v.y };
  const l1 = Math.hypot(u1.x, u1.y), l2 = Math.hypot(u2.x, u2.y);
  if (l1 < 1e-6 || l2 < 1e-6) return null;
  const a = { x: u1.x / l1, y: u1.y / l1 }, b = { x: u2.x / l2, y: u2.y / l2 };
  const bis = { x: a.x + b.x, y: a.y + b.y }, bl = Math.hypot(bis.x, bis.y);
  if (bl < 1e-6) return null;
  const theta = Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y)));
  return { dir: { x: bis.x / bl, y: bis.y / bl }, theta };
}

function render() {
  frame = 0;
  if (pen) { drawPen(); return; }
  const item = drag?.item || target();
  if (!item) { overlay.style.display = 'none'; return; }
  const vector = drag?.vector || asVector(item);
  const m = mapper(item, vector);
  const z = S.camera.zoom, size = 7 / z, r = 3.5 / z;
  overlay.style.display = '';
  overlay.style.setProperty('--anchor-line', `${1 / z}px`);
  const world = (p: Point) => m.toWorld(p);
  const scale = (item.width / vector.w + item.height / vector.h) / 2;
  const d: string[] = [];
  const handleLines: string[] = [];
  let used = 0;
  vector.paths.forEach((path, pi) => {
    const mapped = { closed: path.closed, anchors: path.anchors.map(a => ({ ...a, ...world(a), in: a.in ? world(a.in) : null, out: a.out ? world(a.out) : null })) };
    d.push(pathData({ closed: path.closed, anchors: mapped.anchors.map(a => ({ ...a, radius: (a.radius || 0) * scale })) }));
    const plans = cornerPlan(path);
    path.anchors.forEach((a, i) => {
      const w = mapped.anchors[i];
      for (const side of ['in', 'out'] as const) {
        const h = w[side];
        if (!h) continue;
        handleLines.push(`M${w.x},${w.y}L${h.x},${h.y}`);
        const node = el(used++);
        node.setAttribute('x', String(h.x - r)); node.setAttribute('y', String(h.y - r)); node.setAttribute('width', String(r * 2)); node.setAttribute('height', String(r * 2)); node.setAttribute('rx', String(r));
        node.dataset.hit = `${side}:${pi}:${i}`; node.setAttribute('class', 'anchor-mark handle');
      }
      const node = el(used++);
      node.setAttribute('x', String(w.x - size / 2)); node.setAttribute('y', String(w.y - size / 2)); node.setAttribute('width', String(size)); node.setAttribute('height', String(size)); node.setAttribute('rx', '0');
      node.dataset.hit = `anchor:${pi}:${i}`; node.setAttribute('class', `anchor-mark ${isCorner(a) ? 'corner' : 'smooth'}${chosen && chosen.item === item.id && chosen.path === pi && chosen.index === i ? ' chosen' : ''}`);
      const plan = plans[i];
      const bis = plan && isCorner(a) ? bisector(path.anchors, i, path.closed) : null;
      if (plan && bis) {
        const distance = plan.radius > 0 ? plan.radius / Math.sin(bis.theta / 2) : 0;
        const local = { x: a.x + bis.dir.x * distance, y: a.y + bis.dir.y * distance };
        let spot = world(local);
        if (Math.hypot(spot.x - w.x, spot.y - w.y) < 14 / z) {
          const wd = world({ x: a.x + bis.dir.x, y: a.y + bis.dir.y });
          const ux = wd.x - w.x, uy = wd.y - w.y, ul = Math.hypot(ux, uy) || 1;
          spot = { x: w.x + (ux / ul) * 14 / z, y: w.y + (uy / ul) * 14 / z };
        }
        const widget = el(used++);
        widget.setAttribute('x', String(spot.x - r)); widget.setAttribute('y', String(spot.y - r)); widget.setAttribute('width', String(r * 2)); widget.setAttribute('height', String(r * 2)); widget.setAttribute('rx', String(r));
        widget.dataset.hit = `corner:${pi}:${i}`;
        widget.setAttribute('class', `anchor-mark widget${plan.radius > 0 && plan.radius >= plan.max - 1e-3 ? ' at-limit' : ''}`);
      }
    });
  });
  for (let i = used; i < pool.length; i++) pool[i].setAttribute('class', 'anchor-mark unused');
  preview.setAttribute('d', d.join(' '));
  lines.setAttribute('d', handleLines.join(' '));
}

export function refreshAnchors() {
  if (!frame) frame = requestAnimationFrame(render);
}

function parse(node: Element | null): Hit | null {
  const raw = (node as SVGElement | null)?.dataset?.hit;
  if (!raw) return null;
  const [kind, path, index] = raw.split(':');
  return { kind: kind as Hit['kind'], path: Number(path), index: Number(index) };
}

const clone = (v: Vector): Vector => JSON.parse(JSON.stringify(v));

function applyDrag(event: PointerEvent) {
  if (!drag) return;
  const m = mapper(drag.item, drag.origin);
  const now = m.toLocal(worldPoint(event)), start = m.toLocal(drag.start);
  const dx = now.x - start.x, dy = now.y - start.y;
  drag.moved ||= Math.hypot(dx, dy) * S.camera.zoom > 1;
  const vector = clone(drag.origin);
  const { hit } = drag;
  const path = vector.paths[hit.path], a = path.anchors[hit.index];
  if (hit.kind === 'anchor') {
    a.x += dx; a.y += dy;
    if (a.in) { a.in.x += dx; a.in.y += dy; }
    if (a.out) { a.out.x += dx; a.out.y += dy; }
  } else if (hit.kind === 'in' || hit.kind === 'out') {
    const h = a[hit.kind]!;
    h.x += dx; h.y += dy;
    const other = hit.kind === 'in' ? 'out' : 'in';
    const o = a[other];
    if (o && !event.altKey) {
      const vx = a.x - h.x, vy = a.y - h.y, vl = Math.hypot(vx, vy) || 1, ol = Math.hypot(o.x - a.x, o.y - a.y);
      a[other] = { x: a.x + (vx / vl) * ol, y: a.y + (vy / vl) * ol };
    }
  } else {
    const original = drag.origin.paths[hit.path];
    const bis = bisector(original.anchors, hit.index, original.closed);
    if (bis) {
      const v = original.anchors[hit.index];
      const along = (now.x - v.x) * bis.dir.x + (now.y - v.y) * bis.dir.y;
      const radius = Math.max(0, along * Math.sin(bis.theta / 2));
      const style = a.style || 'round';
      vector.paths.forEach((p, pi) => p.anchors.forEach((anchor, i) => {
        if ((drag!.only && (pi !== hit.path || i !== hit.index)) || !isCorner(anchor)) return;
        anchor.radius = radius; anchor.style = anchor.style || style;
      }));
    }
  }
  drag.vector = vector;
  refreshAnchors();
}

stage.addEventListener('pointerdown', event => {
  const hit = parse((event.target as Element).closest('[data-hit]'));
  const item = target();
  if (!hit || !item || event.button !== 0) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const vector = asVector(item);
  if (event.altKey && hit.kind === 'corner') {
    const a = vector.paths[hit.path].anchors[hit.index];
    const next = STYLES[(STYLES.indexOf(a.style || 'round') + 1) % STYLES.length];
    const copy = clone(vector);
    copy.paths.forEach(p => p.anchors.forEach(anchor => { if (isCorner(anchor) && (anchor.radius || 0) > 0) anchor.style = next; }));
    void execute({ type: 'update', ids: [item.id], patch: { data: withVector(item, copy) } }).catch(error);
    return;
  }
  if (event.altKey && hit.kind === 'anchor') {
    const copy = clone(vector);
    copy.paths[hit.path] = convertAnchor(copy.paths[hit.path], hit.index);
    void execute({ type: 'update', ids: [item.id], patch: { data: withVector(item, copy) } }).catch(error);
    return;
  }
  if (hit.kind === 'anchor') chosen = { item: item.id, path: hit.path, index: hit.index };
  stage.setPointerCapture(event.pointerId);
  drag = { hit, item, vector, origin: clone(vector), start: worldPoint(event), moved: false, only: event.shiftKey };
}, true);

function commit(item: Item, vector: Vector) {
  return execute({ type: 'update', ids: [item.id], patch: { data: withVector(item, vector) } }).catch(error).finally(refreshAnchors);
}

/** The selected anchor of the selected path, when the Direct Selection tool shows it. */
export function chosenAnchor(): { item: Item; vector: Vector; path: number; index: number } | null {
  const item = target();
  if (!item || !chosen || chosen.item !== item.id) return null;
  const vector = asVector(item);
  const path = vector.paths[chosen.path];
  return path && path.anchors[chosen.index] ? { item, vector, path: chosen.path, index: chosen.index } : null;
}

window.addEventListener('keydown', event => {
  const at = S.tool === 'direct' && !pen ? chosenAnchor() : null;
  if (!at || (event.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"],.term-dock')) return;
  const copy = clone(at.vector);
  const path = copy.paths[at.path];
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (path.anchors.length <= 2 && copy.paths.length === 1) return;
    if (path.anchors.length <= 2) copy.paths.splice(at.path, 1);
    else copy.paths[at.path] = deleteAnchor(path, at.index);
    chosen = null;
    void commit(at.item, copy);
    return;
  }
  const step = event.shiftKey ? 10 : 1;
  const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
  if (!d) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const sx = at.vector.w / Math.max(1, at.item.width), sy = at.vector.h / Math.max(1, at.item.height);
  const a = path.anchors[at.index], dx = d[0] * sx, dy = d[1] * sy;
  a.x += dx; a.y += dy;
  if (a.in) { a.in.x += dx; a.in.y += dy; }
  if (a.out) { a.out.x += dx; a.out.y += dy; }
  void commit(at.item, copy);
}, true);

stage.addEventListener('dblclick', event => {
  const item = target();
  if (!item) return;
  const vector = asVector(item);
  const m = mapper(item, vector);
  const p = m.toLocal(worldPoint(event));
  const tolerance = 8 / S.camera.zoom * (vector.w / Math.max(1, item.width));
  let best: { path: number; seg: number; t: number; d: number } | null = null;
  vector.paths.forEach((path, pi) => {
    const count = path.closed ? path.anchors.length : path.anchors.length - 1;
    for (let i = 0; i < count; i++) {
      const a = path.anchors[i], b = path.anchors[(i + 1) % path.anchors.length];
      const c: [Point, Point, Point, Point] = [a, a.out || a, b.in || b, b];
      for (let k = 1; k < 64; k++) {
        const t = k / 64, u = 1 - t;
        const x = u * u * u * c[0].x + 3 * u * u * t * c[1].x + 3 * u * t * t * c[2].x + t * t * t * c[3].x;
        const y = u * u * u * c[0].y + 3 * u * u * t * c[1].y + 3 * u * t * t * c[2].y + t * t * t * c[3].y;
        const dist = Math.hypot(x - p.x, y - p.y);
        if (dist < tolerance && (!best || dist < best.d)) best = { path: pi, seg: i, t, d: dist };
      }
    }
  });
  if (!best) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const hit = best as { path: number; seg: number; t: number };
  const copy = clone(vector);
  copy.paths[hit.path] = addAnchor(copy.paths[hit.path], hit.seg, hit.t);
  chosen = { item: item.id, path: hit.path, index: hit.seg + 1 };
  void commit(item, copy);
}, true);

export function cutAtChosen(): boolean {
  const at = chosenAnchor();
  if (!at) return false;
  const copy = clone(at.vector);
  copy.paths.splice(at.path, 1, ...cutAt(copy.paths[at.path], at.index));
  chosen = null;
  void commit(at.item, copy);
  return true;
}

stage.addEventListener('pointermove', event => { if (drag) { event.stopImmediatePropagation(); applyDrag(event); } }, true);

stage.addEventListener('pointerup', event => {
  if (!drag) { refreshAnchors(); return; }
  event.stopImmediatePropagation();
  const done = drag;
  drag = null;
  if (done.moved) void execute({ type: 'update', ids: [done.item.id], patch: { data: withVector(done.item, done.vector) } }).catch(error).finally(refreshAnchors);
  else refreshAnchors();
}, true);

stage.addEventListener('wheel', refreshAnchors, { passive: true });
document.addEventListener('pointerup', refreshAnchors);
window.addEventListener('keyup', refreshAnchors);
onState(() => refreshAnchors());

interface PenState { anchors: Anchor[]; down: Point | null; hover: Point | null }
let pen: PenState | null = null;
const penPath = document.createElementNS(NS, 'path');
penPath.classList.add('pen-preview');
overlay.append(penPath);

function drawPen() {
  if (!pen || !pen.anchors.length) { penPath.setAttribute('d', ''); return; }
  const anchors = pen.hover && !pen.down ? [...pen.anchors, { x: pen.hover.x, y: pen.hover.y }] : pen.anchors;
  overlay.style.display = '';
  overlay.style.setProperty('--anchor-line', `${1 / S.camera.zoom}px`);
  penPath.setAttribute('d', pathData({ closed: false, anchors }));
  const z = S.camera.zoom, size = 6 / z;
  let used = 0;
  for (const a of pen.anchors) {
    const node = el(used++);
    node.setAttribute('x', String(a.x - size / 2)); node.setAttribute('y', String(a.y - size / 2)); node.setAttribute('width', String(size)); node.setAttribute('height', String(size)); node.setAttribute('rx', '0');
    node.dataset.hit = ''; node.setAttribute('class', `anchor-mark ${a.in ? 'smooth' : 'corner'}`);
  }
  for (let i = used; i < pool.length; i++) pool[i].setAttribute('class', 'anchor-mark unused');
  lines.setAttribute('d', pen.anchors.flatMap(a => [a.in ? `M${a.x},${a.y}L${a.in.x},${a.in.y}` : '', a.out ? `M${a.x},${a.y}L${a.out.x},${a.out.y}` : '']).join(''));
  preview.setAttribute('d', '');
}

async function finishPen(closed: boolean) {
  const done = pen;
  pen = null;
  penPath.setAttribute('d', '');
  if (!done || done.anchors.length < 2) { refreshAnchors(); return; }
  const all = done.anchors.flatMap(a => [a, a.in, a.out].filter(Boolean) as Point[]);
  const x0 = Math.min(...all.map(p => p.x)), y0 = Math.min(...all.map(p => p.y));
  const w = Math.max(1, Math.max(...all.map(p => p.x)) - x0), h = Math.max(1, Math.max(...all.map(p => p.y)) - y0);
  const local = (p: Point) => ({ x: p.x - x0, y: p.y - y0 });
  const anchors = done.anchors.map(a => ({ ...local(a), in: a.in ? local(a.in) : null, out: a.out ? local(a.out) : null }));
  const item = newItem('shape', x0, y0, { width: w, height: h, z: topZ(), color: '#f97316', data: { shape: 'path', stroke_width: 2, fill: 'none', vector: { w, h, paths: [{ closed, anchors }] } } });
  await execute({ type: 'add', items: [item] });
  setSelection([item.id]);
  refreshAnchors();
}

stage.addEventListener('pointerdown', event => {
  if (S.tool !== 'pen-path' || event.button !== 0 || !S.state) return;
  if ((event.target as Element).closest('button,input,.floating-controls,.navigator')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const p = worldPoint(event);
  pen ??= { anchors: [], down: null, hover: null };
  const first = pen.anchors[0];
  if (first && pen.anchors.length > 2 && Math.hypot(p.x - first.x, p.y - first.y) * S.camera.zoom < 8) { void finishPen(true).catch(error); return; }
  stage.setPointerCapture(event.pointerId);
  pen.anchors.push({ x: p.x, y: p.y });
  pen.down = p;
  drawPen();
}, true);

stage.addEventListener('pointermove', event => {
  if (S.tool !== 'pen-path' || !pen) return;
  event.stopImmediatePropagation();
  const p = worldPoint(event);
  pen.hover = p;
  if (pen.down) {
    const a = pen.anchors[pen.anchors.length - 1];
    if (Math.hypot(p.x - a.x, p.y - a.y) * S.camera.zoom > 3) { a.out = { x: p.x, y: p.y }; a.in = { x: 2 * a.x - p.x, y: 2 * a.y - p.y }; }
  }
  drawPen();
}, true);

stage.addEventListener('pointerup', event => {
  if (S.tool !== 'pen-path' || !pen) return;
  event.stopImmediatePropagation();
  pen.down = null;
  drawPen();
}, true);

window.addEventListener('keydown', event => {
  if (!pen || S.tool !== 'pen-path') return;
  if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); void finishPen(false).catch(error); }
  else if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); event.stopImmediatePropagation(); pen.anchors.pop(); drawPen(); }
}, true);

export function registerDirectSelect(setTool: (tool: 'direct' | 'pen-path') => void) {
  registry.add({ group: 'Path', id: 'cut-path', label: 'Cut Path at Selected Anchor', icon: 'crop', keys: ['mod+shift+x'], agent: 'window-only', run: () => { if (!cutAtChosen()) throw new Error('With the Direct Selection tool, click the anchor to cut at first.'); }, enabled: () => !!chosenAnchor(), description: 'Scissors: opens a closed path at the selected anchor, or splits an open path in two there.' });
  registry.add({ group: 'Tools', id: 'tool-pen-path', label: 'Pen Tool', icon: 'bezier', keys: ['shift+p'], run: () => { if (pen) void finishPen(false); setTool('pen-path'); }, agent: 'window-only', mutates: false, description: 'Draws an anchor path as Illustrator\'s Pen does: click for a corner point, drag for a smooth point, click the first point to close the path, Enter or Esc to finish an open path, Backspace removes the last point.' });
  registry.add({ group: 'Tools', id: 'tool-direct', label: 'Direct Selection Tool', icon: 'direct', keys: ['a'], run: () => { setTool('direct'); refreshAnchors(); }, agent: 'window-only', mutates: false, description: 'Shows the anchor points, handles and corner widgets of the selected shape or path: drag an anchor or handle to reshape, drag a corner widget to round every corner (Shift: only that corner), Alt-click a corner widget to switch Round, Inverted round and Chamfer, Alt-click an anchor to convert it between corner and smooth, Alt-drag a handle to break a smooth point.' });
}
