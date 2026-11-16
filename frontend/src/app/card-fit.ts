import type { Command } from '../lib/types';
import { TEXT_CARDS } from '../ui/scene';
import { S, execute, scene, selected } from './editor';
import { registry } from './registry';

/** Text cards keep the size saved in the board, like every other card, so boards and templates open as they were made. A card grows downward when a person writes more text than it shows (inline, in the inspector or in the editor), in the same change as the text; Fit Card to Text sizes chosen cards to their text exactly, growing or shrinking. Other cards never move. */

/** The inspector's text field: each card that would clip the new text grows with it, in one undoable change. */
export function textCommand(ids: string[], text: string): Command {
  const items = S.state?.board.items.filter(item => ids.includes(item.id)) || [];
  const grown = items.map(item => ({ id: item.id, height: item.locked ? undefined : scene.grownHeight({ ...item, text }) }));
  if (!grown.some(entry => entry.height)) return { type: 'update', ids, patch: { text } };
  return { type: 'batch', commands: grown.map(entry => ({ type: 'update', ids: [entry.id], patch: entry.height ? { text, height: entry.height } : { text } })) };
}

const fittable = () => selected().filter(item => TEXT_CARDS.includes(item.kind) && !item.locked && !item.hidden);

function fitToText(): Promise<void> {
  const changes = fittable().map(item => ({ id: item.id, height: Math.max(1, Math.ceil(scene.textHeight(item))) })).filter(entry => entry.height !== S.state?.board.items.find(item => item.id === entry.id)?.height);
  if (!changes.length) return Promise.resolve();
  return execute({ type: 'batch', commands: changes.map(entry => ({ type: 'update', ids: [entry.id], patch: { height: entry.height } })) });
}

export function registerCardFit(): void {
  registry.add({
    group: 'Organize', id: 'fit-to-text', label: 'Fit Card to Text', icon: 'fit', run: fitToText, enabled: () => fittable().length > 0,
    description: 'Sets the height of each selected note, task, document or link card to fit all of its text at its width, growing or shrinking it; the top edge stays put and no other item moves. Locked and hidden cards are left as they are.',
  });
}
