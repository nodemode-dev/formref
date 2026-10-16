import type { Item, Point } from '../lib/types';
import { newItem } from '../lib/types';
import {
  addAnchor, arcPath, closePath, ellipsePath, polarGridPaths, rectGridPaths, spiralPath, joinPaths, polygonPath, polylinePath, rectPath, reversePath, roundAll, simplifyPoints, smoothPath, starPath,
  maxCornerRadius, type CornerStyle, type VPath, type Vector,
} from '../lib/vector/path';
import { CAPS, JOINS, parseDash } from '../lib/vector/stroke';
import { ARROWHEADS, type Arrowhead } from '../lib/vector/arrows';
import { formatStops, parseStops, readGradient } from '../lib/vector/gradient';
import { $, S, editable, error, execute, inputDialog, inspectorHooks, placement, selected, setSelection, toast, topZ } from './editor';
import { registry } from './registry';

const STYLES: CornerStyle[] = ['round', 'inverted', 'chamfer'];

function drawings(): Item[] {
  const ids = new Set(editable());
  return selected().filter(item => ids.has(item.id) && (item.kind === 'shape' || item.kind === 'stroke'));
}

const hasDrawing = () => drawings().length > 0;
const hasPath = () => drawings().some(item => !!item.data.vector);

/** The item as a vector in its own w by h design box, converting a rectangle, ellipse, line or freehand stroke the first time. */
export function asVector(item: Item): Vector {
  const existing = item.data.vector as Vector | undefined;
  if (existing) return existing;
  const w = Math.max(1, item.width), h = Math.max(1, item.height);
  if (item.kind === 'stroke') {
    const points = (item.data.points || []) as Point[];
    return { w, h, paths: [polylinePath(simplifyPoints(points, 0.6))] };
  }
  const kind = String(item.data.shape || 'rect');
  if (kind === 'ellipse') return { w, h, paths: [ellipsePath(w, h)] };
  if (kind === 'line') {
    const ends = item.data.points as Point[] | undefined;
    return { w, h, paths: [polylinePath([ends?.[0] || { x: 0, y: 0 }, ends?.at(-1) || { x: w, y: h }])] };
  }
  return { w, h, paths: [rectPath(w, h)] };
}

export function withVector(item: Item, vector: Vector): Record<string, unknown> {
  return item.kind === 'shape' ? { ...item.data, shape: 'path', vector } : { ...item.data, vector };
}

async function eachPath(change: (path: VPath, item: Item) => VPath) {
  const items = drawings();
  if (!items.length) return;
  await execute({ type: 'batch', commands: items.map(item => {
    const vector = asVector(item);
    return { type: 'update', ids: [item.id], patch: { data: withVector(item, { ...vector, paths: vector.paths.map(p => change(p, item)) }) } };
  }) });
}

async function setData(patch: Record<string, unknown>) {
  const items = drawings();
  if (!items.length) return;
  await execute({ type: 'batch', commands: items.map(item => ({ type: 'update', ids: [item.id], patch: { data: { ...item.data, ...patch } } })) });
}

async function roundCorners(params?: Record<string, unknown>) {
  let radius = typeof params?.radius === 'number' ? params.radius : NaN;
  const style = STYLES.includes(params?.style as CornerStyle) ? (params!.style as CornerStyle) : (($<HTMLSelectElement>('corner-style')?.value as CornerStyle) || 'round');
  if (!Number.isFinite(radius)) {
    const first = drawings()[0];
    const limit = first ? Math.round(Math.max(...asVector(first).paths.map(maxCornerRadius)) * 10) / 10 : 0;
    const form = await inputDialog('Round corners', { name: '12', label: 'Corner radius (px)', description: limit ? `Rounds every corner point of the selected shapes and paths. The largest radius that fits is ${limit} px. Smooth points stay smooth.` : 'Rounds every corner point of the selected shapes and paths. Smooth points stay smooth.', submit: 'Round' });
    if (!form) return;
    radius = Number(form.name);
  }
  if (!Number.isFinite(radius) || radius < 0) throw new Error('Enter a corner radius of 0 or more.');
  await eachPath(path => roundAll(path, radius, style));
}

