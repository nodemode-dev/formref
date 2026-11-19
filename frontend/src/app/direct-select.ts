import type { Item, Point } from '../lib/types';
import { addAnchor, convertAnchor, cornerPlan, cutAt, deleteAnchor, isCorner, pathData, smoothPath, type Anchor, type CornerStyle, type Vector } from '../lib/vector/path';
import { newItem } from '../lib/types';
import { S, error, execute, onState, selection, setSelection, stage, topZ, world, worldPoint } from './editor';
import { registry } from './registry';
import { asVector, withVector } from './vector';

const NS = 'http://www.w3.org/2000/svg';
const STYLES: CornerStyle[] = ['round', 'inverted', 'chamfer'];

type Hit = { kind: 'anchor' | 'in' | 'out' | 'corner'; path: number; index: number };
interface Drag { hit: Hit; item: Item; vector: Vector; start: Point; origin: Vector; moved: boolean; only: boolean; many: boolean }

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
let pickedItem = '';
const picked = new Set<string>();
const key = (path: number, index: number) => `${path}:${index}`;

/** Selects an anchor of the target item; `add` toggles it in the current set (Shift-click), otherwise it becomes the only one. */
function pick(item: string, path: number, index: number, add: boolean) {
  if (pickedItem !== item || !add) { picked.clear(); pickedItem = item; }
  const k = key(path, index);
  if (add && picked.has(k)) picked.delete(k); else picked.add(k);
  const last = [...picked].pop();
  chosen = last ? { item, path: Number(last.split(':')[0]), index: Number(last.split(':')[1]) } : null;
}

function clearPicks() {
  picked.clear();
  chosen = null;
}

function pickedList(item: Item): { path: number; index: number }[] {
  if (pickedItem !== item.id) return [];
  return [...picked].map(k => { const [path, index] = k.split(':').map(Number); return { path, index }; });
}

const marquee = document.createElementNS(NS, 'rect');
marquee.classList.add('anchor-marquee');
overlay.append(marquee);
let box: { start: Point; now: Point; add: boolean; item: Item } | null = null;

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
      node.dataset.hit = `anchor:${pi}:${i}`; node.setAttribute('class', `anchor-mark ${isCorner(a) ? 'corner' : 'smooth'}${pickedItem === item.id && picked.has(key(pi, i)) ? ' chosen' : ''}`);
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

function shift(a: Anchor, dx: number, dy: number) {
  a.x += dx; a.y += dy;
  if (a.in) { a.in.x += dx; a.in.y += dy; }
  if (a.out) { a.out.x += dx; a.out.y += dy; }
}

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
    const moving = drag.many ? pickedList(drag.item).map(t => vector.paths[t.path]?.anchors[t.index]).filter(Boolean) : [a];
    for (const b of moving) shift(b, dx, dy);
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
  if (!hit && item && event.button === 0 && !pen && !(event.target as Element).closest('.board-item,button,input,.floating-controls,.navigator')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    stage.setPointerCapture(event.pointerId);
    const p = worldPoint(event);
    box = { start: p, now: p, add: event.shiftKey, item };
    return;
  }
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
  if (hit.kind === 'anchor') {
    const already = pickedItem === item.id && picked.has(key(hit.path, hit.index));
    if (event.shiftKey) { pick(item.id, hit.path, hit.index, true); refreshAnchors(); return; }
    if (!already) pick(item.id, hit.path, hit.index, false);
  }
  stage.setPointerCapture(event.pointerId);
  drag = { hit, item, vector, origin: clone(vector), start: worldPoint(event), moved: false, only: event.shiftKey, many: hit.kind === 'anchor' && picked.size > 1 };
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
  if (!at || (event.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"],.ft-dock')) return;
  const copy = clone(at.vector);
  const list = pickedList(at.item);
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    event.stopImmediatePropagation();
    const byPath = new Map<number, number[]>();
    for (const t of list) byPath.set(t.path, [...(byPath.get(t.path) || []), t.index]);
    for (const p of [...byPath.keys()].sort((a, b) => b - a)) {
      let path = copy.paths[p];
      for (const i of byPath.get(p)!.sort((a, b) => b - a)) path = path.anchors.length > 2 ? deleteAnchor(path, i) : { ...path, anchors: path.anchors.filter((_, k) => k !== i) };
      if (path.anchors.length < 2) copy.paths.splice(p, 1); else copy.paths[p] = path;
    }
    if (!copy.paths.length) return;
    clearPicks();
    void commit(at.item, copy);
    return;
  }
  const step = event.shiftKey ? 10 : 1;
  const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
  if (!d) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const sx = at.vector.w / Math.max(1, at.item.width), sy = at.vector.h / Math.max(1, at.item.height);
  for (const t of list) shift(copy.paths[t.path].anchors[t.index], d[0] * sx, d[1] * sy);
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
  pick(item.id, hit.path, hit.seg + 1, false);
  void commit(item, copy);
}, true);

