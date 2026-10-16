import { api } from '../../lib/api';
import { dataUrl } from '../../lib/host';
import { $, closeOverlays, host, openEditor, selected, setText } from '../editor';
import type { CommandDef } from '../registry';
import { hasImages } from './when';

async function assign() {
  const images = selected().filter(i => i.kind === 'image' && i.asset_id);
  if (!images.length) throw new Error('Select one or more images');
  const files = await Promise.all(images.map(async item => {
    const response = await fetch(api.assetUrl(item.asset_id!));
    if (!response.ok) throw new Error('Asset unavailable');
    const blob = await response.blob();
    return { name: item.title || 'reference.png', mime: blob.type, width: Number(item.data.natural_width || item.width), height: Number(item.data.natural_height || item.height), dataUrl: await dataUrl(blob) };
  }));
  host.assign(files);
  setText('host-status', 'Image assignment sent to NodeMode. Awaiting host acknowledgement.');
}

export const INSPECTOR_COMMANDS: CommandDef[] = [
  { group: 'Inspector', id: 'open-source', label: 'Open Note Editor', icon: 'document', run: () => { const item = selected()[0]; if (item) openEditor(item.id); }, enabled: () => selected().some(i => ['note', 'document'].includes(i.kind)) },
  { group: 'Inspector', id: 'format-note', label: 'Format Note as Markdown', icon: 'note', run: () => { const item = selected()[0]; if (item) openEditor(item.id, true); }, enabled: () => selected().some(i => i.kind === 'note') },
  { group: 'Inspector', id: 'assign', label: 'Assign Selected Images to NodeMode', icon: 'send', run: assign, enabled: hasImages },
  { group: 'Inspector', id: 'close-overlays', label: 'Close Dialog', icon: 'close', run: closeOverlays, palette: false },
  { group: 'Inspector', id: 'close-dialog', label: 'Close Dialog', icon: 'close', run: () => $<HTMLDialogElement>('input-dialog').close(), palette: false },
];
