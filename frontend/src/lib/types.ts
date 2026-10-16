export type Kind = 'image' | 'note' | 'document' | 'swatch' | 'link' | 'board' | 'column' | 'todo' | 'shape' | 'stroke' | 'file' | 'table';
export interface Point { x: number; y: number }
export interface Item {
  id: string; kind: Kind; x: number; y: number; width: number; height: number;
  rotation: number; z: number; opacity: number; locked: boolean; hidden: boolean;
  group_id: string | null; parent_id: string | null; title: string; text: string;
  color: string; asset_id: string | null; url: string; data: Record<string, unknown>;
}
export interface Connection { id: string; from: string; to: string; label: string; color: string }
export interface Viewport { x: number; y: number; zoom: number }
export interface Label { id: string; name: string; color: string }
export interface WindowLayout { x: number; y: number; width: number; height: number; always_on_top: boolean; opacity: number }
export interface SavedSearch { id: string; name: string; text?: string; kind?: string; color?: string; tolerance?: number; similar?: { item_id: string; level: 'close' | 'related' | 'loose' }; tags?: string[]; labels?: string[]; rating?: number }
export interface SharedSearch { id: string; name: string; text?: string; kind?: string; color?: string; tolerance?: number; tags?: string[]; label_names?: string[]; rating?: number }
export interface BoardSettings { grid_visible: boolean; grid_size: number; snap_enabled: boolean; grayscale: boolean; labels?: Label[]; window?: WindowLayout | null; searches?: SavedSearch[] }
export interface Board { id: string; title: string; version: number; revision: number; items: Item[]; connections: Connection[]; viewport: Viewport; background: string; settings: BoardSettings }
export interface State { board: Board; can_undo: boolean; can_redo: boolean }
export interface Summary { id: string; title: string; item_count?: number; revision?: number; updated_at?: string }
export interface Asset { id: string; url: string; width: number; height: number; name: string; mime: string; size: number; keywords?: string[]; rating?: number }
export type Command = { type: string; [key: string]: unknown };
export const uid = () => crypto.randomUUID();
export function newItem(kind: Kind, x: number, y: number, patch: Partial<Item> = {}): Item {
  return { id: uid(), kind, x, y, width: 240, height: 180, rotation: 0, z: 1, opacity: 1, locked: false, hidden: false, group_id: null, parent_id: null, title: '', text: '', color: '#191919', asset_id: null, url: '', data: {}, ...patch };
}