/** Average: moves the selected anchors to their mean position; `horizontal` lines them up on one horizontal line (shared y), `vertical` on one vertical line (shared x). */
function averageAnchors(axis: string = 'both'): boolean {
  const at = chosenAnchor();
  const list = at ? pickedList(at.item) : [];
  if (!at || list.length < 2) return false;
  const copy = clone(at.vector);
  const points = list.map(t => copy.paths[t.path].anchors[t.index]);
  const mx = points.reduce((s, a) => s + a.x, 0) / points.length, my = points.reduce((s, a) => s + a.y, 0) / points.length;
  for (const a of points) shift(a, axis === 'horizontal' ? 0 : mx - a.x, axis === 'vertical' ? 0 : my - a.y);
  void commit(at.item, copy);
  return true;
}

/** Delete Segment: removes the segment between two selected neighbouring anchors; a closed path opens there, an open path splits in two. */
function deleteSegment(): boolean {
  const at = chosenAnchor();
  if (!at) return false;
  const list = pickedList(at.item);
  for (const a of list) for (const b of list) {
    if (a.path !== b.path) continue;
    const path = at.vector.paths[a.path], n = path.anchors.length;
    const s = b.index === a.index + 1 ? a.index : path.closed && a.index === n - 1 && b.index === 0 ? n - 1 : -1;
    if (s < 0) continue;
    const copy = clone(at.vector);
    const anchors = copy.paths[a.path].anchors;
    const pieces = path.closed
      ? [{ closed: false, anchors: [...anchors.slice(s + 1), ...anchors.slice(0, s + 1)] }]
      : [anchors.slice(0, s + 1), anchors.slice(s + 1)].filter(p => p.length >= 2).map(p => ({ closed: false, anchors: p }));
    copy.paths.splice(a.path, 1, ...pieces);
    if (!copy.paths.length) return false;
    clearPicks();
    void commit(at.item, copy);
    return true;
  }
  return false;
}

export function cutAtChosen(): boolean {
  const at = chosenAnchor();
  if (!at) return false;
  const copy = clone(at.vector);
  copy.paths.splice(at.path, 1, ...cutAt(copy.paths[at.path], at.index));
  clearPicks();
  void commit(at.item, copy);
  return true;
}

function drawBox() {
  if (!box) { marquee.setAttribute('width', '0'); marquee.setAttribute('height', '0'); return; }
  marquee.setAttribute('x', String(Math.min(box.start.x, box.now.x))); marquee.setAttribute('y', String(Math.min(box.start.y, box.now.y)));
  marquee.setAttribute('width', String(Math.abs(box.now.x - box.start.x))); marquee.setAttribute('height', String(Math.abs(box.now.y - box.start.y)));
}

/** Direct Selection marquee: anchors of the selected path inside the box are selected (Shift adds); a click without a drag deselects. */
function finishBox() {
  const done = box!;
  box = null;
  drawBox();
  const x0 = Math.min(done.start.x, done.now.x), x1 = Math.max(done.start.x, done.now.x), y0 = Math.min(done.start.y, done.now.y), y1 = Math.max(done.start.y, done.now.y);
  if ((x1 - x0) * S.camera.zoom < 3 && (y1 - y0) * S.camera.zoom < 3) { clearPicks(); setSelection([]); refreshAnchors(); return; }
  const vector = asVector(done.item);
  const m = mapper(done.item, vector);
  if (!done.add) { picked.clear(); pickedItem = done.item.id; chosen = null; }
  vector.paths.forEach((path, pi) => path.anchors.forEach((a, i) => {
    const w = m.toWorld(a);
    if (w.x >= x0 && w.x <= x1 && w.y >= y0 && w.y <= y1 && !picked.has(key(pi, i))) pick(done.item.id, pi, i, true);
  }));
  refreshAnchors();
}

