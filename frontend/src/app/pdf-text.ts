import type { Item } from '../lib/types';
import { request } from '../lib/api';

/** Page text of PDF assets for board search, fetched once per asset the first time a search needs it. null marks a fetch in flight or a PDF without readable text. */
const texts = new Map<string, string[] | null>();
let loaded: () => void = () => undefined;

/** Called when new text arrives, so the current search can run again with it. */
export function onPdfText(fn: () => void): void { loaded = fn; }

const isPdf = (item: Item) => item.kind === 'file' && !!item.asset_id && (item.data.mime === 'application/pdf' || /\.pdf$/i.test(item.title));

function load(asset: string): void {
  texts.set(asset, null);
  void request<{ pages: string[] }>(`/assets/${asset}/text`).then(result => { texts.set(asset, result.pages); loaded(); }).catch(() => undefined);
}

/** The words a search should see for an item: a PDF file's whole text, or one page's text for an image made by PDF Pages to Images. */
export function pdfSearchText(item: Item): string {
  const page = typeof item.data.pdf_page === 'number' && typeof item.data.pdf_source === 'string' ? item.data.pdf_page : 0;
  const asset = isPdf(item) ? item.asset_id! : page ? (item.data.pdf_source as string) : '';
  if (!asset) return '';
  const pages = texts.get(asset);
  if (pages === undefined) { load(asset); return ''; }
  if (!pages) return '';
  return page ? pages[page - 1] || '' : pages.join(' ');
}
