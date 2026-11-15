import { api, request } from '../lib/api';
import { onLanguage, relativeTime } from '../lib/i18n';
import type { Summary } from '../lib/types';
import { icon } from '../ui/icons';
import { run } from './commands';
import { DEMOS, openDemo, registerDemos } from './demos';
import { S, boardClosed, boardOpened, error, open, refreshBoards, toast, upload } from './editor';
import { FILE_ITEMS, HELP_ITEMS } from './menus';
import { registry } from './registry';
import { onTabs, openTabs } from './tabs';
import { useTemplate, type Template } from './templates';

type Page = 'start' | 'boards' | 'templates';
type HomeTemplate = Template & { saved_at?: number };

const NAV_KEY = 'formref.homeNav';
const NAV_HIDDEN_KEY = 'formref.homeNavHidden';
const BOARD_FILE = /\.(formref|zip|istack|json|bee)$/i;
const FORMATS = ['PNG', 'JPG', 'WEBP', 'GIF', 'SVG', 'PDF', 'FORMREF', 'BEE'];
const STARTER: HomeTemplate = { id: 'sample', title: 'Quiet structures', description: 'Explore a sample board', built_in: true };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}

function glyph(name: string, size = 16): SVGSVGElement {
  const svg = icon(name);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  return svg;
}

function setText(node: Element | null, value: string): void {
  if (node && node.textContent !== value) node.textContent = value;
}

function own<T extends HTMLElement>(node: T): T {
  node.dataset.noI18n = '';
  return node;
}

function button(className: string, key: string, value: string, iconName: string, label: string): HTMLButtonElement {
  const node = el('button', className, glyph(iconName), el('span', '', label));
  node.type = 'button';
  node.dataset[key] = value;
  return node;
}

function navItem(key: string, value: string, iconName: string, label: string, counted = false): HTMLButtonElement {
  const node = button('home-nav-item', key, value, iconName, label);
  if (counted) node.append(own(el('span', 'count home-count', '0')));
  return node;
}

function pageItems(): HTMLButtonElement[] {
  return [
    navItem('v', 'start', 'home', 'Start'),
    navItem('v', 'boards', 'board', 'Your boards', true),
    navItem('v', 'templates', 'template', 'Templates', true),
  ];
}

function head(title: string, sub: string, ...actions: HTMLElement[]): HTMLElement {
  const node = el('div', 'home-head', el('div', '', el('h1', 'home-title', title), el('p', 'home-sub', sub)));
  if (actions.length) node.append(el('div', 'home-head-actions', ...actions));
  return node;
}

function section(title: string, grid: HTMLElement, ...extras: HTMLElement[]): HTMLElement {
  return el('section', 'home-section', el('div', 'home-section-head', el('h2', 'home-section-title', title), ...extras), grid);
}

function card(key: string, value: string, preview: HTMLElement, name: HTMLElement, meta: HTMLElement): HTMLButtonElement {
  const node = el('button', 'home-card', preview, el('span', 'home-card-body', name, meta));
  node.type = 'button';
  node.dataset[key] = value;
  return node;
}

const blank = (iconName: string): HTMLElement => el('span', 'home-card-preview blank', glyph(iconName, 28));

function seeAll(page: Page): HTMLButtonElement {
  const node = el('button', 'button quiet compact', 'See all');
  node.type = 'button';
  node.dataset.v = page;
  return node;
}

const skeleton = card('skeleton', '', el('span', 'home-card-preview'), el('span', 'home-card-name', ' '), el('span', 'home-card-meta', ' '));
skeleton.classList.add('skeleton');
skeleton.tabIndex = -1;
skeleton.setAttribute('aria-hidden', 'true');
const none = card('none', '', blank('board'), el('span', 'home-card-name', 'No boards yet'), el('span', 'home-card-meta', 'One open canvas, ready to explore.'));
none.classList.add('empty');
none.tabIndex = -1;
none.hidden = true;

const recentGrid = el('div', 'home-card-grid home-recent-grid', skeleton, none);
const boardsGrid = el('div', 'home-card-grid');
const templateGrid = el('div', 'home-card-grid');
const templatesFull = el('div', 'home-card-grid');
const noBoards = el('p', 'home-note', 'No boards yet');
const noneSaved = el('p', 'home-note', 'None yet. Use Save as Template on any board to add one here.');
const greeting = el('h1', 'home-title');

const demoGrid = el('div', 'home-card-grid home-demo-grid', ...DEMOS.map(demo => {
  const picture = el('img');
  picture.alt = '';
  picture.decoding = 'async';
  picture.draggable = false;
  picture.width = 320;
  picture.height = 180;
  picture.src = demo.picture;
  const preview = el('span', 'home-card-preview', picture);
  preview.setAttribute('aria-hidden', 'true');
  const line = el('span', 'home-card-meta', demo.line);
  line.title = demo.line;
  return card('demo', demo.id, preview, el('span', 'home-card-name', demo.title), line);
}));

