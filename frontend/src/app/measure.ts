import type { Point } from '../lib/types';
import { t } from '../lib/i18n';
import { S, stage, toast, world, worldPoint } from './editor';
import { registry } from './registry';

/** Measure (reference-board gap: checking proportions against a reference): drag to measure a length and its angle; every later measurement also shows its ratio to the first, so "the head fits 7.5 times" reads straight off the board. Measurements are a view, kept until Measure is turned off; nothing is saved. */
const NS = 'http://www.w3.org/2000/svg';
const overlay = document.createElementNS(NS, 'svg');
overlay.classList.add('measure-overlay');
world.append(overlay);

interface Segment { a: Point; b: Point; line: SVGLineElement; ends: SVGCircleElement[]; label: SVGTextElement }
const segments: Segment[] = [];
let active = false;
let current: Segment | null = null;
let shownZoom = 0;
let frame = 0;

const length = (s: Segment) => Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
/** Angle from the horizontal, -90 to 90 degrees, positive when the line rises to the right as on paper. */
const angle = (s: Segment) => { let deg = Math.atan2(-(s.b.y - s.a.y), s.b.x - s.a.x) * 180 / Math.PI; if (deg > 90) deg -= 180; if (deg <= -90) deg += 180; return deg; };

function text(s: Segment): string {
  const parts = [`${Math.round(length(s))} px`, `${angle(s).toFixed(1)}°`];
  const first = segments[0];
  if (first && first !== s && length(first) > 0) parts.push(t('{0}× first', { 0: (length(s) / length(first)).toFixed(2) }));
  return parts.join(' · ');
}

function make(a: Point): Segment {
  const line = document.createElementNS(NS, 'line');
  const ends = [document.createElementNS(NS, 'circle'), document.createElementNS(NS, 'circle')];
  const label = document.createElementNS(NS, 'text');
  overlay.append(line, ...ends, label);
  return { a, b: a, line, ends, label };
}

/** Writes one segment's geometry and words; sizes are divided by the zoom so lines and labels stay the same on screen. */
function paint(s: Segment): void {
  const z = S.camera.zoom || 1;
  s.line.setAttribute('x1', String(s.a.x)); s.line.setAttribute('y1', String(s.a.y)); s.line.setAttribute('x2', String(s.b.x)); s.line.setAttribute('y2', String(s.b.y));
  s.line.setAttribute('stroke-width', String(1.5 / z));
  s.ends.forEach((c, i) => { const p = i ? s.b : s.a; c.setAttribute('cx', String(p.x)); c.setAttribute('cy', String(p.y)); c.setAttribute('r', String(3.5 / z)); c.setAttribute('stroke-width', String(1.5 / z)); });
  s.label.setAttribute('x', String((s.a.x + s.b.x) / 2 + 8 / z));
  s.label.setAttribute('y', String((s.a.y + s.b.y) / 2 - 8 / z));
  s.label.setAttribute('font-size', String(12 / z));
  s.label.setAttribute('stroke-width', String(4 / z));
  // A flipped view mirrors the world; the label is mirrored back about its own anchor so it stays readable.
  const lx = (s.a.x + s.b.x) / 2 + 8 / z, ly = (s.a.y + s.b.y) / 2 - 8 / z;
  if (S.flipX || S.flipY) s.label.setAttribute('transform', `translate(${lx} ${ly}) scale(${S.flipX ? -1 : 1} ${S.flipY ? -1 : 1}) translate(${-lx} ${-ly})`);
  else s.label.removeAttribute('transform');
  const words = text(s);
  if (s.label.textContent !== words) s.label.textContent = words;
}

/** While measuring, labels follow zoom changes; one check per frame, writes only when the zoom moved. */
function follow(): void {
  if (!active) return;
  const view = S.camera.zoom * (S.flipX ? -1 : 1) * (S.flipY ? 3 : 1);
  if (view !== shownZoom) { shownZoom = view; segments.forEach(paint); }
  frame = requestAnimationFrame(follow);
}

function clear(): void {
  for (const s of segments.splice(0)) s.line.remove(), s.ends.forEach(c => c.remove()), s.label.remove();
}

function stop(): void {
  active = false; current = null; cancelAnimationFrame(frame);
  clear();
  overlay.style.display = 'none';
  stage.classList.remove('measuring');
}

function toggle(): void {
  if (active) { stop(); return; }
  active = true; shownZoom = 0;
  overlay.style.display = '';
  stage.classList.add('measuring');
  follow();
  toast('Drag to measure. Later lines show their ratio to the first. Esc or Measure again ends it.');
}

stage.addEventListener('pointerdown', event => {
  if (!active || event.button !== 0 || event.altKey) return;
  event.preventDefault(); event.stopImmediatePropagation();
  stage.setPointerCapture(event.pointerId);
  current = make(worldPoint(event));
  segments.push(current);
  paint(current);
}, true);

stage.addEventListener('pointermove', event => {
  if (!active || !current) return;
  event.stopImmediatePropagation();
  let b = worldPoint(event);
  // Shift keeps the line horizontal, vertical or at 45 degrees, as the drawing tools do.
  if (event.shiftKey) {
    const dx = b.x - current.a.x, dy = b.y - current.a.y, step = Math.PI / 4, a = Math.round(Math.atan2(dy, dx) / step) * step, r = Math.hypot(dx, dy);
    b = { x: current.a.x + Math.cos(a) * r, y: current.a.y + Math.sin(a) * r };
  }
  current.b = b;
  paint(current);
}, true);

stage.addEventListener('pointerup', event => {
  if (!active || !current) return;
  event.stopImmediatePropagation();
  const done = current; current = null;
  if (length(done) * S.camera.zoom < 3) { segments.splice(segments.indexOf(done), 1); done.line.remove(); done.ends.forEach(c => c.remove()); done.label.remove(); }
  segments.forEach(paint);
}, true);

window.addEventListener('keydown', event => {
  if (active && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); stop(); }
}, true);

export function registerMeasure(): void {
  stop();
  registry.add({
    group: 'Tools', id: 'measure', label: 'Measure', icon: 'line-tool', keys: ['shift+m'], agent: 'window-only', mutates: false, run: toggle, checked: () => active,
    description: 'Drag on the board to measure a length in board pixels and its angle; each later measurement also shows its ratio to the first. Shift keeps lines at 45 degree steps; Esc or Measure again clears them. Nothing is saved.',
  });
}