async function addShape(kind: 'polygon' | 'star', params?: Record<string, unknown>) {
  let count = typeof params?.points === 'number' ? params.points : NaN;
  if (!Number.isFinite(count)) {
    const form = await inputDialog(kind === 'star' ? 'Add star' : 'Add polygon', { name: kind === 'star' ? '5' : '6', label: kind === 'star' ? 'Points' : 'Sides', description: 'From 3 to 1000.', submit: 'Add' });
    if (!form) return;
    count = Number(form.name);
  }
  if (!Number.isFinite(count) || count < 3 || count > 1000) throw new Error('Enter from 3 to 1000.');
  const w = 200, h = 200, p = placement();
  const path = kind === 'star' ? starPath(w, h, count, typeof params?.inner === 'number' ? params.inner : 0.5) : polygonPath(w, h, count);
  const item = newItem('shape', p.x - w / 2, p.y - h / 2, { width: w, height: h, z: topZ(), color: '#f97316', data: { shape: 'path', stroke_width: 2, fill: 'none', vector: { w, h, paths: [path] } } });
  await execute({ type: 'add', items: [item] });
  setSelection([item.id]);
}

const numOr = (params: Record<string, unknown> | undefined, key: string, fallback: number, min: number, max: number) => {
  const v = params?.[key];
  if (v === undefined) return fallback;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Error(`${key} is from ${min} to ${max}.`);
  return v;
};

/** Adds one path item made of `paths` in a w by h box at the view centre, as the Arc, Spiral and grid tools do with a click. */
async function addPaths(w: number, h: number, paths: VPath[], fill = 'none') {
  const p = placement();
  const item = newItem('shape', p.x - w / 2, p.y - h / 2, { width: w, height: h, z: topZ(), color: '#f97316', data: { shape: 'path', stroke_width: 2, fill, vector: { w, h, paths } } });
  await execute({ type: 'add', items: [item] });
  setSelection([item.id]);
}

async function addArc(p?: Record<string, unknown>) {
  const w = numOr(p, 'width', 200, 1, 20000), h = numOr(p, 'height', 200, 1, 20000);
  await addPaths(w, h, [arcPath(w, h, numOr(p, 'slope', 50, -100, 100), p?.closed === true)]);
}

async function addSpiral(p?: Record<string, unknown>) {
  const r = numOr(p, 'radius', 100, 1, 10000);
  await addPaths(r * 2, r * 2, [spiralPath(r * 2, r * 2, numOr(p, 'segments', 10, 1, 1000), numOr(p, 'decay', 80, 5, 150), p?.counterclockwise === true)]);
}

async function addRectGrid(p?: Record<string, unknown>) {
  const w = numOr(p, 'width', 240, 1, 20000), h = numOr(p, 'height', 240, 1, 20000);
  await addPaths(w, h, rectGridPaths(w, h, Math.round(numOr(p, 'rows', 5, 0, 499)), Math.round(numOr(p, 'columns', 5, 0, 499)), p?.frame !== false));
}

async function addPolarGrid(p?: Record<string, unknown>) {
  const w = numOr(p, 'width', 240, 1, 20000), h = numOr(p, 'height', 240, 1, 20000);
  await addPaths(w, h, polarGridPaths(w, h, Math.round(numOr(p, 'rings', 5, 0, 498)), Math.round(numOr(p, 'spokes', 5, 0, 499))));
}

async function joinSelected() {
  const items = drawings().filter(item => asVector(item).paths.some(p => !p.closed));
  if (items.length === 1) { await eachPath(path => (path.closed ? path : closePath(path))); return; }
  if (items.length < 2) throw new Error('Select one open path to close, or two open paths to join.');
  const [a, b] = items;
  const va = asVector(a), vb = asVector(b);
  const sx = vb.w / Math.max(1, b.width), sy = vb.h / Math.max(1, b.height);
  const ax = va.w / Math.max(1, a.width), ay = va.h / Math.max(1, a.height);
  const moved = vb.paths[0].anchors.map(anchor => {
    const map = (q: Point) => ({ x: ((q.x / sx + b.x - a.x) * ax), y: ((q.y / sy + b.y - a.y) * ay) });
    return { ...anchor, ...map(anchor), in: anchor.in ? map(anchor.in) : null, out: anchor.out ? map(anchor.out) : null };
  });
  const joined = joinPaths(va.paths[0], { closed: false, anchors: moved });
  const xs = joined.anchors.map(p => p.x / ax + a.x), ys = joined.anchors.map(p => p.y / ay + a.y);
  const x0 = Math.min(a.x, ...xs), y0 = Math.min(a.y, ...ys), x1 = Math.max(a.x + a.width, ...xs), y1 = Math.max(a.y + a.height, ...ys);
  const shift = (q: Point) => ({ x: q.x / ax + a.x - x0, y: q.y / ay + a.y - y0 });
  const anchors = joined.anchors.map(p => ({ ...p, ...shift(p), in: p.in ? shift(p.in) : null, out: p.out ? shift(p.out) : null }));
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  await execute({ type: 'batch', commands: [
    { type: 'update', ids: [a.id], patch: { x: x0, y: y0, width: w, height: h, data: withVector(a, { w, h, paths: [{ closed: false, anchors }, ...va.paths.slice(1)] }) } },
    { type: 'remove', ids: [b.id] },
  ] });
  setSelection([a.id]);
}