const brandMark = el('img', 'brand-mark');
brandMark.src = '/formref-logo.png';
brandMark.width = 26;
brandMark.height = 26;
brandMark.alt = '';
brandMark.draggable = false;

const openList = el('div', 'home-open-list');
const openGroup = el('div', 'home-open', el('div', 'home-nav-sep'), el('div', 'home-nav-title', 'Open boards'), openList);
openGroup.hidden = true;
const back = navItem('a', 'back', 'chevron-left', 'Back to Board');
back.classList.add('home-back');
back.hidden = true;

const nav = el('nav', 'home-nav',
  el('div', 'home-brand', brandMark, 'formref', el('span', '', 'by nodemode.ai')),
  ...pageItems(),
  openGroup,
  el('div', 'home-nav-sep'),
  el('div', 'home-nav-title', 'Create'),
  navItem('a', 'new-tab', 'plus', 'New board'),
  navItem('a', 'open-file-tab', 'open-folder', 'Open board file'),
  navItem('a', 'trash', 'trash', 'Trash'),
  el('div', 'home-nav-foot', back, navItem('a', 'preferences', 'settings', 'Preferences'), navItem('a', 'help', 'keyboard', 'Keyboard shortcuts')),
);

const resizer = el('div', 'home-resizer');
resizer.setAttribute('role', 'separator');
resizer.setAttribute('aria-orientation', 'vertical');
resizer.setAttribute('aria-label', 'Resize the side panel');
const navHide = el('button', 'home-nav-hide', glyph('chevron-left', 14));
navHide.type = 'button';
navHide.title = 'Hide the side panel';
navHide.setAttribute('aria-label', 'Hide the side panel');
const navShow = el('button', 'home-nav-show', glyph('chevron-right', 14));
navShow.type = 'button';
navShow.title = 'Show the side panel';
navShow.setAttribute('aria-label', 'Show the side panel');

const hero = el('div', 'home-hero',
  el('span', 'home-hero-icon', glyph('image', 26)),
  el('div', 'home-hero-text',
    el('div', 'home-hero-title', 'Bring your references together.'),
    el('div', 'home-hero-sub', el('span', '', 'Images, notes, links and ideas.'), ' ', el('span', '', 'One open canvas, ready to explore.')),
    own(el('div', 'home-formats', ...FORMATS.map(format => el('span', 'home-format', format)))),
  ),
  el('div', 'home-hero-actions',
    button('button primary', 'a', 'new-tab', 'plus', 'New board'),
    button('button', 'a', 'open-file-tab', 'open-folder', 'Open board file'),
    button('button quiet', 'a', 'add', 'image-add', 'Add references'),
  ),
);

const pages: Record<Page, HTMLElement> = {
  start: el('div', '',
    el('div', 'home-head', el('div', '', greeting, el('p', 'home-sub', 'Open a board, or start a new one.')), el('div', 'home-head-actions',
      button('button', 'a', 'open-file-tab', 'open-folder', 'Open board file'),
      button('button', 'a', 'new-tab', 'plus', 'New board'),
    )),
    hero,
    section('Recent', recentGrid, seeAll('boards')),
    section('Demos', demoGrid, el('span', 'home-section-note', 'Each opens as a new board. Nothing of yours is changed.')),
    section('Templates', templateGrid, seeAll('templates')),
  ),
  boards: el('div', '', head('Your boards', 'Every board, newest first.', button('button', 'a', 'new-tab', 'plus', 'New board')), boardsGrid, noBoards),
  templates: el('div', '', head('Templates', 'Start a board from a starter, or from a template you saved.'), templatesFull, noneSaved),
};
for (const [name, node] of Object.entries(pages)) {
  node.dataset.page = name;
  node.hidden = name !== 'start';
}

const narrow = el('div', 'home-narrow', ...pageItems());
const main = el('div', 'home-main', narrow, pages.start, pages.boards, pages.templates);
const root = el('section', 'home', nav, resizer, navHide, navShow, main);
root.setAttribute('aria-label', 'Home');
root.hidden = true;

const workspace = document.querySelector<HTMLElement>('.workspace');
let boards: Summary[] = [];
let templates: HomeTemplate[] = [];
let loaded = false;

