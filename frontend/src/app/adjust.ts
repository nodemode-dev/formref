import type { Item } from '../lib/types';
import { adjustOf, imageFilter, type Adjust } from '../lib/image-geometry';
import { $, execute, onInspector, scene, selected } from './editor';
import { registry } from './registry';

/** Picture adjustments: brightness, contrast and saturation, kept in item data so the original file is untouched; the board, the phone viewer and the PNG, SVG and PDF exports apply them. */

const KEYS: (keyof Adjust)[] = ['brightness', 'contrast', 'saturation'];
const input = (key: keyof Adjust) => $<HTMLInputElement>(`adjust-${key}`);
const pictures = () => selected().filter(i => i.kind === 'image' && !i.locked);

function slider(): Adjust {
  return { brightness: Number(input('brightness').value), contrast: Number(input('contrast').value), saturation: Number(input('saturation').value) };
}

/** While a slider moves, only the selected pictures' image elements change; the engine gets one update when the slider is let go. */
function preview(key: keyof Adjust): void {
  for (const item of pictures()) {
    const image = scene.nodes.get(item.id)?.root.querySelector<HTMLImageElement>('img.reference-image');
    if (image) image.style.filter = imageFilter(item, false, { ...adjustOf(item), [key]: Number(input(key).value) });
  }
}

async function commit(key: keyof Adjust) {
  const items = pictures();
  if (!items.length) return;
  const value = Number(input(key).value);
  await execute({ type: 'batch', commands: items.map(item => ({ type: 'update', ids: [item.id], patch: { data: { adjust: tidy({ ...adjustOf(item), [key]: value }) } } })) });
}

/** Stored only when something differs from 100, so an untouched picture carries no adjust data. */
function tidy(adjust: Adjust): Adjust | null {
  return KEYS.some(k => adjust[k] !== 100) ? adjust : null;
}

async function setAdjust(params?: Record<string, unknown>) {
  const items = pictures();
  if (!items.length) return;
  const asked = KEYS.filter(k => params?.[k] !== undefined);
  for (const k of asked) { const n = Number(params![k]); if (!Number.isFinite(n) || n < 0 || n > 200) throw new Error('Adjustments are from 0 to 200 percent; 100 leaves the picture as it is.'); }
  await execute({ type: 'batch', commands: items.map(item => {
    const next = { ...adjustOf(item) };
    for (const k of asked) next[k] = Number(params![k]);
    return { type: 'update', ids: [item.id], patch: { data: { adjust: asked.length ? tidy(next) : null } } };
  }) });
}

function show(items: Item[]): void {
  const first = items.find(i => i.kind === 'image');
  const values = first ? adjustOf(first) : { brightness: 100, contrast: 100, saturation: 100 };
  for (const key of KEYS) {
    const node = input(key);
    if (document.activeElement !== node && node.value !== String(values[key])) node.value = String(values[key]);
    node.disabled = !items.some(i => i.kind === 'image' && !i.locked);
  }
}

export function registerAdjust(): void {
  for (const key of KEYS) {
    input(key).addEventListener('input', () => preview(key));
    input(key).addEventListener('change', () => void commit(key));
  }
  onInspector(show);
  const has = () => pictures().length > 0;
  registry.add(
    { group: 'Images', id: 'adjust', label: 'Adjust Picture', icon: 'opacity', run: p => setAdjust(p ?? { ...slider() }), enabled: has, palette: false, params: { brightness: { type: 'number', min: 0, max: 200, description: 'percent, 100 unchanged' }, contrast: { type: 'number', min: 0, max: 200, description: 'percent, 100 unchanged' }, saturation: { type: 'number', min: 0, max: 200, description: 'percent, 100 unchanged; 0 is grey' } }, description: 'Sets brightness, contrast and saturation of the selected pictures (0 to 200 percent, 100 unchanged). The original is kept; the board and PNG, SVG, PDF and phone viewer exports show the adjusted picture.' },
    { group: 'Images', id: 'reset-adjust', label: 'Reset Adjustments', icon: 'restore', run: () => setAdjust({}), enabled: () => pictures().some(i => !!i.data.adjust), description: 'Puts brightness, contrast and saturation of the selected pictures back to the original.' },
  );
}
