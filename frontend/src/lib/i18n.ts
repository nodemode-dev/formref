import { BCP47, LANG_CODES, LANG_NAMES, LANG_PARENT, isLang, type Lang } from './i18n/langs';

export { LANG_CODES, LANG_NAMES, isLang, type Lang };

type Table = Record<string, string>;
const loaders = import.meta.glob<{ default: Table }>('./i18n/tables/*.json');
const tables = new Map<Lang, Table>();
const patterns = new Map<Lang, [RegExp, string, Set<string>][]>();
const listeners: (() => void)[] = [];
const STORE = 'formref-lang';
let current: Lang = 'en';
let wanted: Lang = 'en';

async function load(lang: Lang): Promise<void> {
  if (lang === 'en' || tables.has(lang)) return;
  const parent = LANG_PARENT[lang];
  if (parent) await load(parent);
  const loader = loaders[`./i18n/tables/${lang}.json`];
  const table = loader ? (await loader()).default : {};
  tables.set(lang, table);
  const compiled: [RegExp, string, Set<string>][] = [];
  for (const [key, value] of Object.entries(table)) {
    if (!/\{\d+\}/.test(key)) continue;
    const plural = new Set([...key.matchAll(/[A-Za-z]\{(\d+)\}/g)].map(m => m[1]));
    const source = key.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(\d+)\}/g, (_, i: string) => (plural.has(i) ? '(s|es|)' : '([\\s\\S]*?)'));
    try { compiled.push([new RegExp(`^${source}$`), value, plural]); } catch { }
  }
  compiled.sort((a, b) => b[0].source.length - a[0].source.length);
  patterns.set(lang, compiled);
}

function lookup(lang: Lang, key: string): string | undefined {
  const own = tables.get(lang)?.[key];
  if (own !== undefined) return own;
  const parent = LANG_PARENT[lang];
  return parent ? tables.get(parent)?.[key] : undefined;
}

function pattern(lang: Lang, text: string): string | undefined {
  for (const which of [lang, LANG_PARENT[lang]]) {
    if (!which) continue;
    for (const [re, value, plural] of patterns.get(which) || []) {
      const m = re.exec(text);
      if (m) return value.replace(/\{(\d+)\}/g, (_, i: string) => (plural.has(i) ? '' : m[Number(i) + 1] ?? ''));
    }
  }
  return undefined;
}

/** English text in, the chosen language out; {name} placeholders are filled from vars. Unknown text stays English. */
export function t(english: string, vars?: Record<string, string | number>): string {
  let out = english;
  if (current !== 'en') {
    const tail = english.endsWith('...') ? '...' : english.endsWith(':') ? ':' : '';
    const base = tail ? english.slice(0, -tail.length) : english;
    const found = lookup(current, english) ?? (tail ? lookup(current, base) : undefined);
    if (found !== undefined) out = found === lookup(current, base) && tail ? found + tail : found;
  }
  return vars ? out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : out;
}

export function translateText(english: string): string {
  if (current === 'en') return english;
  const trimmed = english.trim();
  if (!trimmed || trimmed.length > 400) return english;
  const tail = trimmed.endsWith('...') ? '...' : trimmed.endsWith(':') ? ':' : '';
  const base = tail ? trimmed.slice(0, -tail.length) : trimmed;
  const found = lookup(current, trimmed) ?? (tail ? (lookup(current, base) !== undefined ? lookup(current, base)! + tail : undefined) : undefined) ?? pattern(current, trimmed);
  if (found === undefined) return english;
  const lead = english.slice(0, english.indexOf(trimmed)), trail = english.slice(english.indexOf(trimmed) + trimmed.length);
  return lead + found + trail;
}

export function language(): Lang { return current; }

export function locale(): string { return BCP47[current] || current; }

/** Locale for dates and numbers: the interface language, keeping the browser's own English region in English (an en-GB browser keeps day-first dates). */
export function formatLocale(): string {
  return current === 'en' && /^en(-|$)/i.test(navigator.language) ? navigator.language : locale();
}

