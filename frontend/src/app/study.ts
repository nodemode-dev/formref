import { request } from '../lib/api';
import type { State } from '../lib/types';
import type { MenuEntry } from '../ui/context-menu';
import { studyGridDivisions, valueLevels } from '../lib/image-geometry';
import { S, applyState, execute, selected, setSelection, toast } from './editor';
import { registry } from './registry';

/** Study aids for painters and draughtsmen working from references: value studies, a drawing grid, and a palette taken from a picture. The first two are views on the board only; the picture and its exports stay as they are. */

const SVG_NS = 'http://www.w3.org/2000/svg';
export const VALUE_STEPS = [2, 3, 4, 5, 6, 8];
export const GRID_STEPS = [3, 4, 6, 8, 12];

/** One hidden SVG holds a filter per level count: luminance to grey, then that many flat steps (sRGB, so the steps sit where a painter's eye puts them). */
function installFilters(): void {
  if (document.getElementById('formref-study-filters')) return;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.id = 'formref-study-filters';
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  for (let levels = 2; levels <= 8; levels++) {
    const filter = document.createElementNS(SVG_NS, 'filter');
    filter.id = `formref-values-${levels}`;
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    const grey = document.createElementNS(SVG_NS, 'feColorMatrix');
    grey.setAttribute('type', 'matrix');
    grey.setAttribute('values', '0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0');
    const steps = document.createElementNS(SVG_NS, 'feComponentTransfer');
    const table = Array.from({ length: levels }, (_, i) => (i / (levels - 1)).toFixed(4)).join(' ');
    for (const channel of ['feFuncR', 'feFuncG', 'feFuncB']) {
      const func = document.createElementNS(SVG_NS, channel);
      func.setAttribute('type', 'discrete');
      func.setAttribute('tableValues', table);
      steps.append(func);
    }
    filter.append(grey, steps);
    svg.append(filter);
  }
  document.body.append(svg);
}

const pictures = () => selected().filter(i => i.kind === 'image' && !i.locked);

async function valueStudy(params?: Record<string, unknown>) {
  const items = pictures();
  if (!items.length) return;
  const asked = Number(params?.levels);
  const levels = Number.isFinite(asked) ? asked : items.every(i => valueLevels(i)) ? 0 : 3;
  if (levels !== 0 && !(levels >= 2 && levels <= 8)) throw new Error('Choose from 2 to 8 values, or 0 to turn the value study off.');
  await execute({ type: 'update', ids: items.map(i => i.id), patch: { data: { value_levels: levels ? Math.round(levels) : null } } });
}

async function drawingGrid(params?: Record<string, unknown>) {
  const items = pictures();
  if (!items.length) return;
  const asked = Number(params?.divisions);
  const divisions = Number.isFinite(asked) ? asked : items.every(i => studyGridDivisions(i)) ? 0 : 4;
  if (divisions !== 0 && !(divisions >= 2 && divisions <= 24)) throw new Error('Choose from 2 to 24 divisions, or 0 to remove the grid.');
  await execute({ type: 'update', ids: items.map(i => i.id), patch: { data: { study_grid: divisions ? { divisions: Math.round(divisions) } : null } } });
}

async function extractPalette(params?: Record<string, unknown>) {
  const item = selected().find(i => i.kind === 'image' && i.asset_id);
  if (!item || !S.state) return;
  const count = Number.isFinite(Number(params?.count)) ? Math.round(Number(params?.count)) : 6;
  const result = await request<State & { added: string[] }>(`/boards/${S.state.board.id}/items/${item.id}/palette?count=${count}`, { method: 'POST' });
  applyState(result);
  setSelection(result.added);
  toast(`Palette of ${result.added.length} colours added below the picture, most used first.`);
}

/** Right-click submenus: value steps and grid sizes, each with Off, checked where every selected picture agrees. */
export function studyMenu(): MenuEntry[] {
  const items = pictures();
  const levels = items.length && items.every(i => valueLevels(i) === valueLevels(items[0])) ? valueLevels(items[0]) : -1;
  const grid = items.length && items.every(i => studyGridDivisions(i) === studyGridDivisions(items[0])) ? studyGridDivisions(items[0]) : -1;
  const run = (id: string, params: Record<string, unknown>) => () => void Promise.resolve(registry.get(id)?.run(params)).catch(reason => toast(String((reason as Error).message || reason)));
  return [
    { label: 'Value Study', icon: 'grayscale', disabled: !items.length, children: [
      { label: 'Off', checked: levels === 0, action: run('value-study', { levels: 0 }) },
      ...VALUE_STEPS.map(n => ({ label: n === 2 ? 'Notan (2 values)' : `Values: ${n}`, checked: levels === n, action: run('value-study', { levels: n }) })),
    ] },
    { label: 'Drawing Grid', icon: 'grid', disabled: !items.length, children: [
      { label: 'Off', checked: grid === 0, action: run('drawing-grid', { divisions: 0 }) },
      ...GRID_STEPS.map(n => ({ label: `${n} x ${n}`, checked: grid === n, action: run('drawing-grid', { divisions: n }) })),
    ] },
  ];
}

export function registerStudy(): void {
  installFilters();
  const hasPictures = () => pictures().length > 0;
  registry.add(
    { group: 'Images', id: 'value-study', label: 'Value Study', icon: 'grayscale', run: p => valueStudy(p), enabled: hasPictures, checked: () => hasPictures() && pictures().every(i => valueLevels(i) > 0), params: { levels: { type: 'integer', min: 0, max: 8, description: 'number of flat grey values, 2 (notan) to 8; 0 turns it off; default toggles 3' } }, description: 'Shows the selected pictures as a few flat grey values (2 is a notan) to judge light and shadow; the picture and its exports are unchanged.' },
    { group: 'Images', id: 'drawing-grid', label: 'Drawing Grid', icon: 'grid', run: p => drawingGrid(p), enabled: hasPictures, checked: () => hasPictures() && pictures().every(i => studyGridDivisions(i) > 0), params: { divisions: { type: 'integer', min: 0, max: 24, description: 'squares across and down, 2 to 24; 0 removes the grid; default toggles 4' } }, description: 'Lays an even grid over the selected pictures for copying proportions; the lines invert what is under them so they show on any picture. Board view only.' },
    { group: 'Images', id: 'extract-palette', label: 'Extract Palette', icon: 'swatch', run: p => extractPalette(p), enabled: () => selected().some(i => i.kind === 'image' && !!i.asset_id), params: { count: { type: 'integer', min: 2, max: 16, description: 'how many colours, 2 to 16; default 6' } }, description: 'Finds the main colours of the selected picture (its visible crop) and adds them as grouped swatch cards below it, most used first.' },
  );
}
