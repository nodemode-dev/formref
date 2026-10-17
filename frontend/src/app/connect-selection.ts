import type { Item } from '../lib/types';
import { uid } from '../lib/types';
import { S, execute, selected, toast } from './editor';
import { registry } from './registry';

/** Connect Selected (reference-board gap: drawing links without switching tools, as in Milanote's line handles): the selected references and groups are joined in reading order, two of them by one line, more as a chain, in one undo step. A group counts as one node when all of its items are selected, as the connect tool treats it. */

const GROUP = 'group:';

interface Node { end: string; x: number; y: number }

/** The selection as nodes: a whole selected group is one node at its box's top-left, any other item is its own node. */
function nodes(): Node[] {
  const items = selected();
  const board = S.state?.board.items || [];
  const out = new Map<string, Node>();
  for (const item of items) {
    const members = item.group_id ? board.filter(other => other.group_id === item.group_id) : [];
    const whole = members.length > 1 && members.every(member => items.some(pick => pick.id === member.id));
    const end = whole ? GROUP + item.group_id : item.id;
    const box = whole ? members : [item];
    const node = out.get(end);
    const x = Math.min(...box.map((m: Item) => m.x)), y = Math.min(...box.map((m: Item) => m.y));
    if (!node) out.set(end, { end, x, y });
  }
  // Reading order: rows top to bottom (within 40 units counts as the same row), then left to right.
  return [...out.values()].sort((a, b) => (Math.abs(a.y - b.y) > 40 ? a.y - b.y : a.x - b.x));
}

const linked = (a: string, b: string) => (S.state?.board.connections || []).some(c => (c.from === a && c.to === b) || (c.from === b && c.to === a));

async function connectSelected(): Promise<void> {
  const chain = nodes();
  if (chain.length < 2) throw new Error('Select two or more references or groups to connect.');
  const commands = [];
  for (let i = 1; i < chain.length; i++) {
    const from = chain[i - 1].end, to = chain[i].end;
    if (!linked(from, to)) commands.push({ type: 'connect', connection: { id: uid(), from, to, color: '#f97316', label: '' } });
  }
  if (!commands.length) { toast('These are already connected.'); return; }
  await execute(commands.length === 1 ? commands[0] : { type: 'batch', commands });
}

async function disconnectSelected(): Promise<void> {
  const ends = new Set(nodes().map(node => node.end));
  for (const item of selected()) ends.add(item.id);
  const ids = (S.state?.board.connections || []).filter(c => ends.has(c.from) || ends.has(c.to)).map(c => c.id);
  if (!ids.length) throw new Error('The selection has no connections.');
  await execute({ type: 'disconnect', ids });
}

const touched = () => {
  const ends = new Set(nodes().map(node => node.end));
  for (const item of selected()) ends.add(item.id);
  return (S.state?.board.connections || []).some(c => ends.has(c.from) || ends.has(c.to));
};

export function registerConnectSelection(): void {
  registry.add(
    { group: 'Organize', id: 'connect-selected', label: 'Connect Selected', icon: 'connect', keys: ['mod+shift+l'], run: () => connectSelected(), enabled: () => nodes().length >= 2 },
    { group: 'Organize', id: 'disconnect-selected', label: 'Remove Connections', icon: 'unsync', run: () => disconnectSelected(), enabled: touched },
  );
}
