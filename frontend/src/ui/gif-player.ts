/**
 * Frame controls for animated GIFs in the reference view: pause, step, speed, scrub and keep a frame.
 * Frames come from the browser's ImageDecoder (already composited), drawn on a canvas laid over the image;
 * without ImageDecoder the GIF simply keeps animating as an image and the controls stay hidden.
 */
type Decoder = { tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } | null }; decode(options: { frameIndex: number }): Promise<{ image: VideoFrame }>; close(): void };
type DecoderClass = new (init: { data: ArrayBuffer; type: string }) => Decoder;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export class GifPlayer {
  private readonly canvas = $<HTMLCanvasElement>('reference-canvas');
  private readonly controls = $('gif-controls');
  private readonly slider = $<HTMLInputElement>('gif-frame');
  private readonly speedSelect = $<HTMLSelectElement>('gif-speed');
  private decoder: Decoder | null = null;
  private count = 0;
  private index = 0;
  private playing = false;
  private timer: number | null = null;
  private token = 0;
  private url = '';
  private drawing = Promise.resolve();

  constructor(private readonly media: HTMLElement, private readonly keep: (file: File) => void, private readonly title: () => string) {
    $('gif-play').addEventListener('click', () => this.toggle());
    $('gif-prev').addEventListener('click', () => this.step(-1));
    $('gif-next').addEventListener('click', () => this.step(1));
    $('gif-keep').addEventListener('click', () => this.keepFrame());
    this.slider.addEventListener('input', () => { this.pause(); void this.show(Number(this.slider.value)); });
    this.speedSelect.addEventListener('change', () => { if (this.playing) this.schedule(0); });
  }

  get active() { return !!this.decoder; }

  static supported() { return 'ImageDecoder' in window; }

  async load(url: string, mime: string) {
    if (url === this.url) return;
    this.unload();
    if (mime !== 'image/gif' || !GifPlayer.supported()) return;
    const token = ++this.token;
    this.url = url;
    try {
      const data = await (await fetch(url)).arrayBuffer();
      if (token !== this.token) return;
      const decoder = new ((window as unknown as { ImageDecoder: DecoderClass }).ImageDecoder)({ data, type: 'image/gif' });
      await decoder.tracks.ready;
      const count = decoder.tracks.selectedTrack?.frameCount || 0;
      if (token !== this.token || count < 2) { decoder.close(); return; }
      this.decoder = decoder;
      this.count = count;
      this.slider.max = String(count - 1);
      await this.show(0);
      if (token !== this.token) return;
      this.media.classList.add('gif-mode');
      this.controls.hidden = false;
      this.play();
    } catch {
      if (token === this.token) this.unload();
    }
  }

  /** Lay the canvas exactly over the painted image (same crop, flip and size styles). */
  follow(image: HTMLImageElement) {
    this.canvas.className = image.className;
    this.canvas.style.cssText = image.style.cssText;
  }

  unload() {
    this.token++;
    this.pause();
    this.decoder?.close();
    this.decoder = null;
    this.count = 0;
    this.index = 0;
    this.url = '';
    this.media.classList.remove('gif-mode');
    this.controls.hidden = true;
    this.canvas.hidden = true;
  }

  private show(index: number) {
    const decoder = this.decoder;
    if (!decoder) return Promise.resolve();
    this.index = (index + this.count) % this.count;
    const target = this.index;
    this.drawing = this.drawing.then(async () => {
      if (decoder !== this.decoder || target !== this.index) return;
      const { image } = await decoder.decode({ frameIndex: target });
      if (this.canvas.width !== image.displayWidth) this.canvas.width = image.displayWidth;
      if (this.canvas.height !== image.displayHeight) this.canvas.height = image.displayHeight;
      this.canvas.getContext('2d')!.drawImage(image, 0, 0);
      this.frameDuration = (image.duration || 100000) / 1000;
      image.close();
      this.canvas.hidden = false;
      this.slider.value = String(target);
      const label = `${target + 1} / ${this.count}`;
      const node = $('gif-count');
      if (node.textContent !== label) node.textContent = label;
    }).catch(() => undefined);
    return this.drawing;
  }

  private frameDuration = 100;

  private schedule(delay = this.frameDuration) {
    if (this.timer !== null) window.clearTimeout(this.timer);
    const speed = Number(this.speedSelect.value) || 1;
    this.timer = window.setTimeout(() => void this.show(this.index + 1).then(() => { if (this.playing) this.schedule(); }), Math.max(10, delay / speed));
  }

  play() {
    if (!this.decoder) return;
    this.playing = true;
    this.paintButton();
    this.schedule();
  }

  pause() {
    this.playing = false;
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.paintButton();
  }

  toggle() { if (this.playing) this.pause(); else this.play(); }

  step(direction: number) {
    if (!this.decoder) return;
    this.pause();
    void this.show(this.index + direction);
  }

  private paintButton() {
    const button = $('gif-play');
    const label = this.playing ? 'Pause GIF' : 'Play GIF';
    if (button.getAttribute('aria-label') !== label) { button.setAttribute('aria-label', label); button.title = `${label} · K`; }
    button.classList.toggle('playing', this.playing);
  }

  private keepFrame() {
    if (!this.decoder) return;
    this.pause();
    const frame = this.index + 1;
    void this.drawing.then(() => this.canvas.toBlob(blob => {
      if (blob) this.keep(new File([blob], `${this.title().replace(/\.gif$/i, '')} frame ${frame}.png`, { type: 'image/png' }));
    }, 'image/png'));
  }
}
