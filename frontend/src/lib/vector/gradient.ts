export interface Gradient { type: 'linear' | 'radial'; from: string; to: string; angle?: number }

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

export function readGradient(value: unknown): Gradient | null {
  if (!value || typeof value !== 'object') return null;
  const g = value as Record<string, unknown>;
  if ((g.type !== 'linear' && g.type !== 'radial') || !HEX.test(String(g.from)) || !HEX.test(String(g.to))) return null;
  const angle = Number(g.angle);
  return { type: g.type, from: String(g.from), to: String(g.to), angle: Number.isFinite(angle) ? angle : 0 };
}

/** Points the item's two gradient elements at the gradient, in the shape's bounding box, and returns the fill to use; null when there is none. */
export function paintGradient(linear: SVGLinearGradientElement, radial: SVGRadialGradientElement, id: string, value: unknown): string | null {
  const g = readGradient(value);
  for (const el of [linear, radial]) el.removeAttribute('id');
  if (!g) return null;
  const el = g.type === 'linear' ? linear : radial;
  el.setAttribute('id', id);
  const stops = el.querySelectorAll('stop');
  stops[0].setAttribute('stop-color', g.from);
  stops[1].setAttribute('stop-color', g.to);
  if (g.type === 'linear') {
    const a = ((g.angle || 0) * Math.PI) / 180, dx = Math.cos(a) / 2, dy = Math.sin(a) / 2;
    el.setAttribute('x1', String(0.5 - dx)); el.setAttribute('y1', String(0.5 + dy));
    el.setAttribute('x2', String(0.5 + dx)); el.setAttribute('y2', String(0.5 - dy));
  }
  return `url(#${id})`;
}
