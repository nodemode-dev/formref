export interface MarkdownRun { text: string; strong: boolean; emphasis: boolean; href?: string }
export interface MarkdownBlock { kind: 'paragraph' | 'heading' | 'list'; level?: number; ordered?: boolean; prefix?: string; runs: MarkdownRun[] }
const inline = /\[([^\[\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|_([^_\n]+)_/g;
export function safeHref(value: string): string | undefined { if (!/^https?:\/\//i.test(value) || value.includes('\\')) return; try { const url = new URL(value); if (['http:', 'https:'].includes(url.protocol) && url.hostname) return value; } catch {} }
export function markdownRuns(source: string): MarkdownRun[] {
  const runs: MarkdownRun[] = []; let offset = 0; inline.lastIndex = 0;
  for (const match of source.matchAll(inline)) { const index = match.index!; if (index > offset) runs.push({ text: source.slice(offset, index), strong: false, emphasis: false }); const href = match[1] ? safeHref(match[2]) : undefined; runs.push(match[1] ? { text: href ? match[1] : match[0], strong: false, emphasis: false, ...(href ? { href } : {}) } : { text: match[3] || match[4] || match[5] || match[6], strong: !!(match[3] || match[4]), emphasis: !!(match[5] || match[6]) }); offset = index + match[0].length; }
  if (offset < source.length || !runs.length) runs.push({ text: source.slice(offset), strong: false, emphasis: false }); return runs;
}
export function markdownBlocks(source: string, limit = 4096): MarkdownBlock[] {
  return source.split(/\r\n|\n|\r/).slice(0, limit).map(line => { const heading = /^(#{1,3}) (.*)$/.exec(line), unordered = /^[-*] (.*)$/.exec(line), ordered = /^(\d+)\. (.*)$/.exec(line); return heading ? { kind: 'heading', level: heading[1].length, runs: markdownRuns(heading[2]) } : unordered ? { kind: 'list', ordered: false, prefix: '• ', runs: markdownRuns(unordered[1]) } : ordered ? { kind: 'list', ordered: true, prefix: `${ordered[1]}. `, runs: markdownRuns(ordered[2]) } : { kind: 'paragraph', runs: markdownRuns(line) }; });
}
const write = (node: HTMLElement, value: string) => { if (node.textContent !== value) node.textContent = value; };
class RunNode {
  root = document.createElement('span'); plain = document.createElement('span'); strong = document.createElement('strong'); emphasis = document.createElement('em'); link = document.createElement('a');
  constructor() { this.root.append(this.plain, this.strong, this.emphasis, this.link); this.link.target = '_blank'; this.link.rel = 'noopener noreferrer'; }
  update(run: MarkdownRun) { const linked = !!run.href; this.plain.hidden = linked || run.strong || run.emphasis; this.strong.hidden = linked || !run.strong; this.emphasis.hidden = linked || !run.emphasis; this.link.hidden = !linked; if (run.href) this.link.setAttribute('href', run.href); else this.link.removeAttribute('href'); for (const node of [this.plain, this.strong, this.emphasis, this.link]) write(node, run.text); }
}
class InlineView {
  nodes: RunNode[] = [];
  constructor(readonly root: HTMLElement) {}
  update(runs: MarkdownRun[]) { while (this.nodes.length > runs.length) this.nodes.pop()!.root.remove(); runs.forEach((run, index) => { let node = this.nodes[index]; if (!node) { node = new RunNode(); this.nodes.push(node); this.root.append(node.root); } node.update(run); }); }
}
class BlockNode {
  root = document.createElement('div'); paragraph = document.createElement('p'); headings = [document.createElement('h1'), document.createElement('h2'), document.createElement('h3')]; ul = document.createElement('ul'); ol = document.createElement('ol'); unordered = document.createElement('li'); ordered = document.createElement('li'); views: InlineView[];
  constructor() { this.root.className = 'markdown-line'; this.ul.append(this.unordered); this.ol.append(this.ordered); this.root.append(this.paragraph, ...this.headings, this.ul, this.ol); this.views = [this.paragraph, ...this.headings, this.unordered, this.ordered].map(node => new InlineView(node)); }
  update(block: MarkdownBlock) { const index = block.kind === 'heading' ? block.level! : block.kind === 'list' ? block.ordered ? 5 : 4 : 0; this.paragraph.hidden = index !== 0; this.headings.forEach((node, i) => node.hidden = index !== i + 1); this.ul.hidden = index !== 4; this.ol.hidden = index !== 5; if (index === 5) this.ol.start = Number.parseInt(block.prefix || '1', 10); this.views[index].update(block.runs); }
}
export class MarkdownView {
  private nodes: BlockNode[] = []; private source: string | null = null;
  constructor(readonly root: HTMLElement, private readonly limit = 4096) { root.classList.add('markdown-view'); }
  update(source: string) { if (this.source === source) return; this.source = source; const blocks = markdownBlocks(source, this.limit); while (this.nodes.length > blocks.length) this.nodes.pop()!.root.remove(); blocks.forEach((block, index) => { let node = this.nodes[index]; if (!node) { node = new BlockNode(); this.nodes.push(node); this.root.append(node.root); } node.update(block); }); }
}
