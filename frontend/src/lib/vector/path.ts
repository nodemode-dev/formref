export interface Pt { x: number; y: number }
export type CornerStyle = 'round' | 'inverted' | 'chamfer';
export interface Anchor { x: number; y: number; in?: Pt | null; out?: Pt | null; radius?: number; style?: CornerStyle }
export interface VPath { closed: boolean; anchors: Anchor[] }
export interface Vector { w: number; h: number; paths: VPath[] }

type Cubic = [Pt, Pt, Pt, Pt];

const KAPPA = 0.5522847498;
const EPS = 1e-6;

const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y;
const len = (a: Pt) => Math.hypot(a.x, a.y);
const unit = (a: Pt): Pt => { const l = len(a); return l < EPS ? { x: 0, y: 0 } : mul(a, 1 / l); };
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const pt = (a: Pt): Pt => ({ x: a.x, y: a.y });

export function isCorner(a: Anchor): boolean {
  return !a.in && !a.out;
}

function segment(path: VPath, i: number): Cubic {
  const a = path.anchors[i], b = path.anchors[(i + 1) % path.anchors.length];
  return [pt(a), pt(a.out || a), pt(b.in || b), pt(b)];
}

function segmentCount(path: VPath): number {
  const n = path.anchors.length;
  return n < 2 ? 0 : path.closed ? n : n - 1;
}

function at(c: Cubic, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * c[0].x + 3 * u * u * t * c[1].x + 3 * u * t * t * c[2].x + t * t * t * c[3].x,
    y: u * u * u * c[0].y + 3 * u * u * t * c[1].y + 3 * u * t * t * c[2].y + t * t * t * c[3].y,
  };
}

function split(c: Cubic, t: number): [Cubic, Cubic] {
  const p01 = lerp(c[0], c[1], t), p12 = lerp(c[1], c[2], t), p23 = lerp(c[2], c[3], t);
  const p012 = lerp(p01, p12, t), p123 = lerp(p12, p23, t), mid = lerp(p012, p123, t);
  return [[c[0], p01, p012, mid], [mid, p123, p23, c[3]]];
}

function arcLength(c: Cubic, t1 = 1): number {
  let total = 0, prev = c[0];
  for (let i = 1; i <= 32; i++) { const p = at(c, (i / 32) * t1); total += len(sub(p, prev)); prev = p; }
  return total;
}

