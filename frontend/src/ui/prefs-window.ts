import { icon } from './icons';

const RAIL_KEY = 'formref.prefsRailCollapsed';
const SPOT_KEY = 'formref.prefsSpot';
const ARC = 10;
const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)';

const setClass = (node: Element, name: string, on: boolean) => { if (node.classList.contains(name) !== on) node.classList.toggle(name, on); };
const setAttr = (node: Element, name: string, value: string) => { if (node.getAttribute(name) !== value) node.setAttribute(name, value); };

/** Preferences as two floating panels: the dialog card with every category stacked in one scrolling column, the category rail outside its left edge, and a wire from the active rail tab to a port on the card. */
export class PrefsWindow {
  private readonly frame: HTMLElement;
  private readonly head: HTMLElement;
  private readonly pages: HTMLElement;
  private readonly nav = document.createElement('div');
  private readonly rail = document.createElement('div');
  private readonly fold = document.createElement('button');
  private readonly port = document.createElement('span');
  private readonly shade = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  private readonly line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  private readonly sections = new Map<string, HTMLElement>();
  private readonly tabs = new Map<string, HTMLButtonElement>();
  private collapsed = false;
  private current = '';
  private wireRaf = 0;
  private spyRaf = 0;
  private spyMuted = 0;
  private reveal = true;
  private wireD = '';
  private portY = Number.NaN;
  private scrollTop = 0;
  private spot = { x: 0, y: 0 };
  private offset = { x: 0, y: 0 };