const num = (params: Record<string, unknown> | undefined, key: string) => (typeof params?.[key] === 'number' ? params[key] as number : NaN);

export function registerVector(): void {
  registry.add(
    { group: 'Path', id: 'round-corners', label: 'Round Corners...', icon: 'shape', run: p => roundCorners(p), enabled: hasDrawing, params: { radius: { type: 'number', min: 0, description: 'corner radius in pixels' }, style: { type: 'string', enum: STYLES, description: 'round, inverted (inverted round) or chamfer' } }, description: 'Live Corners on every corner point of the selected shapes and paths, as Illustrator does; rectangles, ellipses, lines and freehand strokes become editable paths first. A radius larger than fits is clamped.' },
    { group: 'Path', id: 'square-corners', label: 'Square Corners', icon: 'shape', run: () => eachPath(path => roundAll(path, 0)), enabled: hasPath, description: 'Removes corner rounding from the selected paths.' },
    { group: 'Path', id: 'convert-to-path', label: 'Convert to Path', icon: 'shape', run: () => eachPath(path => path), enabled: hasDrawing, description: 'Turns rectangles, ellipses, lines and freehand strokes into editable anchor paths.' },
    { group: 'Path', id: 'add-anchor-points', label: 'Add Anchor Points', icon: 'plus', run: () => eachPath(path => { let out = path; const count = path.closed ? path.anchors.length : path.anchors.length - 1; for (let i = count - 1; i >= 0; i--) out = addAnchor(out, i); return out; }), enabled: hasDrawing, description: 'Adds an anchor halfway along every segment without changing the shape.' },
    { group: 'Path', id: 'simplify-path', label: 'Simplify Path', icon: 'stroke', run: p => eachPath((path, item) => (path.anchors.some(a => a.in || a.out) ? path : { closed: path.closed, anchors: simplifyPoints(path.anchors, Number.isFinite(num(p, 'tolerance')) ? num(p, 'tolerance') : Math.max(1, Math.min(item.width, item.height) / 60)) })), enabled: hasDrawing, params: { tolerance: { type: 'number', min: 0, description: 'how far, in pixels, the simpler path may move' } }, description: 'Fewer anchor points on straight-segment paths, within a tolerance.' },
    { group: 'Path', id: 'smooth-path', label: 'Smooth Path', icon: 'stroke', run: () => eachPath(path => smoothPath(path)), enabled: hasDrawing, description: 'Makes every anchor a smooth point, as the Smooth tool does for a whole path.' },
    { group: 'Path', id: 'reverse-path', label: 'Reverse Path Direction', icon: 'sync', run: () => eachPath(path => reversePath(path)), enabled: hasDrawing, description: 'Reverses the order of the anchors; arrowheads and dash starts swap ends.' },
    { group: 'Path', id: 'join-paths', label: 'Join', icon: 'connect', keys: ['mod+shift+e'], run: () => joinSelected(), enabled: hasDrawing, description: 'Closes one open path, or joins the end of the first selected open path to the start of the second.' },
    { group: 'Insert', id: 'add-polygon', label: 'Add Polygon...', icon: 'shape', run: p => addShape('polygon', p), enabled: () => !!S.state, params: { points: { type: 'integer', min: 3, max: 1000, description: 'number of sides' } }, description: 'Adds a regular polygon as an editable path.' },
    { group: 'Insert', id: 'add-star', label: 'Add Star...', icon: 'shape', run: p => addShape('star', p), enabled: () => !!S.state, params: { points: { type: 'integer', min: 3, max: 1000, description: 'number of points' }, inner: { type: 'number', min: 0.05, max: 1, description: 'inner radius as a share of the outer, default 0.5' } }, description: 'Adds a star as an editable path.' },
    { group: 'Insert', id: 'add-arc', label: 'Add Arc', icon: 'stroke', run: p => addArc(p), enabled: () => !!S.state, params: { width: { type: 'number', min: 1, max: 20000, description: 'length along x, default 200' }, height: { type: 'number', min: 1, max: 20000, description: 'length along y, default 200' }, slope: { type: 'number', min: -100, max: 100, description: '-100 concave to 100 convex, default 50 (a quarter ellipse)' }, closed: { type: 'boolean', description: 'close the arc through its base corner' } }, description: 'Adds an arc as Illustrator\'s Arc tool does: a quarter curve with a chosen length, slope and open or closed type.' },
    { group: 'Insert', id: 'add-spiral', label: 'Add Spiral', icon: 'sync', run: p => addSpiral(p), enabled: () => !!S.state, params: { radius: { type: 'number', min: 1, max: 10000, description: 'outer radius, default 100' }, decay: { type: 'number', min: 5, max: 150, description: 'each quarter turn as a percent of the last, default 80' }, segments: { type: 'integer', min: 1, max: 1000, description: 'quarter turns, default 10' }, counterclockwise: { type: 'boolean' } }, description: 'Adds a spiral as Illustrator\'s Spiral tool does, with radius, decay, segments and direction.' },
    { group: 'Insert', id: 'add-rect-grid', label: 'Add Rectangular Grid', icon: 'grid', run: p => addRectGrid(p), enabled: () => !!S.state, params: { width: { type: 'number', min: 1, max: 20000 }, height: { type: 'number', min: 1, max: 20000 }, rows: { type: 'integer', min: 0, max: 499, description: 'horizontal dividers, default 5' }, columns: { type: 'integer', min: 0, max: 499, description: 'vertical dividers, default 5' }, frame: { type: 'boolean', description: 'include the outer frame, default true' } }, description: 'Adds a rectangular grid as Illustrator\'s Rectangular Grid tool does: a frame with evenly spaced horizontal and vertical dividers, each an editable path.' },
    { group: 'Insert', id: 'add-polar-grid', label: 'Add Polar Grid', icon: 'grid', run: p => addPolarGrid(p), enabled: () => !!S.state, params: { width: { type: 'number', min: 1, max: 20000 }, height: { type: 'number', min: 1, max: 20000 }, rings: { type: 'integer', min: 0, max: 498, description: 'concentric dividers inside the outer ellipse, default 5' }, spokes: { type: 'integer', min: 0, max: 499, description: 'radial dividers, default 5' } }, description: 'Adds a polar grid as Illustrator\'s Polar Grid tool does: concentric ellipses and radial dividers, each an editable path.' },
    { group: 'Path', id: 'gradient-fill', label: 'Gradient Fill', icon: 'palette', palette: false, run: p => setData({ gradient: p?.type === 'none' ? null : readGradient({ angle: 0, ...p }) }), enabled: hasDrawing, params: { type: { type: 'string', enum: ['linear', 'radial', 'none'], required: true }, from: { type: 'string', description: 'start colour as #RRGGBB' }, to: { type: 'string', description: 'end colour as #RRGGBB' }, angle: { type: 'number', min: -360, max: 360, description: 'linear gradient angle in degrees, 0 runs left to right' }, stops: { type: 'array', description: '2 to 16 stops as {offset: 0-100, color: "#RRGGBB", opacity?: 0-100}; when given they replace from and to' } }, description: 'Fills the selected shapes and paths with a linear or radial gradient between two colours or through several stops with their own opacity, or removes it with type none.' },
    { group: 'Path', id: 'stroke-options', label: 'Set Stroke Options', icon: 'stroke', palette: false, run: p => setData(strokePatch(p || {})), enabled: hasDrawing, params: { cap: { type: 'string', enum: CAPS }, join: { type: 'string', enum: JOINS }, miter: { type: 'number', min: 1, max: 500 }, dash: { type: 'array', description: 'dash and gap lengths, for example [8, 4]; [] for a solid line' }, arrow_start: { type: 'string', enum: ARROWHEADS }, arrow_end: { type: 'string', enum: ARROWHEADS }, arrow_scale: { type: 'number', min: 10, max: 1000, description: 'arrowhead size in percent' } }, description: 'Illustrator Stroke panel options for the selected shapes and paths, arrowheads on open paths, lines and freehand strokes included.' },
  );
  bindInspector();
  inspectorHooks.drawing = showStroke;
}