function tAtLength(c: Cubic, d: number): number {
  const full = arcLength(c);
  if (full < EPS) return 0;
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (arcLength(c, mid) < d) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

function trim(c: Cubic, start: number, end: number): Cubic {
  let out = c;
  if (start > EPS) out = split(out, tAtLength(out, start))[1];
  if (end > EPS) { const l = arcLength(out); out = split(out, tAtLength(out, Math.max(0, l - end)))[0]; }
  return out;
}

function tangentIn(c: Cubic): Pt {
  const d = sub(c[3], len(sub(c[3], c[2])) > EPS ? c[2] : len(sub(c[3], c[1])) > EPS ? c[1] : c[0]);
  return unit(d);
}

function tangentOut(c: Cubic): Pt {
  const d = sub(len(sub(c[1], c[0])) > EPS ? c[1] : len(sub(c[2], c[0])) > EPS ? c[2] : c[3], c[0]);
  return unit(d);
}

interface CornerPlan { trim: number; style: CornerStyle; radius: number; max: number }

/** For each corner anchor: how far to trim each neighbouring segment, and the largest radius that fits (Illustrator's red limit). */
export function cornerPlan(path: VPath): (CornerPlan | null)[] {
  const n = path.anchors.length;
  const segs = Array.from({ length: segmentCount(path) }, (_, i) => segment(path, i));
  const lengths = segs.map(s => arcLength(s));
  return path.anchors.map((a, i) => {
    const hasIn = path.closed ? n > 2 : i > 0, hasOut = path.closed ? n > 2 : i < n - 1;
    if (!hasIn || !hasOut || !isCorner(a)) return null;
    const inSeg = segs[(i - 1 + n) % n], outSeg = segs[i % segs.length];
    const tIn = tangentIn(inSeg), tOut = tangentOut(outSeg);
    const cos = Math.max(-1, Math.min(1, dot(mul(tIn, -1), tOut)));
    const theta = Math.acos(cos);
    if (theta < 0.01 || Math.PI - theta < 0.01) return null;
    const room = Math.min(lengths[(i - 1 + n) % n], lengths[i % segs.length]) / 2;
    const max = room * Math.tan(theta / 2);
    const radius = Math.min(Math.max(0, a.radius || 0), max);
    const style = a.style || 'round';
    const trimBy = radius / Math.tan(theta / 2);
    return radius > EPS ? { trim: trimBy, style, radius, max } : { trim: 0, style, radius: 0, max };
  });
}

function fmt(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}

function c(cmd: Cubic): string {
  return `C${fmt(cmd[1].x)},${fmt(cmd[1].y)} ${fmt(cmd[2].x)},${fmt(cmd[2].y)} ${fmt(cmd[3].x)},${fmt(cmd[3].y)}`;
}

function connector(v: Pt, a: Pt, b: Pt, tIn: Pt, tOut: Pt, plan: CornerPlan): string {
  if (plan.style === 'chamfer') return `L${fmt(b.x)},${fmt(b.y)}`;
  if (plan.style === 'round') {
    const turn = Math.acos(Math.max(-1, Math.min(1, dot(tIn, tOut))));
    const k = (4 / 3) * Math.tan(turn / 4) * plan.radius;
    return c([a, add(a, mul(tIn, k)), sub(b, mul(tOut, k)), b]);
  }
  const d = plan.trim;
  const u = unit(sub(a, v)), w = unit(sub(b, v));
  const sweep = Math.acos(Math.max(-1, Math.min(1, dot(u, w))));
  const k = (4 / 3) * Math.tan(sweep / 4) * d;
  const ta = unit(sub(w, mul(u, dot(u, w))));
  const tb = unit(sub(u, mul(w, dot(u, w))));
  return c([a, add(a, mul(ta, k)), add(b, mul(tb, k)), b]);
}

/** SVG path data for one path, with live corners applied. */
export function pathData(path: VPath): string {
  const count = segmentCount(path);
  if (!count) return path.anchors.length ? `M${fmt(path.anchors[0].x)},${fmt(path.anchors[0].y)}` : '';
  const n = path.anchors.length;
  const plans = cornerPlan(path);
  const segs = Array.from({ length: count }, (_, i) => {
    const raw = segment(path, i);
    const start = plans[i]?.trim || 0, end = plans[(i + 1) % n]?.trim || 0;
    return { raw, cut: trim(raw, start, end) };
  });
  const parts = [`M${fmt(segs[0].cut[0].x)},${fmt(segs[0].cut[0].y)}`];
  for (let i = 0; i < count; i++) {
    parts.push(c(segs[i].cut));
    const corner = (i + 1) % n;
    const plan = plans[corner];
    const next = segs[(i + 1) % count];
    if (plan && plan.trim > EPS && (path.closed || i + 1 < count)) {
      parts.push(connector(path.anchors[corner], segs[i].cut[3], next.cut[0], tangentIn(segs[i].raw), tangentOut(next.raw), plan));
    }
  }
  if (path.closed) parts.push('Z');
  return parts.join(' ');
}

export function vectorData(vector: Vector): string {
  return vector.paths.map(pathData).join(' ');
}

export function rectPath(w: number, h: number): VPath {
  return { closed: true, anchors: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }] };
}

export function ellipsePath(w: number, h: number): VPath {
  const rx = w / 2, ry = h / 2, kx = rx * KAPPA, ky = ry * KAPPA;
  return {
    closed: true,
    anchors: [
      { x: rx, y: 0, in: { x: rx - kx, y: 0 }, out: { x: rx + kx, y: 0 } },
      { x: w, y: ry, in: { x: w, y: ry - ky }, out: { x: w, y: ry + ky } },
      { x: rx, y: h, in: { x: rx + kx, y: h }, out: { x: rx - kx, y: h } },
      { x: 0, y: ry, in: { x: 0, y: ry + ky }, out: { x: 0, y: ry - ky } },
    ],
  };
}

export function polygonPath(w: number, h: number, sides: number): VPath {
  const n = Math.max(3, Math.min(1000, Math.round(sides)));
  return { closed: true, anchors: Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return { x: w / 2 + (w / 2) * Math.cos(a), y: h / 2 + (h / 2) * Math.sin(a) }; }) };
}

