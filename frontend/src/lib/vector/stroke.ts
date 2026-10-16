export type Cap = 'butt' | 'round' | 'projecting';
export type Join = 'miter' | 'round' | 'bevel';

export const CAPS: Cap[] = ['butt', 'round', 'projecting'];
export const JOINS: Join[] = ['miter', 'round', 'bevel'];

/** Illustrator's Stroke panel on an SVG element: cap, corner (join), miter limit 1 to 500, dashes as dash and gap pairs. */
export function strokeStyle(el: SVGElement, data: Record<string, unknown>): void {
  const cap = CAPS.includes(data.cap as Cap) ? (data.cap as Cap) : null;
  const join = JOINS.includes(data.join as Join) ? (data.join as Join) : null;
  if (cap) el.setAttribute('stroke-linecap', cap === 'projecting' ? 'square' : cap); else el.removeAttribute('stroke-linecap');
  if (join) el.setAttribute('stroke-linejoin', join); else el.removeAttribute('stroke-linejoin');
  const miter = Number(data.miter);
  if (Number.isFinite(miter) && miter >= 1 && miter <= 500) el.setAttribute('stroke-miterlimit', String(miter)); else el.removeAttribute('stroke-miterlimit');
  const dash = Array.isArray(data.dash) ? (data.dash as unknown[]).map(Number).filter(n => Number.isFinite(n) && n >= 0).slice(0, 6) : [];
  if (dash.some(n => n > 0)) el.setAttribute('stroke-dasharray', dash.join(' ')); else el.removeAttribute('stroke-dasharray');
}

export function parseDash(text: string): number[] {
  return text.split(/[\s,]+/).map(Number).filter(n => Number.isFinite(n) && n >= 0).slice(0, 6);
}
