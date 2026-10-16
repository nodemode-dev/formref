import type { TerminalDock } from '../ui/terminal-dock';
import { S, drawCamera, selection, toast } from './editor';

let dock: Promise<TerminalDock> | null = null;

function root(): HTMLElement {
  return document.getElementById('term-dock')!;
}

function context(): string {
  const board = S.state?.board;
  if (!board) return 'formref window: no board open';
  const where = `formref window: board id ${board.id}`;
  const ids = [...selection];
  if (!ids.length) return where;
  return `${where}; selection: item ${ids.length === 1 ? 'id' : 'ids'} ${ids.slice(0, 200).join(', ')}${ids.length > 200 ? ` and ${ids.length - 200} more` : ''}`;
}

function get(): Promise<TerminalDock> {
  dock ??= import('../ui/terminal-dock').then(m => new m.TerminalDock(root(), { context, fail: toast, onHide: () => setDock(false) }));
  return dock;
}

export function dockOpen(): boolean {
  return !root().hidden;
}

export function setDock(open: boolean): void {
  if (dockOpen() === open) return;
  root().hidden = !open;
  drawCamera();
  if (!open) document.querySelector<HTMLElement>('.stage')?.focus();
}

async function show(): Promise<TerminalDock> {
  const d = await get();
  if (!dockOpen()) {
    setDock(true);
    await d.ensure();
  }
  return d;
}

export async function toggleTerminal(): Promise<void> {
  if (dockOpen()) setDock(false);
  else await show();
}

export async function newTerminal(): Promise<void> {
  const wasOpen = dockOpen();
  const d = await show();
  if (wasOpen) await d.open();
}

export async function openClaudeCode(prompt?: string): Promise<void> {
  const d = await get();
  setDock(true);
  await d.claude(prompt);
}
