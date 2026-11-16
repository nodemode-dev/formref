import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { imageCoordinates } from '../lib/image-geometry';
import type { Item } from '../lib/types';
import { $, S, onInspector, selected, setText, stage, toast, worldPoint } from './editor';

/** Background models, as FormCut offers them: the method picker, downloads and SAM 2.1 point picking. */
export interface ModelInfo { id: string; name: string; license: string; size: string; ready: boolean; bundled: boolean; files: string[]; download: { state: string; fraction: number; error?: string } | null }
interface Listing { runtime: boolean; processor: string | null; models: ModelInfo[] }
export interface CutoutPoint { x: number; y: number; keep: boolean }

const method = $<HTMLSelectElement>('cutout-method');
let listing: Listing | null = null;
let poll = 0;
let picking: { itemId: string; points: CutoutPoint[] } | null = null;
let kept: { itemId: string; points: CutoutPoint[] } | null = null;

const NEEDS: Record<string, string[]> = { auto: ['person-cutout', 'object-cutout'], 'object-cutout': ['object-cutout'], 'person-cutout': ['person-cutout'], 'sharp-cutout': ['sharp-cutout'], 'click-select': ['click-select'] };

function model(id: string) { return listing?.models.find(entry => entry.id === id); }

function missing(): ModelInfo | undefined {
  return (NEEDS[method.value] || []).map(model).find(entry => entry && !entry.ready);
}

function paint() {
  const choice = method.value;
  $('cutout-tolerance-row').hidden = choice !== 'plain';
  $('cutout-model').hidden = choice === 'plain';
  $('cutout-points').hidden = choice !== 'click-select';
  if (choice === 'plain') return;
  const need = missing();
  const busy = need?.download?.state === 'downloading';
  const download = $<HTMLButtonElement>('cutout-download');
  download.disabled = !need || busy || !listing?.runtime;
  $<HTMLButtonElement>('cutout-import').disabled = !need || !listing?.runtime;
  let status: string;
  if (!listing) status = 'Checking models...';
  else if (!listing.runtime) status = 'The service has no ONNX Runtime; run ./formref install again.';
  else if (!need) {
    const names = (NEEDS[choice] || []).map(model).filter(Boolean) as ModelInfo[];
    const label = (entry: ModelInfo) => entry.bundled ? t('{0} (built in)', { 0: t(entry.name) }) : t(entry.name);
    const list = names.length > 1 ? t('{0} and {1}', { 0: label(names[0]), 1: label(names[1]) }) : names.length ? label(names[0]) : '';
    status = t('Ready · {0} · {1}', { 0: list, 1: listing.processor?.replace('ExecutionProvider', '') || 'CPU' });
  } else if (busy) status = `Downloading ${need.name}: ${Math.round((need.download!.fraction || 0) * 100)}%`;
  else if (need.download?.state === 'error') status = need.download.error || 'The download failed.';
  else status = `${need.name} is not downloaded yet · ${need.size} · ${need.license}`;
  setText('cutout-model-status', status);
  const points = picking?.points.length ?? kept?.points.length ?? 0;
  setText('cutout-points-status', picking ? `${points} point${points === 1 ? '' : 's'} · click to keep, Alt-click to leave out, Escape to stop` : points ? `${points} point${points === 1 ? '' : 's'} picked · press Remove` : 'Click what to keep; Alt-click what to leave out.');
}

export async function refreshModels() {
  try { listing = await api.models(); } catch { listing = null; }
  paint();
  window.clearTimeout(poll);
  if (listing?.models.some(entry => entry.download?.state === 'downloading')) poll = window.setTimeout(() => void refreshModels(), 1000);
}

export async function downloadModel() {
  const need = missing();
  if (!need) return;
  listing = await api.downloadModel(need.id);
  paint();
  void refreshModels();
}