function patch<T>(host: HTMLElement, items: T[], key: (item: T) => string, create: (item: T) => HTMLElement, update: (node: HTMLElement, item: T) => void): void {
  const have = new Map<string, HTMLElement>();
  let fixed = 0;
  for (const child of Array.from(host.children) as HTMLElement[]) {
    if (child.dataset.key) have.set(child.dataset.key, child);
    else fixed++;
  }
  items.forEach((item, index) => {
    const id = key(item);
    let node = have.get(id);
    if (node) have.delete(id);
    else { node = create(item); node.dataset.key = id; }
    update(node, item);
    const current = host.children[fixed + index];
    if (current !== node) host.insertBefore(node, current || null);
  });
  for (const node of have.values()) node.remove();
}

function changed(board: Summary): number {
  const at = board.updated_at as unknown as number | string | undefined;
  return typeof at === 'number' ? at * 1000 : at ? Date.parse(at) : 0;
}

function boardCard(board: Summary): HTMLElement {
  const meta = own(el('span', 'home-card-meta', glyph('layers', 12), el('span'), el('span')));
  return card('board', board.id, blank('board'), own(el('span', 'home-card-name')), meta);
}

function boardUpdate(node: HTMLElement, board: Summary): void {
  setText(node.querySelector('.home-card-name'), board.title);
  const meta = node.querySelector('.home-card-meta')!;
  const at = changed(board);
  setText(meta.children[1], String(board.item_count ?? 0));
  setText(meta.children[2], at ? `· ${relativeTime(at)}` : '');
}

function templateCard(template: HomeTemplate): HTMLElement {
  const name = el('span', 'home-card-name');
  const meta = el('span', 'home-card-meta');
  if (template !== STARTER) { own(name); own(meta); }
  return card('template', template.id, blank(template === STARTER ? 'board' : 'template'), name, meta);
}

function templateUpdate(node: HTMLElement, template: HomeTemplate): void {
  setText(node.querySelector('.home-card-name'), template.title);
  const line = template.description || (template.saved_at ? relativeTime(template.saved_at * 1000) : '');
  const meta = node.querySelector<HTMLElement>('.home-card-meta')!;
  setText(meta, line);
  if (meta.title !== line) meta.title = line;
}

