import { api } from '../lib/api';
import { newItem, uid } from '../lib/types';
import { itemBounds } from '../lib/geometry';
import { ContextMenu } from '../ui/context-menu';
import {
  $, S, applyState, colorPicker, descendants, execute, expanded, fit, inputDialog, matches, open, openEditor,
  scene, selected, selection, setSelection, setText, setTool, stage, topZ, upload, worldPoint, zoom, drawCamera,
  rememberCamera, toast, defaultSettings, error,
} from './editor';
import type { Gesture } from './editor';
import { commandForKey } from './commands';
import { boardMenu } from './menu';
import { captureUrl, droppedUrl, webUrl } from './capture';

export const menu = new ContextMenu($('overlay-root'));

function gestureDelta(g: Gesture) {
  let dx = g.current.x - g.start.x;
  let dy = g.current.y - g.start.y;
  if (g.type === 'move' && g.snapSize && g.snapAnchor) {
    const size = g.snapSize;
    const snap = (value: number) => Math.sign(value) * Math.floor(Math.abs(value) / size + .5) * size;
    dx = snap(g.snapAnchor.x + dx) - g.snapAnchor.x;
    dy = snap(g.snapAnchor.y + dy) - g.snapAnchor.y;
  }
  return { dx, dy };
}

const erased = new Set<string>();

function eraseAt(point: { x: number; y: number }) {
  if (!S.state) return;
  const radius = 8 / S.camera.zoom;
  for (const item of S.state.board.items) {
    if (item.kind !== 'stroke' || item.locked || item.hidden || erased.has(item.id)) continue;
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const angle = -item.rotation * Math.PI / 180;
    const dx = point.x - cx;
    const dy = point.y - cy;
    const lx = dx * Math.cos(angle) - dy * Math.sin(angle) + item.width / 2;
    const ly = dx * Math.sin(angle) + dy * Math.cos(angle) + item.height / 2;
    if (lx < -radius || ly < -radius || lx > item.width + radius || ly > item.height + radius) continue;
    const points = (item.data.points || []) as { x: number; y: number }[];
    if (points.some(pt => Math.hypot(pt.x - lx, pt.y - ly) <= radius + Number(item.data.stroke_width || 3) / 2)) {
      erased.add(item.id);
      const root = scene.nodes.get(item.id)?.root;
      if (root) root.style.opacity = '0.25';
    }
  }
}

function shapePath(g: Gesture): string {
  const { start: a, current: b } = g;
  if (S.shapeKind === 'line') return `M${a.x},${a.y}L${b.x},${b.y}`;
  if (S.shapeKind === 'ellipse') {
    const rx = Math.abs(b.x - a.x) / 2;
    const ry = Math.abs(b.y - a.y) / 2;
    const cx = Math.min(a.x, b.x) + rx;
    return `M${cx - rx},${Math.min(a.y, b.y) + ry}a${rx},${ry} 0 1,0 ${rx * 2},0a${rx},${ry} 0 1,0 ${-rx * 2},0`;
  }
  return `M${a.x},${a.y}H${b.x}V${b.y}H${a.x}Z`;
}

