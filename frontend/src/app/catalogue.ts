import { keyHeaders } from '../lib/window-key';
import { isEnabled } from './commands';
import { error } from './editor';
import { COMMAND_WORDS } from './command-meta';
import { registry, type CommandDef, type CommandParam } from './registry';
import { dormantCommands, illustratorCommandIds } from './illustrator';

const WINDOW_ONLY = new Set([
  'open-file', 'open-file-tab', 'images', 'file', 'paste', 'save-to-cloud', 'open-from-cloud', 'export', 'export-png', 'export-all-images',
  'export-selected', 'save-image', 'relink', 'import-cutout-model', 'pick-cutout-points', 'pick-color', 'sample', 'crop', 'assign',
  'copy-clip-token', 'reset-clip-token', 'preferences', 'agent', 'commands', 'help', 'close-overlays', 'close-dialog', 'save-template',
]);
const RISKY = new Set(['delete', 'delete-board']);
const READS = new Set([
  'select-all', 'deselect', 'tool-select', 'tool-hand', 'draw', 'tool-eraser', 'tool-rect', 'tool-circle', 'tool-line', 'tool-connect', 'fit',
  'fit-all', 'reset-zoom', 'zoom-in', 'zoom-out', 'navigator', 'focus', 'present', 'slideshow', 'reference-focus', 'reference-prev', 'reference-next',
  'reference-play', 'reference-stop', 'left-dock', 'right-dock', 'trash', 'new-tab', 'close-tab', 'save', 'export', 'export-png', 'export-all-images',
  'export-selected', 'open-source', 'edit-labels', 'new-from-template', 'download-cutout-model',
]);

export interface CatalogueEntry {
  id: string;
  label: string;
  group: string;
  keys: string[];
  /** The shipped shortcut, before the person's own overrides; references for agents use these. */
  default_keys: string[];
  description: string;
  when: string;
  params: Record<string, CommandParam>;
  mutates: boolean;
  risky: boolean;
  agent: 'allow' | 'window-only';
  enabled: boolean;
}

export function describe(command: CommandDef): CatalogueEntry {
  return {
    id: command.id,
    label: command.label,
    group: command.group,
    keys: [...(command.keys || [])],
    default_keys: [...(registry.defaults.get(command.id) || command.keys || [])],
    description: command.description || COMMAND_WORDS[command.id] || `${command.label} (${command.group}).`,
    when: command.when || '',
    params: command.params || {},
    mutates: command.mutates ?? !READS.has(command.id),
    risky: command.risky ?? RISKY.has(command.id),
    agent: command.agent || (WINDOW_ONLY.has(command.id) ? 'window-only' : 'allow'),
    enabled: isEnabled(command),
  };
}

/** Every command, including the Illustrator ones while they are switched off (listed as not enabled), so the agent reference is the same either way. Their descriptions say they are optional. */
export function catalogue(): CatalogueEntry[] {
  const optional = new Set(illustratorCommandIds());
  const entry = (command: CommandDef, live: boolean): CatalogueEntry => {
    const described = describe(command);
    return { ...described, enabled: live && described.enabled, description: optional.has(command.id) ? `Vector tools (off by default; Preferences turns them on). ${described.description}` : described.description };
  };
  return [...registry.all().map(c => entry(c, true)), ...dormantCommands().map(c => entry(c, false))];
}

function checkParams(command: CommandDef, params: Record<string, unknown>): string | null {
  const schema = command.params || {};
  for (const key of Object.keys(params)) if (!(key in schema)) return `${command.id} takes no parameter ${key}.`;
  for (const [key, spec] of Object.entries(schema)) {
    const value = params[key];
    if (value === undefined) { if (spec.required) return `${command.id} needs ${key}.`; continue; }
    const kind = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
    const ok = spec.type === 'integer' ? Number.isInteger(value) : spec.type === kind;
    if (!ok) return `${key} must be ${spec.type === 'integer' ? 'an integer' : `a ${spec.type}`}.`;
    if (spec.enum && !spec.enum.includes(value as string | number)) return `${key} must be one of ${spec.enum.join(', ')}.`;
    if (typeof value === 'number' && ((spec.min !== undefined && value < spec.min) || (spec.max !== undefined && value > spec.max))) return `${key} is out of range.`;
  }
  return null;
}

export async function runCommand(id: string, params: Record<string, unknown> = {}): Promise<{ ok: boolean; error?: string; dialog?: string }> {
  const command = registry.get(id);
  if (!command && dormantCommands().some(c => c.id === id)) return { ok: false, error: `${id} is one of the vector tools, which are off. The person can turn them on in Preferences.` };
  if (!command) return { ok: false, error: `No command ${id}. Use list_commands for the ids.` };
  const bad = checkParams(command, params);
  if (bad) return { ok: false, error: bad };
  if (!isEnabled(command)) return { ok: false, error: `${command.label} is not available right now (for example nothing suitable is selected).` };
  const before = document.querySelector('dialog[open]');
  let timer = 0;
  try {
    const done = Promise.resolve(command.run(params));
    const asks = new Promise<boolean>(resolve => {
      timer = window.setInterval(() => { const now = document.querySelector('dialog[open]'); if (now && now !== before) resolve(true); }, 150);
    });
    if (await Promise.race([done.then(() => false), asks])) done.catch(error);
  } catch (reason) {
    window.clearInterval(timer);
    return { ok: false, error: reason instanceof Error ? reason.message : String(reason) };
  }
  window.clearInterval(timer);
  const dialog = document.querySelector<HTMLDialogElement>('dialog[open]');
  return dialog ? { ok: true, dialog: `${command.label} opened a dialog in the window; the person needs to finish it.` } : { ok: true };
}

let mirrorTimer = 0;
function mirror() {
  window.clearTimeout(mirrorTimer);
  mirrorTimer = window.setTimeout(() => {
    void fetch('/api/commands/catalogue', { method: 'POST', headers: { 'Content-Type': 'application/json', ...keyHeaders() }, body: JSON.stringify({ commands: catalogue() }) }).catch(() => undefined);
  }, 600);
}

async function bridge() {
  for (;;) {
    try {
      const response = await fetch('/api/commands/next', { cache: 'no-store', headers: keyHeaders() });
      if (response.status === 204) continue;
      if (!response.ok) { await new Promise(r => setTimeout(r, 3000)); continue; }
      const job = await response.json() as { rid: string; id: string; params: Record<string, unknown> };
      const result = await runCommand(job.id, job.params || {});
      await fetch(`/api/commands/result/${encodeURIComponent(job.rid)}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...keyHeaders() }, body: JSON.stringify(result) });
    } catch {
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

export function attachCatalogue(): void {
  registry.onChange(mirror);
  mirror();
  void bridge();
}
