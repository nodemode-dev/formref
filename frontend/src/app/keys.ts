/** Keyboard shortcuts: combo parsing and labels, the live keymap built from the registry, defaults, and the user's overrides. The saved shortcut format is { commandId: ["mod+shift+g", ...] }, holding only commands whose keys differ from their defaults. */
import { registry, type CommandDef } from './registry';

const KEY_NAMES: Record<string, string> = {
  mod: navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl', shift: 'Shift', alt: 'Alt', escape: 'Esc', delete: 'Del', backspace: 'Backspace',
  arrowup: 'Up', arrowdown: 'Down', tab: 'Tab', '=': '=', '+': '+', '-': '-', '[': '[', ']': ']', ',': ',',
};

export function keyLabel(combo: string): string {
  return combo.split('+').map(part => KEY_NAMES[part] || part.toUpperCase()).join('+').replace('Shift+/', '?');
}

export function primaryKey(command: CommandDef): string {
  return command.keys?.length ? keyLabel(command.keys[0]) : '';
}

export function comboOf(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('mod');
  if (event.shiftKey && event.key !== '?' && event.key !== '+') parts.push('shift');
  if (event.altKey) parts.push('alt');
  const physical = event.altKey && /^(Key[A-Z]|Digit\d)$/.test(event.code) ? event.code.slice(event.code.startsWith('Key') ? 3 : 5).toLowerCase() : '';
  parts.push(physical || (event.key === ' ' ? 'space' : event.key.toLowerCase()));
  return parts.join('+');
}

const keymap = new Map<string, CommandDef>();
const DEFAULT_KEYS = registry.defaults;
const keyListeners: (() => void)[] = [];

function rebuildKeymap() {
  keymap.clear();
  for (const command of registry.all()) for (const combo of command.keys || []) keymap.set(combo, command);
  keyListeners.forEach(listener => listener());
}
rebuildKeymap();
registry.onChange(() => rebuildKeymap());

export function onKeysChanged(listener: () => void) { keyListeners.push(listener); }

/** Shortcut overrides: only commands whose keys differ from the defaults. */
export function keyOverrides(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const command of registry.all()) {
    const keys = command.keys || [];
    if (keys.join(' ') !== (DEFAULT_KEYS.get(command.id) || []).join(' ')) out[command.id] = [...keys];
  }
  return out;
}

export function applyKeyOverrides(overrides: Record<string, string[]>) {
  for (const command of registry.all()) command.keys = [...(overrides[command.id] || DEFAULT_KEYS.get(command.id) || [])];
  rebuildKeymap();
}

/** Give a command one shortcut; returns the command it was taken from, if any. */
export function assignKey(id: string, combo: string): CommandDef | undefined {
  const owner = keymap.get(combo);
  if (owner && owner.id !== id) owner.keys = (owner.keys || []).filter(k => k !== combo);
  const command = registry.get(id)!;
  command.keys = [combo];
  rebuildKeymap();
  return owner && owner.id !== id ? owner : undefined;
}

export const RESERVED_KEYS = new Set(['mod+t', 'mod+w', 'mod+q', 'mod+shift+t', 'mod+shift+w', 'mod+shift+n', 'mod+tab', 'mod+r', 'mod+l', 'f5', 'f11', 'f12', 'space']);

export function commandForKey(event: KeyboardEvent): CommandDef | undefined {
  return keymap.get(comboOf(event));
}
