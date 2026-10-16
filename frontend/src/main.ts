import './app/editor';
import { bindShell } from './app/commands';
import { openPalette } from './app/bindings';
import './app/gestures';
import './app/comments';
import './app/labels';
import './app/cards';
import './app/cutout';
import './app/cloud';
import { bindDocks, showPanel, toggleDock } from './ui/dock';
import { AgentPanel } from './ui/panels/agent';
import { S, consent, drawCamera, onState, selection, setTool, toast } from './app/editor';
import { restore } from './app/tabs';
import { registerTerminal } from './app/terminal';
import { attachCatalogue } from './app/catalogue';
import { registerVector } from './app/vector';
import { registerDirectSelect } from './app/direct-select';
import { bindLanguage } from './app/language';
import { registerPathfinder } from './app/pathfinder';
import { registerSmartGuides } from './app/smart-guides';
import { registerVisibility } from './app/visibility';
import { registerPencil } from './app/pencil';
import { registerBlend } from './app/blend';
import { registerVideo } from './app/video';
import './app/drag-out';
import { registerPdf } from './app/pdf';
import { registerCropMode } from './app/crop-mode';
import { registerTransformTools } from './app/transform-tools';

bindLanguage();
registerTerminal();
registerVector();
registerDirectSelect(setTool);
registerPencil(setTool);
registerPathfinder();
registerSmartGuides();
registerVisibility();
registerBlend();
registerVideo();
registerPdf();
registerCropMode();
registerTransformTools();
attachCatalogue();

const agent = new AgentPanel({
  boardId: () => S.state?.board.id || null,
  selection: () => [...selection],
  afterTurn: () => undefined,
  notify: toast,
});

function panel(name: string) {
  showPanel(name);
  if (name === 'agent') agent.focus();
}

bindShell({ palette: openPalette, dock: side => toggleDock(side, drawCamera), panel });
bindDocks(drawCamera);
document.querySelectorAll<HTMLElement>('[data-panel-tab="agent"],[data-rail-panel="agent"]').forEach(node => node.addEventListener('click', () => agent.focus()));
if (document.documentElement.dataset.rightPanel === 'agent') void agent.load();
onState(() => agent.refresh());

let consentDismissedAt = 0;
consent.ask = () => {
  const dialog = document.getElementById('consent-dialog') as HTMLDialogElement;
  if (dialog.open || document.querySelector('dialog[open]') || Date.now() - consentDismissedAt < 60000) return;
  dialog.showModal();
};
document.getElementById('consent-deny')!.addEventListener('click', () => {
  consentDismissedAt = Date.now();
  (document.getElementById('consent-dialog') as HTMLDialogElement).close();
});
document.getElementById('consent-allow')!.addEventListener('click', () => {
  void agent.allowOutside().then(() => {
    (document.getElementById('consent-dialog') as HTMLDialogElement).close();
    toast('Outside agents may now edit boards. Turn this off in the Agent panel.');
  });
});
drawCamera();
void restore();
