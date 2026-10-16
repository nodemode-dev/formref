import type { Item, Point } from './types';
export function sourceCrop(item: Item, width = 0, height = 0) {
  const crop = (item.data.crop || { x: 0, y: 0, width: 1, height: 1 }) as { x: number; y: number; width: number; height: number };
  width ||= Number(item.data.natural_width || 0); height ||= Number(item.data.natural_height || 0);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return crop;
  const left = Math.max(0, Math.min(width - 1, Math.floor(crop.x * width))), top = Math.max(0, Math.min(height - 1, Math.floor(crop.y * height)));
  const right = Math.max(left + 1, Math.min(width, Math.ceil((crop.x + crop.width) * width))), bottom = Math.max(top + 1, Math.min(height, Math.ceil((crop.y + crop.height) * height)));
  return { x: left / width, y: top / height, width: (right - left) / width, height: (bottom - top) / height };
}
/** Lasso crop as a CSS polygon on the whole-picture image element: the mask is in source-normalized coordinates, which are the element's own, and clip-path follows its flips. */
export function maskPath(item: Item): string {
  const mask = item.data.mask;
  if (!Array.isArray(mask) || mask.length < 3) return '';
  return `polygon(${(mask as [number, number][]).map(([u, v]) => `${(u * 100).toFixed(3)}% ${(v * 100).toFixed(3)}%`).join(',')})`;
}
export function paintImage(image: HTMLImageElement, item: Item, width = image.naturalWidth, height = image.naturalHeight, grayscale = false) {
  const clip = maskPath(item); if ((image.dataset.mask || '') !== clip) { image.dataset.mask = clip; image.style.clipPath = clip; }
  const crop = sourceCrop(item, width, height);
  image.style.width = `${100 / crop.width}%`; image.style.height = `${100 / crop.height}%`; image.style.left = `${-crop.x / crop.width * 100}%`; image.style.top = `${-crop.y / crop.height * 100}%`;
  image.style.transformOrigin = `${(crop.x + crop.width / 2) * 100}% ${(crop.y + crop.height / 2) * 100}%`; image.style.transform = `scale(${item.data.flip_x ? -1 : 1},${item.data.flip_y ? -1 : 1})`;
  const levels = valueLevels(item);
  image.style.filter = levels ? `url(#formref-values-${levels})` : grayscale || item.data.grayscale ? 'grayscale(1)' : 'none'; image.style.imageRendering = item.data.sampling === 'nearest' ? 'pixelated' : 'auto';
}

/** Value study: the picture as 2 to 8 flat grey values (notan at 2), a view aid that leaves the picture and its exports unchanged. */
export function valueLevels(item: Item): number {
  const levels = Number(item.data.value_levels) || 0;
  return levels >= 2 && levels <= 8 ? Math.round(levels) : 0;
}

/** Drawing grid: equal divisions over the visible picture for copying proportions; lines invert what is under them so they show on any picture. */
export function studyGridDivisions(item: Item): number {
  const divisions = Number((item.data.study_grid as { divisions?: number } | undefined)?.divisions) || 0;
  return divisions >= 2 && divisions <= 24 ? Math.round(divisions) : 0;
}

export function paintStudyGrid(node: HTMLElement, item: Item) {
  const divisions = studyGridDivisions(item);
  if (node.hidden !== !divisions) node.hidden = !divisions;
  if (!divisions) return;
  const size = `${100 / divisions}% ${100 / divisions}%`;
  if (node.style.backgroundSize !== size) node.style.backgroundSize = size;
}
export function imageCoordinates(item: Item, point: Point, root: HTMLElement): { u: number; v: number } | null {
  const box = root.querySelector<HTMLElement>('.image-content'); if (!box) return null;
  const width = Number.parseFloat(getComputedStyle(root).width), height = Number.parseFloat(getComputedStyle(root).height), paintedWidth = Number.parseFloat(getComputedStyle(box).width), paintedHeight = Number.parseFloat(getComputedStyle(box).height);
  const angle = item.rotation * Math.PI / 180, dx = point.x - item.x - width / 2, dy = point.y - item.y - height / 2;
  const u = (dx * Math.cos(angle) + dy * Math.sin(angle) + width / 2 - box.offsetLeft) / paintedWidth, v = (-dx * Math.sin(angle) + dy * Math.cos(angle) + height / 2 - box.offsetTop) / paintedHeight;
  if (!Number.isFinite(u) || !Number.isFinite(v) || u < -1e-9 || v < -1e-9 || u > 1 + 1e-9 || v > 1 + 1e-9) return null;
  return { u: Math.max(0, Math.min(1, u)), v: Math.max(0, Math.min(1, v)) };
}
