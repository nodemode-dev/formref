import polygonClipping, { type MultiPolygon, type Polygon, type Ring } from 'polygon-clipping';
import { simplifyPoints, type Pt, type VPath } from './path';

export type PathfinderOp = 'unite' | 'minus-front' | 'intersect' | 'exclude' | 'minus-back';

/** One shape's outlines (already in shared coordinates) as a multipolygon, filled even-odd as the canvas draws it. */
export function shapeOf(rings: Pt[][]): MultiPolygon {
  const polys: Polygon[] = rings.filter(r => r.length >= 3).map(r => [r.map(p => [p.x, p.y] as [number, number])]);
  if (!polys.length) return [];
  return polys.length === 1 ? [polys[0]] : polygonClipping.xor(polys[0], ...polys.slice(1));
}

/** Illustrator's Pathfinder shape modes over shapes ordered back to front. */
export function pathfinder(op: PathfinderOp, shapes: MultiPolygon[]): MultiPolygon {
  const [first, ...rest] = shapes.filter(s => s.length);
  if (!first) return [];
  if (!rest.length) return first;
  if (op === 'unite') return polygonClipping.union(first, ...rest);
  if (op === 'intersect') return polygonClipping.intersection(first, ...rest);
  if (op === 'exclude') return polygonClipping.xor(first, ...rest);
  if (op === 'minus-front') return polygonClipping.difference(first, ...rest);
  const front = rest[rest.length - 1];
  return polygonClipping.difference(front, first, ...rest.slice(0, -1));
}

export type PieceOp = 'divide' | 'trim' | 'merge' | 'crop';

/** Pathfinder modes that keep several objects. Shapes run back to front; each piece names the shape whose style it takes. */
export function pieces(op: PieceOp, shapes: MultiPolygon[], keys: string[] = shapes.map((_, i) => String(i))): { geom: MultiPolygon; from: number }[] {
  const out: { geom: MultiPolygon; from: number }[] = [];
  const area = (g: MultiPolygon) => g.some(poly => poly.some(ring => ring.length >= 3));
  if (op === 'crop') {
    const front = shapes[shapes.length - 1];
    shapes.slice(0, -1).forEach((shape, i) => { const g = polygonClipping.intersection(shape, front); if (area(g)) out.push({ geom: g, from: i }); });
    return out;
  }
  if (op === 'divide') {
    let faces: { geom: MultiPolygon; from: number }[] = [];
    shapes.forEach((shape, i) => {
      const next: typeof faces = [];
      for (const face of faces) {
        const inside = polygonClipping.intersection(face.geom, shape), outside = polygonClipping.difference(face.geom, shape);
        if (area(inside)) next.push({ geom: inside, from: i });
        if (area(outside)) next.push({ geom: outside, from: face.from });
      }
      const rest = faces.length ? polygonClipping.difference(shape, ...faces.map(f => f.geom)) : shape;
      if (area(rest)) next.push({ geom: rest, from: i });
      faces = next;
    });
    for (const face of faces) for (const poly of face.geom) out.push({ geom: [poly], from: face.from });
    return out;
  }
  shapes.forEach((shape, i) => {
    const front = shapes.slice(i + 1);
    const visible = front.length ? polygonClipping.difference(shape, ...front) : shape;
    if (area(visible)) out.push({ geom: visible, from: i });
  });
  if (op === 'trim') return out;
  const merged = new Map<string, { geom: MultiPolygon; from: number }>();
  for (const piece of out) {
    const key = keys[piece.from];
    const seen = merged.get(key);
    merged.set(key, seen ? { geom: polygonClipping.union(seen.geom, piece.geom), from: Math.max(seen.from, piece.from) } : piece);
  }
  return [...merged.values()];
}

/** Offset Path with round joins: grows the shape by d (shrinks it when d is negative) using the band every edge and vertex sweeps at that distance. */
export function offset(shape: MultiPolygon, d: number, steps = 16): MultiPolygon {
  const r = Math.abs(d);
  if (r < 1e-6) return shape;
  const band: Polygon[] = [];
  const disc = (x: number, y: number): Polygon => [Array.from({ length: steps + 1 }, (_, k) => { const a = (k % steps) * 2 * Math.PI / steps; return [x + r * Math.cos(a), y + r * Math.sin(a)] as [number, number]; })];
  for (const polygon of shape) for (const ring of polygon) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i], [x2, y2] = ring[i + 1];
      const l = Math.hypot(x2 - x1, y2 - y1);
      band.push(disc(x1, y1));
      if (l < 1e-9) continue;
      const nx = -(y2 - y1) / l * r, ny = (x2 - x1) / l * r;
      band.push([[[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny], [x1 + nx, y1 + ny]]]);
    }
  }
  if (!band.length) return shape;
  const swept = polygonClipping.union(band[0], ...band.slice(1));
  return d > 0 ? polygonClipping.union(shape, swept) : polygonClipping.difference(shape, swept);
}

