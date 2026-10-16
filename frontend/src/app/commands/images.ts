import { api } from '../../lib/api';
import { startCrop } from '../crop-mode';
import { cutoutOptions, downloadModel, togglePicking } from '../cutout';
import { $, S, applyState, editable, execute, inputDialog, selected, selectedImages, toast } from '../editor';
import type { CommandDef } from '../registry';
import { downloadImages } from './file';
import { has, hasCutout, hasImages } from './when';

export async function setOpacity() {
  const first = selected()[0];
  const form = await inputDialog('Set opacity', { name: String(Math.round((first?.opacity ?? 1) * 100)), label: 'Opacity %', description: 'From 0 (invisible) to 100 (solid).', submit: 'Apply' });
  if (!form) return;
  const value = Number(form.name);
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('Enter an opacity from 0 to 100.');
  await execute({ type: 'opacity', ids: editable(), value: value / 100 });
}

function focusCrop() {
  if (!hasImages()) throw new Error('Select an image to crop.');
  if (selected().length === 1) { startCrop(); return; }
  document.documentElement.dataset.rightDock = 'open';
  try { localStorage.setItem('formref-right-dock', 'open'); } catch { }
  $('crop-x').focus();
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

function cropReset() {
  return execute({ type: 'crop', ids: selectedImages().map(i => i.id), reset: true });
}

export const IMAGE_COMMANDS: CommandDef[] = [
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
];