export function starPath(w: number, h: number, points: number, inner = 0.5): VPath {
  const n = Math.max(3, Math.min(1000, Math.round(points)));
  return {
    closed: true,
    anchors: Array.from({ length: n * 2 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / n, r = i % 2 ? inner : 1;
      return { x: w / 2 + (w / 2) * r * Math.cos(a), y: h / 2 + (h / 2) * r * Math.sin(a) };
    }),
  };
}

/** Illustrator's Arc tool: a quarter curve from the bottom-left to the top-right of a w by h box; slope -100 (concave) to 100 (convex), 50 a quarter ellipse; closed adds the corner point at the base. */
export function arcPath(w: number, h: number, slope = 50, closed = false): VPath {
  const k = KAPPA * Math.max(-100, Math.min(100, slope)) / 50;
  const convex = k >= 0, m = Math.abs(k);
  const start = { x: 0, y: h }, end = { x: w, y: 0 };
  const anchors: Anchor[] = convex
    ? [{ ...start, out: { x: 0, y: h - m * h } }, { ...end, in: { x: w - m * w, y: 0 } }]
    : [{ ...start, out: { x: m * w, y: h } }, { ...end, in: { x: w, y: m * h } }];
  if (closed) anchors.push({ x: convex ? w : 0, y: convex ? h : 0 });
  return { closed, anchors };
}

/** Illustrator's Spiral tool: `segments` quarter turns from the outer radius inward, each `decay` percent of the last, clockwise unless `counter`; fitted to a w by h box. */
export function spiralPath(w: number, h: number, segments = 10, decay = 80, counter = false): VPath {
  const n = Math.max(1, Math.min(1000, Math.round(segments))), f = Math.max(5, Math.min(150, decay)) / 100, dir = counter ? -1 : 1;
  const raw: Anchor[] = [];
  for (let i = 0; i <= n; i++) {
    const a = dir * i * Math.PI / 2, r = Math.pow(f, i);
    const p = { x: Math.cos(a) * r, y: Math.sin(a) * r }, t = { x: -Math.sin(a) * dir, y: Math.cos(a) * dir };
    const lenIn = i > 0 ? KAPPA * Math.pow(f, i) : 0, lenOut = i < n ? KAPPA * Math.pow(f, i) : 0;
    raw.push({ ...p, in: i > 0 ? { x: p.x - t.x * lenIn, y: p.y - t.y * lenIn } : null, out: i < n ? { x: p.x + t.x * lenOut, y: p.y + t.y * lenOut } : null });
  }
  const pts = raw.flatMap(a => [a, a.in, a.out].filter(Boolean) as Pt[]);
  const x0 = Math.min(...pts.map(p => p.x)), y0 = Math.min(...pts.map(p => p.y));
  const sx = w / Math.max(1e-9, Math.max(...pts.map(p => p.x)) - x0), sy = h / Math.max(1e-9, Math.max(...pts.map(p => p.y)) - y0);
  const fit = (p: Pt) => ({ x: (p.x - x0) * sx, y: (p.y - y0) * sy });
  return { closed: false, anchors: raw.map(a => ({ ...fit(a), in: a.in ? fit(a.in) : null, out: a.out ? fit(a.out) : null })) };
}

/** Illustrator's Rectangular Grid tool: the frame plus `rows` horizontal and `columns` vertical dividers, evenly spaced, as separate paths. */
export function rectGridPaths(w: number, h: number, rows = 5, columns = 5, frame = true): VPath[] {
  const paths: VPath[] = frame ? [rectPath(w, h)] : [];
  for (let i = 1; i <= rows; i++) { const y = (h * i) / (rows + 1); paths.push({ closed: false, anchors: [{ x: 0, y }, { x: w, y }] }); }
  for (let i = 1; i <= columns; i++) { const x = (w * i) / (columns + 1); paths.push({ closed: false, anchors: [{ x, y: 0 }, { x, y: h }] }); }
  return paths;
}

