import { BLENDS } from '../ui/scene';
import { $, editable, error, execute, selected } from './editor';
import { registry } from './registry';

/** Illustrator's Transparency panel blending modes on any item: Normal plus the fifteen separable and non-separable modes, drawn with CSS mix-blend-mode against the items beneath it. */
async function setBlend(mode: string) {
  if (mode !== 'normal' && !BLENDS.includes(mode)) throw new Error(`Blending mode is one of normal, ${BLENDS.join(', ')}.`);
  const ids = new Set(editable());
  const items = selected().filter(item => ids.has(item.id) && !item.locked);
  if (!items.length) throw new Error('Select the items to blend.');
  await execute({ type: 'batch', commands: items.map(item => ({ type: 'update', ids: [item.id], patch: { data: { ...item.data, blend: mode === 'normal' ? null : mode } } })) });
}

export function registerBlend(): void {
  $<HTMLSelectElement>('prop-blend').addEventListener('change', event => { void setBlend((event.target as HTMLSelectElement).value).catch(error); });
  registry.add({
    group: 'Inspector', id: 'blend-mode', label: 'Set Blending Mode', icon: 'layers', palette: false, run: p => setBlend(String((p as { mode?: unknown } | undefined)?.mode ?? 'normal')),
    enabled: () => selected().length > 0, params: { mode: { type: 'string', enum: ['normal', ...BLENDS], required: true, description: 'how the selected items mix with what is beneath them' } },
    description: 'Sets the blending mode of the selected items (images, shapes, notes, any item), as in Illustrator\'s Transparency panel: Multiply darkens, Screen lightens, Overlay adds contrast, Difference compares two references.',
  });
}
