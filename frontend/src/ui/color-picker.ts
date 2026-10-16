import type { Board, Item, Point } from '../lib/types';
import { api, request } from '../lib/api';
import { imageCoordinates } from '../lib/image-geometry';
import { isColor } from '../lib/color';
export interface PixelSample { board_id: string; item_id: string; asset_id: string; revision: number; x: number; y: number; rgba: number[]; rgb: number[]; hsv: number[]; hex: string; scope: 'original'; frame: 0 }
const element = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const text = (id: string, value: string) => { const node = element(id); if (node.textContent !== value) node.textContent = value; };
const geometry = (item: Item) => JSON.stringify([item.asset_id, item.x, item.y, item.width, item.height, item.rotation, item.data.crop, !!item.data.flip_x, !!item.data.flip_y]);
export class ColorPicker {
  private board: Board | null = null; private active = false; private token = 0; private abort: AbortController | null = null; private pending: { id: string; geometry: string } | null = null; private result: PixelSample | null = null;
  constructor(private readonly hooks: { exit(): void; create(sample: PixelSample): Promise<void> }) {
    element('color-copy').addEventListener('click', () => { if (this.result) void navigator.clipboard.writeText(this.result.hex).then(() => text('color-status', 'HEX copied.')).catch(() => { element<HTMLInputElement>('color-hex').select(); text('color-status', 'Select the HEX value and copy it with Ctrl or Cmd+C.'); }); });
    element('color-create').addEventListener('click', () => { if (this.result && this.board?.id === this.result.board_id) void this.hooks.create(this.result).catch(reason => text('color-status', reason instanceof Error ? reason.message : String(reason))); });
    this.controls();
  }
  update(board: Board) { if (this.board && this.board.id !== board.id) { this.cancel(); this.result = null; this.clear(); if (this.active) this.hooks.exit(); } this.board = board; if (this.pending) { const item = board.items.find(entry => entry.id === this.pending!.id); if (!item || geometry(item) !== this.pending.geometry) { this.cancel(); text('color-status', 'The image changed. Sample it again.'); } } this.controls(); }
  setActive(active: boolean) { if (!active) this.cancel(); this.active = active; if (active) text('color-status', 'Click a registered image to sample its original pixels.'); else text('color-status', this.result ? 'Original source pixels. Opacity and grayscale are ignored.' : 'Original pixels · opacity and grayscale are ignored.'); }
  pick(item: Item | undefined, point: Point, root: HTMLElement | null) {
    if (!this.active || !this.board) return;
    if (!item || item.kind !== 'image' || !item.asset_id || !root) { text('color-status', 'Click a registered image reference.'); return; }
    const image = root.querySelector<HTMLImageElement>('.reference-image'); if (!image?.naturalWidth || !(image.getAttribute('src') || '').startsWith(api.assetUrl(item.asset_id))) { text('color-status', 'Wait for this image to finish loading.'); return; }
    const coordinates = imageCoordinates(item, point, root); if (!coordinates) { text('color-status', 'Click inside the painted image area.'); return; }
    this.cancel(); const token = ++this.token, boardId = this.board.id; this.abort = new AbortController(); this.pending = { id: item.id, geometry: geometry(item) }; text('color-status', 'Sampling original pixels…');
    void request<PixelSample>(`/boards/${boardId}/items/${item.id}/sample?u=${coordinates.u}&v=${coordinates.v}`, { signal: this.abort.signal }).then(result => { if (token !== this.token || !this.active || this.board?.id !== boardId) return; if (!isColor(result.hex)) throw new Error('The service returned an invalid color.'); this.result = result; this.pending = null; element<HTMLInputElement>('color-hex').value = result.hex; element('color-preview').style.backgroundColor = result.hex; text('color-rgb', result.rgb.join(', ')); text('color-rgba', result.rgba.join(', ')); text('color-hsv', `${result.hsv[0].toFixed(1)}° / ${result.hsv[1].toFixed(1)}% / ${result.hsv[2].toFixed(1)}%`); text('color-source', `Source pixel ${result.x}, ${result.y} · frame ${result.frame}`); text('color-status', 'Original source pixels. Opacity and grayscale are ignored.'); this.controls(); }).catch(reason => { if (token === this.token) { this.pending = null; text('color-status', reason instanceof Error ? reason.message : String(reason)); } });
  }
  private cancel() { this.token++; this.abort?.abort(); this.abort = null; this.pending = null; }
  private clear() { element<HTMLInputElement>('color-hex').value = ''; element('color-preview').style.backgroundColor = 'transparent'; for (const id of ['color-rgb', 'color-rgba', 'color-hsv', 'color-source']) text(id, ''); text('color-status', 'Original pixels · opacity and grayscale are ignored.'); }
  private controls() { for (const id of ['color-copy', 'color-create']) element<HTMLButtonElement>(id).disabled = !this.result; document.querySelectorAll<HTMLButtonElement>('[data-tool="sample"]').forEach(button => button.disabled = !this.board?.items.some(item => item.kind === 'image' && !!item.asset_id && !item.hidden)); }
}
