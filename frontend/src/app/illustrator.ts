import { $, S, setTool, toast } from './editor';
import { registry, type CommandDef } from './registry';
import { registerVector } from './vector';
import { registerDirectSelect } from './direct-select';
import { registerPencil } from './pencil';
import { registerPathfinder } from './pathfinder';
import { registerSmartGuides, setSmartGuidesAvailable } from './smart-guides';

/** The Illustrator tools (Phase 4: Pen, Curvature, Pencil, Direct Selection, path editing and Live Corners, shapes, stroke and gradient options, Pathfinder, Smart Guides) are optional and off by default; Preferences turns them on. FormRef is a reference board, so a fresh install shows none of them. Off, their commands leave the registry (palette, menus, keys, shortcut sheet) and their controls are hidden by data-illustrator on the root, set by the early script before first paint. Paths already on a board still draw, move and export. */

const STORE = 'formref-illustrator';
const TOOLS = new Set(['direct', 'pen-path', 'curvature', 'pencil']);
let commands: CommandDef[] = [];
let on = false;

export function illustratorOn(): boolean { return on; }

/** The Illustrator commands while they are switched off, so the agent catalogue can still describe them. */
export function dormantCommands(): CommandDef[] { return on ? [] : commands; }
export function illustratorCommandIds(): string[] { return commands.map(c => c.id); }

function apply(next: boolean): void {
  on = next;
  document.documentElement.dataset.illustrator = next ? 'on' : 'off';
  setSmartGuidesAvailable(next);
  if (next) {
    const missing = commands.filter(c => !registry.get(c.id));
    if (missing.length) registry.add(...missing);
  } else {
    for (const command of commands) registry.remove(command.id);
    if (TOOLS.has(S.tool)) setTool('select');
  }
  const box = $<HTMLInputElement>('illustrator-tools');
  if (box.checked !== next) box.checked = next;
}

export function setIllustrator(next: boolean): void {
  try { localStorage.setItem(STORE, next ? 'on' : 'off'); } catch { }
  apply(next);
  toast(next ? 'Illustrator tools on: Pen, Curvature, Pencil, Direct Selection, Pathfinder and Smart Guides are in the toolbar, menus and palette.' : 'Illustrator tools off. Paths already on the board stay as they are.');
}

/** Registers every Illustrator module once, keeps their commands, and removes them again unless the tools are on. */
export function registerIllustrator(): void {
  const before = new Set(registry.all().map(c => c.id));
  registerVector();
  registerDirectSelect(setTool);
  registerPencil(setTool);
  registerPathfinder();
  registerSmartGuides();
  commands = registry.all().filter(c => !before.has(c.id));
  let stored = false;
  try { stored = localStorage.getItem(STORE) === 'on'; } catch { }
  apply(stored);
  $<HTMLInputElement>('illustrator-tools').addEventListener('change', event => setIllustrator((event.target as HTMLInputElement).checked));
}