function strokePatch(p: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (CAPS.includes(p.cap as never)) out.cap = p.cap;
  if (JOINS.includes(p.join as never)) out.join = p.join;
  if (typeof p.miter === 'number' && p.miter >= 1 && p.miter <= 500) out.miter = p.miter;
  if (Array.isArray(p.dash)) out.dash = (p.dash as unknown[]).map(Number).filter(n => Number.isFinite(n) && n >= 0).slice(0, 6);
  if (ARROWHEADS.includes(p.arrow_start as Arrowhead)) out.arrow_start = p.arrow_start;
  if (ARROWHEADS.includes(p.arrow_end as Arrowhead)) out.arrow_end = p.arrow_end;
  if (typeof p.arrow_scale === 'number' && p.arrow_scale >= 10 && p.arrow_scale <= 1000) out.arrow_scale = p.arrow_scale;
  return out;
}

function bindInspector() {
  const on = (id: string, event: string, fn: (e: Event) => unknown) => document.getElementById(id)?.addEventListener(event, e => { void Promise.resolve().then(() => fn(e)).catch(error); });
  on('stroke-cap', 'change', () => setData({ cap: $<HTMLSelectElement>('stroke-cap').value }));
  on('stroke-join', 'change', () => setData({ join: $<HTMLSelectElement>('stroke-join').value }));
  on('stroke-miter', 'change', () => { const v = Number($<HTMLInputElement>('stroke-miter').value); if (v >= 1 && v <= 500) return setData({ miter: v }); toast('Miter limit is from 1 to 500.'); });
  on('stroke-dash', 'change', () => setData({ dash: parseDash($<HTMLInputElement>('stroke-dash').value) }));
  const gradient = (event?: Event) => {
    const type = $<HTMLSelectElement>('gradient-type').value;
    const text = $<HTMLInputElement>('gradient-stops').value.trim();
    const edited = (event?.target as HTMLElement | undefined)?.id;
    const stops = text && edited !== 'gradient-from' && edited !== 'gradient-to' ? parseStops(text) : null;
    if (text && !stops && edited === 'gradient-stops') { toast('Write each stop as a colour, a position from 0 to 100 and an optional opacity, separated by commas: #ff0000 0, #0000ff 100.'); return; }
    return setData({ gradient: type === 'none' ? null : { type, from: $<HTMLInputElement>('gradient-from').value, to: $<HTMLInputElement>('gradient-to').value, angle: Number($<HTMLInputElement>('gradient-angle').value) || 0, ...(stops ? { stops } : {}) } });
  };
  for (const id of ['gradient-type', 'gradient-from', 'gradient-to', 'gradient-angle', 'gradient-stops']) on(id, 'change', gradient);
  on('arrow-start', 'change', () => setData({ arrow_start: $<HTMLSelectElement>('arrow-start').value }));
  on('arrow-end', 'change', () => setData({ arrow_end: $<HTMLSelectElement>('arrow-end').value }));
  on('arrow-scale', 'change', () => { const v = Number($<HTMLInputElement>('arrow-scale').value); if (v >= 10 && v <= 1000) return setData({ arrow_scale: v }); toast('Arrowhead scale is from 10 to 1000 percent.'); });
  on('corner-apply', 'click', () => roundCorners({ radius: Number($<HTMLInputElement>('corner-radius').value), style: $<HTMLSelectElement>('corner-style').value }));
}

