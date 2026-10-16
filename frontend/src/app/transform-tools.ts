import type { Command, Item } from '../lib/types';
import { editable, execute, inputDialog, selected, selection, toast } from './editor';
import { registry } from './registry';

/** Rotate several references together about a pivot (the selection's centre, a point, or each in place), and lock an item's stacking order so Bring Forward and Send Backward leave it where it is. */
function movable(): Item[] {
  const ids = new Set(editable());
  return selected().filter(item => ids.has(item.id) && !item.locked);
}

async function rotateAbout(params?: Record<string, unknown>) {
  const items = movable();
  if (!items.length) throw new Error('Select the references to rotate.');
  let degrees = typeof params?.degrees === 'number' ? params.degrees : NaN;
  if (!Number.isFinite(degrees)) {
    const form = await inputDialog('Rotate selection', { name: '15', label: 'Angle (degrees)', description: 'Positive turns clockwise. Several references turn together about the centre of the selection, keeping their arrangement.', submit: 'Rotate' });
    if (!form) return;
    degrees = Number(form.name);
  }
  if (!Number.isFinite(degrees) || Math.abs(degrees) > 3600) throw new Error('Enter an angle from -3600 to 3600 degrees.');
  const pivotMode = params?.pivot ?? 'selection';
  let px = 0, py = 0;
  if (pivotMode && typeof pivotMode === 'object') {
    const p = pivotMode as { x?: unknown; y?: unknown };
    if (typeof p.x !== 'number' || typeof p.y !== 'number') throw new Error('pivot is "selection", "each" or {x, y}.');
    px = p.x; py = p.y;
  } else if (pivotMode === 'selection') {
    const xs = items.flatMap(i => [i.x, i.x + i.width]), ys = items.flatMap(i => [i.y, i.y + i.height]);
    px = (Math.min(...xs) + Math.max(...xs)) / 2; py = (Math.min(...ys) + Math.max(...ys)) / 2;
  } else if (pivotMode !== 'each') throw new Error('pivot is "selection", "each" or {x, y}.');
  const a = degrees * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  const normal = (r: number) => ((r % 360) + 540) % 360 - 180;
  const commands: Command[] = items.map(item => {
    const cx = item.x + item.width / 2, cy = item.y + item.height / 2;
    const [nx, ny] = pivotMode === 'each' ? [cx, cy] : [px + (cx - px) * cos - (cy - py) * sin, py + (cx - px) * sin + (cy - py) * cos];
    return { type: 'update', ids: [item.id], patch: { x: nx - item.width / 2, y: ny - item.height / 2, rotation: normal((item.rotation || 0) + degrees) } };
  });
  await execute({ type: 'batch', commands });
}

async function toggleStacking() {
  const items = selected().filter(item => !item.locked);
  if (!items.length) throw new Error('Select the references whose stacking order to lock.');
  const lock = !items.every(item => item.data.z_locked);
  await execute({ type: 'batch', commands: items.map(item => ({ type: 'update', ids: [item.id], patch: { data: { ...item.data, z_locked: lock || null } } })) });
  toast(lock ? 'Stacking order locked: Bring Forward and Send Backward now leave these where they are.' : 'Stacking order unlocked.');
}

/** Ids the Layer commands may move: editable and not stacking-locked. */
export function orderable(): string[] {
  const locked = new Set(selected().filter(item => item.data.z_locked).map(item => item.id));
  if (locked.size && locked.size === selection.size) toast('These references have their stacking order locked.');
  return editable().filter(id => !locked.has(id));
}

export function registerTransformTools(): void {
  registry.add(
    { group: 'Images', id: 'rotate-selection', label: 'Rotate Selection...', icon: 'rotate', keys: ['alt+r'], run: p => rotateAbout(p), enabled: () => movable().length > 0, params: { degrees: { type: 'number', min: -3600, max: 3600, required: true, description: 'clockwise degrees' }, pivot: { type: 'string', description: '"selection" (default, about the selection centre), "each" (every item in place), or an object {x, y} in board coordinates' } }, description: 'Turns the selected references by any angle together about the centre of the selection (keeping their arrangement), about a chosen point, or each in place.' },
    { group: 'Layer', id: 'lock-stacking', label: 'Lock Stacking Order', icon: 'lock', checked: () => selected().length > 0 && selected().every(item => !!item.data.z_locked), run: toggleStacking, enabled: () => selected().length > 0, description: 'Keeps the selected references at their place in the stack: Bring to Front, Bring Forward, Send Backward and Send to Back leave them alone, so a background stays behind.' },
  );
}