stage.addEventListener('pointermove', event => {
  if (box) { event.stopImmediatePropagation(); box.now = worldPoint(event); drawBox(); return; }
  if (drag) { event.stopImmediatePropagation(); applyDrag(event); }
}, true);

stage.addEventListener('pointerup', event => {
  if (box) { event.stopImmediatePropagation(); finishBox(); return; }
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

interface PenState { anchors: Anchor[]; down: Point | null; hover: Point | null; continuing?: { item: Item; path: number }; curve?: boolean; corners?: Set<Anchor> }

const penTool = () => S.tool === 'pen-path' || S.tool === 'curvature';

/** The Curvature tool's anchors: the placed points with handles worked out so the curve bends through them; points in `corners` (corner points, and the anchors of a path picked up to continue) keep their own handles. */
function curveAnchors(state: PenState, closed: boolean, extra?: Point | null): Anchor[] {
  const points: Anchor[] = extra ? [...state.anchors, { x: extra.x, y: extra.y }] : state.anchors;
  if (!state.curve) return points;
  const smooth = smoothPath({ closed, anchors: points.map(a => ({ x: a.x, y: a.y })) }, 1).anchors;
  return smooth.map((a, i) => state.corners?.has(points[i]) ? points[i] : a);
}

/** With the Pen, a click on an end of the selected open path picks that path up to continue it (Illustrator's continue path). */
function pickUpEnd(p: Point): PenState | null {
  if (selection.size !== 1 || !S.state) return null;
  const item = S.state.board.items.find(i => selection.has(i.id));
  if (!item || item.locked || (item.kind !== 'shape' && item.kind !== 'stroke') || (item.rotation || 0) !== 0) return null;
  const vector = asVector(item);
  const sx = item.width / vector.w, sy = item.height / vector.h;
  const world = (q: Point): Point => ({ x: item.x + q.x * sx, y: item.y + q.y * sy });
  for (let pi = 0; pi < vector.paths.length; pi++) {
    const path = vector.paths[pi];
    if (path.closed || path.anchors.length < 2) continue;
    const mapped = path.anchors.map(a => ({ ...a, ...world(a), in: a.in ? world(a.in) : null, out: a.out ? world(a.out) : null, radius: a.radius ? a.radius * (sx + sy) / 2 : a.radius }));
    const near = (a: Point) => Math.hypot(a.x - p.x, a.y - p.y) * S.camera.zoom < 8;
    if (near(mapped[mapped.length - 1])) return { anchors: mapped, down: null, hover: null, continuing: { item, path: pi } };
    if (near(mapped[0])) return { anchors: [...mapped].reverse().map(a => ({ ...a, in: a.out ?? null, out: a.in ?? null })), down: null, hover: null, continuing: { item, path: pi } };
  }
  return null;
}
let pen: PenState | null = null;
const penPath = document.createElementNS(NS, 'path');
penPath.classList.add('pen-preview');
overlay.append(penPath);

function drawPen() {
  if (!pen || !pen.anchors.length) { penPath.setAttribute('d', ''); return; }
  const anchors = curveAnchors(pen, false, pen.hover && !pen.down ? pen.hover : null);
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
  lines.setAttribute('d', curveAnchors(pen, false).flatMap(a => [a.in ? `M${a.x},${a.y}L${a.in.x},${a.in.y}` : '', a.out ? `M${a.x},${a.y}L${a.out.x},${a.out.y}` : '']).join(''));
  preview.setAttribute('d', '');
}

async function finishPen(closed: boolean) {
  const done = pen;
  pen = null;
  penPath.setAttribute('d', '');
  if (!done || done.anchors.length < 2) { refreshAnchors(); return; }
  if (done.curve) { done.anchors = curveAnchors(done, closed); done.curve = false; }
  const all =done.anchors.flatMap(a => [a, a.in, a.out].filter(Boolean) as Point[]);
  const x0 = Math.min(...all.map(p => p.x)), y0 = Math.min(...all.map(p => p.y));
  const w = Math.max(1, Math.max(...all.map(p => p.x)) - x0), h = Math.max(1, Math.max(...all.map(p => p.y)) - y0);
  const local = (p: Point) => ({ x: p.x - x0, y: p.y - y0 });
  const anchors = done.anchors.map(a => ({ ...local(a), in: a.in ? local(a.in) : null, out: a.out ? local(a.out) : null }));
  if (done.continuing) {
    const { item: old, path: index } = done.continuing;
    const vector = asVector(old);
    const sx = old.width / vector.w, sy = old.height / vector.h;
    const others = vector.paths.map((path, i) => i === index ? null : path.anchors.map(a => {
      const w = (q: Point) => ({ x: old.x + q.x * sx, y: old.y + q.y * sy });
      return { ...a, ...w(a), in: a.in ? w(a.in) : null, out: a.out ? w(a.out) : null };
    }));
    const every = [...all, ...others.flat().filter(Boolean).flatMap(a => [a!, a!.in, a!.out].filter(Boolean) as Point[])];
    const nx = Math.min(...every.map(q => q.x)), ny = Math.min(...every.map(q => q.y));
    const nw = Math.max(1, Math.max(...every.map(q => q.x)) - nx), nh = Math.max(1, Math.max(...every.map(q => q.y)) - ny);
    const shift = (q: Point) => ({ x: q.x - nx, y: q.y - ny });
    const paths = vector.paths.map((path, i) => {
      const source = i === index ? done.anchors : others[i]!;
      return { closed: i === index ? closed : path.closed, anchors: source.map(a => ({ ...a, ...shift(a), in: a.in ? shift(a.in) : null, out: a.out ? shift(a.out) : null })) };
    });
    await execute({ type: 'update', ids: [old.id], patch: { x: nx, y: ny, width: nw, height: nh, data: withVector(old, { w: nw, h: nh, paths }) } });
    refreshAnchors();
    return;
  }
  const item = newItem('shape', x0, y0, { width: w, height: h, z: topZ(), color: '#f97316', data: { shape: 'path', stroke_width: 2, fill: 'none', vector: { w, h, paths: [{ closed, anchors }] } } });
  await execute({ type: 'add', items: [item] });
  setSelection([item.id]);
  refreshAnchors();
}

stage.addEventListener('pointerdown', event => {
  if (!penTool() || event.button !== 0 || !S.state) return;
  if ((event.target as Element).closest('button,input,.floating-controls,.navigator')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const p = worldPoint(event);
  const curve = S.tool === 'curvature';
  if (!pen) {
    const picked = pickUpEnd(p);
    if (picked) { pen = picked; if (curve) { pen.curve = true; pen.corners = new Set(pen.anchors); } drawPen(); return; }
  }
  pen ??= { anchors: [], down: null, hover: null, curve, corners: new Set() };
  const near = (a: Anchor) => Math.hypot(p.x - a.x, p.y - a.y) * S.camera.zoom < 8;
  const first = pen.anchors[0];
  if (first && pen.anchors.length > 2 && near(first)) { void finishPen(true).catch(error); return; }
  const hit = pen.curve ? pen.anchors.find(near) : undefined;
  if (hit && pen.corners) {
    if (pen.corners.has(hit)) pen.corners.delete(hit); else pen.corners.add(hit);
    drawPen();
    return;
  }
  stage.setPointerCapture(event.pointerId);
  pen.anchors.push({ x: p.x, y: p.y });
  pen.down = p;
  drawPen();
}, true);

stage.addEventListener('pointermove', event => {
  if (!penTool() || !pen) return;
  event.stopImmediatePropagation();
  const p = worldPoint(event);
  pen.hover = p;
  if (pen.down && pen.curve) { const a = pen.anchors[pen.anchors.length - 1]; a.x = p.x; a.y = p.y; }
  else if (pen.down) {
    const a = pen.anchors[pen.anchors.length - 1];
    if (Math.hypot(p.x - a.x, p.y - a.y) * S.camera.zoom > 3) { a.out = { x: p.x, y: p.y }; a.in = { x: 2 * a.x - p.x, y: 2 * a.y - p.y }; }
  }
  drawPen();
}, true);

stage.addEventListener('pointerup', event => {
  if (!penTool() || !pen) return;
  event.stopImmediatePropagation();
  pen.down = null;
  drawPen();
}, true);

window.addEventListener('keydown', event => {
  if (!pen || !penTool()) return;
  if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); void finishPen(false).catch(error); }
  else if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); event.stopImmediatePropagation(); pen.anchors.pop(); drawPen(); }
}, true);

