import { togglePresenting } from '../present';
import { refreshCloudPreferences } from '../cloud';
import { $, S, error, referenceView, setInput } from '../editor';
import type { CommandDef } from '../registry';
import { clipToken } from './file';
import { hasBoard, hasImages } from './when';
import { PrefsWindow } from '../../ui/prefs-window';

const prefsWindow = new PrefsWindow($<HTMLDialogElement>('preferences-dialog'));
let paletteOpener: () => void = () => undefined;
let dockToggler: (side: 'left' | 'right') => void = () => undefined;
let panelShower: (panel: string) => void = () => undefined;
export function bindShell(hooks: { palette: () => void; dock: (side: 'left' | 'right') => void; panel: (panel: string) => void }) {
  paletteOpener = hooks.palette;
  dockToggler = hooks.dock;
  panelShower = hooks.panel;
}
function openPalette() { paletteOpener(); }
function toggleDock(side: 'left' | 'right') { dockToggler(side); }
function showRightPanel(panel: string) { panelShower(panel); }

export const VIEW_COMMANDS: CommandDef[] = [
  { group: 'View', id: 'present', label: 'Present', icon: 'present', keys: ['p'], run: togglePresenting, enabled: hasBoard },
  { group: 'View', id: 'slideshow', label: 'Slideshow', icon: 'play', keys: ['shift+s'], run: () => referenceView.toggle(), enabled: () => !!S.state?.board.items.some(i => i.kind === 'image') },
  { group: 'View', id: 'reference-focus', label: 'Focus Image Reference', icon: 'image', run: () => referenceView.focus(), enabled: hasImages },
  { group: 'View', id: 'reference-prev', label: 'Previous Reference', icon: 'chevron-left', run: () => referenceView.step(-1), palette: false },
  { group: 'View', id: 'reference-next', label: 'Next Reference', icon: 'chevron-right', run: () => referenceView.step(1), palette: false },
  { group: 'View', id: 'reference-play', label: 'Play or Pause References', icon: 'play', run: () => referenceView.toggle(), palette: false },
  { group: 'View', id: 'reference-stop', label: 'Exit Reference View', icon: 'close', run: () => referenceView.stop(true), palette: false },
  { group: 'View', id: 'left-dock', label: 'Toggle Left Panel', icon: 'dock-left', keys: ['mod+['], run: () => toggleDock('left') },
  { group: 'View', id: 'right-dock', label: 'Toggle Right Panel', icon: 'dock-right', keys: ['mod+]'], run: () => toggleDock('right') },
  { group: 'View', id: 'agent', label: 'Open Agent', icon: 'agent', run: () => showRightPanel('agent') },
  { group: 'View', id: 'commands', label: 'Commands', icon: 'commands', keys: ['mod+k'], run: () => openPalette(), palette: false },
  { group: 'View', id: 'help', label: 'Keyboard Shortcuts', icon: 'keyboard', keys: ['?', 'shift+/'], run: () => $<HTMLDialogElement>('help-dialog').showModal() },
  { group: 'View', id: 'preferences', label: 'Preferences', icon: 'settings', keys: ['mod+,'], run: () => { setInput('theme-select', document.documentElement.dataset.theme || 'studio'); prefsWindow.show(); void clipToken().catch(error); void refreshCloudPreferences(); } },
];
