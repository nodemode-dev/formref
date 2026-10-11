import type { Board, Item, State } from '../lib/types';
import { api, request } from '../lib/api';
import { MarkdownView, safeHref } from '../lib/markdown';
const element = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const signature = (item: Item) => JSON.stringify([item.title, item.text, item.data.text_format || 'plain']);
const text = (id: string, value: string) => { const node = element(id); if (node.textContent !== value) node.textContent = value; };
export class SourceEditor {
  private readonly dialog = element<HTMLDialogElement>('document-dialog');
  private readonly source = element<HTMLTextAreaElement>('document-source');
  private readonly title = element<HTMLInputElement>('document-title');
  private readonly format = element<HTMLSelectElement>('document-format');
  private readonly plain = element('document-plain-preview');
  private readonly markdown = new MarkdownView(element('document-markdown-preview'));
  private board: Board | null = null; private itemId: string | null = null; private baseline = ''; private conflict = false; private saving = false; private token = 0;
  constructor(private readonly hooks: { flush(): Promise<void>; state(value: State): void; notify(message: string): void }) {
    this.source.addEventListener('input', () => this.preview()); this.format.addEventListener('change', () => this.preview());
    element('document-save').addEventListener('click', () => void this.save()); element('document-cancel').addEventListener('click', () => this.dialog.close()); element('document-close').addEventListener('click', () => this.dialog.close()); element('document-reload').addEventListener('click', () => this.reload());
    this.dialog.addEventListener('cancel', event => { if (this.saving) event.preventDefault(); }); this.dialog.addEventListener('close', () => { this.token++; this.itemId = null; this.board = null; this.saving = false; });
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-format-action]').forEach(button => button.addEventListener('click', () => this.insert(button.dataset.formatAction!)));
    const exporter = element<HTMLSelectElement>('document-export');
    exporter.addEventListener('change', () => {
      const format = exporter.value, item = this.current();
      exporter.value = '';
      if (!format || !item || !this.board) return;
      // Exports are of the saved document, so an unsaved draft is never half-exported.
      if (this.title.value !== item.title || this.source.value !== item.text || this.format.value !== String(item.data.text_format || 'plain')) this.hooks.notify('Exported the saved version. Save first to include your draft.');
      const link = document.createElement('a');
      link.href = `/api/boards/${this.board.id}/items/${item.id}/export?format=${format}`;
      link.download = '';
      link.click();
    });
  }
  open(board: Board, item: Item, markdown = false) { this.token++; this.board = board; this.itemId = item.id; this.baseline = signature(item); this.conflict = false; this.saving = false; this.title.value = item.title; this.source.value = item.text; this.format.value = markdown ? 'markdown' : String(item.data.text_format || 'plain'); this.preview(); text('document-status', item.locked ? 'This reference is locked. Unlock it before saving.' : 'Draft changes are saved only when you choose Save.'); this.controls(); this.dialog.showModal(); this.source.focus(); }
  update(board: Board) { if (!this.dialog.open) return; if (this.board?.id !== board.id) { this.dialog.close(); return; } this.board = board; const item = this.current(); if (!item) { this.dialog.close(); this.hooks.notify('The reference was removed. The editor closed without saving.'); return; } this.conflict = signature(item) !== this.baseline; if (this.conflict) text('document-status', 'Saved source, title or format changed elsewhere. Reload saved or cancel; your draft is retained.'); else if (item.locked) text('document-status', 'This reference is locked. Unlock it before saving.'); this.controls(); }
  private current() { return this.board?.items.find(item => item.id === this.itemId); }
  private controls() { const disabled = this.saving; element<HTMLButtonElement>('document-save').disabled = disabled || this.conflict || !this.current() || !!this.current()?.locked; element<HTMLButtonElement>('document-reload').disabled = disabled || !this.conflict; for (const id of ['document-cancel', 'document-close']) element<HTMLButtonElement>(id).disabled = disabled; this.title.disabled = disabled; this.source.disabled = disabled; this.format.disabled = disabled; this.dialog.querySelectorAll<HTMLButtonElement>('[data-format-action]').forEach(button => button.disabled = disabled); }
  private preview() { const source = this.source.value, markdown = this.format.value === 'markdown'; this.plain.hidden = markdown; this.markdown.root.hidden = !markdown; if (markdown) this.markdown.update(source); else if (this.plain.textContent !== source) this.plain.textContent = source; text('document-count', `${new TextEncoder().encode(source).length.toLocaleString()} bytes`); text('document-limit', markdown && source.split(/\r\n|\n|\r/).length > 4096 ? 'Preview shows the first 4,096 lines. Save retains the complete source.' : ''); }
  private insert(action: string) { const input = this.source, start = input.selectionStart, end = input.selectionEnd, selected = input.value.slice(start, end); if (action === 'heading' || action === 'list') { const prefix = action === 'list' ? '- ' : `${'#'.repeat(Number(element<HTMLSelectElement>('document-heading').value))} `, line = input.value.lastIndexOf('\n', start - 1) + 1; input.setRangeText(prefix, line, line, 'preserve'); input.setSelectionRange(start + prefix.length, end + prefix.length); } else { let before = action === 'strong' ? '**' : '*', after = before; if (action === 'link') { const href = safeHref(element<HTMLInputElement>('document-link-url').value.trim()); if (!href) { text('document-status', 'Enter an absolute HTTP or HTTPS URL for the link.'); element('document-link-url').focus(); return; } before = '['; after = `](${href})`; } const value = selected || (action === 'link' ? 'link label' : action === 'strong' ? 'strong text' : 'emphasis'); input.setRangeText(`${before}${value}${after}`, start, end, 'select'); input.setSelectionRange(start + before.length, start + before.length + value.length); } this.format.value = 'markdown'; this.preview(); input.focus(); }
  private reload() { const item = this.current(); if (!item || this.saving) return; this.baseline = signature(item); this.conflict = false; this.title.value = item.title; this.source.value = item.text; this.format.value = String(item.data.text_format || 'plain'); this.preview(); text('document-status', 'Saved source loaded. The previous draft was discarded.'); this.controls(); this.source.focus(); }
  private async save() {
    if (!this.board || !this.current() || this.conflict || this.current()!.locked || this.saving) return; this.saving = true; this.controls(); const boardId = this.board.id, itemId = this.itemId!, token = ++this.token; text('document-status', 'Saving draft…');
    try { await this.hooks.flush(); if (token !== this.token || !this.dialog.open) return; const item = this.current(); if (!item || this.conflict || item.locked) { text('document-status', 'The saved reference changed. Reload saved before retrying.'); return; } const result = await request<State>(`/boards/${boardId}/commands`, { method: 'POST', body: JSON.stringify({ expected_revision: this.board.revision, command: { type: 'update', ids: [itemId], patch: { title: this.title.value, text: this.source.value, data: { ...item.data, text_format: this.format.value } } } }) }); if (token !== this.token || !this.dialog.open) return; const saved = result.board.items.find(entry => entry.id === itemId); if (saved) this.baseline = signature(saved); this.hooks.state(result); this.dialog.close(); }
    catch (reason) { if (token !== this.token || !this.dialog.open) return; const message = reason instanceof Error ? reason.message : String(reason); if (message.startsWith('Board changed since')) { try { const latest = await api.get(boardId); if (token === this.token && this.dialog.open) this.hooks.state(latest); } catch {} text('document-status', this.conflict ? 'Saved source, title or format changed elsewhere. Reload saved or cancel; your draft is retained.' : 'The board changed while saving. Your draft is intact; choose Save again.'); } else text('document-status', message); }
    finally { if (token === this.token && this.dialog.open) { this.saving = false; this.controls(); } }
  }
}
