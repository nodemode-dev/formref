import type { Item } from './types';
export interface Bounds { left: number; top: number; right: number; bottom: number }
export function itemBounds(item: Pick<Item, 'x' | 'y' | 'width' | 'height' | 'rotation'>): Bounds {
  const angle = item.rotation * Math.PI / 180, cosine = Math.abs(Math.cos(angle)), sine = Math.abs(Math.sin(angle));
  const halfWidth = (item.width * cosine + item.height * sine) / 2, halfHeight = (item.width * sine + item.height * cosine) / 2;
  const centerX = item.x + item.width / 2, centerY = item.y + item.height / 2;
  return { left: centerX - halfWidth, top: centerY - halfHeight, right: centerX + halfWidth, bottom: centerY + halfHeight };
}
