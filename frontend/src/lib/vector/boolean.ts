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