function render(): void {
  for (const count of root.querySelectorAll('[data-v="boards"] .home-count')) setText(count, String(boards.length));
  for (const count of root.querySelectorAll('[data-v="templates"] .home-count')) setText(count, String(templates.length + 1));
  const hour = new Date().getHours();
  setText(greeting, hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');
  if (loaded && skeleton.isConnected) skeleton.remove();
  none.hidden = !loaded || boards.length > 0;
  noBoards.hidden = boards.length > 0;
  patch(recentGrid, boards.slice(0, 5), board => board.id, boardCard, boardUpdate);
  patch(boardsGrid, boards, board => board.id, boardCard, boardUpdate);
  const all = [STARTER, ...templates];
  patch(templateGrid, all.slice(0, 10), template => template.id, templateCard, templateUpdate);
  patch(templatesFull, all, template => template.id, templateCard, templateUpdate);
  noneSaved.hidden = templates.some(template => !template.built_in);
}

function syncOpen(): void {
  const tabs = openTabs();
  openGroup.hidden = !tabs.length;
  patch(openList, tabs, tab => tab.id, tab => { const node = navItem('open', tab.id, 'board', ''); own(node.children[1] as HTMLElement); return node; },
    (node, tab) => setText(node.children[1], tab.title));
  back.hidden = !S.state;
}

async function load(): Promise<void> {
  const [list, found] = await Promise.all([
    refreshBoards(),
    request<{ templates: HomeTemplate[] }>('/templates').catch(() => ({ templates: [] as HomeTemplate[] })),
  ]);
  boards = list;
  templates = found.templates;
  loaded = true;
  render();
}

function page(name: Page): void {
  for (const [key, node] of Object.entries(pages)) { const hide = key !== name; if (node.hidden !== hide) node.hidden = hide; }
  for (const item of root.querySelectorAll<HTMLElement>('.home-nav-item[data-v]')) item.classList.toggle('active', item.dataset.v === name);
  main.scrollTop = 0;
}

/** Shows Home over the workspace; with no board open it is the only page. */
export function showHome(): Promise<void> {
  S.home = true;
  root.hidden = false;
  if (workspace) workspace.inert = true;
  document.documentElement.classList.add('at-home');
  document.title = 'formref';
  syncOpen();
  render();
  return load().catch(() => undefined);
}

function hideHome(): void {
  if (!S.home) return;
  S.home = false;
  root.hidden = true;
  if (workspace) workspace.inert = false;
  document.documentElement.classList.remove('at-home');
  hero.classList.remove('drag-over');
  if (S.state) document.title = `formref · ${S.state.board.title}`;
}

function toBoard(id: string): void {
  if (S.state?.board.id === id) hideHome();
  else void open(id).catch(error);
}

async function boardFrom(files: File[]): Promise<void> {
  if (!files.length) return;
  const file = files.find(entry => BOARD_FILE.test(entry.name));
  if (file) {
    const result = await api.import(file);
    await open(result.board.id, result);
    if (result.warnings?.length) toast(result.warnings.join(' · '));
    return;
  }
  const next = await api.create('Untitled board');
  await open(next.board.id, next);
  await upload(files);
}

function pickReferences(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = 'image/*';
  input.addEventListener('change', () => void boardFrom(Array.from(input.files || [])).catch(error));
  input.click();
}

function sidePanel(): void {
  const save = (): void => {
    try {
      localStorage.setItem(NAV_KEY, root.style.getPropertyValue('--home-nav-w'));
      localStorage.setItem(NAV_HIDDEN_KEY, root.classList.contains('nav-hidden') ? '1' : '0');
    } catch { return; }
  };
  const collapse = (on: boolean): void => { root.classList.toggle('nav-hidden', on); save(); };
  try {
    const width = localStorage.getItem(NAV_KEY);
    if (width && /^\d+px$/.test(width.trim())) root.style.setProperty('--home-nav-w', width.trim());
    if (localStorage.getItem(NAV_HIDDEN_KEY) === '1') root.classList.add('nav-hidden');
  } catch { /* storage unavailable: the default width */ }
  navHide.addEventListener('click', () => collapse(true));
  navShow.addEventListener('click', () => collapse(false));
  resizer.addEventListener('pointerdown', event => {
    event.preventDefault();
    const from = event.clientX;
    const start = nav.getBoundingClientRect().width || 232;
    resizer.classList.add('dragging');
    const move = (next: PointerEvent): void => {
      const raw = start + next.clientX - from;
      const hide = raw < 120;
      if (root.classList.contains('nav-hidden') !== hide) root.classList.toggle('nav-hidden', hide);
      if (!hide) root.style.setProperty('--home-nav-w', `${Math.round(Math.max(180, Math.min(420, raw)))}px`);
    };
    const up = (): void => {
      resizer.classList.remove('dragging');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      save();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
}

function wire(): void {
  root.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const view = target.closest<HTMLElement>('[data-v]')?.dataset.v as Page | undefined;
    if (view) { page(view); return; }
    const tab = target.closest<HTMLElement>('[data-open]')?.dataset.open;
    if (tab) { toBoard(tab); return; }
    const action = target.closest<HTMLElement>('[data-a]')?.dataset.a;
    if (action === 'back') { hideHome(); return; }
    if (action === 'add') { pickReferences(); return; }
    if (action) { run(action); return; }
    const hit = target.closest<HTMLElement>('.home-card');
    if (hit?.dataset.demo) void openDemo(hit.dataset.demo);
    else if (hit?.dataset.board) toBoard(hit.dataset.board);
    else if (hit?.dataset.template === STARTER.id) run('sample');
    else if (hit?.dataset.template) {
      const template = templates.find(entry => entry.id === hit.dataset.template);
      if (template) void useTemplate(template).catch(error);
    }
  });
  root.addEventListener('dragover', event => { event.preventDefault(); hero.classList.add('drag-over'); });
  root.addEventListener('dragleave', event => { if (!root.contains(event.relatedTarget as Node | null)) hero.classList.remove('drag-over'); });
  root.addEventListener('drop', event => {
    event.preventDefault();
    hero.classList.remove('drag-over');
    void boardFrom(Array.from(event.dataTransfer?.files || [])).catch(error);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && S.home && S.state && !document.querySelector('dialog[open], .ctx-menu, .menu-btn.is-open')) hideHome();
  });
  document.querySelector('.brand')?.addEventListener('click', event => event.preventDefault());
  document.getElementById('board-tabs')?.addEventListener('click', event => {
    if (S.home && S.state && (event.target as Element).closest('.board-tab.active .board-tab-label')) hideHome();
  });
}

/** The Home page: shown when no board is open, and from the Home command, File > Home and the brand mark. */
export function registerHome(): void {
  document.getElementById('app')?.append(root);
  page('start');
  sidePanel();
  wire();
  registry.add({
    group: 'File', id: 'home', label: 'Home', icon: 'home', keys: ['mod+alt+h'], mutates: false, agent: 'window-only',
    run: () => { void showHome(); }, enabled: () => !S.presenting,
    description: 'Shows the Home page with recent boards, templates and the demo boards. Opening or creating a board leaves it.',
  });
  registerDemos();
  FILE_ITEMS.unshift('home', '-');
  HELP_ITEMS.push('-', { label: 'Demos', items: DEMOS.map(demo => `demo-${demo.id}`) });
  boardOpened.push(hideHome);
  boardClosed.push(showHome);
  onTabs(syncOpen);
  onLanguage(() => { if (S.home) render(); });
}
