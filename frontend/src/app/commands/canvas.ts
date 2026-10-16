import { $, S, defaultSettings, drawCamera, execute, fit, selected, selection, toast, zoom } from '../editor';
import type { CommandDef } from '../registry';
import { hasBoard } from './when';

export function snapScale(scale: number) {
  if (!scale) return execute({ type: 'settings', patch: { snap_enabled: false } });
  const grid_size = Math.min(512, Math.max(4, defaultSettings.grid_size * scale));
  return execute({ type: 'settings', patch: { snap_enabled: true, grid_size } });
}

export function currentSnapScale(): number {
  const settings = S.state?.board.settings || defaultSettings;
  return settings.snap_enabled ? settings.grid_size / defaultSettings.grid_size : 0;
}

function pickBackground() {
  const input = $<HTMLInputElement>('menu-background');
  input.value = /^#[0-9a-f]{6}$/i.test(S.state?.board.background || '') ? S.state!.board.background : '#1c1b1d';
  if (typeof input.showPicker === 'function') input.showPicker();
  else input.click();
}

function settingsToggle(key: 'grid_visible' | 'grayscale') {
  const settings = S.state?.board.settings || defaultSettings;
  return execute({ type: 'settings', patch: { [key]: !settings[key] } });
}

export const CANVAS_COMMANDS: CommandDef[] = [
  { group: 'Canvas', id: 'toggle-grid', label: 'Toggle Grid', icon: 'grid', keys: ['g'], run: () => settingsToggle('grid_visible'), enabled: hasBoard },
  { group: 'Canvas', id: 'grayscale-canvas', label: 'Grayscale Canvas', icon: 'grayscale', run: () => settingsToggle('grayscale'), enabled: hasBoard },
  { group: 'Canvas', id: 'background', label: 'Background Color', icon: 'palette', run: pickBackground, enabled: hasBoard },
  { group: 'Canvas', id: 'fit', label: 'Fit View', icon: 'fit', keys: ['f'], run: () => fit(selection.size ? selected() : undefined) },
  { group: 'Canvas', id: 'fit-all', label: 'Fit Canvas to Content', icon: 'focus-mode', run: () => fit(S.state?.board.items || []) },
  { group: 'Canvas', id: 'reset-zoom', label: 'Reset Zoom', icon: 'search', keys: ['mod+0', '1'], run: () => zoom(1 / S.camera.zoom) },
  { group: 'Canvas', id: 'zoom-in', label: 'Zoom In', icon: 'zoom-in', keys: ['=', '+'], run: () => zoom(1.2) },
  { group: 'Canvas', id: 'zoom-out', label: 'Zoom Out', icon: 'zoom-out', keys: ['-'], run: () => zoom(1 / 1.2) },
  { group: 'Canvas', id: 'navigator', label: 'Toggle Navigator', icon: 'navigator', keys: ['m'], run: () => { $('navigator').hidden = !$('navigator').hidden; drawCamera(); } },
  { group: 'Canvas', id: 'flip-view-horizontal', label: 'Flip View Horizontally', icon: 'flip', keys: ['shift+h'], mutates: false, agent: 'window-only', checked: () => S.flipX, run: () => { S.flipX = !S.flipX; drawCamera(); $('stage').classList.toggle('flipped', S.flipX || S.flipY); toast(S.flipX ? 'View flipped horizontally. The board itself is unchanged.' : 'View no longer flipped horizontally.'); }, description: 'Mirrors the view left to right to check a drawing with fresh eyes, as artists flip a canvas; the board, exports and other windows are unchanged.' },
  { group: 'Canvas', id: 'flip-view-vertical', label: 'Flip View Vertically', icon: 'flip', keys: ['shift+v'], mutates: false, agent: 'window-only', checked: () => S.flipY, run: () => { S.flipY = !S.flipY; drawCamera(); $('stage').classList.toggle('flipped', S.flipX || S.flipY); toast(S.flipY ? 'View flipped vertically. The board itself is unchanged.' : 'View no longer flipped vertically.'); }, description: 'Mirrors the view top to bottom; the board itself is unchanged.' },
  { group: 'Canvas', id: 'focus', label: 'Focus Mode', icon: 'focus-mode', keys: ['tab'], run: () => { $('app').classList.toggle('focus'); drawCamera(); } },
];