/** Inspector values for the first selected drawing; called from the inspector refresh. */
export function showStroke(item: Item) {
  const set = (id: string, value: string) => { const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null; if (el && document.activeElement !== el && el.value !== value) el.value = value; };
  const freehand = item.kind === 'stroke' && !item.data.vector;
  set('stroke-cap', CAPS.includes(item.data.cap as never) ? String(item.data.cap) : freehand ? 'round' : 'butt');
  set('stroke-join', JOINS.includes(item.data.join as never) ? String(item.data.join) : freehand ? 'round' : 'miter');
  set('stroke-miter', String(item.data.miter ?? 10));
  set('stroke-dash', Array.isArray(item.data.dash) ? (item.data.dash as number[]).join(' ') : '');
  set('arrow-start', ARROWHEADS.includes(item.data.arrow_start as Arrowhead) ? String(item.data.arrow_start) : 'none');
  set('arrow-end', ARROWHEADS.includes(item.data.arrow_end as Arrowhead) ? String(item.data.arrow_end) : 'none');
  set('arrow-scale', String(item.data.arrow_scale ?? 100));
  const g = readGradient(item.data.gradient);
  set('gradient-type', g ? g.type : 'none');
  if (g) { set('gradient-from', g.from.slice(0, 7)); set('gradient-to', g.to.slice(0, 7)); set('gradient-angle', String(g.angle || 0)); }
  set('gradient-stops', g?.stops ? formatStops(g.stops) : '');
  const vector = item.data.vector as Vector | undefined;
  const first = vector?.paths[0]?.anchors.find(a => (a.radius || 0) > 0);
  if (first) { set('corner-radius', String(first.radius)); set('corner-style', first.style || 'round'); }
  const limit = document.getElementById('corner-limit');
  const max = Math.round(Math.max(0, ...asVector(item).paths.map(maxCornerRadius)) * 10) / 10;
  const text = max ? `Largest radius that fits: ${max} px` : 'No corner points to round.';
  if (limit && limit.textContent !== text) limit.textContent = text;
}
