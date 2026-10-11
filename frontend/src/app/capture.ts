import { request } from '../lib/api';
import type { Asset, Point } from '../lib/types';
import { $, S, error, inputDialog, placeAssets, placement, setText, toast } from './editor';

type Captured = { asset: Asset; url: string } | { page: string; images: string[] };

const dialog = $<HTMLDialogElement>('capture-dialog');
const grid = $('capture-grid');
const addButton = $<HTMLButtonElement>('capture-add');
const picked = new Set<string>();
let target: Point | null = null;

export function webUrl(text: string | undefined | null): string | null {
  const value = (text || '').trim().split(/\s+/)[0];
  return /^https?:\/\/[^\s]+$/i.test(value) ? value : null;
}

/** The image a browser drag carries: the first img src in its HTML, else its URL list. */
export function droppedUrl(data: DataTransfer | null): string | null {
  if (!data) return null;
  const html = data.getData('text/html');
  const src = html && /<img[^>]+src="([^"]+)"/i.exec(html)?.[1];
  if (src && webUrl(src)) return src;
  const list = data.getData('text/uri-list').split('\n').find(line => line && !line.startsWith('#'));
  return webUrl(list) || webUrl(data.getData('text/plain'));
}

function label() {
  const text = `Add ${picked.size} Image${picked.size === 1 ? '' : 's'}`;
  if (addButton.lastChild!.textContent !== text) addButton.lastChild!.textContent = text;
  addButton.disabled = !picked.size;
}

function showPage(page: string, images: string[]) {
  picked.clear();
  setText('capture-title', `Images on ${new URL(page).hostname}`);
  setText('capture-note', images.length ? 'Pick the images to add. They are downloaded and kept with your board.' : 'No images were found on that page.');
  grid.replaceChildren(...images.map(url => {
    const cell = document.createElement('button');
    cell.className = 'capture-cell';
    cell.title = url;
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.alt = '';
    img.src = url;
    img.addEventListener('error', () => cell.classList.add('broken'));
    cell.append(img);
    cell.addEventListener('click', () => {
      if (picked.has(url)) picked.delete(url); else picked.add(url);
      cell.classList.toggle('picked', picked.has(url));
      cell.setAttribute('aria-pressed', String(picked.has(url)));
      label();
    });
    return cell;
  }));
  label();
  if (!dialog.open) dialog.showModal();
}

export async function captureUrl(url: string, at: Point = placement()) {
  if (!S.state) throw new Error('Open a board first.');
  setText('save-status', 'Fetching…');
  const result = await request<Captured>('/capture', { method: 'POST', body: JSON.stringify({ url }) });
  if ('asset' in result) {
    await placeAssets([{ asset: result.asset, name: result.asset.name, url: result.url }], at);
    return;
  }
  setText('save-status', 'Saved locally');
  target = at;
  showPage(result.page, result.images);
}

addButton.addEventListener('click', () => {
  const urls = [...picked];
  const at = target || placement();
  dialog.close();
  void (async () => {
    const assets: { asset: Asset; name: string; url: string }[] = [];
    const failed: string[] = [];
    for (const url of urls) {
      setText('save-status', `Fetching ${assets.length + failed.length + 1} of ${urls.length}…`);
      try {
        const result = await request<Captured>('/capture', { method: 'POST', body: JSON.stringify({ url }) });
        if ('asset' in result) assets.push({ asset: result.asset, name: result.asset.name, url: result.url });
        else failed.push(url);
      } catch {
        failed.push(url);
      }
    }
    await placeAssets(assets, at);
    if (failed.length) toast(`${failed.length} of ${urls.length} images could not be downloaded.`);
  })().catch(error);
});

export async function askForUrl() {
  const form = await inputDialog('Add images from the web', { name: '', label: 'Image or page address', description: 'Paste the address of an image, or of a page to pick images from it. You can also drag images from a browser onto the board, or paste an address.', submit: 'Fetch' });
  const url = webUrl(form?.name);
  if (form && !url) throw new Error('That is not an http or https address.');
  if (url) await captureUrl(url);
}
