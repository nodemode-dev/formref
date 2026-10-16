import { request } from '../lib/api';
import type { Item, State } from '../lib/types';
import { S, applyState, inputDialog, selected, setSelection, toast } from './editor';
import { registry } from './registry';

/** PDF pages as images: renders the selected PDF's pages into image references beside it. */
function pdfItem(): Item | null {
  const items = selected();
  const item = items.length === 1 ? items[0] : null;
  return item && item.kind === 'file' && item.asset_id && (item.data.mime === 'application/pdf' || /\.pdf$/i.test(item.title)) ? item : null;
}

async function pagesToImages(params?: Record<string, unknown>) {
  const item = pdfItem();
  if (!item || !S.state) throw new Error('Select one PDF on the board.');
  let first = typeof params?.first === 'number' ? params.first : NaN, last = typeof params?.last === 'number' ? params.last : NaN;
  if (!Number.isFinite(first)) {
    const form = await inputDialog('PDF pages to images', { name: '1-', label: 'Pages', description: 'A page or a range, such as 3, 2-5 or 1- for every page. Each page becomes an image reference beside the PDF.', submit: 'Add pages' });
    if (!form) return;
    const match = /^\s*(\d+)\s*(?:(-)\s*(\d*))?\s*$/.exec(form.name);
    if (!match) throw new Error('Write a page or a range, such as 3, 2-5 or 1-.');
    first = Number(match[1]);
    last = match[2] ? (match[3] ? Number(match[3]) : 0) : first;
  }
  const dpi = typeof params?.dpi === 'number' ? params.dpi : 150;
  toast('Rendering PDF pages...');
  const result = await request<State & { added: string[]; pages: number }>(`/boards/${S.state.board.id}/items/${item.id}/pdf-pages?first=${first}&last=${Number.isFinite(last) ? last : 0}&dpi=${dpi}`, { method: 'POST' });
  applyState(result);
  setSelection(result.added);
  toast(`Pages added: ${result.added.length} of ${result.pages}.`);
}

export function registerPdf(): void {
  registry.add({
    group: 'Images', id: 'pdf-to-images', label: 'PDF Pages to Images...', icon: 'document', run: p => pagesToImages(p), enabled: () => !!pdfItem(),
    params: { first: { type: 'integer', min: 1, description: 'first page, 1 based' }, last: { type: 'integer', min: 0, description: 'last page; 0 for the end' }, dpi: { type: 'integer', min: 36, max: 600, description: 'resolution, default 150' } },
    description: 'Renders pages of the selected PDF into image references laid out beside it, so they can be cropped, flipped, sampled and arranged like any picture.',
  });
}
