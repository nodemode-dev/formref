import { orderable } from '../transform-tools';
import { execute } from '../editor';
import type { CommandDef } from '../registry';
import { has } from './when';

function reorder(mode: 'front' | 'forward' | 'backward' | 'back') {
  const ids = orderable();
  return ids.length ? execute({ type: 'order', ids, mode }) : undefined;
}

export const LAYER_COMMANDS: CommandDef[] = [
  { group: 'Layer', id: 'front', label: 'Bring to Front', icon: 'bring-front', keys: ['shift+arrowup'], run: () => reorder('front'), enabled: has },
  { group: 'Layer', id: 'forward', label: 'Bring Forward', icon: 'layers', run: () => reorder('forward'), enabled: has },
  { group: 'Layer', id: 'backward', label: 'Send Backward', icon: 'layers', run: () => reorder('backward'), enabled: has },
  { group: 'Layer', id: 'back', label: 'Send to Back', icon: 'send-back', keys: ['shift+arrowdown'], run: () => reorder('back'), enabled: has },
];
