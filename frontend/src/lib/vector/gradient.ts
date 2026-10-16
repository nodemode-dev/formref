export interface Stop { offset: number; color: string; opacity?: number }
export interface Gradient { type: 'linear' | 'radial'; from: string; to: string; angle?: number; stops?: Stop[] }

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

/** Gradient stops as Illustrator's slider has them: 2 to 16, offsets 0 to 100 percent in order, optional opacity 0 to 100. */
export function readStops(value: unknown): Stop[] | null {
  if (!Array.isArray(value)) return null;
  const stops = value.map(s => s as Record<string, unknown>).map(s => ({ offset: Number(s.offset), color: String(s.color), opacity: s.opacity === undefined ? undefined : Number(s.opacity) }));
  if (stops.length < 2 || stops.length > 16 || stops.some(s => !HEX.test(s.color) || !(s.offset >= 0 && s.offset <= 100) || (s.opacity !== undefined && !(s.opacity >= 0 && s.opacity <= 100)))) return null;
  return stops.sort((a, b) => a.offset - b.offset).map(s => s.opacity === undefined ? { offset: s.offset, color: s.color } : s);
}

/** "#ff0000 0, #00ff00 50 80, #0000ff 100": colour, position percent, optional opacity percent per stop. */
export function parseStops(text: string): Stop[] | null {
  const parts = text.split(',').map(p => p.trim().split(/\s+/)).filter(p => p[0]);
  return readStops(parts.map((p, i) => ({ color: p[0], offset: p[1] === undefined ? (i / Math.max(1, parts.length - 1)) * 100 : Number(p[1]), opacity: p[2] === undefined ? undefined : Number(p[2]) })));
}

export function formatStops(stops: Stop[]): string {
  return stops.map(s => `${s.color} ${Math.round(s.offset * 10) / 10}${s.opacity === undefined ? '' : ` ${s.opacity}`}`).join(', ');
}

export function readGradient(value: unknown): Gradient | null {
  if (!value || typeof value !== 'object') return null;
  const g = value as Record<string, unknown>;
  const stops = readStops(g.stops);
  const from = stops ? stops[0].color : String(g.from), to = stops ? stops[stops.length - 1].color : String(g.to);
  if ((g.type !== 'linear' && g.type !== 'radial') || !HEX.test(from) || !HEX.test(to)) return null;
  const angle = Number(g.angle);
  return { type: g.type, from, to, angle: Number.isFinite(angle) ? angle : 0, ...(stops && stops.length > 2 || stops?.some(s => s.opacity !== undefined || (s.offset !== 0 && s.offset !== 100)) ? { stops } : {}) };
}

/** Points the item's two gradient elements at the gradient, in the shape's bounding box, and returns the fill to use; null when there is none. */
export function paintGradient(linear: SVGLinearGradientElement, radial: SVGRadialGradientElement, id: string, value: unknown): string | null {
  const g = readGradient(value);
  for (const el of [linear, radial]) el.removeAttribute('id');
  if (!g) return null;
  const el = g.type === 'linear' ? linear : radial;
  el.setAttribute('id', id);
  const wanted = g.stops || [{ offset: 0, color: g.from }, { offset: 100, color: g.to }];
  while (el.childElementCount < wanted.length) el.append(document.createElementNS('http://www.w3.org/2000/svg', 'stop'));
  while (el.childElementCount > wanted.length) el.lastElementChild!.remove();
  const stops = el.querySelectorAll('stop');
  wanted.forEach((s, i) => {
    stops[i].setAttribute('offset', String(s.offset / 100));
    stops[i].setAttribute('stop-color', s.color);
    if (s.opacity === undefined) stops[i].removeAttribute('stop-opacity'); else stops[i].setAttribute('stop-opacity', String(s.opacity / 100));
  });
  if (g.type === 'linear') {
    const a = ((g.angle || 0) * Math.PI) / 180, dx = Math.cos(a) / 2, dy = Math.sin(a) / 2;
    el.setAttribute('x1', String(0.5 - dx)); el.setAttribute('y1', String(0.5 + dy));
    el.setAttribute('x2', String(0.5 + dx)); el.setAttribute('y2', String(0.5 - dy));
  }
  return `url(#${id})`;
}
