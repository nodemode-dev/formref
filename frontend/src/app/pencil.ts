import type { Item, Point } from '../lib/types';
import { newItem } from '../lib/types';
import { simplifyPoints, smoothPath, type VPath } from '../lib/vector/path';
import { S, toast, topZ } from './editor';
import { registry } from './registry';

const STORE = 'formref-pencil-fidelity';
let fidelity = 3;
try { const saved = Number(localStorage.getItem(STORE)); if (saved >= 1 && saved <= 5) fidelity = saved; } catch { }

/** Illustrator's Pencil: the freehand trace becomes an editable smooth path, simplified by the Fidelity setting (1 accurate to 5 smooth, in screen pixels of tolerance); ending near the start closes it. */
export function pencilItem(points: Point[]): Item | null {
  if (points.length < 2) return null;
  const z = S.camera.zoom;
  const first = points[0], last = points[points.length - 1];
  const closed = points.length > 8 && Math.hypot(last.x - first.x, last.y - first.y) * z < 10;
  const tolerance = [0.5, 1, 2.5, 5, 9][fidelity - 1] / z;
  let simple = simplifyPoints(points, tolerance);
  if (closed && simple.length > 3) simple = simple.slice(0, -1);
  const path: VPath = simple.length > 2 ? smoothPath({ closed, anchors: simple.map(p => ({ x: p.x, y: p.y })) }) : { closed: false, anchors: simple.map(p => ({ x: p.x, y: p.y })) };
  const all = path.anchors.flatMap(a => [a, a.in, a.out].filter(Boolean) as Point[]);
  const x0 = Math.min(...all.map(p => p.x)), y0 = Math.min(...all.map(p => p.y));
  const w = Math.max(1, Math.max(...all.map(p => p.x)) - x0), h = Math.max(1, Math.max(...all.map(p => p.y)) - y0);
  const local = (p: Point) => ({ x: p.x - x0, y: p.y - y0 });
  const anchors = path.anchors.map(a => ({ ...local(a), in: a.in ? local(a.in) : null, out: a.out ? local(a.out) : null }));
  return newItem('shape', x0, y0, { width: w, height: h, z: topZ(), color: '#f97316', data: { shape: 'path', stroke_width: 2, fill: 'none', cap: 'round', join: 'round', vector: { w, h, paths: [{ closed: path.closed, anchors }] } } });
}

export function registerPencil(setTool: (tool: 'pencil') => void): void {
  registry.add(
    { group: 'Tools', id: 'tool-pencil', label: 'Pencil Tool', icon: 'pen', keys: ['shift+n'], run: () => setTool('pencil'), agent: 'window-only', mutates: false, description: 'Draws freehand like Illustrator\'s Pencil: the trace becomes an editable smooth path with anchors and handles; end near the start to close it. Pencil Fidelity sets how closely it follows the hand.' },
    {
      group: 'Tools', id: 'pencil-fidelity', label: 'Pencil Fidelity...', icon: 'pen', agent: 'window-only', mutates: false,
      params: { fidelity: { type: 'integer', min: 1, max: 5, description: '1 follows the hand closely with more anchors, 5 is smoothest with fewest' } },
      run: p => {
        const value = Number((p as { fidelity?: unknown } | undefined)?.fidelity ?? (fidelity % 5) + 1);
        if (!(value >= 1 && value <= 5)) throw new Error('Fidelity is 1 (accurate) to 5 (smooth).');
        fidelity = Math.round(value);
        try { localStorage.setItem(STORE, String(fidelity)); } catch { }
        toast(`Pencil Fidelity ${fidelity} of 5 (1 accurate, 5 smooth).`);
      },
      description: 'Sets the Pencil\'s fidelity from 1 (accurate, more anchors) to 5 (smooth, fewer anchors); without a value it steps to the next setting.',
    },
  );
}