stage.addEventListener('pointerdown', event => {
  const target = event.target as HTMLElement;
  if (target.closest('button,input,a,video,audio,iframe,[contenteditable="true"],.floating-controls,.navigator') || !S.state || event.button === 2) return;
  menu.close();
  const p = worldPoint(event);
  const screen = { x: event.clientX, y: event.clientY };
  const element = target.closest<HTMLElement>('.board-item');
  const item = S.state.board.items.find(i => i.id === element?.dataset.id);
  const connection = target.closest<SVGPathElement>('[data-connection]');
  if (S.tool === 'sample') { event.preventDefault(); colorPicker.pick(item, p, element); return; }
  if (connection) {
    setSelection([]);
    S.chosenConnection = connection.dataset.connection || null;
    toast('Connection selected. Press Delete to remove; double-click to label.');
    return;
  }
  if (S.tool === 'connect' && item) {
    if (!S.connectionStart) {
      S.connectionStart = item.id;
      setSelection([item.id]);
      setText('tool-status', 'Click the destination reference');
    } else if (S.connectionStart !== item.id) {
      const from = S.connectionStart;
      S.connectionStart = null;
      void execute({ type: 'connect', connection: { id: uid(), from, to: item.id, color: '#f97316', label: '' } });
      setText('tool-status', 'Click two references to connect them');
    }
    return;
  }
  const base = { start: p, current: p, screen, items: [], initial: { ...S.camera }, points: [], shift: event.shiftKey };
  if (S.space || event.button === 1 || S.tool === 'hand') S.gesture = { type: 'pan', ...base };
  else if (S.tool === 'pen' || S.tool === 'shape') S.gesture = { type: S.tool, ...base, points: [p] };
  else if (S.tool === 'eraser') {
    erased.clear();
    S.gesture = { type: 'erase', ...base };
    eraseAt(p);
  }
  else if (item) {
    const group = expanded([item]);
    if (event.shiftKey) {
      const next = new Set(selection);
      for (const id of group) {
        if (selection.has(item.id)) next.delete(id);
        else next.add(id);
      }
      setSelection([...next]);
      return;
    }
    if (!selection.has(item.id)) setSelection(group);
    const involved = descendants(selected());
    if (involved.some(i => i.locked)) return;
    const handle = target.closest<HTMLElement>('[data-handle]')?.dataset.handle;
    const type = handle === 'resize' ? 'resize' : handle === 'rotate' ? 'rotate' : 'move';
    S.gesture = {
      type, ...base,
      items: (type === 'move' ? involved : [item]).map(i => ({ ...i })),
      angle: Math.atan2(p.y - item.y - item.height / 2, p.x - item.x - item.width / 2),
    };
  } else {
    if (!event.shiftKey) setSelection([]);
    S.gesture = { type: 'marquee', ...base };
    $('marquee').hidden = false;
  }
  const settings = S.state.board.settings || defaultSettings;
  if (S.gesture?.type === 'move' && settings.snap_enabled) {
    const bounds = S.gesture.items.map(itemBounds);
    S.gesture.snapSize = settings.grid_size;
    S.gesture.snapAnchor = { x: Math.min(...bounds.map(b => b.left)), y: Math.min(...bounds.map(b => b.top)) };
  }
  if (S.gesture && S.gesture.type !== 'move') {
    stage.setPointerCapture(event.pointerId);
    stage.classList.add('dragging');
    event.preventDefault();
  }
});

stage.addEventListener('pointermove', event => {
  S.pointer = worldPoint(event);
  const g = S.gesture;
  if (!g) return;
  g.current = S.pointer;
  const { dx, dy } = gestureDelta(g);
  if (g.type === 'move' && !stage.hasPointerCapture(event.pointerId)) {
    if (Math.hypot(event.clientX - g.screen.x, event.clientY - g.screen.y) < 3) return;
    stage.setPointerCapture(event.pointerId);
    stage.classList.add('dragging');
  }
  if (g.type === 'pan') {
    S.camera = { ...g.initial, x: g.initial.x + event.clientX - g.screen.x, y: g.initial.y + event.clientY - g.screen.y };
    drawCamera();
  } else if (g.type === 'move') {
    for (const item of g.items) scene.preview(item.id, { x: item.x + dx, y: item.y + dy });
  } else if (g.type === 'resize') {
    const item = g.items[0];
    const angle = item.rotation * Math.PI / 180;
    const localX = dx * Math.cos(angle) + dy * Math.sin(angle);
    const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
    const width = Math.max(16, item.width + localX);
    const height = event.shiftKey ? width * item.height / item.width : Math.max(16, item.height + localY);
    scene.preview(item.id, { width, height });
  } else if (g.type === 'rotate') {
    const item = g.items[0];
    const angle = Math.atan2(g.current.y - item.y - item.height / 2, g.current.x - item.x - item.width / 2);
    let rotation = item.rotation + (angle - (g.angle || 0)) * 180 / Math.PI;
    if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
    scene.preview(item.id, { rotation });
  } else if (g.type === 'marquee') {
    const rect = stage.getBoundingClientRect();
    const x1 = g.screen.x - rect.left;
    const y1 = g.screen.y - rect.top;
    const x2 = event.clientX - rect.left;
    const y2 = event.clientY - rect.top;
    const node = $('marquee');
    node.style.left = `${Math.min(x1, x2)}px`;
    node.style.top = `${Math.min(y1, y2)}px`;
    node.style.width = `${Math.abs(x2 - x1)}px`;
    node.style.height = `${Math.abs(y2 - y1)}px`;
  } else if (g.type === 'pen') {
    const last = g.points[g.points.length - 1];
    if (Math.hypot(g.current.x - last.x, g.current.y - last.y) > 1.5 / S.camera.zoom) g.points.push(g.current);
    $('draw-path').setAttribute('d', g.points.map((pt, i) => `${i ? 'L' : 'M'}${pt.x},${pt.y}`).join(' '));
  } else if (g.type === 'shape') {
    $('draw-path').setAttribute('d', shapePath(g));
  } else if (g.type === 'erase') {
    eraseAt(g.current);
  }
});

function flushDeferred() {
  if (S.deferred) {
    const next = S.deferred;
    S.deferred = null;
    applyState(next);
  }
}

