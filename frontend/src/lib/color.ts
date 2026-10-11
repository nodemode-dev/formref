export const isColor = (value: string) => /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(value);
export function colorValues(value: string) {
  if (!isColor(value)) return null;
  const rgba = [1, 3, 5].map(offset => Number.parseInt(value.slice(offset, offset + 2), 16)); rgba.push(value.length === 9 ? Number.parseInt(value.slice(7, 9), 16) : 255);
  const [r, g, b] = rgba.slice(0, 3).map(channel => channel / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const hue = delta === 0 ? 0 : ((max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60 + 360) % 360;
  return { rgba, rgb: rgba.slice(0, 3), hsv: [hue, max === 0 ? 0 : delta / max * 100, max * 100], hex: value.toUpperCase() };
}
