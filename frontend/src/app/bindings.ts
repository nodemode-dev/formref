import { api } from '../lib/api';
import { onLanguage } from '../lib/i18n';
import { onPdfText } from './pdf-text';
import { isColor } from '../lib/color';
import { nativeInvoke } from '../lib/host';
import type { NativeWindow } from '../lib/host';
import { icon } from '../ui/icons';
import { NOTE_FONTS } from '../ui/scene';
import {
  $, S, applyState, closeOverlays, defaultSettings, editable, error, execute, matches, open, referenceView, scene,
  selected, selection, setInput, setText, setTool, toast, updateInspector, updateOutline, upload,
} from './editor';
import type { Tool } from './editor';
import { BY_ID, isEnabled, run } from './commands';
import { RESERVED_KEYS, applyKeyOverrides, assignKey, comboOf, keyLabel, keyOverrides, onKeysChanged, primaryKey } from './keys';
import type { CommandDef } from './commands';
import { registry } from './registry';
import { replaceActiveWithNext } from './tabs';

for (const node of document.querySelectorAll<HTMLElement>('[data-icon]')) node.prepend(icon(node.dataset.icon!));

if (/^(en-(US|CA)|es-(MX|US)|fr-CA)$/i.test(navigator.language)) $<HTMLSelectElement>('export-paper').value = 'letter';

document.addEventListener('click', event => {
  const target = (event.target as Element).closest<HTMLElement>('[data-action],[data-tool],[data-export]');
  if (!target || (target instanceof HTMLButtonElement && target.disabled)) return;
  if ($<HTMLDialogElement>('reference-dialog').open && !target.closest('#reference-dialog')) return;
  if ($<HTMLDialogElement>('document-dialog').open && !target.closest('#document-dialog')) return;
  if (target.dataset.tool) {
    if (target.dataset.shape) S.shapeKind = target.dataset.shape as typeof S.shapeKind;
    setTool(target.dataset.tool as Tool);
  } else if (target.dataset.export && S.state) {
    const link = document.createElement('a');
    const format = target.dataset.export;
    if (format === 'images' && !S.state.board.items.some(item => item.kind === 'image' && item.asset_id)) { toast('This board has no pictures to export.'); return; }
    link.href = api.exportUrl(S.state.board.id, format) + (format.startsWith('pdf') ? `&paper=${encodeURIComponent($<HTMLSelectElement>('export-paper').value)}` : '');
    link.download = '';
    link.click();
    closeOverlays();
    if (format === 'bee') {
      const left = S.state.board.items.filter(item => !['image', 'note', 'document', 'todo', 'link'].includes(item.kind)).length;
      if (left) toast(`Pictures and text went to the BeeRef file; ${left} drawn or other items were left out because BeeRef has no place for them.`);
    }
  } else if (target.dataset.action) {
    run(target.dataset.action);
  }
});

const paletteRows = new Map<string, HTMLButtonElement>();
function addPaletteRow(command: CommandDef) {
  if (command.palette === false || paletteRows.has(command.id)) return;
  const button = document.createElement('button');
  button.className = 'command-row';
  button.dataset.command = `${command.label} ${command.group}`.toLowerCase();
  const label = document.createElement('span');
  const group = document.createElement('small');
  const key = document.createElement('kbd');
  label.textContent = command.label;
  group.textContent = command.group;
  key.textContent = primaryKey(command);
  button.append(icon(command.icon || 'commands'), label, group, key);
  button.addEventListener('click', () => {
    closeOverlays();
    run(command.id);
  });
  paletteRows.set(command.id, button);
  $('command-list').append(button);
}
registry.all().forEach(addPaletteRow);

function filterCommands() {
  const query = $<HTMLInputElement>('command-search').value.toLowerCase().trim();
  for (const [id, row] of paletteRows) {
    const command = BY_ID.get(id)!;
    row.hidden = !row.dataset.command!.includes(query);
    row.disabled = !isEnabled(command);
  }
}
$('command-search').addEventListener('input', filterCommands);
// Enter runs the first match and the arrows move through the list, so the palette works without a mouse.
$('commands-dialog').addEventListener('keydown', event => {
  const rows = [...paletteRows.values()].filter(row => !row.hidden && !row.disabled);
  const at = rows.indexOf(document.activeElement as HTMLButtonElement);
  if (event.key === 'Enter' && document.activeElement === $('command-search') && rows.length) { event.preventDefault(); rows[0].click(); }
  else if (event.key === 'ArrowDown' && rows.length) { event.preventDefault(); rows[Math.min(rows.length - 1, at + 1)].focus(); }
  else if (event.key === 'ArrowUp') { event.preventDefault(); if (at <= 0) $('command-search').focus(); else rows[at - 1].focus(); }
});