function endGesture(event: PointerEvent, cancel = false) {
  if (!S.gesture || !S.state) return;
  const g = S.gesture;
  S.gesture = null;
  stage.classList.remove('dragging');
  $('marquee').hidden = true;
  $('draw-path').setAttribute('d', '');
  if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  if (g.type === 'erase') {
    const ids = [...erased];
    erased.clear();
    if (ids.length && !cancel) void execute({ type: 'remove', ids });
    else scene.render(S.state.board, selection, matches);
    flushDeferred();
    return;
  }
  if (cancel) {
    scene.render(S.state.board, selection, matches);
    flushDeferred();
    return;
  }
  const { dx, dy } = gestureDelta(g);
  if (g.type === 'pan') rememberCamera();
  else if (g.type === 'move' && Math.hypot((g.current.x - g.start.x) * S.camera.zoom, (g.current.y - g.start.y) * S.camera.zoom) >= 3) {
    void execute({ type: 'transform', ids: g.items.map(item => item.id), dx, dy });
  } else if (g.type === 'move') scene.render(S.state.board, selection, matches);
  else if (g.type === 'resize' || g.type === 'rotate') {
    const root = scene.nodes.get(g.items[0].id)?.root;
    if (root) {
      const patch = g.type === 'resize'
        ? { width: Number.parseFloat(root.style.width), height: Number.parseFloat(root.style.height) }
        : { rotation: Number.parseFloat(root.style.transform.replace('rotate(', '')) };
      void execute({ type: 'update', ids: [g.items[0].id], patch });
    }
  } else if (g.type === 'marquee') {
    const x1 = Math.min(g.start.x, g.current.x);
    const y1 = Math.min(g.start.y, g.current.y);
    const x2 = Math.max(g.start.x, g.current.x);
    const y2 = Math.max(g.start.y, g.current.y);
    const found = S.state.board.items.filter(i => {
      const b = itemBounds(i);
      return !i.hidden && matches(i) && b.left < x2 && b.right > x1 && b.top < y2 && b.bottom > y1;
    });
    setSelection(g.shift ? [...selection, ...expanded(found)] : expanded(found));
  } else if (g.type === 'pen' && g.points.length > 1) {
    const x = Math.min(...g.points.map(pt => pt.x)) - 2;
    const y = Math.min(...g.points.map(pt => pt.y)) - 2;
    const width = Math.max(4, Math.max(...g.points.map(pt => pt.x)) - x + 2);
    const height = Math.max(4, Math.max(...g.points.map(pt => pt.y)) - y + 2);
    const item = newItem('stroke', x, y, { width, height, z: topZ(), color: '#f97316', data: { points: g.points.map(pt => ({ x: pt.x - x, y: pt.y - y })), stroke_width: 3 } });
    void execute({ type: 'add', items: [item] }).then(() => setSelection([item.id]));
  } else if (g.type === 'shape' && (Math.abs(dx) > 4 || Math.abs(dy) > 4) && (S.shapeKind === 'line' || (Math.abs(dx) > 4 && Math.abs(dy) > 4))) {
    const line = S.shapeKind === 'line';
    const data = line
      ? { shape: 'line', fill: 'none', stroke_width: 3, points: [{ x: g.start.x - Math.min(g.start.x, g.current.x), y: g.start.y - Math.min(g.start.y, g.current.y) }, { x: g.current.x - Math.min(g.start.x, g.current.x), y: g.current.y - Math.min(g.start.y, g.current.y) }] }
      : { shape: S.shapeKind, fill: '#f9731620', stroke_width: 2 };
    const item = newItem('shape', Math.min(g.start.x, g.current.x), Math.min(g.start.y, g.current.y), { width: Math.max(4, Math.abs(dx)), height: Math.max(4, Math.abs(dy)), color: '#f97316', z: topZ(), data });
    void execute({ type: 'add', items: [item] }).then(() => setSelection([item.id]));
  }
  flushDeferred();
}

stage.addEventListener('pointerup', event => endGesture(event));
stage.addEventListener('pointercancel', event => endGesture(event, true));
stage.addEventListener('pointerleave', () => { if (!S.gesture) S.pointer = null; });

stage.addEventListener('wheel', event => {
  if ((event.target as Element).closest('[contenteditable="true"],.navigator')) return;
  event.preventDefault();
  const rect = stage.getBoundingClientRect();
  zoom(Math.exp(-event.deltaY * .0015), { x: event.clientX - rect.left, y: event.clientY - rect.top });
}, { passive: false });

