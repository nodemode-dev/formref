import type { Item, Point } from '../lib/types';
import { newItem } from '../lib/types';
import { pathfinder, shapeOf, toPaths, type PathfinderOp } from '../lib/vector/boolean';
import { flatten } from '../lib/vector/path';
import { editable, error, execute, selected, setSelection } from './editor';
import { registry } from './registry';
import { asVector } from './vector';

function shapes(): Item[] {
  const ids = new Set(editable());
  return selected().filter(item => ids.has(item.id) && (item.kind === 'shape' || item.kind === 'stroke')).sort((a, b) => a.z - b.z);
}

function worldRings(item: Item): Point[][] {
  const vector = asVector(item);
  const sx = item.width / vector.w, sy = item.height / vector.h;
  const cx = item.x + item.width / 2, cy = item.y + item.height / 2;
  const angle = (item.rotation || 0) * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
  const toWorld = (p: Point) => { const x = item.x + p.x * sx - cx, y = item.y + p.y * sy - cy; return { x: cx + x * cos - y * sin, y: cy + x * sin + y * cos }; };
  return vector.paths.map(path => flatten(path, 1.5 / Math.max(sx, sy)).map(toWorld));
}

async function run(op: PathfinderOp) {
  const items = shapes();
  if (items.length < 2) throw new Error('Select two or more shapes or paths.');
  const result = pathfinder(op, items.map(item => shapeOf(worldRings(item))));
  const back = op === 'minus-back' ? items[items.length - 1] : items[0];
  const paths = toPaths(result);
  if (!paths.length) {
    await execute({ type: 'remove', ids: items.map(i => i.id) });
    return;
  }
  const xs = paths.flatMap(p => p.anchors.map(a => a.x)), ys = paths.flatMap(p => p.anchors.map(a => a.y));
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  const w = Math.max(1, Math.max(...xs) - x0), h = Math.max(1, Math.max(...ys) - y0);
  const local = paths.map(p => ({ closed: true, anchors: p.anchors.map(a => ({ x: a.x - x0, y: a.y - y0 })) }));
  const fill = back.kind === 'shape' && back.data.fill && back.data.fill !== 'none' ? back.data.fill : 'none';
  const data: Record<string, unknown> = { shape: 'path', stroke_width: back.data.stroke_width ?? 2, fill, vector: { w, h, paths: local } };
  for (const key of ['cap', 'join', 'miter', 'dash']) if (back.data[key] !== undefined) data[key] = back.data[key];
  const made = newItem('shape', x0, y0, { width: w, height: h, z: back.z, color: back.color, opacity: back.opacity, data });
  await execute({ type: 'batch', commands: [{ type: 'remove', ids: items.map(i => i.id) }, { type: 'add', items: [made] }] });
  setSelection([made.id]);
}

const MODES: [PathfinderOp, string, string][] = [
  ['unite', 'Unite', 'Merges the selected shapes into one outline.'],
  ['minus-front', 'Minus Front', 'Cuts the shapes in front out of the backmost shape.'],
  ['intersect', 'Intersect', 'Keeps only the area all selected shapes share.'],
  ['exclude', 'Exclude', 'Keeps the areas where an odd number of shapes overlap, removing the shared parts.'],
  ['minus-back', 'Minus Back', 'Cuts the shapes behind out of the frontmost shape.'],
];

export function registerPathfinder(): void {
  registry.add(...MODES.map(([op, label, description]) => ({
    group: 'Pathfinder', id: `pathfinder-${op}`, label, icon: 'shape' as const, run: () => run(op).catch(error),
    enabled: () => shapes().length >= 2, description: `Pathfinder ${label}: ${description} The result is one path with the backmost shape's stroke and fill; curves become many short segments.`,
  })));
}