  constructor(private readonly scrim: HTMLDialogElement) {
    this.frame = scrim.querySelector<HTMLElement>('.prefs-dlg')!;
    this.head = scrim.querySelector<HTMLElement>('.prefs-head')!;
    this.pages = scrim.querySelector<HTMLElement>('.prefs-pages')!;
    this.nav.className = 'prefs-nav';
    this.nav.setAttribute('role', 'tablist');
    this.nav.setAttribute('aria-orientation', 'vertical');
    this.nav.setAttribute('aria-label', 'Preferences');
    const order: string[] = [];
    for (const sec of this.pages.querySelectorAll<HTMLElement>('.prefs-sec')) {
      const name = sec.dataset.section!;
      const tab = document.createElement('button');
      tab.className = 'prefs-railtab';
      tab.type = 'button';
      tab.dataset.section = name;
      tab.title = name;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', 'false');
      const glyph = document.createElement('span');
      glyph.className = 'prefs-tabicon';
      glyph.append(icon(sec.querySelector<HTMLElement>('.prefs-secicon')!.dataset.icon!));
      const label = document.createElement('span');
      label.className = 'prefs-tablabel';
      label.textContent = name;
      tab.append(glyph, label);
      tab.addEventListener('click', () => this.showSection(name, 'smooth'));
      tab.addEventListener('keydown', event => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        const next = order[(order.indexOf(name) + (event.key === 'ArrowDown' ? 1 : -1) + order.length) % order.length];
        this.tabs.get(next)!.focus();
        this.showSection(next, 'smooth');
      });
      sec.querySelector('.prefs-sechead')!.addEventListener('click', () => this.foldSection(name));
      this.nav.append(tab);
      this.sections.set(name, sec);
      this.tabs.set(name, tab);
      order.push(name);
    }
    try { this.collapsed = localStorage.getItem(RAIL_KEY) === '1'; } catch { this.collapsed = false; }
    this.fold.className = 'prefs-fold';
    this.fold.type = 'button';
    this.fold.append(icon('collapse-tabs'));
    this.fold.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      try { localStorage.setItem(RAIL_KEY, this.collapsed ? '1' : '0'); } catch { this.paintRail(); }
      this.paintRail();
      this.draw();
    });
    this.paintRail();
    this.rail.className = 'prefs-rail';
    this.rail.append(this.nav, this.fold);
    const wire = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    wire.setAttribute('class', 'prefs-wire');
    wire.setAttribute('aria-hidden', 'true');
    this.shade.setAttribute('class', 'prefs-wire-shade');
    this.line.setAttribute('class', 'prefs-wire-line');
    wire.append(this.shade, this.line);
    this.port.className = 'prefs-port';
    this.port.setAttribute('aria-hidden', 'true');
    this.frame.append(this.rail, wire, this.port);

    try {
      const saved = JSON.parse(localStorage.getItem(SPOT_KEY) || '{}') as { x?: unknown; y?: unknown };
      if (typeof saved.x === 'number' && typeof saved.y === 'number') this.spot = { x: saved.x, y: saved.y };
    } catch { this.spot = { x: 0, y: 0 }; }
    this.bindMove();

    scrim.addEventListener('pointerdown', event => { if (event.target === scrim) scrim.close(); });
    scrim.addEventListener('keydown', event => { if (event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey) this.wrapTab(event); });
    this.pages.addEventListener('scroll', () => { if (scrim.open) this.scrollTop = this.pages.scrollTop; this.queueSpy(); }, { passive: true });
    this.nav.addEventListener('scroll', () => this.queueWire(false), { passive: true });
    new ResizeObserver(() => this.draw()).observe(this.frame);
    window.addEventListener('resize', () => this.queueWire());
    if (order.length) this.markSection(order[0]);
  }

  /** Opens the window, on `section` when one is named; the wire is in place before the first painted frame. */
  show(section?: string): void {
    const to = section && this.sections.has(section) ? section : '';
    if (to) this.markSection(to);
    const opening = !this.scrim.open;
    if (opening) {
      this.scrim.showModal();
      this.pages.scrollTop = this.scrollTop;
      this.offset = { x: 0, y: 0 };
      this.frame.style.translate = '';
      if (this.spot.x || this.spot.y) this.moveFrame(this.spot.x, this.spot.y);
    }
    if (to) this.scrollToSection(to, 'auto');
    this.draw();
    if (opening) {
      const target = this.pages.querySelector<HTMLElement>('input:not(:disabled), select:not(:disabled)') ?? this.scrim.querySelector<HTMLElement>('.prefs-foot .button')!;
      target.focus({ preventScroll: true });
    }
  }

  private draw(): void {
    this.reveal = true;
    this.drawWire();
  }

  private wrapTab(event: KeyboardEvent): void {
    const items = Array.from(this.frame.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(node => node.getClientRects().length > 0);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1], at = document.activeElement;
    if (event.shiftKey && (at === first || at === this.scrim)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && at === last) { event.preventDefault(); first.focus(); }
  }

  private moveFrame(x: number, y: number): void {
    const was = this.offset, r = this.frame.getBoundingClientRect();
    if (!r.width) return;
    const left = r.left - was.x, top = r.top - was.y;
    const nx = Math.round(Math.min(Math.max(x, 48 - r.width - left), window.innerWidth - 48 - left));
    const ny = Math.round(Math.min(Math.max(y, -top), window.innerHeight - 44 - top));
    this.offset = { x: nx, y: ny };
    this.spot = { x: nx, y: ny };
    const want = nx || ny ? `${nx}px ${ny}px` : '';
    if (this.frame.style.translate !== want) this.frame.style.translate = want;
  }

  private bindMove(): void {
    const head = this.head;
    head.addEventListener('pointerdown', event => {
      if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
      const at = { ...this.spot }, sx = event.clientX, sy = event.clientY;
      head.setPointerCapture(event.pointerId);
      const move = (ev: PointerEvent) => this.moveFrame(at.x + ev.clientX - sx, at.y + ev.clientY - sy);
      const up = () => {
        head.removeEventListener('pointermove', move);
        head.removeEventListener('pointerup', up);
        head.removeEventListener('pointercancel', up);
        try { localStorage.setItem(SPOT_KEY, JSON.stringify(this.spot)); } catch { return; }
      };
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', up);
      head.addEventListener('pointercancel', up);
    });
  }

  private paintRail(): void {
    setClass(this.frame, 'is-rail-collapsed', this.collapsed);
    const label = this.collapsed ? 'Expand tabs' : 'Collapse tabs';
    this.fold.title = label;
    this.fold.setAttribute('aria-label', label);
    setAttr(this.fold, 'aria-expanded', String(!this.collapsed));
  }

  private showSection(name: string, scroll: ScrollBehavior | null = null): void {
    if (!this.sections.has(name)) return;
    this.markSection(name);
    if (scroll) this.scrollToSection(name, scroll);
  }

  private markSection(name: string): void {
    if (this.current === name) return;
    this.current = name;
    for (const [n, sec] of this.sections) setClass(sec, 'is-current', n === name);
    for (const [n, tab] of this.tabs) {
      setClass(tab, 'is-active', n === name);
      setAttr(tab, 'aria-selected', String(n === name));
    }
    this.queueWire();
  }

  private scrollToSection(name: string, behavior: ScrollBehavior): void {
    const sec = this.sections.get(name);
    if (!sec) return;
    if (sec.classList.contains('is-folded')) this.foldSection(name);
    const top = sec.getBoundingClientRect().top - this.pages.getBoundingClientRect().top + this.pages.scrollTop - 12;
    this.spyMuted = performance.now() + 700;
    this.pages.scrollTo({ top, behavior });
  }

  private foldSection(name: string): void {
    const sec = this.sections.get(name);
    if (!sec) return;
    const folded = !sec.classList.contains('is-folded');
    setClass(sec, 'is-folded', folded);
    sec.querySelector<HTMLElement>('.prefs-secbody')!.hidden = folded;
    setAttr(sec.querySelector('.prefs-sechead')!, 'aria-expanded', String(!folded));
    this.queueWire();
    this.queueSpy();
  }

  private queueSpy(): void {
    if (this.spyRaf) return;
    this.spyRaf = requestAnimationFrame(() => {
      this.spyRaf = 0;
      const pages = this.pages;
      if (!pages.clientHeight || performance.now() < this.spyMuted) return;
      const edge = pages.getBoundingClientRect().top + 24;
      const names = Array.from(this.sections.keys());
      let best = '';
      let bestD = Infinity;
      if (pages.scrollHeight > pages.clientHeight + 4 && pages.scrollTop + pages.clientHeight >= pages.scrollHeight - 2) best = names[names.length - 1] ?? '';
      else for (const [n, sec] of this.sections) {
        const top = sec.getBoundingClientRect().top;
        const d = top <= edge ? edge - top : top - edge + 100000;
        if (d < bestD) { bestD = d; best = n; }
      }
      if (best) this.markSection(best);
    });
  }

  private queueWire(reveal = true): void {
    if (reveal) this.reveal = true;
    if (this.wireRaf) return;
    this.wireRaf = requestAnimationFrame(() => { this.wireRaf = 0; this.drawWire(); });
  }

  private drawWire(): void {
    const tab = this.tabs.get(this.current);
    if (!this.scrim.open || !tab) return;
    const F = this.frame.getBoundingClientRect();
    const R = this.rail.getBoundingClientRect();
    if (!F.width || !R.width) return;
    const N = this.nav.getBoundingClientRect();
    let T = tab.getBoundingClientRect();
    if (this.reveal && (T.top < N.top || T.bottom > N.bottom)) {
      this.nav.scrollTop += T.top < N.top ? T.top - N.top - 6 : T.bottom - N.bottom + 6;
      T = tab.getBoundingClientRect();
    }
    this.reveal = false;
    const H = this.head.getBoundingClientRect();
    const portY = Math.round(H.bottom - F.top);
    const sx = Math.round(T.right - F.left);
    const ty = Math.round(Math.min(Math.max(T.top + T.height / 2, N.top + ARC), N.bottom - ARC) - F.top);
    const rr = R.right - F.left;
    const trunk = Math.round(rr - rr * 0.45);
    const dy = portY - ty;
    const r = ARC;
    const dir = dy > 0 ? 1 : -1;
    const d = Math.abs(dy) < 2 * r ? `M${sx} ${ty} H ${trunk} V ${portY} H -7` : `M${sx} ${ty} H ${trunk - r} a ${r} ${r} 0 0 ${dir > 0 ? 1 : 0} ${r} ${dir * r} V ${portY - dir * r} a ${r} ${r} 0 0 ${dir > 0 ? 0 : 1} ${r} ${dir * r} H -7`;
    if (d !== this.wireD) { this.wireD = d; this.shade.setAttribute('d', d); this.line.setAttribute('d', d); }
    if (portY !== this.portY) { this.portY = portY; this.port.style.transform = `translateY(${portY}px)`; }
  }
}