stage.addEventListener('contextmenu', event => {
  if ((event.target as Element).closest('input,textarea,[contenteditable="true"]')) return;
  event.preventDefault();
  if (!S.state) return;
  S.pointer = worldPoint(event);
  const element = (event.target as HTMLElement).closest<HTMLElement>('.board-item');
  const item = S.state.board.items.find(i => i.id === element?.dataset.id);
  if (item && !selection.has(item.id)) setSelection(expanded([item]));
  menu.show(boardMenu(), event.clientX, event.clientY);
});

stage.addEventListener('dblclick', event => {
  // Players and table cells handle their own double-clicks (full screen, cell editing).
  if ((event.target as HTMLElement).closest('video,audio,iframe,.card-table')) return;
  const element = (event.target as HTMLElement).closest<HTMLElement>('.board-item');
  const item = S.state?.board.items.find(i => i.id === element?.dataset.id);
  const connection = (event.target as Element).closest<SVGPathElement>('[data-connection]');
  if (connection && S.state) {
    const record = S.state.board.connections.find(c => c.id === connection.dataset.connection);
    if (record) {
      void inputDialog('Label connection', { name: record.label, submit: 'Save' }).then(form => {
        if (form) return execute({ type: 'batch', commands: [{ type: 'disconnect', ids: [record.id] }, { type: 'connect', connection: { ...record, label: form.name } }] });
      });
    }
    return;
  }
  if (!item || S.tool === 'sample') return;
  if (item.kind === 'document' || (item.kind === 'note' && item.data.text_format === 'markdown')) openEditor(item.id);
  else if (item.kind === 'board' && typeof item.data.board_id === 'string') void open(item.data.board_id).catch(error);
  else if (item.kind === 'link' && /^https?:\/\//i.test(item.url)) window.open(item.url, '_blank', 'noopener,noreferrer');
  else if (item.kind === 'file' && item.asset_id) {
    const link = document.createElement('a');
    link.href = api.assetUrl(item.asset_id);
    link.download = item.title || 'attachment';
    link.click();
  } else if (item.kind === 'image') fit([item]);
});

let dragDepth = 0;
stage.addEventListener('dragenter', event => {
  const types = event.dataTransfer?.types || [];
  if (!types.includes('Files') && !types.includes('text/uri-list')) return;
  event.preventDefault();
  dragDepth++;
  $('drop-hint').hidden = false;
});
stage.addEventListener('dragover', event => {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
});
stage.addEventListener('dragleave', event => {
  event.preventDefault();
  if (--dragDepth <= 0) {
    dragDepth = 0;
    $('drop-hint').hidden = true;
  }
});
stage.addEventListener('drop', event => {
  event.preventDefault();
  dragDepth = 0;
  $('drop-hint').hidden = true;
  const files = Array.from(event.dataTransfer?.files || []);
  const url = files.length ? null : droppedUrl(event.dataTransfer);
  if (url) void captureUrl(url, worldPoint(event)).catch(error);
  else void upload(files, worldPoint(event)).catch(error);
});

document.addEventListener('paste', event => {
  if (document.querySelector('dialog[open]')) return;
  if ((event.target as HTMLElement).closest('input,textarea,[contenteditable="true"]')) return;
  const files = Array.from(event.clipboardData?.items || []).filter(entry => entry.kind === 'file').map(entry => entry.getAsFile()).filter((file): file is File => !!file);
  if (files.length) {
    event.preventDefault();
    void upload(files).catch(error);
    return;
  }
  const url = webUrl(event.clipboardData?.getData('text/plain'));
  if (url && S.state) {
    event.preventDefault();
    void captureUrl(url).catch(error);
  }
});

document.addEventListener('keydown', event => {
  if (menu.open) return;
  const target = event.target as HTMLElement;
  const editing = !!target.closest('input,textarea,select,[contenteditable="true"]');
  const modal = !!document.querySelector('dialog[open]');
  const modifier = event.ctrlKey || event.metaKey;
  if (event.code === 'Space' && !editing && !modal) {
    event.preventDefault();
    S.space = true;
    stage.classList.add('pan');
    return;
  }
  const command = commandForKey(event);
  if (!command) return;
  const global = modifier && ['save', 'commands', 'export'].includes(command.id);
  if ((editing || modal) && !global) return;
  if (command.id === 'paste') return;
  if (modifier && editing && !global) return;
  event.preventDefault();
  if (command.enabled && !command.enabled()) return;
  void Promise.resolve().then(() => command.run()).catch(error);
});

document.addEventListener('keyup', event => {
  if (event.code === 'Space') {
    S.space = false;
    stage.classList.toggle('pan', S.tool === 'hand');
  }
});
window.addEventListener('blur', () => {
  S.space = false;
  stage.classList.toggle('pan', S.tool === 'hand');
});
new ResizeObserver(drawCamera).observe(stage);

export { setTool };
