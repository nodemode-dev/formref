import { S, selected, selection } from '../editor';

/** Enabled checks shared by the command groups. An enabled check must never throw: it runs for every menu, palette and inspector refresh, selection or not. */
export const has = () => selection.size > 0;
export const hasImages = () => selected().some(i => i.kind === 'image');
export const hasBoard = () => !!S.state;
export const anyLocked = () => selected().some(i => i.locked);
export const hasCutout = () => selected().some(i => i.kind === 'image' && !!i.data.cutout);
