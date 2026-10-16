import { api } from '../lib/api';
import type { Command, Item } from '../lib/types';
import { newItem } from '../lib/types';
import { dataUrl } from '../lib/host';
import { sampleCommand } from '../ui/sample';
import type { IconName } from '../ui/icons';
import { close as closeTab, forget, replaceActiveWithNext } from './tabs';
import { openTrash } from './trash';
import { openTemplates, saveAsTemplate } from './templates';
import { askForUrl } from './capture';
import { startCrop } from './crop-mode';
import { orderable } from './transform-tools';
import { openLabels } from './labels';
import { togglePresenting } from './present';
import { cutoutOptions, downloadModel, togglePicking } from './cutout';
import { openCloud, refreshCloudPreferences } from './cloud';
import {
  $, S, add, applyState, arrange, closeOverlays, defaultSettings, editable, error, execute, fit, history, host, inputDialog,
  matches, open, openEditor, placement, referenceView, refreshBoards, selected, selectedImages, selection,
  setInput, setSelection, setText, setTool, start, targetIds, toast, topZ, upload, zoom, drawCamera,
} from './editor';

import { registry, type CommandDef } from './registry';
export type { CommandDef };

const has = () => selection.size > 0;
const hasImages = () => selected().some(i => i.kind === 'image');
const hasBoard = () => !!S.state;
const anyLocked = () => selected().some(i => i.locked);

function download(href: string, name: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  link.click();
}

