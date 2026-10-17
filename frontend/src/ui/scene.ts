import type { Board, Item, Label, Point, Viewport } from '../lib/types';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { icon } from './icons';
import { MarkdownView } from '../lib/markdown';
import { paintImage, paintStudyGrid } from '../lib/image-geometry';
import { colorValues } from '../lib/color';
import { embedUrl, isMap, mediaKind, paintPlayer } from '../lib/media';
import { TableView } from './table-view';
import { vectorData, type Vector } from '../lib/vector/path';
import { strokeStyle } from '../lib/vector/stroke';
import { arrowheads } from '../lib/vector/arrows';
import { paintGradient } from '../lib/vector/gradient';
/** Level of detail for image references: the smallest server-made preview (256 to 2048 px on the long edge) that covers the item at the current zoom and pixel ratio, or 0 for the original. Big boards decode far less, and zoomed-out screentone stops shimmering because the preview is resampled properly. A node only ever moves up a level. */
const EDGES = [256, 512, 1024, 2048];
/** Card eyebrow words, English keys for t(); the eyebrow is shown in capitals by CSS. */
const KIND_LABELS: Record<string, string> = { board: 'Board', document: 'Document', link: 'Link', todo: 'Task', column: 'Column', swatch: 'Swatch', file: 'File', table: 'Table', image: 'Image', shape: 'Shape', stroke: 'Drawing', video: 'Video', audio: 'Audio' };
let detailZoom = 1;
/** Visible-first loading: images outside the view (plus a screen of margin) wait to load until the view reaches them, so a big board opens with what is on screen. Null until the first camera is drawn. */
let viewRect: { x: number; y: number; w: number; h: number } | null = null;
function inView(item: Item): boolean {
  if (!viewRect) return true;
  const r = Math.hypot(item.width, item.height) / 2, cx = item.x + item.width / 2, cy = item.y + item.height / 2;
  return cx + r >= viewRect.x - viewRect.w && cx - r <= viewRect.x + 2 * viewRect.w && cy + r >= viewRect.y - viewRect.h && cy - r <= viewRect.y + 2 * viewRect.h;
}
function detailEdge(item: Item): number {
  if (item.data.sampling === 'nearest' || item.data.lod === false) return 0;
  const crop = item.data.crop as { width?: number; height?: number } | undefined;
  const need = Math.max(item.width / (crop?.width || 1), item.height / (crop?.height || 1)) * detailZoom * (window.devicePixelRatio || 1);
  return EDGES.find(edge => edge >= need) || 0;
}
export const BLENDS: readonly string[] = ['darken', 'multiply', 'color-burn', 'lighten', 'screen', 'color-dodge', 'overlay', 'soft-light', 'hard-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
export const NOTE_FONTS: Record<string, string> = {
  Inter: "'Inter', system-ui, sans-serif", 'JetBrains Mono': "'JetBrains Mono', ui-monospace, monospace", Helvetica: "Helvetica, 'Helvetica Neue', Arial, sans-serif",
  Arial: 'Arial, sans-serif', Avenir: "Avenir, 'Avenir Next', sans-serif", Baskerville: "Baskerville, 'Libre Baskerville', serif", Courier: "'Courier New', Courier, monospace",
  'Fira Sans': "'Fira Sans', sans-serif", Futura: "Futura, 'Century Gothic', sans-serif", Garamond: "Garamond, 'EB Garamond', serif", Georgia: 'Georgia, serif',
  'Gill Sans': "'Gill Sans', 'Gill Sans MT', sans-serif", 'Lucida Grande': "'Lucida Grande', 'Lucida Sans Unicode', sans-serif", Palatino: "Palatino, 'Palatino Linotype', serif",
  'SF Mono': "'SF Mono', ui-monospace, Menlo, monospace", 'Segoe UI': "'Segoe UI', system-ui, sans-serif", Times: "'Times New Roman', Times, serif", Trebuchet: "'Trebuchet MS', sans-serif", Verdana: 'Verdana, sans-serif',
};
const ns = 'http://www.w3.org/2000/svg';
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = ''): HTMLElementTagNameMap[K] { const node = document.createElement(tag); node.className = className; return node; }
function svg<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] { return document.createElementNS(ns, tag); }
function text(node: Node, value: string) { if (node.textContent !== value) node.textContent = value; }
export interface SceneHooks { edit(id: string, patch: Partial<Item>): void; item(id: string): Item | undefined; openEditor(id: string): void }
class ItemNode {
  root = el('div', 'board-item'); content = el('div', 'item-content'); imageBox = el('div', 'item-content image-content'); image = el('img', 'reference-image'); fallback = el('div', 'item-fallback'); fallbackText = el('span'); imageCaption = el('div', 'image-caption'); card = el('div', 'item-content card-content'); eyebrow = el('div', 'card-eyebrow'); eyebrowIcon = el('span'); eyebrowText = el('span'); title = el('div', 'card-title'); body = el('div', 'card-text'); url = el('div', 'card-url'); footer = el('div', 'card-footer'); footerText = el('span'); footerArrow = icon('arrow-right'); checkbox = el('input', 'todo-checkbox'); shapeBox = el('div', 'item-content shape-content'); drawing = svg('svg'); rect = svg('rect'); ellipse = svg('ellipse'); line = svg('line'); path = svg('path'); vpath = svg('path'); arrows = svg('svg'); arrowFill = svg('path'); arrowLine = svg('path'); defs = svg('defs'); linear = svg('linearGradient') as SVGLinearGradientElement; radial = svg('radialGradient') as SVGRadialGradientElement; lock = el('span', 'item-lock'); commentBadge = el('span', 'item-comments'); commentCount = el('span'); labelRow = el('div', 'item-labels'); source = ''; loadToken = 0; edge = 0; deferred = false; culled = false; studyGrid = el('div', 'study-grid');
  formattedBody = el('div', 'card-text formatted-card'); markdown = new MarkdownView(this.formattedBody, 48); swatchPreview = el('div', 'swatch-preview'); swatchPaint = el('div', 'swatch-paint'); mediaBox = el('div', 'card-media'); tableBox = el('div', 'card-table'); table!: TableView; sourceWidth = 0; sourceHeight = 0; current: Item | null = null;
  constructor(id: string, hooks: SceneHooks) {
    this.root.dataset.id = id; this.root.setAttribute('role', 'group'); this.image.alt = ''; this.image.decoding = 'async'; this.image.draggable = false;
    this.fallback.append(icon('image'), this.fallbackText); this.imageBox.append(this.image, this.studyGrid, this.fallback, this.imageCaption); this.studyGrid.hidden = true;
    this.eyebrow.append(this.eyebrowIcon, this.eyebrowText); this.footer.append(this.footerText, this.footerArrow); this.checkbox.type = 'checkbox'; this.checkbox.setAttribute('aria-label', 'Complete task');
    this.swatchPreview.append(this.swatchPaint); this.card.append(this.eyebrow, this.title, this.swatchPreview, this.body, this.formattedBody, this.mediaBox, this.tableBox, this.url, this.footer, this.checkbox); this.mediaBox.hidden = true; this.tableBox.hidden = true; this.table = new TableView(this.tableBox, (patch) => hooks.edit(id, patch), () => hooks.item(id));
    this.drawing.append(this.rect, this.ellipse, this.line, this.path, this.vpath); this.vpath.setAttribute('vector-effect', 'non-scaling-stroke'); this.arrows.classList.add('arrowheads'); this.arrows.append(this.arrowFill, this.arrowLine); this.arrowLine.setAttribute('fill', 'none'); for (const g of [this.linear, this.radial]) { g.append(svg('stop'), svg('stop')); g.querySelectorAll('stop')[1].setAttribute('offset', '1'); this.defs.append(g); } this.drawing.prepend(this.defs); this.arrowLine.setAttribute('stroke-linecap', 'round'); this.arrowLine.setAttribute('stroke-linejoin', 'round'); this.shapeBox.append(this.drawing, this.arrows); this.content.append(this.imageBox, this.card, this.shapeBox); this.lock.append(icon('lock')); this.commentBadge.append(icon('comment'), this.commentCount); this.commentBadge.hidden = true; this.labelRow.hidden = true;
    const resize = el('span', 'resize-handle'); resize.dataset.handle = 'resize'; resize.setAttribute('aria-label', 'Resize reference');
    const rotate = el('span', 'rotate-handle'); rotate.dataset.handle = 'rotate'; rotate.setAttribute('aria-label', 'Rotate reference');
    this.root.append(this.content, this.lock, this.commentBadge, this.labelRow, resize, rotate);
    this.body.addEventListener('dblclick', event => { const item = hooks.item(id); if (!item) return; if (item.kind === 'document' || (item.kind === 'note' && item.data.text_format === 'markdown')) { event.stopPropagation(); hooks.openEditor(id); return; } if (item.locked || !['note', 'todo'].includes(item.kind)) return; event.stopPropagation(); this.body.contentEditable = 'true'; this.body.focus(); });
    this.body.addEventListener('blur', () => { if (this.body.contentEditable !== 'true') return; this.body.contentEditable = 'false'; const item = hooks.item(id); if (item && item.text !== this.body.textContent) hooks.edit(id, { text: this.body.textContent || '' }); });
    this.body.addEventListener('keydown', event => { if (event.key === 'Escape') { const item = hooks.item(id); this.body.contentEditable = 'false'; text(this.body, item?.text || ''); this.body.blur(); } if (!((event.ctrlKey || event.metaKey) && ['s', 'k'].includes(event.key.toLowerCase()))) event.stopPropagation(); });
    this.checkbox.addEventListener('change', () => { const item = hooks.item(id); if (item) hooks.edit(id, { data: { ...item.data, checked: this.checkbox.checked } }); });
  }
  update(item: Item, selected: boolean, matching: boolean) {
    this.current = item; const r = this.root; r.dataset.kind = item.kind; r.classList.toggle('selected', selected); r.classList.toggle('locked', item.locked); r.classList.toggle('matched-out', !matching); r.classList.toggle('cutout', item.kind === 'image' && !!item.data.cutout); r.hidden = item.hidden; r.style.left = `${item.x}px`; r.style.top = `${item.y}px`; r.style.width = `${item.width}px`; r.style.height = `${item.height}px`; r.style.transform = `rotate(${item.rotation}deg)`; r.style.opacity = String(item.opacity); const blend = typeof item.data.blend === 'string' && BLENDS.includes(item.data.blend) ? item.data.blend : ''; if (r.style.mixBlendMode !== blend) r.style.mixBlendMode = blend; r.setAttribute('aria-label', item.title || `${item.kind} reference`); const open = Array.isArray(item.data.comments) ? (item.data.comments as { resolved?: boolean }[]).filter(c => !c.resolved).length : 0; this.commentBadge.hidden = !open; if (this.commentCount.textContent !== String(open)) this.commentCount.textContent = String(open); this.paintLabels(item); this.paintRating(item); this.paintMedia(item); this.tableBox.hidden = item.kind !== 'table'; this.card.classList.toggle('table-content', item.kind === 'table'); if (item.kind === 'table') this.table.update(item);
    this.imageBox.hidden = item.kind !== 'image'; this.card.hidden = ['image', 'shape', 'stroke'].includes(item.kind); this.shapeBox.hidden = !['shape', 'stroke'].includes(item.kind);
    this.deferred = item.kind === 'image' && !this.source && !!item.asset_id && !inView(item);
    if (this.deferred) { this.image.hidden = true; this.fallback.hidden = true; }
    const far = !inView(item); if (this.culled !== far) { this.culled = far; r.classList.toggle('culled', far); }
    else if (item.kind === 'image') {
      this.edge = Math.max(this.edge, detailEdge(item) || Infinity);
      const source = item.asset_id ? (Number.isFinite(this.edge) ? `${api.assetUrl(item.asset_id)}/preview?edge=${this.edge}` : api.assetUrl(item.asset_id)) : '';
      if (source !== this.source) { this.source = source; const token = ++this.loadToken; if (source) { const pending = new Image(); pending.src = source; pending.decode().then(() => { if (token === this.loadToken) { this.sourceWidth = pending.naturalWidth; this.sourceHeight = pending.naturalHeight; if (this.current) paintImage(this.image, this.current, this.sourceWidth, this.sourceHeight); this.image.src = source; this.image.hidden = false; this.fallback.hidden = true; } }).catch(() => { if (token === this.loadToken && !this.image.getAttribute('src')) { this.fallback.hidden = false; text(this.fallbackText, 'Image unavailable. Use Replace / relink.'); } }); } else { this.image.hidden = true; this.fallback.hidden = false; } }
      if (!source) text(this.fallbackText, item.data.unresolved ? 'Source missing. Use Replace / relink.' : 'No image source');
      paintImage(this.image, item, this.sourceWidth, this.sourceHeight); paintStudyGrid(this.studyGrid, item); text(this.imageCaption, item.title);
    } else if (item.kind === 'shape' || item.kind === 'stroke') {
      this.drawing.setAttribute('viewBox', `0 0 ${item.width} ${item.height}`); const kind = item.data.shape || 'rect'; this.rect.style.display = item.kind === 'shape' && kind === 'rect' ? '' : 'none'; this.ellipse.style.display = item.kind === 'shape' && kind === 'ellipse' ? '' : 'none'; this.line.style.display = item.kind === 'shape' && kind === 'line' ? '' : 'none'; this.path.style.display = item.kind === 'stroke' && !item.data.vector ? '' : 'none'; const vector = item.data.vector as Vector | undefined; this.vpath.style.display = vector ? '' : 'none'; if (vector) { this.drawing.setAttribute('viewBox', `0 0 ${vector.w} ${vector.h}`); this.drawing.setAttribute('preserveAspectRatio', 'none'); this.vpath.setAttribute('d', vectorData(vector)); this.vpath.setAttribute('fill-rule', 'evenodd'); } else this.drawing.removeAttribute('preserveAspectRatio');
      const fill = String(item.data.fill || 'none'); for (const s of [this.rect, this.ellipse, this.line, this.path, this.vpath]) { s.setAttribute('stroke', item.data.stroke === 'none' ? 'none' : item.color); s.setAttribute('stroke-width', String(item.data.stroke_width || 2)); s.setAttribute('fill', s === this.path || s === this.line || (s === this.vpath && item.kind === 'stroke') ? 'none' : fill); strokeStyle(s, item.data); }
      this.rect.setAttribute('x', '1'); this.rect.setAttribute('y', '1'); this.rect.setAttribute('width', String(Math.max(1, item.width - 2))); this.rect.setAttribute('height', String(Math.max(1, item.height - 2))); this.rect.setAttribute('rx', '4'); this.ellipse.setAttribute('cx', String(item.width / 2)); this.ellipse.setAttribute('cy', String(item.height / 2)); this.ellipse.setAttribute('rx', String(Math.max(.1, item.width / 2 - 1))); this.ellipse.setAttribute('ry', String(Math.max(.1, item.height / 2 - 1))); const endpoints = item.data.points as Point[] | undefined; this.line.setAttribute('x1', String(endpoints?.[0]?.x || 0)); this.line.setAttribute('y1', String(endpoints?.[0]?.y || 0)); this.line.setAttribute('x2', String(endpoints?.at(-1)?.x ?? item.width)); this.line.setAttribute('y2', String(endpoints?.at(-1)?.y ?? item.height));
      const points = (item.data.points || []) as Point[]; this.path.setAttribute('d', points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')); this.path.setAttribute('stroke-linecap', 'round'); this.path.setAttribute('stroke-linejoin', 'round');
      const gradientFill = item.kind === 'shape' ? paintGradient(this.linear, this.radial, `grad-${item.id}`, item.data.gradient) : null; if (gradientFill) for (const s of [this.rect, this.ellipse, this.vpath]) s.setAttribute('fill', gradientFill);
      const heads = arrowheads(item); this.arrows.setAttribute('viewBox', `0 0 ${item.width} ${item.height}`); this.arrowFill.setAttribute('d', heads.filled); this.arrowLine.setAttribute('d', heads.lines); this.arrowFill.setAttribute('fill', item.color); this.arrowLine.setAttribute('stroke', item.color); this.arrowLine.setAttribute('stroke-width', String(item.data.stroke_width || 2));
    } else {
      const formatted = ['note', 'document'].includes(item.kind) && item.data.text_format === 'markdown'; this.body.hidden = formatted; this.formattedBody.hidden = !formatted; this.swatchPreview.hidden = item.kind !== 'swatch'; if (formatted) this.markdown.update(item.text); this.card.classList.toggle('swatch-content', item.kind === 'swatch'); this.card.classList.toggle('document-content', item.kind === 'document'); this.card.classList.toggle('note-content', item.kind === 'note'); const font = item.kind === 'note' && typeof item.data.font === 'string' ? NOTE_FONTS[item.data.font] || '' : ''; if (this.card.style.fontFamily !== font) this.card.style.fontFamily = font; this.card.classList.toggle('column-content', item.kind === 'column'); this.card.classList.toggle('todo-content', item.kind === 'todo'); this.card.classList.toggle('checked', !!item.data.checked); this.card.style.backgroundColor = item.kind === 'note' ? item.color : ''; const paper = item.kind === 'note' ? colorValues(item.color)?.rgb : undefined; this.card.classList.toggle('dark-note', !!paper && 0.2126 * paper[0] + 0.7152 * paper[1] + 0.0722 * paper[2] < 110); this.swatchPaint.style.backgroundColor = item.color; text(this.title, item.title); if (document.activeElement !== this.body) text(this.body, item.kind === 'swatch' ? colorValues(item.color)!.hex : item.text); const media = mediaKind(item.kind, item.data.mime, item.asset_id, item.url); text(this.eyebrowText, t(item.kind === 'note' ? 'Studio note' : media === 'video' || media === 'audio' ? KIND_LABELS[media] : media === 'embed' ? (isMap(item.url) ? 'Map' : 'Player') : KIND_LABELS[item.kind] || item.kind) + (item.data.sync_id ? ' · ' + t('Synced') : '')); const iconName = media === 'video' || media === 'audio' ? media : item.kind; if (this.eyebrowIcon.dataset.name !== iconName) { this.eyebrowIcon.firstChild?.remove(); this.eyebrowIcon.append(icon(iconName)); this.eyebrowIcon.dataset.name = iconName; }
      text(this.url, item.url); this.url.hidden = item.kind !== 'link'; this.checkbox.hidden = item.kind !== 'todo'; this.checkbox.checked = !!item.data.checked; this.checkbox.disabled = item.locked; this.footerArrow.style.display = ['board', 'link', 'file', 'document'].includes(item.kind) ? '' : 'none';
      text(this.footerText, item.kind === 'swatch' ? `RGB ${colorValues(item.color)!.rgb.join(' · ')}` : item.kind === 'document' || formatted ? t('Double-click to open editor') : item.kind === 'board' ? t('Double-click to open') : item.kind === 'file' ? t('Double-click to download') : item.kind === 'link' ? t('Double-click to visit') : item.kind === 'column' ? t(item.data.drops_locked ? 'Locked against drops' : 'Drag items here') : Array.isArray(item.data.tags) ? (item.data.tags as string[]).join(' · ') : item.kind === 'note' ? t('Double-click to edit') : '');
    }
  }
  paintMedia(item: Item) {
    const kind = mediaKind(item.kind, item.data.mime, item.asset_id, item.url);
    this.mediaBox.hidden = !kind;
    this.card.classList.toggle('media-card', !!kind);
    this.card.classList.toggle('audio-card', kind === 'audio');
    const src = kind === 'embed' ? embedUrl(item.url) || '' : kind ? api.assetUrl(item.asset_id!) : '';
    paintPlayer(this.mediaBox, kind, src, { loop: !!item.data.loop, autoplay: !!item.data.autoplay, title: item.title || 'Media', start: Number(item.data.clip_start) || 0, end: Number(item.data.clip_end) || 0, rate: Number(item.data.rate) || 1 });
  }
  ratingBadge: HTMLElement | null = null;
  /** A picture's stars in its bottom-right corner: the badge is made the first time the item is rated, then only hidden and its stars shown or hidden. */
  paintRating(item: Item) {
    const stars = item.kind === 'image' && typeof item.data.rating === 'number' ? Math.max(0, Math.min(5, Math.round(item.data.rating))) : 0;
    if (!stars && !this.ratingBadge) return;
    if (!this.ratingBadge) {
      this.ratingBadge = el('span', 'item-rating');
      for (let i = 0; i < 5; i++) this.ratingBadge.append(icon('star'));
      this.root.insertBefore(this.ratingBadge, this.labelRow);
    }
    const badge = this.ratingBadge;
    if (badge.hidden !== !stars) badge.hidden = !stars;
    [...badge.children].forEach((star, index) => { const show = index < stars; if ((star as SVGElement).style.display !== (show ? '' : 'none')) (star as SVGElement).style.display = show ? '' : 'none'; });
    if (badge.dataset.stars !== String(stars)) { badge.dataset.stars = String(stars); badge.setAttribute('aria-label', `${stars} / 5`); }
  }
  /** Coloured label pills along the item's bottom edge, patched in place. */
  paintLabels(item: Item) {
    const ids = Array.isArray(item.data.labels) ? (item.data.labels as string[]) : [];
    const shown = ids.map(id => LABELS.get(id)).filter((label): label is Label => !!label);
    this.labelRow.hidden = !shown.length;
    while (this.labelRow.children.length > shown.length) this.labelRow.lastElementChild!.remove();
    shown.forEach((label, index) => {
      let pill = this.labelRow.children[index] as HTMLElement | undefined;
      if (!pill) { pill = el('span', 'item-label'); this.labelRow.append(pill); }
      if (pill.textContent !== label.name) pill.textContent = label.name;
      if (pill.style.getPropertyValue('--label') !== label.color) pill.style.setProperty('--label', label.color);
    });
  }
}
const LABELS = new Map<string, Label>();

/** A connection end may be one item or a whole group ("group:" and the group id); a group's box covers its visible members. */
export const GROUP_ENDPOINT = 'group:';
interface EndBox { x: number; y: number; width: number; height: number; hidden: boolean; group?: boolean }

/** Line ends: an item's centre, as before; a group's end sits on the side of its frame facing the other end, where the curve's flat tangent leaves it, so no stub crosses the gaps between grouped items. */
const FRAME_PAD = 12;
function anchors(from: EndBox, to: EndBox): [number, number, number, number] {
  const fx = from.x + from.width / 2, tx = to.x + to.width / 2;
  const side = (box: EndBox, centre: number, other: number) => (box.group ? (other >= centre ? box.x + box.width + FRAME_PAD : box.x - FRAME_PAD) : centre);
  return [side(from, fx, tx), from.y + from.height / 2, side(to, tx, fx), to.y + to.height / 2];
}
function endpoints(board: Board): (endpoint: string) => EndBox | undefined {
  const items = new Map(board.items.map(item => [item.id, item]));
  const groups = new Map<string, EndBox>();
  for (const item of board.items) {
    if (!item.group_id) continue;
    const key = GROUP_ENDPOINT + item.group_id;
    const box = groups.get(key);
    if (item.hidden) { if (!box) groups.set(key, { x: item.x, y: item.y, width: 0, height: 0, hidden: true, group: true }); continue; }
    if (!box || box.hidden) { groups.set(key, { x: item.x, y: item.y, width: item.width, height: item.height, hidden: false, group: true }); continue; }
    const right = Math.max(box.x + box.width, item.x + item.width), bottom = Math.max(box.y + box.height, item.y + item.height);
    box.x = Math.min(box.x, item.x); box.y = Math.min(box.y, item.y); box.width = right - box.x; box.height = bottom - box.y;
  }
  return endpoint => items.get(endpoint) || groups.get(endpoint);
}

export class Scene {
  nodes = new Map<string, ItemNode>(); lines = new Map<string, { path: SVGPathElement; label: SVGTextElement }>(); mini = new Map<string, SVGRectElement>(); miniView = svg('rect');
  constructor(readonly container: HTMLElement, readonly connections: SVGSVGElement, readonly navigator: SVGSVGElement, readonly hooks: SceneHooks) { this.miniView.classList.add('navigator-view'); navigator.append(this.miniView); }
  render(board: Board, selection: Set<string>, matches: (item: Item) => boolean) {
    LABELS.clear(); for (const label of board.settings?.labels || []) LABELS.set(label.id, label);
    const ids = new Set(board.items.map(item => item.id)); for (const [id, node] of this.nodes) if (!ids.has(id)) { node.root.remove(); this.nodes.delete(id); this.mini.get(id)?.remove(); this.mini.delete(id); }
    for (const item of board.items) { let node = this.nodes.get(item.id); if (!node) { node = new ItemNode(item.id, this.hooks); this.nodes.set(item.id, node); this.container.append(node.root); } node.update(item, selection.has(item.id), matches(item)); }
    const ordered = board.items.map((item, index) => ({ item, index })).sort((a, b) => a.item.z - b.item.z || a.index - b.index); let next = this.container.firstElementChild; for (const { item } of ordered) { const root = this.nodes.get(item.id)!.root; if (next === root) next = next.nextElementSibling; else this.container.insertBefore(root, next); }
    const connectionIds = new Set(board.connections.map(c => c.id)); for (const [id, line] of this.lines) if (!connectionIds.has(id)) { line.path.remove(); line.label.remove(); this.lines.delete(id); }
    const ends = endpoints(board);
    this.paintGroupFrames(board, ends);
    for (const connection of board.connections) { let line = this.lines.get(connection.id); if (!line) { const path = svg('path'); path.classList.add('connection'); path.dataset.connection = connection.id; const label = svg('text'); label.classList.add('connection-label'); line = { path, label }; this.lines.set(connection.id, line); this.connections.append(path, label); } const from = ends(connection.from), to = ends(connection.to); if (!from || !to) continue; const [x1, y1, x2, y2] = anchors(from, to); line.path.setAttribute('d', `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`); line.path.setAttribute('stroke', connection.color || 'var(--accent-color)'); line.path.style.display = from.hidden || to.hidden ? 'none' : ''; line.label.setAttribute('x', String((x1 + x2) / 2)); line.label.setAttribute('y', String((y1 + y2) / 2 - 8)); text(line.label, connection.label); }
  }
  frames = new Map<string, SVGRectElement>();
  /** A dashed frame around every group that a connection reaches, so the group reads as one node; frames are patched in place and removed when the group has no connections left. */
  paintGroupFrames(board: Board, ends: (endpoint: string) => EndBox | undefined) {
    const used = new Set<string>();
    for (const connection of board.connections) for (const endpoint of [connection.from, connection.to]) if (endpoint.startsWith(GROUP_ENDPOINT) && !board.items.some(item => item.id === endpoint)) used.add(endpoint);
    for (const [endpoint, frame] of this.frames) if (!used.has(endpoint)) { frame.remove(); this.frames.delete(endpoint); }
    for (const endpoint of used) {
      const box = ends(endpoint);
      let frame = this.frames.get(endpoint);
      if (!frame) { frame = svg('rect') as SVGRectElement; frame.classList.add('group-frame'); frame.dataset.group = endpoint.slice(GROUP_ENDPOINT.length); this.frames.set(endpoint, frame); this.connections.prepend(frame); }
      if (!box) { frame.style.display = 'none'; continue; }
      const pad = FRAME_PAD, values: [string, string][] = [['x', String(box.x - pad)], ['y', String(box.y - pad)], ['width', String(box.width + pad * 2)], ['height', String(box.height + pad * 2)]];
      for (const [name, value] of values) if (frame.getAttribute(name) !== value) frame.setAttribute(name, value);
      const display = box.hidden ? 'none' : '';
      if (frame.style.display !== display) frame.style.display = display;
    }
  }
  /** Called when the zoom changes: image references that now need more pixels load a larger preview (never a smaller one). */
  detail(zoom: number, view?: { x: number; y: number; w: number; h: number }) {
    if (view) {
      viewRect = view;
      for (const node of this.nodes.values()) {
        if (!node.current) continue;
        const near = inView(node.current);
        if (node.deferred && near) node.update(node.current, node.root.classList.contains('selected'), !node.root.classList.contains('matched-out'));
        if (node.culled === near) { node.culled = !near; node.root.classList.toggle('culled', !near); }
      }
    }
    if (zoom <= detailZoom) { detailZoom = Math.min(detailZoom, zoom); return; }
    detailZoom = zoom;
    for (const node of this.nodes.values()) if (node.current?.kind === 'image' && Number.isFinite(node.edge) && (detailEdge(node.current) || Infinity) > node.edge) node.update(node.current, node.root.classList.contains('selected'), !node.root.classList.contains('matched-out'));
  }
  selection(ids: Set<string>) { for (const [id, node] of this.nodes) node.root.classList.toggle('selected', ids.has(id)); }
  preview(id: string, patch: Partial<Item>) { const r = this.nodes.get(id)?.root; if (!r) return; if (patch.x !== undefined) r.style.left = `${patch.x}px`; if (patch.y !== undefined) r.style.top = `${patch.y}px`; if (patch.width !== undefined) r.style.width = `${patch.width}px`; if (patch.height !== undefined) r.style.height = `${patch.height}px`; if (patch.rotation !== undefined) r.style.transform = `rotate(${patch.rotation}deg)`; }
  navigatorUpdate(board: Board, camera: Viewport, stage: HTMLElement) {
    const items = board.items.filter(i => !i.hidden); const minX = Math.min(0, ...items.map(i => i.x)), minY = Math.min(0, ...items.map(i => i.y)); const maxX = Math.max(1000, ...items.map(i => i.x + i.width)), maxY = Math.max(600, ...items.map(i => i.y + i.height)); const scale = Math.min(184 / (maxX - minX), 104 / (maxY - minY));
    const visibleIds = new Set(items.map(item => item.id)); for (const [id, rect] of this.mini) rect.style.display = visibleIds.has(id) ? '' : 'none';
    for (const item of items) { let rect = this.mini.get(item.id); if (!rect) { rect = svg('rect'); this.mini.set(item.id, rect); this.navigator.insertBefore(rect, this.miniView); } rect.classList.add('navigator-item'); rect.classList.toggle('image', item.kind === 'image'); rect.setAttribute('x', String(8 + (item.x - minX) * scale)); rect.setAttribute('y', String(8 + (item.y - minY) * scale)); rect.setAttribute('width', String(item.width * scale)); rect.setAttribute('height', String(item.height * scale)); rect.style.display = item.hidden ? 'none' : ''; }
    this.miniView.setAttribute('x', String(8 + (-camera.x / camera.zoom - minX) * scale)); this.miniView.setAttribute('y', String(8 + (-camera.y / camera.zoom - minY) * scale)); this.miniView.setAttribute('width', String(stage.clientWidth / camera.zoom * scale)); this.miniView.setAttribute('height', String(stage.clientHeight / camera.zoom * scale));
  }
}