export function openPalette() {
  $<HTMLDialogElement>('commands-dialog').showModal();
  $<HTMLInputElement>('command-search').value = '';
  filterCommands();
  $('command-search').focus();
}

// Shortcut sheet: every command that has or had a key; click a key to reassign it.
const shortcutKeys = new Map<string, HTMLButtonElement>();
let capturing: string | null = null;
let sheetGroup = '';

function keyText(id: string): string {
  const command = BY_ID.get(id)!;
  return command.keys?.length ? command.keys.map(k => keyLabel(k)).join('  or  ') : 'None';
}

function addShortcutRows(commands: CommandDef[]) {
  const sheet = $('shortcut-list');
  for (const command of commands) {
    const id = command.id;
    if (!command.keys?.length || shortcutKeys.has(id)) continue;
    if (command.group !== sheetGroup) {
      const group = sheetGroup = command.group;
      const head = document.createElement('div');
      head.className = 'shortcut-group';
      head.textContent = group;
      sheet.append(head);
    }
    const label = document.createElement('span');
    label.className = 'shortcut-label';
    label.append(icon(command.icon || 'keyboard'), document.createTextNode(command.label));
    const key = document.createElement('button');
    key.className = 'shortcut-key';
    key.title = `Change the shortcut for ${command.label}`;
    key.textContent = keyText(id);
    key.addEventListener('click', () => startCapture(id));
    shortcutKeys.set(id, key);
    sheet.append(label, key);
  }
}
addShortcutRows(registry.all());
registry.onChange((added, removed) => {
  added.forEach(addPaletteRow);
  addShortcutRows(added);
  for (const id of removed) { paletteRows.get(id)?.remove(); paletteRows.delete(id); }
});

function refreshShortcutText() {
  for (const [id, key] of shortcutKeys) {
    const text = capturing === id ? 'Press keys…' : keyText(id);
    if (key.textContent !== text) key.textContent = text;
    key.classList.toggle('capturing', capturing === id);
  }
  for (const [id, row] of paletteRows) {
    const kbd = row.querySelector('kbd')!;
    const text = primaryKey(BY_ID.get(id)!);
    if (kbd.textContent !== text) kbd.textContent = text;
  }
}
onKeysChanged(refreshShortcutText);

function shortcutNote(text: string) {
  setText('shortcut-note', text);
}

function startCapture(id: string) {
  capturing = id;
  refreshShortcutText();
  shortcutNote('Press the new keys. Esc cancels.');
}

function stopCapture(note = 'Click a shortcut to change it, then press the new keys. Esc cancels.') {
  capturing = null;
  refreshShortcutText();
  shortcutNote(note);
}

function saveKeys() {
  void fetch('/api/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keys: keyOverrides() }) })
    .then(response => { if (!response.ok) toast('Shortcuts were not saved.'); });
}

window.addEventListener('keydown', event => {
  if (!capturing) return;
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.key === 'Escape') { stopCapture(); return; }
  const combo = comboOf(event);
  if (RESERVED_KEYS.has(combo)) { shortcutNote(`${keyLabel(combo)} belongs to the browser or the canvas; choose another.`); return; }
  const id = capturing;
  const taken = assignKey(id, combo);
  saveKeys();
  stopCapture(taken ? `${keyLabel(combo)} moved here from ${taken.label}.` : `${BY_ID.get(id)!.label} is now ${keyLabel(combo)}.`);
}, true);

$<HTMLDialogElement>('help-dialog').addEventListener('close', () => { if (capturing) stopCapture(); });
$('shortcut-reset').addEventListener('click', () => {
  applyKeyOverrides({});
  saveKeys();
  stopCapture('Every shortcut is back to its default.');
});

void fetch('/api/preferences').then(response => response.ok ? response.json() : { keys: {} })
  .then((saved: { keys: Record<string, string[]> }) => { if (Object.keys(saved.keys || {}).length) applyKeyOverrides(saved.keys); })
  .catch(() => undefined);

$('files-input').addEventListener('change', event => {
  const input = event.target as HTMLInputElement;
  void upload(Array.from(input.files || [])).catch(error);
  input.value = '';
});
$('import-input').addEventListener('change', event => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    if (input.dataset.mode === 'replace') replaceActiveWithNext();
    void api.import(file).then(async result => {
      await open(result.board.id, result);
      if (result.warnings?.length) toast(result.warnings.join(' · '));
    }).catch(error);
  }
  input.value = '';
});
$('relink-input').addEventListener('change', event => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const item = selected()[0];
  const id = S.state?.board.id;
  if (file && item && id) void api.relink(id, item.id, file).then(applyState).catch(error);
  input.value = '';
});
$('menu-background').addEventListener('change', () => void execute({ type: 'background', color: $<HTMLInputElement>('menu-background').value }));

