import { api } from '../../lib/api';
import type { Command, Item } from '../../lib/types';
import { sampleCommand } from '../../ui/sample';
import { close as closeTab, forget, replaceActiveWithNext } from '../tabs';
import { openTrash } from '../trash';
import { openTemplates, saveAsTemplate } from '../templates';
import { openCloud } from '../cloud';
import { $, S, closeOverlays, execute, fit, inputDialog, open, refreshBoards, selected, setInput, setText, start, toast, upload } from '../editor';
import type { CommandDef } from '../registry';
import { hasBoard, hasImages } from './when';

function download(href: string, name: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  link.click();
}

export function downloadImages(items: Item[]) {
  const images = items.filter(i => i.kind === 'image' && i.asset_id);
  if (!images.length) throw new Error('There are no images to export.');
  images.forEach((item, index) => download(api.assetUrl(item.asset_id!), item.title || `image_${index + 1}.png`));
}

async function pasteFromClipboard() {
  if (!navigator.clipboard?.read) throw new Error('Paste with Ctrl or Cmd + V; this browser does not let the menu read the clipboard.');
  const files: File[] = [];
  for (const entry of await navigator.clipboard.read()) {
    const type = entry.types.find(t => t.startsWith('image/'));
    if (type) files.push(new File([await entry.getType(type)], 'Pasted Image.' + type.split('/')[1], { type }));
  }
  if (!files.length) throw new Error('The clipboard has no image.');
  await upload(files);
}

/** The pairing token for the browser clipper; only FormRef's own page can read it. */
export async function clipToken(reset = false) {
  const { token } = await api.clipToken(reset);
  setInput('clip-token', token);
  return token;
}

async function copyClipToken() {
  await navigator.clipboard.writeText(await clipToken());
  toast('Clipper token copied. Paste it into the FormRef Clipper options.');
}

async function deleteBoard() {
  if (!S.state) return;
  const id = S.state.board.id;
  const title = S.state.board.title;
  const form = await inputDialog(`Delete ${title}?`, { label: 'Type DELETE to confirm', description: 'The board moves to the Trash, where you can restore it until the trash is emptied.', submit: 'Delete board' });
  if (form?.name !== 'DELETE') return;
  await S.queue;
  await api.remove(id);
  forget(id);
  S.events?.close();
  S.state = null;
  await start();
}

async function newBoard(replace = false) {
  const form = await inputDialog(replace ? 'New board in this tab' : 'New board in a new tab', { name: 'Untitled board' });
  if (!form) return;
  if (replace) replaceActiveWithNext();
  const next = await api.create(form.name || 'Untitled board');
  await open(next.board.id, next);
}

async function renameBoard() {
  if (!S.state) return;
  const form = await inputDialog('Rename board', { name: S.state.board.title, submit: 'Save' });
  if (form) await execute({ type: 'rename', title: form.name || 'Untitled board' });
}

async function sampleBoard() {
  if (!S.state) return;
  if (S.state.board.items.length) {
    const next = await api.create('Quiet structures');
    await open(next.board.id, next);
  }
  const boardId = S.state!.board.id;
  setText('save-status', 'Creating sample…');
  await execute(await sampleCommand() as Command, boardId);
  if (S.state?.board.id === boardId) fit();
  await refreshBoards();
}

function chooseImport(mode: 'replace' | 'tab') {
  $('import-input').dataset.mode = mode;
  $('import-input').click();
}

function chooseFiles(accept: string) {
  $<HTMLInputElement>('files-input').accept = accept;
  $('files-input').click();
}

export const FILE_COMMANDS: CommandDef[] = [
  { group: 'File', id: 'new-board', label: 'New', icon: 'new-file', keys: ['mod+n'], run: () => newBoard(true) },
  { group: 'File', id: 'new-tab', label: 'New Tab', icon: 'new-tab', run: () => newBoard(false) },
  { group: 'File', id: 'open-file', label: 'Open Board File', icon: 'open-folder', keys: ['mod+o'], run: () => chooseImport('replace') },
  { group: 'File', id: 'open-file-tab', label: 'Open in New Tab', icon: 'open-folder', run: () => chooseImport('tab') },
  { group: 'File', id: 'close-tab', label: 'Close Tab', icon: 'close', keys: ['alt+w'], run: () => S.state && closeTab(S.state.board.id), enabled: hasBoard },
  { group: 'File', id: 'images', label: 'Add Images', icon: 'image-add', keys: ['mod+i'], run: () => chooseFiles('image/*'), enabled: hasBoard },
  { group: 'File', id: 'file', label: 'Attach File', icon: 'paperclip', run: () => chooseFiles(''), enabled: hasBoard },
  { group: 'File', id: 'paste', label: 'Paste', icon: 'paste', keys: ['mod+v'], run: pasteFromClipboard, enabled: hasBoard, palette: true },
  { group: 'File', id: 'save', label: 'Save Board (.formref)', icon: 'save', keys: ['mod+s'], run: () => S.state && download(api.exportUrl(S.state.board.id, 'portable'), ''), enabled: hasBoard },
  { group: 'File', id: 'export', label: 'Export…', icon: 'export', keys: ['mod+e'], run: () => $<HTMLDialogElement>('export-dialog').showModal(), enabled: hasBoard },
  { group: 'File', id: 'save-to-cloud', label: 'Save Board to Cloud…', icon: 'export', run: () => openCloud('save'), enabled: hasBoard },
  { group: 'File', id: 'open-from-cloud', label: 'Open from Cloud…', icon: 'import', run: () => openCloud('browse') },
  { group: 'File', id: 'export-png', label: 'Export Canvas as PNG', icon: 'image', run: () => S.state && download(api.exportUrl(S.state.board.id, 'png'), ''), enabled: hasBoard },
  { group: 'File', id: 'export-all-images', label: 'Export All Images', icon: 'export', run: () => downloadImages(S.state?.board.items || []), enabled: hasBoard },
  { group: 'File', id: 'export-selected', label: 'Export Selected', icon: 'export', run: () => downloadImages(selected()), enabled: hasImages },
  { group: 'File', id: 'rename', label: 'Rename Board', icon: 'pen', run: renameBoard, enabled: hasBoard },
  { group: 'File', id: 'duplicate-board', label: 'Duplicate Board', icon: 'duplicate', run: async () => { if (!S.state) return; const next = await api.duplicate(S.state.board.id); closeOverlays(); await open(next.board.id, next); }, enabled: hasBoard },
  { group: 'File', id: 'delete-board', label: 'Delete Board', icon: 'trash', run: deleteBoard, enabled: hasBoard },
  { group: 'File', id: 'trash', label: 'Open Trash', icon: 'trash-open', run: openTrash },
  { group: 'File', id: 'new-from-template', label: 'New from Template', icon: 'template', run: openTemplates },
  { group: 'File', id: 'save-template', label: 'Save as Template', icon: 'template-save', run: saveAsTemplate, enabled: hasBoard },
  { group: 'File', id: 'sample', label: 'Create Sample Board', icon: 'board', run: sampleBoard },
];

/** The clipper token commands are File commands that have always sat after View in the table, so they keep that place in menus and the palette. */
export const CLIP_COMMANDS: CommandDef[] = [
  { group: 'File', id: 'copy-clip-token', label: 'Copy Browser Clipper Token', icon: 'paste', run: copyClipToken },
  { group: 'File', id: 'reset-clip-token', label: 'New Browser Clipper Token', icon: 'relink', palette: false, run: async () => { await clipToken(true); toast('New clipper token made. Paste it into the clipper options; the old one no longer works.'); } },
];
