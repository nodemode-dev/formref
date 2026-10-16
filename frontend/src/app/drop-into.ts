import type { Command, Item, Point } from '../lib/types';
import { itemBounds } from '../lib/geometry';
import { S, execute, scene, selected } from './editor';
import { registry } from './registry';

let lit: HTMLElement | null = null;

const items = () => S.state?.board.items || [];
const inside = (item: Item, p: Point) => { const b = itemBounds(item); return p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom; };

/** The column a drag would land in: the topmost visible column under the pointer that is not being moved and is not locked against drops. */
function columnAt(p: Point, moving: Set<string>): Item | undefined {
  return items().filter(i => i.kind === 'column' && !i.hidden && !moving.has(i.id) && !i.data.drops_locked && inside(i, p)).sort((a, b) => b.z - a.z)[0];
}

function roots(moving: Item[]): Item[] {
  const ids = new Set(moving.map(i => i.id));
  return moving.filter(i => i.kind !== 'column' && (!i.parent_id || !ids.has(i.parent_id)));
}

/** While dragging: outline the column the items would join; one class on one node changes only when the target changes. */
export function highlightDrop(moving: Item[], p: Point): void {
  const column = roots(moving).length ? columnAt(p, new Set(moving.map(i => i.id))) : undefined;
  const next = column ? scene.nodes.get(column.id)?.root || null : null;
  if (next === lit) return;
  lit?.classList.remove('drop-target');
  next?.classList.add('drop-target');
  lit = next;
}

export function clearDropHighlight(): void { lit?.classList.remove('drop-target'); lit = null; }

/** The commands that end a move: the move itself, then items dropped on a column become its children (raised above it) and items dragged out of their column leave it. One batch, one undo step. */
export function moveCommands(moving: Item[], dx: number, dy: number, p: Point): Command {
  const move: Command = { type: 'transform', ids: moving.map(i => i.id), dx, dy };
  const column = columnAt(p, new Set(moving.map(i => i.id)));
  const byId = new Map(items().map(i => [i.id, i]));
  const commands: Command[] = [move];
  let top = Math.max(0, ...items().map(i => i.z));
  for (const item of roots(moving)) {
    const parent = item.parent_id ? byId.get(item.parent_id) : undefined;
    if (column && item.parent_id !== column.id) {
      commands.push({ type: 'update', ids: [item.id], patch: item.z <= column.z ? { parent_id: column.id, z: ++top } : { parent_id: column.id } });
    } else if (!column && parent?.kind === 'column' && !inside(parent, p)) {
      commands.push({ type: 'update', ids: [item.id], patch: { parent_id: null } });
    }
  }
  return commands.length === 1 ? move : { type: 'batch', commands };
}

function columns(): Item[] { return selected().filter(i => i.kind === 'column'); }

export function registerDropInto(): void {
  registry.add({
    group: 'Organize', id: 'lock-drops', label: 'Lock Against Drops', icon: 'lock',
    run: () => { const cs = columns(); const on = !cs.every(c => c.data.drops_locked); return execute({ type: 'update', ids: cs.map(c => c.id), patch: { data: { drops_locked: on } } }); },
    enabled: () => columns().length > 0, checked: () => columns().length > 0 && columns().every(c => !!c.data.drops_locked),
    description: 'Stops items dragged onto the selected columns from joining them; items already inside stay, and can still be dragged out.',
  });
}
