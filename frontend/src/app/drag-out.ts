import { api } from '../lib/api';
import { S, stage } from './editor';

/** Alt-drag an image out of formref into another application (a file manager, Photoshop, a chat), as PureRef and Milanote users asked: the drag carries the original file. */
const OWN = 'application/x-formref-item';
let source: HTMLElement | null = null;

function extension(mime: string): string {
  return ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif', 'image/bmp': 'bmp' } as Record<string, string>)[mime] || 'png';
}

stage.addEventListener('pointerdown', event => {
  if (!event.altKey || event.button !== 0 || S.tool !== 'select') return;
  const root = (event.target as Element).closest<HTMLElement>('.board-item');
  const item = root && S.state?.board.items.find(i => i.id === root.dataset.id);
  if (!root || !item || item.kind !== 'image' || !item.asset_id) return;
  event.stopImmediatePropagation();
  root.draggable = true;
  source = root;
}, true);

document.addEventListener('pointerup', () => { if (source && !source.matches(':active')) { source.draggable = false; source = null; } });

stage.addEventListener('dragstart', event => {
  const root = (event.target as Element).closest<HTMLElement>('.board-item');
  const item = root && S.state?.board.items.find(i => i.id === root.dataset.id);
  if (!root || root !== source || !item?.asset_id || !event.dataTransfer) { if (root && root !== source) event.preventDefault(); return; }
  const url = new URL(api.assetUrl(item.asset_id), location.href).href;
  const titled = /\.(png|jpe?g|webp|gif|svg|avif|bmp)$/i.exec(item.title || '')?.[1].toLowerCase();
  const mime = String(item.data.mime || (titled ? `image/${titled === 'jpg' ? 'jpeg' : titled === 'svg' ? 'svg+xml' : titled}` : 'image/png'));
  const base = (item.title || 'reference').replace(/[\\/:*?"<>|]+/g, '-').replace(/\.[a-z0-9]{2,4}$/i, '').slice(0, 80) || 'reference';
  const name = `${base}.${extension(mime)}`;
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('DownloadURL', `${mime}:${name}:${url}`);
  event.dataTransfer.setData('text/uri-list', url);
  event.dataTransfer.setData('text/plain', url);
  event.dataTransfer.setData(OWN, item.id);
  const img = root.querySelector('img');
  if (img) event.dataTransfer.setDragImage(img, Math.min(img.clientWidth, 120) / 2, Math.min(img.clientHeight, 120) / 2);
});

stage.addEventListener('dragend', () => { if (source) { source.draggable = false; source = null; } });

for (const type of ['dragenter', 'dragover', 'drop'] as const) {
  stage.addEventListener(type, event => {
    if (!event.dataTransfer?.types.includes(OWN)) return;
    event.stopImmediatePropagation();
    if (type !== 'drop') { event.preventDefault(); event.dataTransfer.dropEffect = 'none'; }
  }, true);
}