/** Illustrator's Polar Grid tool: the outer ellipse, `rings` concentric ellipses inside it and `spokes` radial dividers from the centre. */
export function polarGridPaths(w: number, h: number, rings = 5, spokes = 5): VPath[] {
  const paths: VPath[] = [];
  for (let i = rings + 1; i >= 1; i--) {
    const s = i / (rings + 1), e = ellipsePath(w * s, h * s), dx = (w - w * s) / 2, dy = (h - h * s) / 2;
    const move = (p: Pt) => ({ x: p.x + dx, y: p.y + dy });
    paths.push({ closed: true, anchors: e.anchors.map(a => ({ ...move(a), in: a.in ? move(a.in) : null, out: a.out ? move(a.out) : null })) });
  }
  for (let i = 0; i < spokes; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / spokes;
    paths.push({ closed: false, anchors: [{ x: w / 2, y: h / 2 }, { x: w / 2 + (w / 2) * Math.cos(a), y: h / 2 + (h / 2) * Math.sin(a) }] });
  }
  return paths;
}

export function polylinePath(points: Pt[], closed = false): VPath {
  return { closed, anchors: points.map(p => ({ x: p.x, y: p.y })) };
}

/** Ramer-Douglas-Peucker: fewer anchors within tolerance, as Illustrator's Simplify does for straight runs. */
export function simplifyPoints(points: Pt[], tolerance: number): Pt[] {
  if (points.length < 3) return points.map(pt);
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    const a = points[s], b = points[e], ab = sub(b, a), l = len(ab);
    let worst = -1, index = -1;
    for (let i = s + 1; i < e; i++) {
      const p = points[i];
      const d = l < EPS ? len(sub(p, a)) : Math.abs(ab.x * (a.y - p.y) - ab.y * (a.x - p.x)) / l;
      if (d > worst) { worst = d; index = i; }
    }
    if (worst > tolerance && index > 0) { keep[index] = 1; stack.push([s, index], [index, e]); }
  }
  return points.filter((_, i) => keep[i]).map(pt);
}