function downloadImages(items: Item[]) {
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

async function setOpacity() {
  const first = selected()[0];
  const form = await inputDialog('Set opacity', { name: String(Math.round((first?.opacity ?? 1) * 100)), label: 'Opacity %', description: 'From 0 (invisible) to 100 (solid).', submit: 'Apply' });
  if (!form) return;
  const value = Number(form.name);
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('Enter an opacity from 0 to 100.');
  await execute({ type: 'opacity', ids: editable(), value: value / 100 });
}

function snapScale(scale: number) {
  if (!scale) return execute({ type: 'settings', patch: { snap_enabled: false } });
  const grid_size = Math.min(512, Math.max(4, defaultSettings.grid_size * scale));
  return execute({ type: 'settings', patch: { snap_enabled: true, grid_size } });
}

export function currentSnapScale(): number {
  const settings = S.state?.board.settings || defaultSettings;
  return settings.snap_enabled ? settings.grid_size / defaultSettings.grid_size : 0;
}

function pickBackground() {
  const input = $<HTMLInputElement>('menu-background');
  input.value = /^#[0-9a-f]{6}$/i.test(S.state?.board.background || '') ? S.state!.board.background : '#1c1b1d';
  if (typeof input.showPicker === 'function') input.showPicker();
  else input.click();
}

function reorder(mode: 'front' | 'forward' | 'backward' | 'back') {
  const ids = orderable();
  return ids.length ? execute({ type: 'order', ids, mode }) : undefined;
}

function focusCrop() {
  if (!hasImages()) throw new Error('Select an image to crop.');
  if (selected().length === 1) { startCrop(); return; }
  document.documentElement.dataset.rightDock = 'open';
  try { localStorage.setItem('formref-right-dock', 'open'); } catch { }
  $('crop-x').focus();
}

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

async function addDocument() {
  if (!S.state) return;
  const boardId = S.state.board.id;
  const p = placement();
  const item = newItem('document', p.x, p.y, { title: 'New document', text: '# A new direction\n\nCollect your thoughts here.', width: 360, height: 300, data: { text_format: 'markdown' }, z: topZ() });
  await execute({ type: 'add', items: [item] }, boardId);
  if (S.state?.board.id === boardId && S.state.board.items.some(i => i.id === item.id)) {
    setSelection([item.id]);
    openEditor(item.id);
  }
}

async function addSwatch() {
  const form = await inputDialog('Add color swatch', { name: '#f97316', label: 'HEX color', description: 'Use #RRGGBB or #RRGGBBAA. Alpha remains part of the saved color.' });
  if (!form) return;
  if (!/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(form.name)) throw new Error('Enter exactly #RRGGBB or #RRGGBBAA.');
  const p = placement();
  const item = newItem('swatch', p.x, p.y, { title: 'Color swatch', color: form.name, width: 220, height: 200, z: topZ() });
  await execute({ type: 'add', items: [item] });
  setSelection([item.id]);
}

async function normalize() {
  const form = await inputDialog('Normalize selected references', { name: '300', normalize: true, label: 'Target size', description: 'Choose width, height or area. Each reference keeps its aspect ratio. Measurements use visible bounds after rotation.', submit: 'Apply' });
  if (!form) return;
  const value = Number(form.name);
  if (!Number.isFinite(value) || value <= 0) throw new Error('Enter a positive target size');
  await execute({ type: 'normalize', ids: editable(), mode: $<HTMLSelectElement>('normalize-mode').value, value });
}

function imageToggle(key: 'flip_x' | 'flip_y' | 'grayscale') {
  return execute({ type: 'image', ids: selectedImages().map(i => i.id), toggle: [key] });
}

function pixelArt() {
  const images = selectedImages();
  const next = images[0].data.sampling === 'nearest' ? 'smooth' : 'nearest';
  return execute({ type: 'image', ids: images.map(i => i.id), set: { sampling: next } });
}

/** Background removal runs on the service, which keeps the original; the result is one undoable step. */
async function background(action: 'remove' | 'restore') {
  if (!S.state) return;
  const images = selectedImages().filter(i => action === 'remove' || i.data.cutout);
  if (!images.length) return;
  const tolerance = Number($<HTMLInputElement>('cutout-tolerance').value) || 12;
  const options = action === 'remove' ? cutoutOptions(images) : { method: 'plain' };
  if (action === 'remove') toast(images.length > 1 ? `Removing ${images.length} backgrounds...` : 'Removing background...');
  const next = await api.background(S.state.board.id, images.map(i => i.id), action, tolerance, options.method, options.points);
  applyState(next);
  const skipped = next.skipped || [];
  if (skipped.length) toast(`${skipped.length} of ${images.length} skipped: ${skipped[0].reason}`);
  else toast(action === 'remove' ? 'Background removed. Restore Background brings the original back.' : 'Original image restored.');
}

/** The pairing token for the browser clipper; only FormRef's own page can read it. */
async function clipToken(reset = false) {
  const { token } = await api.clipToken(reset);
  setInput('clip-token', token);
  return token;
}

async function copyClipToken() {
  await navigator.clipboard.writeText(await clipToken());
  toast('Clipper token copied. Paste it into the FormRef Clipper options.');
}

// An enabled check must never throw: it runs for every menu, palette and inspector refresh, selection or not.
const hasCutout = () => selected().some(i => i.kind === 'image' && !!i.data.cutout);

function cropReset() {
  return execute({ type: 'crop', ids: selectedImages().map(i => i.id), reset: true });
}

function sortBy(key: 'filename' | 'aspect' | 'similarity') {
  const ids = targetIds();
  if (ids.length < 2) throw new Error('Select at least two references to sort, or clear the selection to sort the board.');
  return execute({ type: 'sort', ids, key, gap: Number($<HTMLInputElement>('pack-gap').value) || 24 });
}

function toggleLock() {
  const items = selected();
  if (!items.length) return;
  const lock = !items.some(i => i.locked);
  return execute({ type: 'update', ids: items.map(i => i.id), patch: { locked: lock } });
}

function addNoteHere() {
  return add('note');
}

function drawMode() {
  setTool(S.tool === 'pen' ? 'select' : 'pen');
}

function shapeTool(kind: 'rect' | 'ellipse' | 'line') {
  S.shapeKind = kind;
  setTool('shape');
}

function settingsToggle(key: 'grid_visible' | 'grayscale') {
  const settings = S.state?.board.settings || defaultSettings;
  return execute({ type: 'settings', patch: { [key]: !settings[key] } });
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

function removeSelection() {
  if (S.chosenConnection) {
    const id = S.chosenConnection;
    S.chosenConnection = null;
    return execute({ type: 'disconnect', ids: [id] });
  }
  return execute({ type: 'remove', ids: editable() });
}

function selectAll() {
  setSelection(S.state?.board.items.filter(i => !i.hidden && matches(i)).map(i => i.id) || []);
}

export const COMMANDS: CommandDef[] = [
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

  { group: 'Edit', id: 'undo', label: 'Undo', icon: 'undo', keys: ['mod+z'], run: () => history('undo'), enabled: () => !!S.state?.can_undo },
  { group: 'Edit', id: 'redo', label: 'Redo', icon: 'redo', keys: ['mod+y', 'mod+shift+z'], run: () => history('redo'), enabled: () => !!S.state?.can_redo },
  { group: 'Edit', id: 'select-all', label: 'Select All', icon: 'select-all', keys: ['mod+a'], run: selectAll, enabled: hasBoard },
  { group: 'Edit', id: 'deselect', label: 'Deselect All', icon: 'deselect', keys: ['escape'], run: () => { setSelection([]); setTool('select'); }, enabled: has },
  { group: 'Edit', id: 'duplicate', label: 'Duplicate', icon: 'duplicate', keys: ['mod+d'], run: () => execute({ type: 'duplicate', ids: editable() }), enabled: has },
  { group: 'Edit', id: 'duplicate-synced', label: 'Synced Copy', icon: 'sync', run: () => execute({ type: 'duplicate', ids: selected().filter(i => !i.locked && ['note', 'document'].includes(i.kind)).map(i => i.id), synced: true } as Command), enabled: () => selected().some(i => ['note', 'document'].includes(i.kind)) },
  { group: 'Edit', id: 'unsync', label: 'Stop Syncing', icon: 'unsync', run: () => execute({ type: 'update', ids: selected().filter(i => i.data.sync_id && !i.locked).map(i => i.id), patch: { data: { sync_id: null } } }), enabled: () => selected().some(i => !!i.data.sync_id) },
  { group: 'Edit', id: 'delete', label: 'Delete Selected', icon: 'trash', keys: ['delete', 'backspace'], run: removeSelection, enabled: () => has() || !!S.chosenConnection },
  { group: 'Edit', id: 'lock', label: 'Lock Selected', icon: 'lock', keys: ['l'], run: toggleLock, enabled: has },

  { group: 'Insert', id: 'note', label: 'Add Note', icon: 'note', keys: ['n'], run: addNoteHere, enabled: hasBoard },
  { group: 'Insert', id: 'document', label: 'Add Document', icon: 'document', run: addDocument, enabled: hasBoard },
  { group: 'Insert', id: 'link', label: 'Add Link', icon: 'link', keys: ['shift+l'], run: () => add('link'), enabled: hasBoard },
  { group: 'Insert', id: 'table', label: 'Add Table', icon: 'table', run: () => add('table'), enabled: hasBoard },
  { group: 'Insert', id: 'from-web', label: 'Add Images from the Web…', icon: 'web-image', run: askForUrl, enabled: hasBoard },
  { group: 'Edit', id: 'edit-labels', label: 'Edit Board Labels', icon: 'label', run: openLabels, enabled: hasBoard },
  { group: 'Insert', id: 'todo', label: 'Add Task', icon: 'todo', run: () => add('todo'), enabled: hasBoard },
  { group: 'Insert', id: 'column', label: 'Add Column', icon: 'column', run: () => add('column'), enabled: hasBoard },
  { group: 'Insert', id: 'nested-board', label: 'Add Nested Board', icon: 'board', run: () => add('board'), enabled: hasBoard },
  { group: 'Insert', id: 'swatch', label: 'Add Color Swatch', icon: 'swatch', run: addSwatch, enabled: hasBoard },
  { group: 'Insert', id: 'pick-color', label: 'Sample Image Color', icon: 'pipette', keys: ['i'], run: () => setTool('sample'), enabled: hasBoard },

  { group: 'Tools', id: 'tool-select', label: 'Select Tool', icon: 'cursor', keys: ['v'], run: () => setTool('select') },
  { group: 'Tools', id: 'tool-hand', label: 'Pan Tool', icon: 'hand', keys: ['h'], run: () => setTool('hand') },
  { group: 'Tools', id: 'draw', label: 'Draw Mode', icon: 'brush', keys: ['d'], run: drawMode, enabled: hasBoard },
  { group: 'Tools', id: 'tool-eraser', label: 'Eraser', icon: 'eraser', keys: ['e'], run: () => setTool(S.tool === 'eraser' ? 'select' : 'eraser'), enabled: hasBoard },
  { group: 'Tools', id: 'tool-rect', label: 'Rectangle Tool', icon: 'rect-tool', keys: ['shift+r'], run: () => shapeTool('rect'), enabled: hasBoard },
  { group: 'Tools', id: 'tool-circle', label: 'Circle Tool', icon: 'circle-tool', keys: ['shift+o'], run: () => shapeTool('ellipse'), enabled: hasBoard },
  { group: 'Tools', id: 'tool-line', label: 'Line Tool', icon: 'line-tool', keys: ['shift+i'], run: () => shapeTool('line'), enabled: hasBoard },
  { group: 'Tools', id: 'tool-connect', label: 'Connect References', icon: 'connect', keys: ['shift+c'], run: () => setTool('connect'), enabled: hasBoard },

  { group: 'Canvas', id: 'toggle-grid', label: 'Toggle Grid', icon: 'grid', keys: ['g'], run: () => settingsToggle('grid_visible'), enabled: hasBoard },
  { group: 'Canvas', id: 'grayscale-canvas', label: 'Grayscale Canvas', icon: 'grayscale', run: () => settingsToggle('grayscale'), enabled: hasBoard },
  { group: 'Canvas', id: 'background', label: 'Background Color', icon: 'palette', run: pickBackground, enabled: hasBoard },
  { group: 'Canvas', id: 'fit', label: 'Fit View', icon: 'fit', keys: ['f'], run: () => fit(selection.size ? selected() : undefined) },
  { group: 'Canvas', id: 'fit-all', label: 'Fit Canvas to Content', icon: 'focus-mode', run: () => fit(S.state?.board.items || []) },
  { group: 'Canvas', id: 'reset-zoom', label: 'Reset Zoom', icon: 'search', keys: ['mod+0', '1'], run: () => zoom(1 / S.camera.zoom) },
  { group: 'Canvas', id: 'zoom-in', label: 'Zoom In', icon: 'zoom-in', keys: ['=', '+'], run: () => zoom(1.2) },
  { group: 'Canvas', id: 'zoom-out', label: 'Zoom Out', icon: 'zoom-out', keys: ['-'], run: () => zoom(1 / 1.2) },
  { group: 'Canvas', id: 'navigator', label: 'Toggle Navigator', icon: 'navigator', keys: ['m'], run: () => { $('navigator').hidden = !$('navigator').hidden; drawCamera(); } },
  { group: 'Canvas', id: 'flip-view-horizontal', label: 'Flip View Horizontally', icon: 'flip', keys: ['shift+h'], mutates: false, agent: 'window-only', checked: () => S.flipX, run: () => { S.flipX = !S.flipX; drawCamera(); $('stage').classList.toggle('flipped', S.flipX || S.flipY); toast(S.flipX ? 'View flipped horizontally. The board itself is unchanged.' : 'View no longer flipped horizontally.'); }, description: 'Mirrors the view left to right to check a drawing with fresh eyes, as artists flip a canvas; the board, exports and other windows are unchanged.' },
  { group: 'Canvas', id: 'flip-view-vertical', label: 'Flip View Vertically', icon: 'flip', keys: ['shift+v'], mutates: false, agent: 'window-only', checked: () => S.flipY, run: () => { S.flipY = !S.flipY; drawCamera(); $('stage').classList.toggle('flipped', S.flipX || S.flipY); toast(S.flipY ? 'View flipped vertically. The board itself is unchanged.' : 'View no longer flipped vertically.'); }, description: 'Mirrors the view top to bottom; the board itself is unchanged.' },
  { group: 'Canvas', id: 'focus', label: 'Focus Mode', icon: 'focus-mode', keys: ['tab'], run: () => { $('app').classList.toggle('focus'); drawCamera(); } },

  { group: 'Organize', id: 'pack', label: 'Pack', icon: 'pack', keys: ['mod+p'], run: () => arrange('pack'), enabled: hasBoard },
  { group: 'Organize', id: 'sort-aspect', label: 'Sort by Aspect Ratio', icon: 'sort', run: () => sortBy('aspect'), enabled: hasBoard },
  { group: 'Organize', id: 'sort-filename', label: 'Sort by Filename', icon: 'sort', run: () => sortBy('filename'), enabled: hasBoard },
  { group: 'Organize', id: 'sort-similarity', label: 'Sort by Similarity', icon: 'similarity', run: () => sortBy('similarity'), enabled: hasBoard },
  { group: 'Organize', id: 'group', label: 'Group Selected', icon: 'group', keys: ['mod+g'], run: () => execute({ type: 'group', ids: editable() }), enabled: () => selection.size > 1 },
  { group: 'Organize', id: 'ungroup', label: 'Ungroup Selected', icon: 'ungroup', keys: ['mod+shift+g'], run: () => execute({ type: 'ungroup', ids: editable() }), enabled: () => selected().some(i => i.group_id) },
  { group: 'Organize', id: 'align', label: 'Align', icon: 'align-left', run: () => execute({ type: 'align', ids: editable(), mode: $<HTMLSelectElement>('align-mode').value }), enabled: () => selection.size > 1 },
  { group: 'Organize', id: 'distribute-x', label: 'Space Horizontally', icon: 'distribute-h', run: () => arrange('distribute', 'x'), enabled: () => selection.size > 1 },
  { group: 'Organize', id: 'distribute-y', label: 'Space Vertically', icon: 'distribute-v', run: () => arrange('distribute', 'y'), enabled: () => selection.size > 1 },
  { group: 'Organize', id: 'normalize', label: 'Normalize Sizes', icon: 'normalize', run: normalize, enabled: () => selection.size > 1 },
  { group: 'Organize', id: 'snap', label: 'Snap Selection to Grid', icon: 'snap', run: () => execute({ type: 'snap', ids: editable() }), enabled: has },

  { group: 'Images', id: 'flip-x', label: 'Flip Horizontal', icon: 'flip-h', run: () => imageToggle('flip_x'), enabled: hasImages },
  { group: 'Images', id: 'flip-y', label: 'Flip Vertical', icon: 'flip-v', run: () => imageToggle('flip_y'), enabled: hasImages },
  { group: 'Images', id: 'grayscale', label: 'Toggle Grayscale', icon: 'grayscale', run: () => imageToggle('grayscale'), enabled: hasImages },
  { group: 'Images', id: 'sampling', label: 'Toggle Pixel Art', icon: 'pixel', run: pixelArt, enabled: hasImages },
  { group: 'Images', id: 'opacity', label: 'Set Opacity', icon: 'opacity', run: setOpacity, enabled: has },
  { group: 'Images', id: 'crop', label: 'Crop', icon: 'crop', keys: ['c'], run: focusCrop, enabled: hasImages },
  { group: 'Images', id: 'reset-crop', label: 'Reset Crop', icon: 'reset-crop', run: cropReset, enabled: hasImages },
  { group: 'Images', id: 'remove-background', label: 'Remove Background', icon: 'cutout', run: () => background('remove'), enabled: hasImages },
  { group: 'Images', id: 'restore-background', label: 'Restore Background', icon: 'restore', run: () => background('restore'), enabled: hasCutout },
  { group: 'Images', id: 'download-cutout-model', label: 'Download Background Model', icon: 'import', palette: false, run: downloadModel },
  { group: 'Images', id: 'import-cutout-model', label: 'Import Background Model File', icon: 'paperclip', palette: false, run: () => $('cutout-import-input').click() },
  { group: 'Images', id: 'pick-cutout-points', label: 'Pick Points for Click to Select', icon: 'focus-mode', palette: false, run: togglePicking, enabled: () => selected().filter(i => i.kind === 'image').length === 1 },
  { group: 'Images', id: 'rotate', label: 'Rotate 90', icon: 'rotate', keys: ['r'], run: () => execute({ type: 'rotate', ids: editable(), degrees: 90 }), enabled: has },
  { group: 'Images', id: 'save-image', label: 'Save Image As...', icon: 'save', run: () => downloadImages(selected()), enabled: hasImages },
  { group: 'Images', id: 'relink', label: 'Replace or Relink Image', icon: 'relink', run: () => $('relink-input').click(), enabled: () => selected().length === 1 && hasImages() },

  { group: 'Layer', id: 'front', label: 'Bring to Front', icon: 'bring-front', keys: ['shift+arrowup'], run: () => reorder('front'), enabled: has },
  { group: 'Layer', id: 'forward', label: 'Bring Forward', icon: 'layers', run: () => reorder('forward'), enabled: has },
  { group: 'Layer', id: 'backward', label: 'Send Backward', icon: 'layers', run: () => reorder('backward'), enabled: has },
  { group: 'Layer', id: 'back', label: 'Send to Back', icon: 'send-back', keys: ['shift+arrowdown'], run: () => reorder('back'), enabled: has },

  { group: 'View', id: 'present', label: 'Present', icon: 'present', keys: ['p'], run: togglePresenting, enabled: hasBoard },
  { group: 'View', id: 'slideshow', label: 'Slideshow', icon: 'play', keys: ['shift+s'], run: () => referenceView.toggle(), enabled: () => !!S.state?.board.items.some(i => i.kind === 'image') },
  { group: 'View', id: 'reference-focus', label: 'Focus Image Reference', icon: 'image', run: () => referenceView.focus(), enabled: hasImages },
  { group: 'View', id: 'reference-prev', label: 'Previous Reference', icon: 'chevron-left', run: () => referenceView.step(-1), palette: false },
  { group: 'View', id: 'reference-next', label: 'Next Reference', icon: 'chevron-right', run: () => referenceView.step(1), palette: false },
  { group: 'View', id: 'reference-play', label: 'Play or Pause References', icon: 'play', run: () => referenceView.toggle(), palette: false },
  { group: 'View', id: 'reference-stop', label: 'Exit Reference View', icon: 'close', run: () => referenceView.stop(true), palette: false },
  { group: 'View', id: 'left-dock', label: 'Toggle Left Panel', icon: 'dock-left', keys: ['mod+['], run: () => toggleDock('left') },
  { group: 'View', id: 'right-dock', label: 'Toggle Right Panel', icon: 'dock-right', keys: ['mod+]'], run: () => toggleDock('right') },
  { group: 'View', id: 'agent', label: 'Open Agent', icon: 'agent', run: () => showRightPanel('agent') },
  { group: 'View', id: 'commands', label: 'Commands', icon: 'commands', keys: ['mod+k'], run: () => openPalette(), palette: false },
  { group: 'View', id: 'help', label: 'Keyboard Shortcuts', icon: 'keyboard', keys: ['?', 'shift+/'], run: () => $<HTMLDialogElement>('help-dialog').showModal() },
  { group: 'View', id: 'preferences', label: 'Preferences', icon: 'settings', keys: ['mod+,'], run: () => { setInput('theme-select', document.documentElement.dataset.theme || 'studio'); $<HTMLDialogElement>('preferences-dialog').showModal(); void clipToken().catch(error); void refreshCloudPreferences(); } },
  { group: 'File', id: 'copy-clip-token', label: 'Copy Browser Clipper Token', icon: 'paste', run: copyClipToken },
  { group: 'File', id: 'reset-clip-token', label: 'New Browser Clipper Token', icon: 'relink', palette: false, run: async () => { await clipToken(true); toast('New clipper token made. Paste it into the clipper options; the old one no longer works.'); } },

  { group: 'Inspector', id: 'open-source', label: 'Open Note Editor', icon: 'document', run: () => { const item = selected()[0]; if (item) openEditor(item.id); }, enabled: () => selected().some(i => ['note', 'document'].includes(i.kind)) },
  { group: 'Inspector', id: 'format-note', label: 'Format Note as Markdown', icon: 'note', run: () => { const item = selected()[0]; if (item) openEditor(item.id, true); }, enabled: () => selected().some(i => i.kind === 'note') },
  { group: 'Inspector', id: 'assign', label: 'Assign Selected Images to NodeMode', icon: 'send', run: assign, enabled: hasImages },
  { group: 'Inspector', id: 'close-overlays', label: 'Close Dialog', icon: 'close', run: closeOverlays, palette: false },
  { group: 'Inspector', id: 'close-dialog', label: 'Close Dialog', icon: 'close', run: () => $<HTMLDialogElement>('input-dialog').close(), palette: false },
];

registry.add(...COMMANDS);
export const BY_ID = registry.byId;

export function lockLabel(): string {
  return anyLocked() ? 'Unlock Selected' : 'Lock Selected';
}

/** A command whose check fails counts as disabled, so one faulty check can never stop a menu or the palette opening. */
export function isEnabled(command: CommandDef): boolean {
  try {
    return command.enabled ? command.enabled() : true;
  } catch (reason) {
    console.warn(`Enabled check for ${command.id} failed`, reason);
    return false;
  }
}

export function run(id: string) {
  const command = BY_ID.get(id);
  if (!command) throw new Error(`Unknown command ${id}`);
  if (!isEnabled(command)) return;
  void Promise.resolve().then(() => command.run()).catch(error);
}

const KEY_NAMES: Record<string, string> = {
  mod: navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl', shift: 'Shift', alt: 'Alt', escape: 'Esc', delete: 'Del', backspace: 'Backspace',
  arrowup: 'Up', arrowdown: 'Down', tab: 'Tab', '=': '=', '+': '+', '-': '-', '[': '[', ']': ']', ',': ',',
};

export function keyLabel(combo: string): string {
  return combo.split('+').map(part => KEY_NAMES[part] || part.toUpperCase()).join('+').replace('Shift+/', '?');
}

export function primaryKey(command: CommandDef): string {
  return command.keys?.length ? keyLabel(command.keys[0]) : '';
}

export function comboOf(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('mod');
  if (event.shiftKey && event.key !== '?' && event.key !== '+') parts.push('shift');
  if (event.altKey) parts.push('alt');
  const physical = event.altKey && /^(Key[A-Z]|Digit\d)$/.test(event.code) ? event.code.slice(event.code.startsWith('Key') ? 3 : 5).toLowerCase() : '';
  parts.push(physical || (event.key === ' ' ? 'space' : event.key.toLowerCase()));
  return parts.join('+');
}

const keymap = new Map<string, CommandDef>();
const DEFAULT_KEYS = registry.defaults;
const keyListeners: (() => void)[] = [];

function rebuildKeymap() {
  keymap.clear();
  for (const command of registry.all()) for (const combo of command.keys || []) keymap.set(combo, command);
  keyListeners.forEach(listener => listener());
}
rebuildKeymap();
registry.onChange(() => rebuildKeymap());

export function onKeysChanged(listener: () => void) { keyListeners.push(listener); }

/** Shortcut overrides: only commands whose keys differ from the defaults. */
export function keyOverrides(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const command of registry.all()) {
    const keys = command.keys || [];
    if (keys.join(' ') !== (DEFAULT_KEYS.get(command.id) || []).join(' ')) out[command.id] = [...keys];
  }
  return out;
}

export function applyKeyOverrides(overrides: Record<string, string[]>) {
  for (const command of registry.all()) command.keys = [...(overrides[command.id] || DEFAULT_KEYS.get(command.id) || [])];
  rebuildKeymap();
}

/** Give a command one shortcut; returns the command it was taken from, if any. */
export function assignKey(id: string, combo: string): CommandDef | undefined {
  const owner = keymap.get(combo);
  if (owner && owner.id !== id) owner.keys = (owner.keys || []).filter(k => k !== combo);
  const command = BY_ID.get(id)!;
  command.keys = [combo];
  rebuildKeymap();
  return owner && owner.id !== id ? owner : undefined;
}

export const RESERVED_KEYS = new Set(['mod+t', 'mod+w', 'mod+q', 'mod+shift+t', 'mod+shift+w', 'mod+shift+n', 'mod+tab', 'mod+r', 'mod+l', 'f5', 'f11', 'f12', 'space']);

export function commandForKey(event: KeyboardEvent): CommandDef | undefined {
  return keymap.get(comboOf(event));
}

let paletteOpener: () => void = () => undefined;
let dockToggler: (side: 'left' | 'right') => void = () => undefined;
let panelShower: (panel: string) => void = () => undefined;
export function bindShell(hooks: { palette: () => void; dock: (side: 'left' | 'right') => void; panel: (panel: string) => void }) {
  paletteOpener = hooks.palette;
  dockToggler = hooks.dock;
  panelShower = hooks.panel;
}
function openPalette() { paletteOpener(); }
function toggleDock(side: 'left' | 'right') { dockToggler(side); }
function showRightPanel(panel: string) { panelShower(panel); }

export { snapScale, currentSnapScale as snapScaleNow, setOpacity };
export const SNAP_SCALES = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
export { toast, selected };
