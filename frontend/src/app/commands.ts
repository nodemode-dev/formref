import { S, error, selected, toast } from './editor';
import { registry, type CommandDef } from './registry';
import { CLIP_COMMANDS, FILE_COMMANDS } from './commands/file';
import { EDIT_COMMANDS } from './commands/edit';
import { INSERT_COMMANDS } from './commands/insert';
import { TOOL_COMMANDS } from './commands/tools';
import { CANVAS_COMMANDS } from './commands/canvas';
import { ORGANIZE_COMMANDS } from './commands/organize';
import { IMAGE_COMMANDS } from './commands/images';
import { LAYER_COMMANDS } from './commands/layer';
import { VIEW_COMMANDS } from './commands/view';
import { INSPECTOR_COMMANDS } from './commands/inspector';
export type { CommandDef };

/** Registration order is menu and palette order; each group lives in app/commands/. */
export const COMMANDS: CommandDef[] = [
  ...FILE_COMMANDS, ...EDIT_COMMANDS, ...INSERT_COMMANDS, ...TOOL_COMMANDS, ...CANVAS_COMMANDS, ...ORGANIZE_COMMANDS,
  ...IMAGE_COMMANDS, ...LAYER_COMMANDS, ...VIEW_COMMANDS, ...CLIP_COMMANDS, ...INSPECTOR_COMMANDS,
];

registry.add(...COMMANDS);
export const BY_ID = registry.byId;

const WITHOUT_BOARD = new Set([
  'home', 'new-board', 'new-tab', 'new-from-template', 'open-file', 'open-file-tab', 'open-from-cloud', 'trash', 'sample', 'copy-clip-token',
  'reset-clip-token', 'commands', 'help', 'preferences', 'close-dialog', 'close-overlays', 'menus-in-window', 'practice-log',
  'download-cutout-model', 'import-cutout-model',
]);

/** While Home covers the workspace (always so when no board is open), only the commands that need no board answer. */
export function needsBoard(command: CommandDef): boolean {
  return S.home && !WITHOUT_BOARD.has(command.id) && !command.id.startsWith('demo-');
}

/** A command whose check fails counts as disabled, so one faulty check can never stop a menu or the palette opening. */
export function isEnabled(command: CommandDef): boolean {
  try {
    if (needsBoard(command)) return false;
    return command.enabled ? command.enabled() : true;
  } catch (reason) {
    console.warn(`Enabled check for ${command.id} failed`, reason);
    return false;
  }
}

export function run(id: string) {
  const command = BY_ID.get(id);
  if (!command) throw new Error(`Unknown command ${id}`);
  if (!isEnabled(command)) return;
  void Promise.resolve().then(() => command.run()).catch(error);
}

export { lockLabel } from './commands/edit';
export { bindShell } from './commands/view';
export { snapScale, currentSnapScale, currentSnapScale as snapScaleNow } from './commands/canvas';
export { setOpacity } from './commands/images';
export const SNAP_SCALES = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
export { toast, selected };