for (const input of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-property]')) {
  input.addEventListener('change', () => {
    const key = input.dataset.property!;
    let value: string | number | boolean = input.value;
    if (input instanceof HTMLInputElement && input.type === 'checkbox') value = input.checked;
    else if (input instanceof HTMLInputElement && input.type === 'number') value = key === 'opacity' ? Number(input.value) / 100 : Number(input.value);
    if (typeof value === 'number' && !Number.isFinite(value)) { error('Enter a valid number'); return; }
    void execute({ type: 'update', ids: editable(), patch: { [key]: value } });
  });
}

for (const name of Object.keys(NOTE_FONTS)) {
  const option = document.createElement('option');
  option.value = name;
  option.textContent = name;
  $('note-font').append(option);
}
$('note-font').addEventListener('change', () => {
  const font = $<HTMLSelectElement>('note-font').value;
  const notes = selected().filter(item => item.kind === 'note');
  void execute({ type: 'batch', commands: notes.map(item => ({ type: 'update', ids: [item.id], patch: { data: { font: font || null } } })) });
});

$('prop-tags').addEventListener('change', () => {
  const tags = $<HTMLInputElement>('prop-tags').value.split(',').map(t => t.trim()).filter(Boolean);
  void execute({ type: 'batch', commands: selected().map(item => ({ type: 'update', ids: [item.id], patch: { data: { ...item.data, tags } } })) });
});
$('swatch-value').addEventListener('change', () => {
  const value = $<HTMLInputElement>('swatch-value').value;
  if (!isColor(value)) { error('Enter exactly #RRGGBB or #RRGGBBAA.'); return; }
  void execute({ type: 'update', ids: selected().filter(item => item.kind === 'swatch').map(item => item.id), patch: { color: value } });
});
$('prop-parent').addEventListener('change', () => void execute({ type: 'update', ids: editable(), patch: { parent_id: $<HTMLSelectElement>('prop-parent').value || null } }));
$('background').addEventListener('change', () => void execute({ type: 'background', color: $<HTMLInputElement>('background').value }));
$('shape-kind').addEventListener('change', () => {
  const item = selected()[0];
  if (item) void execute({ type: 'update', ids: [item.id], patch: { data: { ...item.data, shape: $<HTMLSelectElement>('shape-kind').value } } });
});
$('stroke-width').addEventListener('change', () => {
  const width = Number($<HTMLInputElement>('stroke-width').value);
  if (!Number.isFinite(width) || width <= 0) { error('Stroke width must be positive'); return; }
  void execute({ type: 'batch', commands: selected().filter(item => ['shape', 'stroke'].includes(item.kind)).map(item => ({ type: 'update', ids: [item.id], patch: { data: { ...item.data, stroke_width: width } } })) });
});
for (const id of ['shape-fill', 'shape-fill-enabled']) {
  $(id).addEventListener('change', () => {
    const fill = $<HTMLInputElement>('shape-fill-enabled').checked ? $<HTMLInputElement>('shape-fill').value : 'none';
    void execute({ type: 'batch', commands: selected().filter(item => item.kind === 'shape').map(item => ({ type: 'update', ids: [item.id], patch: { data: { ...item.data, fill } } })) });
  });
}
for (const key of ['x', 'y', 'width', 'height']) {
  $(`crop-${key}`).addEventListener('change', () => {
    const crop = Object.fromEntries(['x', 'y', 'width', 'height'].map(k => [k, Number($<HTMLInputElement>(`crop-${k}`).value) / 100]));
    if (crop.x < 0 || crop.y < 0 || crop.width <= 0 || crop.height <= 0 || crop.x + crop.width > 1.00001 || crop.y + crop.height > 1.00001) {
      error('Crop must remain inside the source image');
      updateInspector();
      return;
    }
    void execute({ type: 'crop', ids: selected().filter(i => i.kind === 'image').map(i => i.id), rect: crop });
  });
}
const refilter = () => {
  if (S.state) {
    scene.render(S.state.board, selection, matches);
    updateOutline();
  }
};
for (const id of ['search', 'kind-filter']) $(id).addEventListener(id === 'search' ? 'input' : 'change', refilter);
// PDF text arrives after the first keystroke; the search runs again with it.
onPdfText(() => { if ($<HTMLInputElement>('search').value.trim()) refilter(); });

