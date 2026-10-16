import { S, setTool } from '../editor';
import type { CommandDef } from '../registry';
import { hasBoard } from './when';

function drawMode() {
  setTool(S.tool === 'pen' ? 'select' : 'pen');
}

function shapeTool(kind: 'rect' | 'ellipse' | 'line') {
  S.shapeKind = kind;
  setTool('shape');
}

export const TOOL_COMMANDS: CommandDef[] = [
  { group: 'Tools', id: 'tool-select', label: 'Select Tool', icon: 'cursor', keys: ['v'], run: () => setTool('select') },
  { group: 'Tools', id: 'tool-hand', label: 'Pan Tool', icon: 'hand', keys: ['h'], run: () => setTool('hand') },
  { group: 'Tools', id: 'draw', label: 'Draw Mode', icon: 'brush', keys: ['d'], run: drawMode, enabled: hasBoard },
  { group: 'Tools', id: 'tool-eraser', label: 'Eraser', icon: 'eraser', keys: ['e'], run: () => setTool(S.tool === 'eraser' ? 'select' : 'eraser'), enabled: hasBoard },
  { group: 'Tools', id: 'tool-rect', label: 'Rectangle Tool', icon: 'rect-tool', keys: ['shift+r'], run: () => shapeTool('rect'), enabled: hasBoard },
  { group: 'Tools', id: 'tool-circle', label: 'Circle Tool', icon: 'circle-tool', keys: ['shift+o'], run: () => shapeTool('ellipse'), enabled: hasBoard },
  { group: 'Tools', id: 'tool-line', label: 'Line Tool', icon: 'line-tool', keys: ['shift+i'], run: () => shapeTool('line'), enabled: hasBoard },
  { group: 'Tools', id: 'tool-connect', label: 'Connect References', icon: 'connect', keys: ['shift+c'], run: () => setTool('connect'), enabled: hasBoard },
];
