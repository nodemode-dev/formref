import { mediaKind } from '../lib/media';
import type { Item } from '../lib/types';
import { $, error, execute, selected } from './editor';
import { registry } from './registry';
import { run } from './commands';

/** Video reference tools from the PureRef and BeeRef wishlists: in and out points that the player keeps to (and loops between), frame stepping and playback speed. */
function media(): { item: Item; el: HTMLMediaElement } | null {
  const items = selected();
  if (items.length !== 1) return null;
  const item = items[0];
  if (!['video', 'audio'].includes(mediaKind(item.kind, item.data.mime, item.asset_id, item.url))) return null;
  const el = document.querySelector<HTMLMediaElement>(`.board-item[data-id="${CSS.escape(item.id)}"] video, .board-item[data-id="${CSS.escape(item.id)}"] audio`);
  return el ? { item, el } : null;
}

const need = () => { const m = media(); if (!m) throw new Error('Select one video or audio reference.'); return m; };
const round = (t: number) => Math.round(t * 1000) / 1000;

function save(item: Item, data: Record<string, unknown>) {
  if (item.locked) throw new Error('Unlock the reference first.');
  return execute({ type: 'update', ids: [item.id], patch: { data } });
}

async function setPoint(which: 'clip_start' | 'clip_end', value?: number) {
  const { item, el } = need();
  const t = round(value ?? el.currentTime);
  const start = which === 'clip_start' ? t : Number(item.data.clip_start) || 0;
  const end = which === 'clip_end' ? t : Number(item.data.clip_end) || 0;
  if (Number.isFinite(el.duration) && t > el.duration) throw new Error(`The clip is ${round(el.duration)} seconds long.`);
  if (end > 0 && end <= start) throw new Error('The out point must come after the in point.');
  await save(item, { [which]: t });
}

function step(frames: number) {
  const { item, el } = need();
  const fps = Number(item.data.fps) > 0 ? Number(item.data.fps) : 30;
  el.pause();
  const start = Number(item.data.clip_start) || 0, end = Number(item.data.clip_end) || (Number.isFinite(el.duration) ? el.duration : Infinity);
  el.currentTime = Math.max(start, Math.min(end, el.currentTime + frames / fps));
}

async function setRate(rate: number) {
  if (!(rate >= 0.0625 && rate <= 16)) throw new Error('Speed is from 0.0625x to 16x.');
  const { item, el } = need();
  el.playbackRate = rate;
  await save(item, { rate });
}

export function registerVideo(): void {
  const has = () => !!media();
  for (const [id, key] of [['media-start', 'clip_start'], ['media-end', 'clip_end']] as const) {
    $<HTMLInputElement>(id).addEventListener('change', event => {
      const raw = (event.target as HTMLInputElement).value.trim();
      const run = raw === '' ? (() => { const { item } = need(); return save(item, { [key]: null }); })() : setPoint(key, Number(raw));
      void Promise.resolve(run).catch(error);
    });
  }
  $<HTMLSelectElement>('media-rate').addEventListener('change', event => { void setRate(Number((event.target as HTMLSelectElement).value)).catch(error); });
  $('media-properties').addEventListener('click', event => {
    const action = (event.target as HTMLElement).closest<HTMLElement>('[data-video]')?.dataset.video;
    if (action) run(`video-${action}`);
  });
  registry.add(
    { group: 'Images', id: 'video-set-in', label: 'Set Video In Point', icon: 'video', keys: ['alt+i'], run: p => setPoint('clip_start', typeof p?.seconds === 'number' ? p.seconds : undefined), enabled: has, params: { seconds: { type: 'number', min: 0, description: 'time in seconds; the current frame when left out' } }, description: 'Marks where the selected video or audio reference starts playing; with an out point it plays (and loops) only between them.' },
    { group: 'Images', id: 'video-set-out', label: 'Set Video Out Point', icon: 'video', keys: ['alt+o'], run: p => setPoint('clip_end', typeof p?.seconds === 'number' ? p.seconds : undefined), enabled: has, params: { seconds: { type: 'number', min: 0, description: 'time in seconds; the current frame when left out' } }, description: 'Marks where the selected video or audio reference stops (or loops back to the in point).' },
    { group: 'Images', id: 'video-clear-clip', label: 'Clear Video In and Out', icon: 'video', run: () => { const { item } = need(); return save(item, { clip_start: null, clip_end: null }); }, enabled: has, description: 'Plays the whole video again.' },
    { group: 'Images', id: 'video-frame-back', label: 'Previous Frame', icon: 'video', keys: [','], agent: 'window-only', mutates: false, run: () => step(-1), enabled: has, description: 'Pauses the selected video and steps back one frame.' },
    { group: 'Images', id: 'video-frame-forward', label: 'Next Frame', icon: 'video', keys: ['.'], agent: 'window-only', mutates: false, run: () => step(1), enabled: has, description: 'Pauses the selected video and steps forward one frame.' },
    { group: 'Images', id: 'video-speed', label: 'Set Video Speed', icon: 'video', palette: false, run: p => setRate(Number(p?.rate)), enabled: has, params: { rate: { type: 'number', min: 0.0625, max: 16, required: true, description: 'playback speed, 1 is normal' } }, description: 'Sets the playback speed of the selected video or audio reference, kept with the board.' },
  );
}
