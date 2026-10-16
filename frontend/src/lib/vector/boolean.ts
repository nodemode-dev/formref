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
