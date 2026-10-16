import type { Command, Item, Point } from '../lib/types';
import { newItem } from '../lib/types';
import type { MultiPolygon } from 'polygon-clipping';
import { offset, pathfinder, pieces, shapeOf, strokeOutline, toPaths, type PathfinderOp, type PieceOp } from '../lib/vector/boolean';
import { flatten } from '../lib/vector/path';
import { editable, error, execute, inputDialog, selected, setSelection, topZ } from './editor';
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

function itemFor(back: Item, result: MultiPolygon, z: number): Item | null {
  const paths = toPaths(result);
  if (!paths.length) return null;
  const xs = paths.flatMap(p => p.anchors.map(a => a.x)), ys = paths.flatMap(p => p.anchors.map(a => a.y));
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  const w = Math.max(1, Math.max(...xs) - x0), h = Math.max(1, Math.max(...ys) - y0);
  const local = paths.map(p => ({ closed: true, anchors: p.anchors.map(a => ({ x: a.x - x0, y: a.y - y0 })) }));
  const fill = back.kind === 'shape' && back.data.fill && back.data.fill !== 'none' ? back.data.fill : 'none';
  const data: Record<string, unknown> = { shape: 'path', stroke_width: back.data.stroke_width ?? 2, fill, vector: { w, h, paths: local } };
  for (const key of ['cap', 'join', 'miter', 'dash', 'gradient']) if (back.data[key] !== undefined) data[key] = back.data[key];
  return newItem('shape', x0, y0, { width: w, height: h, z, color: back.color, opacity: back.opacity, data });
}

async function runPieces(op: PieceOp) {
  const items = shapes();
  if (items.length < 2) throw new Error('Select two or more shapes or paths.');
  const keys = items.map(item => `${item.color}|${String(item.data.fill ?? 'none')}`);
  const made = pieces(op, items.map(item => shapeOf(worldRings(item))), keys)
    .map((piece, i) => itemFor(items[piece.from], piece.geom, items[0].z + i))
    .filter((item): item is Item => !!item);
  await execute({ type: 'batch', commands: [{ type: 'remove', ids: items.map(i => i.id) }, ...(made.length ? [{ type: 'add', items: made }] : [])] });
  setSelection(made.map(item => item.id));
}

async function offsetPath(params?: Record<string, unknown>) {
  const ids = new Set(editable());
  const items = selected().filter(item => ids.has(item.id) && (item.kind === 'shape' || item.kind === 'stroke'));
  if (!items.length) throw new Error('Select a shape or path.');
  let distance = typeof params?.distance === 'number' ? params.distance : NaN;
  if (!Number.isFinite(distance)) {
    const form = await inputDialog('Offset Path', { name: '10', label: 'Offset (px)', description: 'A new path this far outside the selected shapes, or inside them for a negative value, with round joins. The originals stay.', submit: 'Offset' });
    if (!form) return;
    distance = Number(form.name);
  }
  if (!Number.isFinite(distance) || distance === 0 || Math.abs(distance) > 2000) throw new Error('Enter an offset from -2000 to 2000, not 0.');
  const base = topZ();
  const made = items.map((item, i) => itemFor(item, offset(shapeOf(worldRings(item)), distance), base + i)).filter((item): item is Item => !!item);
  if (!made.length) throw new Error('Nothing is left after that offset.');
  await execute({ type: 'add', items: made });
  setSelection(made.map(item => item.id));
}

/** Outline Stroke: replaces each selected path's stroke with a filled shape of the same outline, as Illustrator does; dashes are not expanded. */
async function outlineStroke() {
  const ids = new Set(editable());
  const items = selected().filter(item => ids.has(item.id) && (item.kind === 'shape' || item.kind === 'stroke') && item.data.stroke !== 'none');
  if (!items.length) throw new Error('Select a shape or path that has a stroke.');
  const commands: Command[] = [];
  const made: Item[] = [];
  for (const item of items) {
    const vector = asVector(item);
    const rings = worldRings(item);
    const legacy = item.kind === 'stroke' && !item.data.vector;
    const cap = String(item.data.cap || (legacy ? 'round' : 'butt')), join = String(item.data.join || (legacy ? 'round' : 'miter'));
    const miter = Number(item.data.miter) >= 1 ? Number(item.data.miter) : 10;
    const outline = strokeOutline(rings.map((points, i) => ({ points, closed: vector.paths[i].closed })), Number(item.data.stroke_width || 2), cap, join, miter);
    const filled = item.kind === 'shape' && item.data.fill && item.data.fill !== 'none' && vector.paths.some(p => p.closed);
    const outlined = itemFor(item, outline, item.z + (filled ? 1 : 0));
    if (!outlined) continue;
    outlined.data = { shape: 'path', stroke: 'none', stroke_width: 1, fill: item.color, vector: outlined.data.vector };
    if (filled) {
      const body = itemFor(item, shapeOf(rings.filter((_, i) => vector.paths[i].closed)), item.z);
      if (body) { body.data = { ...body.data, stroke: 'none', stroke_width: 1 }; body.color = String(item.data.fill); made.push(body); }
    }
    made.push(outlined);
    commands.push({ type: 'remove', ids: [item.id] });
  }
  if (!made.length) throw new Error('Nothing to outline.');
  await execute({ type: 'batch', commands: [...commands, { type: 'add', items: made }] });
  setSelection(made.map(item => item.id));
}

const PIECES: [PieceOp, string, string][] = [
  ['divide', 'Divide', 'Splits the selected shapes into every separate area their outlines make; each piece keeps the style of the shape on top there.'],
  ['trim', 'Trim', 'Removes the hidden parts of each selected shape, keeping each visible part as its own object.'],
  ['merge', 'Merge', 'Trims hidden parts, then joins touching pieces that share a colour and fill.'],
  ['crop', 'Crop', 'Keeps only the parts of the shapes behind that fall inside the frontmost shape, and removes the frontmost shape.'],
];

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
  })), {
    group: 'Path', id: 'offset-path', label: 'Offset Path...', icon: 'shape' as const, run: (p?: Record<string, unknown>) => offsetPath(p).catch(error),
    enabled: () => selected().some(item => item.kind === 'shape' || item.kind === 'stroke'),
    params: { distance: { type: 'number' as const, min: -2000, max: 2000, description: 'pixels outward, negative for inward' } },
    description: 'Object > Path > Offset Path: adds a path at the given distance outside (or inside) each selected shape, with round joins.',
  }, {
    group: 'Path', id: 'outline-stroke', label: 'Outline Stroke', icon: 'stroke' as const, run: () => outlineStroke().catch(error),
    enabled: () => selected().some(item => (item.kind === 'shape' || item.kind === 'stroke') && item.data.stroke !== 'none'),
    description: 'Object > Path > Outline Stroke: turns each selected stroke into a filled shape with the same outline, keeping its caps, joins and miter limit; a filled closed shape keeps its fill as a separate shape behind. Dashes are not expanded.',
  }, ...PIECES.map(([op, label, description]) => ({
    group: 'Pathfinder', id: `pathfinder-${op}`, label, icon: 'shape' as const, run: () => runPieces(op).catch(error),
    enabled: () => shapes().length >= 2, description: `Pathfinder ${label}: ${description} Curves become many short segments.`,
  })));
}