export interface StrokeLine { points: Pt[]; closed: boolean }

/** Outline Stroke: the area a stroke of `width` covers along each line, with Illustrator's caps (butt, round, projecting) and joins (miter up to the limit, round, bevel), as one filled shape. */
export function strokeOutline(lines: StrokeLine[], width: number, cap: string, join: string, miterLimit: number, steps = 16): MultiPolygon {
  const h = width / 2;
  if (h <= 0) return [];
  const parts: Polygon[] = [];
  const disc = (c: Pt): Polygon => [Array.from({ length: steps + 1 }, (_, k) => { const a = (k % steps) * 2 * Math.PI / steps; return [c.x + h * Math.cos(a), c.y + h * Math.sin(a)] as [number, number]; })];
  const poly = (...p: Pt[]): Polygon => [[...p, p[0]].map(q => [q.x, q.y] as [number, number])];
  for (const line of lines) {
    const pts = line.points.filter((p, i, all) => i === 0 || Math.hypot(p.x - all[i - 1].x, p.y - all[i - 1].y) > 1e-6);
    if (line.closed && pts.length > 2 && Math.hypot(pts[0].x - pts.at(-1)!.x, pts[0].y - pts.at(-1)!.y) < 1e-6) pts.pop();
    if (pts.length < 2) { if (pts.length === 1 && cap !== 'butt') parts.push(cap === 'round' ? disc(pts[0]) : poly({ x: pts[0].x - h, y: pts[0].y - h }, { x: pts[0].x + h, y: pts[0].y - h }, { x: pts[0].x + h, y: pts[0].y + h }, { x: pts[0].x - h, y: pts[0].y + h })); continue; }
    const n = pts.length, segs = line.closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      let a = pts[i], b = pts[(i + 1) % n];
      const l = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / l, uy = (b.y - a.y) / l;
      if (!line.closed && cap === 'projecting') {
        if (i === 0) a = { x: a.x - ux * h, y: a.y - uy * h };
        if (i === segs - 1) b = { x: b.x + ux * h, y: b.y + uy * h };
      }
      const nx = -uy * h, ny = ux * h;
      parts.push(poly({ x: a.x + nx, y: a.y + ny }, { x: b.x + nx, y: b.y + ny }, { x: b.x - nx, y: b.y - ny }, { x: a.x - nx, y: a.y - ny }));
    }
    if (!line.closed && cap === 'round') parts.push(disc(pts[0]), disc(pts[n - 1]));
    for (let i = line.closed ? 0 : 1; i < (line.closed ? n : n - 1); i++) {
      const p = pts[(i - 1 + n) % n], v = pts[i], q = pts[(i + 1) % n];
      if (join === 'round') { parts.push(disc(v)); continue; }
      const l1 = Math.hypot(v.x - p.x, v.y - p.y), l2 = Math.hypot(q.x - v.x, q.y - v.y);
      const d1 = { x: (v.x - p.x) / l1, y: (v.y - p.y) / l1 }, d2 = { x: (q.x - v.x) / l2, y: (q.y - v.y) / l2 };
      const n1 = { x: -d1.y, y: d1.x }, n2 = { x: -d2.y, y: d2.x };
      const half = Math.sqrt(Math.max(0, (1 + n1.x * n2.x + n1.y * n2.y) / 2));
      for (const s of [1, -1]) {
        const e1 = { x: v.x + s * n1.x * h, y: v.y + s * n1.y * h }, e2 = { x: v.x + s * n2.x * h, y: v.y + s * n2.y * h };
        if (join !== 'bevel' && half > 1e-6 && 1 / half <= miterLimit) {
          const mx = n1.x + n2.x, my = n1.y + n2.y, ml = Math.hypot(mx, my) || 1;
          parts.push(poly(v, e1, { x: v.x + s * mx / ml * h / half, y: v.y + s * my / ml * h / half }, e2));
        } else parts.push(poly(v, e1, e2));
      }
    }
  }
  if (!parts.length) return [];
  return polygonClipping.union(parts[0], ...parts.slice(1));
}

/** Result rings back to closed corner paths, with points on straight runs removed. */
export function toPaths(result: MultiPolygon, tolerance = 0.25): VPath[] {
  const paths: VPath[] = [];
  for (const polygon of result) for (const ring of polygon as Ring[]) {
    const points = ring.map(([x, y]) => ({ x, y }));
    if (points.length > 1 && points[0].x === points.at(-1)!.x && points[0].y === points.at(-1)!.y) points.pop();
    const simple = simplifyPoints([...points, points[0]], tolerance).slice(0, -1);
    if (simple.length >= 3) paths.push({ closed: true, anchors: simple });
  }
  return paths;
}
