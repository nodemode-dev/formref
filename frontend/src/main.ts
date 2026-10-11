import './app/editor';
import { bindShell } from './app/commands';
import { openPalette } from './app/bindings';
import './app/gestures';
import { bindDocks, showPanel, toggleDock } from './ui/dock';
import { AgentPanel } from './ui/panels/agent';
import { S, drawCamera, onState, selection, toast } from './app/editor';
import { restore } from './app/tabs';

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
drawCamera();
void restore();