export async function importModel(files: FileList) {
  const need = missing();
  if (!need) return;
  for (const file of Array.from(files)) listing = await api.importModel(need.id, file);
  paint();
  toast(missing() ? 'File imported. The model needs its other files too.' : `${need.name} is ready.`);
}

function dots(itemId: string, points: CutoutPoint[]) {
  for (const old of document.querySelectorAll('.cutout-dot')) old.remove();
  const box = stage.querySelector<HTMLElement>(`.board-item[data-id="${itemId}"] .image-content`);
  if (!box) return;
  for (const point of points) {
    const dot = document.createElement('span');
    dot.className = `cutout-dot${point.keep ? '' : ' leave'}`;
    dot.style.left = `${point.x * 100}%`;
    dot.style.top = `${point.y * 100}%`;
    box.append(dot);
  }
}

export function stopPicking() {
  if (!picking) return;
  kept = picking.points.length ? picking : null;
  picking = null;
  stage.classList.remove('picking-points');
  $('cutout-pick').setAttribute('aria-pressed', 'false');
  paint();
}

export function togglePicking() {
  if (picking) { stopPicking(); return; }
  const images = selected().filter(item => item.kind === 'image');
  if (images.length !== 1) { toast('Select one image, then pick points on it.'); return; }
  picking = { itemId: images[0].id, points: [] };
  kept = null;
  dots(images[0].id, []);
  stage.classList.add('picking-points');
  $('cutout-pick').setAttribute('aria-pressed', 'true');
  paint();
}

/** What Remove Background sends: the method, and for SAM 2.1 the points picked on that image. */
export function cutoutOptions(items: Item[]): { method: string; points?: CutoutPoint[] } {
  if (method.value !== 'click-select') return { method: method.value };
  const source = picking || kept;
  if (items.length !== 1 || !source || source.itemId !== items[0].id || !source.points.length) throw new Error('Click to select works on one image: pick points on it first.');
  const points = source.points;
  stopPicking();
  kept = null;
  for (const old of document.querySelectorAll('.cutout-dot')) old.remove();
  return { method: method.value, points };
}

/** Called when the selection changes: a different image ends point picking. */
export function selectionChanged() {
  const only = selected();
  if ((picking || kept) && !(only.length === 1 && only[0].id === (picking || kept)!.itemId)) {
    picking = null; kept = null;
    stage.classList.remove('picking-points');
    $('cutout-pick').setAttribute('aria-pressed', 'false');
    for (const old of document.querySelectorAll('.cutout-dot')) old.remove();
  }
  paint();
}

// While picking, a click on the chosen image is a prompt, not a selection or a drag.
stage.addEventListener('pointerdown', event => {
  if (!picking || event.button !== 0) return;
  const root = (event.target as HTMLElement).closest<HTMLElement>('.board-item');
  if (root?.dataset.id !== picking.itemId) return;
  event.stopImmediatePropagation();
  event.preventDefault();
  const item = S.state?.board.items.find(entry => entry.id === picking!.itemId);
  const at = item && imageCoordinates(item, worldPoint(event), root);
  if (!at) return;
  if (picking.points.length >= 16) { toast('Sixteen points is the most SAM 2.1 takes.'); return; }
  picking.points.push({ x: Math.round(at.u * 10000) / 10000, y: Math.round(at.v * 10000) / 10000, keep: !event.altKey });
  dots(picking.itemId, picking.points);
  paint();
}, true);
window.addEventListener('keydown', event => { if (picking && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); stopPicking(); } }, true);
method.addEventListener('change', () => { if (method.value !== 'click-select') stopPicking(); paint(); if (!listing) void refreshModels(); });
$<HTMLInputElement>('cutout-import-input').addEventListener('change', event => {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) void importModel(input.files).catch(reason => toast(reason instanceof Error ? reason.message : String(reason))).finally(() => { input.value = ''; });
});
onInspector(() => selectionChanged());
paint();
void refreshModels();
