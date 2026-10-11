export type Kind = 'image' | 'note' | 'document' | 'swatch' | 'link' | 'board' | 'column' | 'todo' | 'shape' | 'stroke' | 'file';
export interface Point { x: number; y: number }
export interface Item {
  id: string; kind: Kind; x: number; y: number; width: number; height: number;
  rotation: number; z: number; opacity: number; locked: boolean; hidden: boolean;
  group_id: string | null; parent_id: string | null; title: string; text: string;
  color: string; asset_id: string | null; url: string; data: Record<string, unknown>;
}
export interface Connection { id: string; from: string; to: string; label: string; color: string }
export interface Viewport { x: number; y: number; zoom: number }
export interface BoardSettings { grid_visible: boolean; grid_size: number; snap_enabled: boolean; grayscale: boolean }
export interface Board { id: string; title: string; version: number; revision: number; items: Item[]; connections: Connection[]; viewport: Viewport; background: string; settings: BoardSettings }
export interface State { board: Board; can_undo: boolean; can_redo: boolean }
export interface Summary { id: string; title: string; item_count?: number; revision?: number; updated_at?: string }
export interface Asset { id: string; url: string; width: number; height: number; name: string; mime: string; size: number }
export type Command = { type: string; [key: string]: unknown };
export const uid = () => crypto.randomUUID();
export function newItem(kind: Kind, x: number, y: number, patch: Partial<Item> = {}): Item {
  return { id: uid(), kind, x, y, width: 240, height: 180, rotation: 0, z: 1, opacity: 1, locked: false, hidden: false, group_id: null, parent_id: null, title: '', text: '', color: '#191919', asset_id: null, url: '', data: {}, ...patch };
}