/** "now", "5 minutes ago", "3 hours ago" in the interface language, then a short date. */
export function relativeTime(ms: number): string {
  const seconds = (ms - Date.now()) / 1000, size = Math.abs(seconds);
  const words = new Intl.RelativeTimeFormat(formatLocale(), { numeric: 'auto' });
  if (size < 45) return words.format(Math.min(-1, Math.round(seconds)), 'second');
  if (size < 3600) return words.format(Math.round(seconds / 60), 'minute');
  if (size < 86400) return words.format(Math.round(seconds / 3600), 'hour');
  return new Date(ms).toLocaleDateString(formatLocale(), { year: 'numeric', month: 'short', day: 'numeric' });
}

export function languages(): [Lang, string][] { return LANG_CODES.map(code => [code, LANG_NAMES[code]]); }

export function onLanguage(fn: () => void): () => void {
  listeners.push(fn);
  return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
}

export async function setLanguage(lang: Lang): Promise<void> {
  wanted = lang;
  try { await load(lang); } catch { return; }
  if (wanted !== lang) return;
  try { localStorage.setItem(STORE, lang); } catch { }
  if (lang === current) return;
  current = lang;
  document.documentElement.lang = BCP47[lang] || lang;
  document.documentElement.dataset.lang = lang;
  translatePage();
  for (const fn of listeners) fn();
}

/** Loads the saved language before the interface paints, so the first frame is already translated. */
export async function startLanguage(): Promise<void> {
  let saved: string | null = null;
  try { saved = localStorage.getItem(STORE); } catch { }
  startPageTranslator();
  if (isLang(saved) && saved !== 'en') await setLanguage(saved);
}

const SKIP = 'script,style,textarea,code,pre,[contenteditable="true"],[data-no-i18n],.xterm,.board-item .item-content,.outline,.board-list,.chat-msg,.term-dock-tab-title,.card-text,.card-title,#board-title,.board-tab-label,#inspector-title,.label-chip,.comment-text';
const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
const textEnglish = new WeakMap<Text, { en: string; shown: string }>();
const attrEnglish = new WeakMap<Element, Map<string, { en: string; shown: string }>>();
let observer: MutationObserver | null = null;

function skipped(el: Element | null): boolean {
  return !el || !!el.closest(SKIP);
}

function doText(node: Text): void {
  if (skipped(node.parentElement)) return;
  const known = textEnglish.get(node);
  const value = node.data;
  const en = known && known.shown === value ? known.en : value;
  if (!en.trim() || /^[\s\d.,:%+\-x×·/]*$/.test(en)) return;
  const shown = translateText(en);
  textEnglish.set(node, { en, shown });
  if (node.data !== shown) node.data = shown;
}

function doAttrs(el: Element): void {
  if (el.closest('[data-no-i18n],.board-item .item-content')) return;
  for (const name of ATTRS) {
    const value = el.getAttribute(name);
    if (value === null || !value.trim()) continue;
    let map = attrEnglish.get(el);
    const known = map?.get(name);
    const en = known && known.shown === value ? known.en : value;
    const shown = translateText(en);
    if (!map) { map = new Map(); attrEnglish.set(el, map); }
    map.set(name, { en, shown });
    if (value !== shown) el.setAttribute(name, shown);
  }
}

function walk(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) { doText(root as Text); return; }
  if (!(root instanceof Element) && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE && root !== document) return;
  if (root instanceof Element) { if (skipped(root) && !root.matches('[data-i18n-force]')) { doAttrs(root); return; } doAttrs(root); }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
    else doAttrs(n as Element);
  }
}

export function translatePage(): void {
  walk(document.body);
}

function startPageTranslator(): void {
  if (observer) return;
  observer = new MutationObserver(records => {
    if (current === 'en' && !records.some(r => r.type === 'characterData' && textEnglish.has(r.target as Text))) return;
    for (const r of records) {
      if (r.type === 'childList') r.addedNodes.forEach(walk);
      else if (r.type === 'characterData') doText(r.target as Text);
      else if (r.type === 'attributes' && r.target instanceof Element) doAttrs(r.target);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
