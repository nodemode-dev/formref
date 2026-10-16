import type { Command, Item } from '../lib/types';
import { S, execute, selected, toast } from './editor';
import { registry } from './registry';

type Mode = 'height' | 'width' | 'area';

/** Visible size after rotation, the same measure the engine's normalize uses. */
function measure(item: Item, mode: Mode): number {
  const a = (item.rotation * Math.PI) / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const w = item.width * c + item.height * s, h = item.width * s + item.height * c;
  return mode === 'width' ? w : mode === 'height' ? h : w * h;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b), mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Normalize Sizes Within Each Group: every group in the selection (or on the board when nothing is selected) has its members brought to the group's median size, so each group reads as one set while groups keep their own scale. */
async function normalizeGroups(params?: Record<string, unknown>) {
  if (!S.state) return;
  const mode: Mode = params?.mode === 'width' || params?.mode === 'area' ? params.mode : 'height';
  const scope = selected().length ? selected() : S.state.board.items;
  const groupIds = new Set(scope.map(i => i.group_id).filter((g): g is string => !!g));
  const commands: Command[] = [];
  let resized = 0;
  for (const group of groupIds) {
    const members = S.state.board.items.filter(i => i.group_id === group && !i.locked && !i.parent_id && !i.hidden);
    if (members.length < 2) continue;
    commands.push({ type: 'normalize', ids: members.map(i => i.id), mode, value: median(members.map(i => measure(i, mode))) });
    resized += members.length;
  }
  if (!commands.length) { toast('Select grouped items first: each group needs at least two unlocked items.'); return; }
  await execute({ type: 'batch', commands });
  toast(`Sizes matched within ${commands.length} groups (${resized} items).`);
}

export function registerGroupNormalize(): void {
  registry.add({
    group: 'Organize', id: 'normalize-groups', label: 'Normalize Sizes Within Each Group', icon: 'normalize', run: p => normalizeGroups(p), enabled: () => !!S.state?.board.items.some(i => i.group_id),
    params: { mode: { type: 'string', enum: ['height', 'width', 'area'], description: 'which size to match; default height' } },
    description: 'Gives the items of each group the same size (the group\'s median height, width or area) while every group keeps its own scale. Works on the groups in the selection, or every group when nothing is selected.',
  });
}