$('theme-select').addEventListener('change', () => {
  const theme = $<HTMLSelectElement>('theme-select').value;
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('formref-theme', theme); } catch { }
});
$('accent-select').addEventListener('input', () => {
  const color = $<HTMLInputElement>('accent-select').value;
  document.documentElement.style.setProperty('--accent-color', color);
  try { localStorage.setItem('formref-accent', color); } catch { }
});
$('cutout-tolerance').addEventListener('input', () => setText('cutout-tolerance-value', $<HTMLInputElement>('cutout-tolerance').value));
for (const [id, key] of [['grid-visible', 'grid_visible'], ['snap-enabled', 'snap_enabled'], ['canvas-grayscale', 'grayscale']]) {
  $(id).addEventListener('change', () => void execute({ type: 'settings', patch: { [key]: $<HTMLInputElement>(id).checked } }));
}
$('grid-size').addEventListener('change', () => {
  const input = $<HTMLInputElement>('grid-size');
  const grid_size = Number(input.value);
  if (!Number.isFinite(grid_size) || grid_size < 4 || grid_size > 512) {
    toast('Choose a grid size from 4 to 512 pixels.');
    input.value = String(S.state?.board.settings?.grid_size || defaultSettings.grid_size);
    return;
  }
  void execute({ type: 'settings', patch: { grid_size } });
});
try {
  const saved = localStorage.getItem('formref-transition');
  if (saved === 'none' || saved === 'fade') {
    setInput('presentation-transition', saved);
    referenceView.transition(saved);
  }
} catch { }
$('presentation-transition').addEventListener('change', () => {
  const kind = $<HTMLSelectElement>('presentation-transition').value;
  referenceView.transition(kind);
  try { localStorage.setItem('formref-transition', kind); } catch { }
});
$('presentation-interval').addEventListener('change', () => {
  const input = $<HTMLInputElement>('presentation-interval');
  if (!referenceView.interval(Number(input.value))) {
    input.value = '10';
    referenceView.interval(10);
  }
});

const native = nativeInvoke<NativeWindow>('window_state');
if (native) {
  $('native-controls').hidden = false;
  const showNative = (result: NativeWindow) => {
    setInput('native-top', result.always_on_top);
    setInput('native-bottom', result.always_on_bottom);
    setInput('native-fullscreen', result.fullscreen);
    setInput('native-decorations', result.decorations);
    setInput('native-click-through', result.click_through);
  };
  void native.then(showNative).catch(error);
  // The shell answers with the whole window state, so on top and on bottom switch each other off in view too.
  for (const [id, key] of [['native-top', 'alwaysOnTop'], ['native-bottom', 'alwaysOnBottom'], ['native-fullscreen', 'fullscreen'], ['native-decorations', 'decorations'], ['native-click-through', 'clickThrough']]) {
    $(id).addEventListener('change', () => void nativeInvoke<NativeWindow>('window_configure', { [key]: $<HTMLInputElement>(id).checked })?.then(showNative).catch(error));
  }
  // Window opacity: the desktop window is transparent, so lowering the page's opacity shows what is behind it.
  const opacity = $<HTMLInputElement>('native-opacity');
  const applyOpacity = (value: number) => { document.documentElement.style.opacity = value >= 100 ? '' : String(value / 100); };
  try { const saved = Number(localStorage.getItem('formref.window-opacity')); if (saved >= 20 && saved <= 100) { opacity.value = String(saved); applyOpacity(saved); } } catch { /* storage may be unavailable */ }
  opacity.addEventListener('input', () => { applyOpacity(Number(opacity.value)); try { localStorage.setItem('formref.window-opacity', opacity.value); } catch { /* ignore */ } });
  // The global shortcut changes click-through from outside the page; keep the checkbox honest.
  const events = (window as unknown as { __TAURI__?: { event?: { listen(name: string, handler: (event: { payload: boolean }) => void): Promise<unknown> } } }).__TAURI__?.event;
  void events?.listen('formref://window', event => {
    setInput('native-click-through', event.payload);
    toast(event.payload ? 'Click-through is on. Press Ctrl+Alt+K to turn it off.' : 'Click-through is off.');
  });
  // The tray menu changes window modes from outside the page too.
  void events?.listen('formref://window-state', event => showNative(event.payload as unknown as NativeWindow));
}

setInput('accent-select', getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim());
// Card hints on the board come from t(); a language change repaints them (text() writes only nodes whose words changed).
onLanguage(() => { if (S.state) scene.render(S.state.board, selection, matches); });
