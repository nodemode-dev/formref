import type { Board, Item } from '../lib/types';
import { api } from '../lib/api';
import { itemBounds } from '../lib/geometry';
import { paintImage } from '../lib/image-geometry';
import { GifPlayer } from './gif-player';

const element = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const text = (node: HTMLElement, value: string) => { if (node.textContent !== value) node.textContent = value; };

export class ReferenceView {
  private readonly dialog = element<HTMLDialogElement>('reference-dialog');
  private readonly frame = element('reference-frame');
  private readonly media = element('reference-media');
  private readonly image = element<HTMLImageElement>('reference-image');
  private readonly empty = element('reference-empty');
  private images: Item[] = [];
  private boardId: string | null = null;
  private currentId: string | null = null;
  private grayscale = false;
  private timer: number | null = null;
  private playing = false;
  private seconds = 10;
  private fade = true;
  private loadToken = 0;
  private loadedSource = '';
  private sourceWidth = 0; private sourceHeight = 0;

  private readonly gif: GifPlayer;

  constructor(private readonly selected: () => string[], private readonly notify: (message: string) => void, keepFrame: (file: File) => void = () => undefined) {
    this.gif = new GifPlayer(this.media, keepFrame, () => this.current()?.title || 'GIF');
    this.dialog.addEventListener('close', () => { this.stop(); this.gif.unload(); });
    document.addEventListener('keydown', event => {
      if (!this.dialog.open || (event.target as Element).closest('input,textarea,select,[contenteditable="true"]')) return;
      if (this.gif.active && [',', '.', 'k', 'K'].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (event.key === ',') this.gif.step(-1); else if (event.key === '.') this.gif.step(1); else this.gif.toggle();
        return;
      }
      if (['ArrowLeft', 'ArrowRight', 'Escape'].includes(event.key) || event.code === 'Space') event.stopImmediatePropagation();
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); this.step(event.key === 'ArrowLeft' ? -1 : 1); }
      else if (event.code === 'Space') { event.preventDefault(); this.toggle(); }
      else if (event.key === 'Escape') { event.preventDefault(); this.stop(true); }
    });
    new ResizeObserver(() => { const item = this.current(); if (this.dialog.open && item && this.loadedSource === api.assetUrl(item.asset_id!)) this.paint(item); }).observe(this.frame);
    this.controls();
  }

  update(board: Board) {
    if (this.boardId !== board.id) { this.stop(true); this.currentId = null; }
    this.boardId = board.id;
    this.grayscale = board.settings?.grayscale || false;
    const previous = this.images.findIndex(item => item.id === this.currentId);
    this.images = board.items.map((item, order) => ({ item, order })).filter(({ item }) => item.kind === 'image' && !item.hidden && item.opacity > 0 && !!item.asset_id).sort((a, b) => a.item.z - b.item.z || a.order - b.order).map(({ item }) => item);
    if (!this.images.some(item => item.id === this.currentId)) { this.stop(); this.currentId = this.images[Math.max(0, Math.min(previous, this.images.length - 1))]?.id || null; }
    if (!this.images.length) this.stop(true);
    else if (this.dialog.open) this.render();
    this.controls();
  }

  focus() {
    if (!this.images.length) { this.notify('Add a visible image to use reference view.'); return; }
    if (!this.dialog.open) {
      const chosen = this.images.find(item => this.selected().includes(item.id));
      if (chosen) this.currentId = chosen.id;
      this.dialog.showModal();
    }
    this.render();
  }

  step(direction: number) {
    if (!this.images.length) return;
    this.focus();
    const index = this.images.findIndex(item => item.id === this.currentId);
    this.currentId = this.images[(index + direction + this.images.length) % this.images.length].id;
    this.render();
  }

  toggle() {
    if (this.playing) { this.stop(); return; }
    if (!this.images.length) return;
    this.focus(); this.playing = true; this.controls(); this.schedule();
  }

  interval(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 60) { this.notify('Choose a reference interval from 1 to 60 seconds.'); return false; }
    this.seconds = seconds;
    if (this.playing) this.schedule();
    return true;
  }

  transition(kind: string) {
    this.fade = kind === 'fade';
  }

  stop(close = false) {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null; this.playing = false;
    if (close) { this.loadToken++; if (this.dialog.open) this.dialog.close(); }
    this.controls();
  }

  private schedule() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = window.setInterval(() => this.step(1), this.seconds * 1000);
  }

  private current() { return this.images.find(item => item.id === this.currentId); }

  private controls() {
    this.dialog.classList.toggle('playing', this.playing);
    document.querySelectorAll<HTMLButtonElement>('[data-action="reference-prev"],[data-action="reference-next"],[data-action="reference-focus"],[data-action="reference-play"]').forEach(button => {
      button.disabled = !this.images.length;
      if (button.dataset.action === 'reference-play') { text(button, this.playing ? 'Pause' : 'Play'); button.setAttribute('aria-pressed', String(this.playing)); }
    });
  }

  private render() {
    const item = this.current();
    if (!item || !this.dialog.open) return;
    const url = api.assetUrl(item.asset_id!), token = ++this.loadToken;
    if (url === this.loadedSource) { this.paint(item); return; }
    const loader = new Image(); loader.decoding = 'async'; loader.src = url;
    void loader.decode().then(() => {
      if (token !== this.loadToken || !this.dialog.open || this.currentId !== item.id) return;
      const swapping = !!this.loadedSource;
      this.loadedSource = url; this.sourceWidth = loader.naturalWidth; this.sourceHeight = loader.naturalHeight; this.image.src = url; this.image.hidden = false; this.empty.hidden = true;
      this.paint(this.current() || item);
      void this.gif.load(url, String(item.data.mime || ''));
      if (swapping && this.fade && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.media.animate([{ opacity: 0 }, { opacity: item.opacity }], { duration: 280, easing: 'ease-out' });
      }
    }).catch(() => {
      if (token === this.loadToken && this.dialog.open) { text(this.empty, 'This reference could not be loaded. Step to another image or exit.'); this.empty.hidden = false; }
    });
  }

  private paint(item: Item) {
    const bounds = itemBounds(item), scale = Math.max(.001, Math.min((this.frame.clientWidth - 48) / (bounds.right - bounds.left), (this.frame.clientHeight - 48) / (bounds.bottom - bounds.top)));
    this.media.style.width = `${item.width * scale}px`; this.media.style.height = `${item.height * scale}px`;
    this.media.style.transform = `translate(-50%,-50%) rotate(${item.rotation}deg)`; this.media.style.opacity = String(item.opacity);
    paintImage(this.image, item, this.sourceWidth, this.sourceHeight, this.grayscale); this.gif.follow(this.image); this.image.alt = item.title || 'Image reference';
    this.dialog.dataset.itemId = item.id;
    text(element('reference-title'), item.title || 'Image reference');
    text(element('reference-position'), `${this.images.findIndex(candidate => candidate.id === item.id) + 1} / ${this.images.length}`);
  }
}