/** Smooth: every interior anchor becomes a smooth point with Catmull-Rom handles. */
export function smoothPath(path: VPath, tension = 1): VPath {
  const n = path.anchors.length;
  return {
    closed: path.closed,
    anchors: path.anchors.map((a, i) => {
      const prev = path.anchors[path.closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
      const next = path.anchors[path.closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      if (!path.closed && (i === 0 || i === n - 1)) return { x: a.x, y: a.y };
      const d = mul(sub(next, prev), tension / 6);
      return { x: a.x, y: a.y, in: sub(a, d), out: add(a, d) };
    }),
  };
}

export function roundAll(path: VPath, radius: number, style: CornerStyle = 'round'): VPath {
  return { closed: path.closed, anchors: path.anchors.map(a => (isCorner(a) ? { ...a, radius, style } : { ...a })) };
}

export function setCorner(path: VPath, index: number, radius: number, style: CornerStyle): VPath {
  return { closed: path.closed, anchors: path.anchors.map((a, i) => (i === index ? { ...a, in: null, out: null, radius, style } : a)) };
}

/** Add Anchor Point: split segment i at t, keeping the curve's shape. */
export function addAnchor(path: VPath, i: number, t = 0.5): VPath {
  const n = path.anchors.length;
  const [left, right] = split(segment(path, i), t);
  const anchors = path.anchors.map(a => ({ ...a }));
  const a = anchors[i], b = anchors[(i + 1) % n];
  const curved = !!(a.out || b.in);
  if (curved) { a.out = left[1]; b.in = right[2]; }
  const mid: Anchor = curved ? { x: left[3].x, y: left[3].y, in: left[2], out: right[1] } : { x: left[3].x, y: left[3].y };
  anchors.splice(i + 1, 0, mid);
  return { closed: path.closed, anchors };
}

export function deleteAnchor(path: VPath, index: number): VPath {
  return { closed: path.closed && path.anchors.length > 3, anchors: path.anchors.filter((_, i) => i !== index) };
}

/** Convert Anchor Point: a corner becomes smooth (handles along its neighbours), a smooth point becomes a corner. */
export function convertAnchor(path: VPath, index: number): VPath {
  const n = path.anchors.length;
  return {
    closed: path.closed,
    anchors: path.anchors.map((a, i) => {
      if (i !== index) return a;
      if (!isCorner(a)) return { x: a.x, y: a.y };
      const prev = path.anchors[(i - 1 + n) % n], next = path.anchors[(i + 1) % n];
      const d = mul(sub(next, prev), 1 / 6);
      return { x: a.x, y: a.y, in: sub(a, d), out: add(a, d) };
    }),
  };
}

export function reversePath(path: VPath): VPath {
  return { closed: path.closed, anchors: [...path.anchors].reverse().map(a => ({ ...a, in: a.out ?? null, out: a.in ?? null })) };
}

/** Join: the end of a and the start of b become one path (Ctrl+J); the two meeting ends are joined by a straight segment. */
export function joinPaths(a: VPath, b: VPath): VPath {
  return { closed: false, anchors: [...a.anchors.map(x => ({ ...x })), ...b.anchors.map(x => ({ ...x }))] };
}

export function closePath(path: VPath): VPath {
  return { closed: true, anchors: path.anchors.map(a => ({ ...a })) };
}

/** Scissors: cut a closed path open at an anchor, or an open path in two. */
export function cutAt(path: VPath, index: number): VPath[] {
  if (path.closed) return [{ closed: false, anchors: [...path.anchors.slice(index), ...path.anchors.slice(0, index + 1)].map(a => ({ ...a })) }];
  if (index <= 0 || index >= path.anchors.length - 1) return [path];
  return [{ closed: false, anchors: path.anchors.slice(0, index + 1) }, { closed: false, anchors: path.anchors.slice(index) }];
}

export function bounds(vector: Vector): { x: number; y: number; w: number; h: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const path of vector.paths) for (let i = 0; i < segmentCount(path) || (i === 0 && path.anchors.length === 1); i++) {
    const s = segmentCount(path) ? segment(path, i) : [path.anchors[0], path.anchors[0], path.anchors[0], path.anchors[0]] as Cubic;
    for (let k = 0; k <= 16; k++) { const p = at(s, k / 16); x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  }
  return Number.isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : { x: 0, y: 0, w: 0, h: 0 };
}

function connectorCubic(v: Pt, a: Pt, b: Pt, tIn: Pt, tOut: Pt, plan: CornerPlan): Cubic {
  if (plan.style === 'chamfer') return [a, a, b, b];
  if (plan.style === 'round') {
    const k = (4 / 3) * Math.tan(Math.acos(Math.max(-1, Math.min(1, dot(tIn, tOut)))) / 4) * plan.radius;
    return [a, add(a, mul(tIn, k)), sub(b, mul(tOut, k)), b];
  }
  const u = unit(sub(a, v)), w = unit(sub(b, v));
  const k = (4 / 3) * Math.tan(Math.acos(Math.max(-1, Math.min(1, dot(u, w)))) / 4) * plan.trim;
  return [a, add(a, mul(unit(sub(w, mul(u, dot(u, w)))), k)), add(b, mul(unit(sub(u, mul(w, dot(u, w)))), k)), b];
}

/** The outline as points, live corners included, for Pathfinder and hit testing; curves are sampled about every `step` units. */
export function flatten(path: VPath, step = 2): Pt[] {
  const count = segmentCount(path);
  if (!count) return path.anchors.map(pt);
  const n = path.anchors.length;
  const plans = cornerPlan(path);
  const segs = Array.from({ length: count }, (_, i) => {
    const raw = segment(path, i);
    return { raw, cut: trim(raw, plans[i]?.trim || 0, plans[(i + 1) % n]?.trim || 0) };
  });
  const out: Pt[] = [pt(segs[0].cut[0])];
  const push = (c: Cubic) => {
    const straight = len(sub(c[1], c[0])) < EPS && len(sub(c[2], c[3])) < EPS;
    const steps = straight ? 1 : Math.max(2, Math.min(96, Math.ceil(arcLength(c) / step)));
    for (let k = 1; k <= steps; k++) out.push(at(c, k / steps));
  };
  for (let i = 0; i < count; i++) {
    push(segs[i].cut);
    const corner = (i + 1) % n, plan = plans[corner], next = segs[(i + 1) % count];
    if (plan && plan.trim > EPS && (path.closed || i + 1 < count)) push(connectorCubic(path.anchors[corner], segs[i].cut[3], next.cut[0], tangentIn(segs[i].raw), tangentOut(next.raw), plan));
  }
  return out;
}

export function maxCornerRadius(path: VPath): number {
  return Math.max(0, ...cornerPlan(path).map(p => p?.max || 0));
}