export function registerDirectSelect(setTool: (tool: 'direct' | 'pen-path' | 'curvature') => void) {
  const several = () => { const at = chosenAnchor(); return !!at && pickedList(at.item).length > 1; };
  registry.add({ group: 'Path', id: 'average-anchors', label: 'Average...', icon: 'snap', agent: 'window-only', params: { axis: { type: 'string', enum: ['both', 'horizontal', 'vertical'], description: 'both moves the anchors to one point; horizontal lines them up on a horizontal line; vertical on a vertical line' } }, run: p => { if (!averageAnchors(String((p as { axis?: string } | undefined)?.axis || 'both'))) throw new Error('With the Direct Selection tool, select two or more anchors first (Shift-click or drag a box).'); }, enabled: several, description: 'Moves the selected anchors to their average position, or lines them up horizontally or vertically.' });
  registry.add({ group: 'Path', id: 'delete-segment', label: 'Delete Segment', icon: 'delete', agent: 'window-only', run: () => { if (!deleteSegment()) throw new Error('With the Direct Selection tool, select the two anchors at the ends of a segment first.'); }, enabled: several, description: 'Removes the segment between two selected neighbouring anchors: a closed path opens there, an open path splits in two.' });
  registry.add({ group: 'Tools', id: 'tool-curvature', label: 'Curvature Tool', icon: 'curvature', keys: ['shift+~'], run: () => { if (pen) void finishPen(false); setTool('curvature'); }, agent: 'window-only', mutates: false, description: 'Draws a curved path through the points you click: each click places a point and the curve bends smoothly through all of them; drag while placing to move the point, double-click or Alt-click a placed point to switch it between smooth and corner, click the first point to close, Enter or Esc to finish, Backspace removes the last point.' });
  registry.add({ group: 'Path', id: 'cut-path', label: 'Cut Path at Selected Anchor', icon: 'crop', keys: ['mod+shift+x'], agent: 'window-only', run: () => { if (!cutAtChosen()) throw new Error('With the Direct Selection tool, click the anchor to cut at first.'); }, enabled: () => !!chosenAnchor(), description: 'Scissors: opens a closed path at the selected anchor, or splits an open path in two there.' });
  registry.add({ group: 'Tools', id: 'tool-pen-path', label: 'Pen Tool', icon: 'bezier', keys: ['shift+p'], run: () => { if (pen) void finishPen(false); setTool('pen-path'); }, agent: 'window-only', mutates: false, description: 'Draws a path with anchor points and handles: click for a corner point, drag for a smooth point, click the first point to close the path, Enter or Esc to finish an open path, Backspace removes the last point.' });
  registry.add({ group: 'Tools', id: 'tool-direct', label: 'Direct Selection Tool', icon: 'direct', keys: ['a'], run: () => { setTool('direct'); refreshAnchors(); }, agent: 'window-only', mutates: false, description: 'Shows the anchor points, handles and corner widgets of the selected shape or path: drag an anchor or handle to reshape, drag a corner widget to round every corner (Shift: only that corner), Alt-click a corner widget to switch Round, Inverted round and Chamfer, Alt-click an anchor to convert it between corner and smooth, Alt-drag a handle to break a smooth point.' });
}
