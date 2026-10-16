import type { Item } from '../lib/types';
import { formatLocale, t } from '../lib/i18n';
import { icon } from '../ui/icons';
import { selected, toast } from './editor';
import { registry } from './registry';

/** Picture Info (reference-board gap: Eagle's and PureRef's image details): the original file's name, format, pixel size and file size, how large it shows on the board, camera details from its EXIF, keywords stored in it and the page it was clipped from. Read only. */

interface Details { name?: string; mime?: string; size?: number; width?: number; height?: number; keywords?: string[]; camera?: string; lens?: string; taken?: string; focal_mm?: number; aperture?: number; exposure?: string; iso?: number; software?: string }

const dialog = document.createElement('dialog');
dialog.className = 'modal picture-info';
dialog.setAttribute('aria-labelledby', 'picture-info-title');
const head = document.createElement('div'); head.className = 'modal-head';
const title = document.createElement('strong'); title.id = 'picture-info-title'; title.dataset.noI18n = '';
const closeIcon = document.createElement('button');
closeIcon.type = 'button'; closeIcon.className = 'icon-button'; closeIcon.title = 'Close'; closeIcon.setAttribute('aria-label', 'Close');
closeIcon.append(icon('close'));
closeIcon.addEventListener('click', () => dialog.close());
head.append(title, closeIcon);
const body = document.createElement('div'); body.className = 'modal-body';
const list = document.createElement('dl'); list.className = 'picture-info-list';
body.append(list);
const foot = document.createElement('div'); foot.className = 'modal-footer';
const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'button picture-info-copy'; copy.textContent = 'Copy Info';
const done = document.createElement('button'); done.type = 'button'; done.className = 'button primary'; done.textContent = 'Close';
done.addEventListener('click', () => dialog.close());
foot.append(copy, done);
dialog.append(head, body, foot);
let plain = '';

const single = (): Item | undefined => {
  const picks = selected();
  return picks.length === 1 && picks[0].kind === 'image' && picks[0].asset_id ? picks[0] : undefined;
};

function format(mime = ''): string {
  const sub = mime.split('/')[1] || mime;
  return ({ jpeg: 'JPEG', 'svg+xml': 'SVG', png: 'PNG', webp: 'WebP', gif: 'GIF', avif: 'AVIF', heic: 'HEIC', tiff: 'TIFF', bmp: 'BMP' } as Record<string, string>)[sub] || sub.toUpperCase();
}

function bytes(size: number): string {
  const [value, unit] = size >= 1e6 ? [size / 1e6, 'megabyte'] : size >= 1e3 ? [size / 1e3, 'kilobyte'] : [size, 'byte'];
  try { return new Intl.NumberFormat(formatLocale(), { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: 1 }).format(value); } catch { return `${value.toFixed(1)} ${unit}`; }
}

function number(value: number, digits = 0): string {
  return new Intl.NumberFormat(formatLocale(), { maximumFractionDigits: digits }).format(value);
}

/** The page a picture came from: the clipper keeps it as the item's url and in data.clip.source; only web addresses become links. */
function sourceOf(item: Item): string {
  const clip = item.data.clip as { source?: unknown } | undefined;
  const value = typeof clip?.source === 'string' && clip.source ? clip.source : item.url;
  return /^https?:\/\//i.test(value || '') ? value : '';
}

function rows(item: Item, details: Details): [string, string | HTMLElement][] {
  const out: [string, string | HTMLElement][] = [];
  if (details.name) out.push(['File', details.name]);
  if (details.mime) out.push(['Format', format(details.mime)]);
  if (details.width && details.height) {
    const megapixels = details.width * details.height / 1e6;
    out.push(['Pixels', `${number(details.width)} × ${number(details.height)}` + (megapixels >= 0.1 ? ` (${number(megapixels, 1)} MP)` : '')]);
  }
  if (details.size) out.push(['File size', bytes(details.size)]);
  if (details.width) out.push(['On the board', `${number(item.width)} × ${number(item.height)} (${number(item.width / details.width * 100)} %)`]);
  if (details.taken) {
    const when = new Date(details.taken);
    out.push(['Taken', Number.isNaN(when.getTime()) ? details.taken : new Intl.DateTimeFormat(formatLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(when)]);
  }
  if (details.camera) out.push(['Camera', details.camera]);
  if (details.lens) out.push(['Lens', details.lens]);
  const settings = [details.focal_mm ? `${number(details.focal_mm, 1)} mm` : '', details.aperture ? `f/${number(details.aperture, 1)}` : '', details.exposure || '', details.iso ? ['ISO', details.iso].join(' ') : ''].filter(Boolean);
  if (settings.length) out.push(['Exposure', settings.join(' · ')]);
  if (details.software) out.push(['Software', details.software]);
  if (details.keywords?.length) out.push(['Keywords in the file', details.keywords.join(', ')]);
  const source = sourceOf(item);
  if (source) {
    const link = document.createElement('a');
    link.href = source; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = source;
    out.push(['Source page', link]);
  }
  return out;
}

/** The details are fetched first and the rows built while the dialog is closed, so it opens complete. */
async function open(): Promise<void> {
  const item = single();
  if (!item) throw new Error('Select one picture to see its details.');
  const response = await fetch(`/api/assets/${item.asset_id}/details`).catch(() => null);
  if (!response?.ok) throw new Error('The details of this picture could not be read.');
  const details: Details = await response.json();
  if (!dialog.isConnected) document.body.append(dialog);
  title.textContent = item.title || details.name || t('Picture Info');
  const entries = rows(item, details);
  list.replaceChildren(...entries.flatMap(([label, value]) => {
    const term = document.createElement('dt'); term.textContent = label;
    const desc = document.createElement('dd'); desc.dataset.noI18n = '';
    desc.append(value);
    return [term, desc];
  }));
  plain = [title.textContent, ...entries.map(([label, value]) => `${t(label)}: ${typeof value === 'string' ? value : value.textContent}`)].join('\n');
  dialog.showModal();
  done.focus();
}

copy.addEventListener('click', () => {
  void navigator.clipboard?.writeText(plain).then(() => toast('Picture details copied.'), () => toast('The details could not be copied.'));
});

export function registerPictureInfo(): void {
  registry.add({
    group: 'Images', id: 'picture-info', label: 'Picture Info…', icon: 'image', keys: ['shift+alt+i'], agent: 'window-only', mutates: false,
    run: () => open().catch(reason => toast((reason as Error).message)),
    enabled: () => !!single(),
    description: 'Shows the selected picture\'s file details: original name, format, pixel size, file size, how large it shows on the board, the camera, lens, exposure and date taken from its EXIF, keywords stored in the file and the page it was clipped from. Copy Info puts them on the clipboard. Read only.',
  });
}
