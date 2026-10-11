// FormRef Clipper: saves what you right-click (an image, selected text, a link or the page) to the FormRef
// board running on this computer. Every clip carries the pairing token from FormRef's Preferences, which is
// what stops ordinary web pages from writing to your board.
const api = globalThis.browser ?? globalThis.chrome;

export const DEFAULTS = { server: 'http://127.0.0.1:8196', token: '', board: '' };

const MENUS = [
  { id: 'formref-image', title: 'Save image to FormRef', contexts: ['image'] },
  { id: 'formref-selection', title: 'Save selection to FormRef', contexts: ['selection'] },
  { id: 'formref-link', title: 'Save link to FormRef', contexts: ['link'] },
  { id: 'formref-page', title: 'Save page to FormRef', contexts: ['page'] },
];

export async function settings() {
  return { ...DEFAULTS, ...(await api.storage.local.get(Object.keys(DEFAULTS))) };
}

async function call(path, init = {}) {
  const { server, token } = await settings();
  if (!token) throw new Error('Pair the clipper first: copy the token from FormRef > Preferences > Browser clipper into the clipper options.');
  let response;
  try {
    response = await fetch(server.replace(/\/+$/, '') + '/api/clip' + path, { ...init, headers: { 'Content-Type': 'application/json', 'X-FormRef-Clip-Token': token } });
  } catch {
    throw new Error(`FormRef is not reachable at ${server}. Start it with ./formref and try again.`);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof body.detail === 'string' ? body.detail : `FormRef answered ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return body;
}

export function boards() {
  return call('/boards');
}

function base64(buffer) {
  const bytes = new Uint8Array(buffer);
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}

/** When FormRef cannot fetch an image itself (a signed-in or blocking site), the browser fetches it instead. */
async function imageData(src) {
  const response = await fetch(src, { credentials: 'include' });
  if (!response.ok) throw new Error(`The image could not be downloaded (${response.status}).`);
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('That address did not return an image.');
  return `data:${blob.type};base64,${base64(await blob.arrayBuffer())}`;
}

async function selectedText(tab, fallback) {
  // The menu's own selectionText collapses line breaks; reading the page keeps paragraphs when allowed.
  try {
    const [result] = await api.scripting.executeScript({ target: { tabId: tab.id }, func: () => String(getSelection()) });
    if (result && typeof result.result === 'string' && result.result.trim()) return result.result;
  } catch { /* pages such as the web store refuse scripts; the menu text still works */ }
  return fallback || '';
}

function nameOf(src) {
  try { return decodeURIComponent(new URL(src).pathname.split('/').pop() || '') || 'clipped image'; } catch { return 'clipped image'; }
}

export async function clip(kind, info, tab) {
  const { board } = await settings();
  const page = { page_url: tab?.url || info.pageUrl || '', page_title: tab?.title || '', board_id: board || undefined };
  if (kind === 'image') {
    const src = info.srcUrl || '';
    if (src.startsWith('data:')) return call('', { method: 'POST', body: JSON.stringify({ ...page, kind, data_url: src, name: 'clipped image' }) });
    try {
      return await call('', { method: 'POST', body: JSON.stringify({ ...page, kind, src }) });
    } catch (error) {
      if (error.status === 401 || !/^https?:/i.test(src)) throw error;
      return call('', { method: 'POST', body: JSON.stringify({ ...page, kind, data_url: await imageData(src), name: nameOf(src) }) });
    }
  }
  if (kind === 'text') return call('', { method: 'POST', body: JSON.stringify({ ...page, kind, text: await selectedText(tab, info.selectionText) }) });
  if (kind === 'link') return call('', { method: 'POST', body: JSON.stringify({ ...page, kind, url: info.linkUrl, title: info.linkText || '' }) });
  return call('', { method: 'POST', body: JSON.stringify({ ...page, kind: 'page', url: page.page_url, title: page.page_title }) });
}

const KIND_OF = { 'formref-image': 'image', 'formref-selection': 'text', 'formref-link': 'link', 'formref-page': 'page' };
const LABEL = { image: 'Image', note: 'Text', link: 'Link' };

async function report(promise) {
  try {
    const saved = await promise;
    await api.action.setBadgeBackgroundColor({ color: '#16a34a' });
    await api.action.setBadgeText({ text: 'OK' });
    await api.action.setTitle({ title: `Saved to ${saved.board_title}` });
    api.notifications.create({ type: 'basic', iconUrl: 'icons/icon-128.png', title: 'Saved to FormRef', message: `${LABEL[saved.kind] || 'Item'} added to ${saved.board_title}.` });
    setTimeout(() => api.action.setBadgeText({ text: '' }), 4000);
    return saved;
  } catch (error) {
    await api.action.setBadgeBackgroundColor({ color: '#dc2626' });
    await api.action.setBadgeText({ text: '!' });
    await api.action.setTitle({ title: error.message });
    api.notifications.create({ type: 'basic', iconUrl: 'icons/icon-128.png', title: 'FormRef could not save this', message: error.message });
    return { error: error.message, status: error.status };
  }
}

function installMenus() {
  api.contextMenus.removeAll(() => {
    for (const menu of MENUS) api.contextMenus.create(menu);
  });
}

api.runtime.onInstalled.addListener(installMenus);
api.runtime.onStartup?.addListener(installMenus);
api.contextMenus.onClicked.addListener((info, tab) => { void report(clip(KIND_OF[info.menuItemId] || 'page', info, tab)); });
api.action.onClicked.addListener(tab => { void report(clip('page', {}, tab)); });

// Reachable from the extension's own devtools (and the verification harness) to clip without a menu click.
globalThis.formrefClipper = { clip: (kind, info, tab) => report(clip(kind, info, tab)), menus: MENUS };
