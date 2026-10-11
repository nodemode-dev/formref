import './app/editor';
import { bindShell } from './app/commands';
import { openPalette } from './app/bindings';
import './app/gestures';
import { bindDocks, showPanel, toggleDock } from './ui/dock';
import { drawCamera, start } from './app/editor';

bindShell({ palette: openPalette, dock: side => toggleDock(side, drawCamera), panel: showPanel });
bindDocks(drawCamera);
drawCamera();
void start();
