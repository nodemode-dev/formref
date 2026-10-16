import type { Pt, Vector } from './path';

export type Arrowhead = 'none' | 'arrow' | 'open' | 'circle' | 'bar' | 'square';
export const ARROWHEADS: Arrowhead[] = ['none', 'arrow', 'open', 'circle', 'bar', 'square'];

interface Drawing { kind: string; width: number; height: number; data: Record<string, unknown> }
interface End { tip: Pt; dir: Pt }

function unit(x: number, y: number): Pt {
  const l = Math.hypot(x, y);
  return l < 1e-9 ? { x: 1, y: 0 } : { x: x / l, y: y / l };
}

/** The two open ends of a drawing in its own pixel box, each with the direction the stroke travels into it. */
function ends(item: Drawing): [End, End] | null {
  const vector = item.data.vector as Vector | undefined;
  if (vector) {
    const path = vector.paths.find(p => !p.closed && p.anchors.length >= 2);
    if (!path) return null;
    const sx = item.width / vector.w, sy = item.height / vector.h;
    const map = (p: Pt): Pt => ({ x: p.x * sx, y: p.y * sy });
    const a = path.anchors, first = a[0], last = a[a.length - 1];
    const startFrom = map(first.out || a[1].in || a[1]), endFrom = map(last.in || a[a.length - 2].out || a[a.length - 2]);
    const s = map(first), e = map(last);
    return [{ tip: s, dir: unit(s.x - startFrom.x, s.y - startFrom.y) }, { tip: e, dir: unit(e.x - endFrom.x, e.y - endFrom.y) }];
  }
  const points = item.data.points as Pt[] | undefined;
  if (item.kind === 'stroke' && points && points.length >= 2) {
    const back = (from: number, step: number) => { let i = from + step; while (i > 0 && i < points.length - 1 && Math.hypot(points[i].x - points[from].x, points[i].y - points[from].y) < 6) i += step; return points[Math.max(0, Math.min(points.length - 1, i))]; };
    const s = points[0], e = points[points.length - 1], ns = back(0, 1), ne = back(points.length - 1, -1);
    return [{ tip: s, dir: unit(s.x - ns.x, s.y - ns.y) }, { tip: e, dir: unit(e.x - ne.x, e.y - ne.y) }];
  }
  if (item.kind === 'shape' && item.data.shape === 'line') {
    const s = points?.[0] || { x: 0, y: 0 }, e = points?.at(-1) || { x: item.width, y: item.height };
    return [{ tip: s, dir: unit(s.x - e.x, s.y - e.y) }, { tip: e, dir: unit(e.x - s.x, e.y - s.y) }];
  }
  return null;
}

function head(kind: Arrowhead, end: End, size: number): string {
  const { tip, dir } = end, n = { x: -dir.y, y: dir.x };
  const at = (along: number, across: number) => `${(tip.x + dir.x * along + n.x * across).toFixed(2)},${(tip.y + dir.y * along + n.y * across).toFixed(2)}`;
  if (kind === 'arrow') return `M${at(0, 0)} L${at(-size, size * 0.5)} L${at(-size * 0.8, 0)} L${at(-size, -size * 0.5)} Z`;
  if (kind === 'open') return `M${at(-size, size * 0.55)} L${at(0, 0)} L${at(-size, -size * 0.55)}`;
  if (kind === 'circle') { const r = size * 0.4, c = { x: tip.x - dir.x * r, y: tip.y - dir.y * r }; return `M${(c.x + r).toFixed(2)},${c.y.toFixed(2)} a${r},${r} 0 1,0 ${(-2 * r).toFixed(2)},0 a${r},${r} 0 1,0 ${(2 * r).toFixed(2)},0 Z`; }
  if (kind === 'bar') return `M${at(0, size * 0.55)} L${at(0, -size * 0.55)}`;
  if (kind === 'square') { const h = size * 0.4; return `M${at(0, h)} L${at(-2 * h, h)} L${at(-2 * h, -h)} L${at(0, -h)} Z`; }
  return '';
}

/** Arrowhead outlines for a drawing, in its pixel box; empty when it has no open ends or no arrowheads set. Size follows the stroke weight and the scale (percent). */
export function arrowheads(item: Drawing): { filled: string; lines: string } {
  const start = (item.data.arrow_start as Arrowhead) || 'none', finish = (item.data.arrow_end as Arrowhead) || 'none';
  if (start === 'none' && finish === 'none') return { filled: '', lines: '' };
  const found = ends(item);
  if (!found) return { filled: '', lines: '' };
  const weight = Number(item.data.stroke_width) || 2;
  const scale = Math.max(10, Math.min(1000, Number(item.data.arrow_scale) || 100)) / 100;
  const size = Math.max(6, weight * 4.5) * scale;
  const filled: string[] = [], lines: string[] = [];
  for (const [kind, end] of [[start, found[0]], [finish, found[1]]] as [Arrowhead, End][]) {
    if (!ARROWHEADS.includes(kind) || kind === 'none') continue;
    (kind === 'open' || kind === 'bar' ? lines : filled).push(head(kind, end, size));
  }
  return { filled: filled.join(' '), lines: lines.join(' ') };
}
