import type { Item } from '../lib/types';
import { display, evaluate, readTable } from '../lib/table';
import type { Table } from '../lib/table';

/**
 * The grid inside a table card. Cells are patched in place; rows and columns are added or removed
 * only when the shape changes. Double-click a cell to edit its raw text (formulas start with =),
 * Enter or Tab commits, Escape cancels. A checkbox column toggles with one click.
 */
export class TableView {
  private readonly grid = document.createElement('table');
  private readonly head = document.createElement('thead');
  private readonly body = document.createElement('tbody');
  private table: Table | null = null;
  private editing: HTMLElement | null = null;

  constructor(root: HTMLElement, private readonly commit: (patch: Partial<Item>) => void, private readonly item: () => Item | undefined) {
    this.grid.className = 'table-grid';
    this.grid.append(this.head, this.body);
    root.append(this.grid);
    this.grid.addEventListener('dblclick', event => {
      const cell = (event.target as HTMLElement).closest<HTMLElement>('td[data-r],th[data-c]');
      const item = this.item();
      if (!cell || !item || item.locked) return;
      event.stopPropagation();
      this.edit(cell);
    });
    this.grid.addEventListener('change', event => {
      const box = event.target as HTMLInputElement;
      const cell = box.closest<HTMLElement>('td[data-r]');
      if (cell && this.table) this.save(Number(cell.dataset.r), Number(cell.dataset.c), box.checked ? 'true' : 'false');
    });
  }

  private edit(cell: HTMLElement) {
    if (!this.table) return;
    const header = cell.tagName === 'TH';
    const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
    const raw = header ? this.table.columns[c].name : this.table.rows[r][c];
    if (!header && this.table.columns[c].type === 'checkbox') return;
    this.editing = cell;
    cell.textContent = raw;
    cell.contentEditable = 'true';
    cell.focus();
    getSelection()?.selectAllChildren(cell);
    const finish = (keep: boolean, move = 0) => {
      cell.removeEventListener('keydown', keys);
      cell.removeEventListener('blur', blur);
      cell.contentEditable = 'false';
      this.editing = null;
      const value = (cell.textContent || '').replace(/\n/g, ' ');
      if (keep && value !== raw) {
        if (header) this.rename(c, value.trim() || raw); else this.save(r, c, value);
      } else if (this.table) this.paint(this.table);
      if (move && !header && this.table) {
        const next = c + move < this.table.columns.length ? this.cellAt(r, c + move) : this.cellAt(r + 1, 0);
        if (next) requestAnimationFrame(() => this.edit(next));
      }
    };
    const keys = (event: KeyboardEvent) => {
      event.stopPropagation();
      if (event.key === 'Enter') { event.preventDefault(); finish(true); }
      else if (event.key === 'Escape') { event.preventDefault(); finish(false); }
      else if (event.key === 'Tab') { event.preventDefault(); finish(true, 1); }
    };
    const blur = () => finish(true);
    cell.addEventListener('keydown', keys);
    cell.addEventListener('blur', blur);
  }

  private cellAt(r: number, c: number): HTMLElement | null {
    return this.body.querySelector<HTMLElement>(`td[data-r="${r}"][data-c="${c}"]`);
  }

  private save(r: number, c: number, value: string) {
    if (!this.table) return;
    const rows = this.table.rows.map(row => [...row]);
    rows[r][c] = value;
    this.commit({ data: { table: { columns: this.table.columns, rows } } });
  }

  private rename(c: number, name: string) {
    if (!this.table) return;
    const columns = this.table.columns.map((column, i) => (i === c ? { ...column, name } : column));
    this.commit({ data: { table: { columns, rows: this.table.rows } } });
  }

  update(item: Item) {
    const table = readTable(item.data.table);
    this.table = table;
    if (!this.editing) this.paint(table);
  }

  private paint(table: Table) {
    const values = evaluate(table);
    let headRow = this.head.firstElementChild as HTMLTableRowElement | null;
    if (!headRow) { headRow = document.createElement('tr'); this.head.append(headRow); }
    this.resize(headRow, table.columns.length, 'th');
    table.columns.forEach((column, c) => {
      const th = headRow!.children[c] as HTMLElement;
      th.dataset.c = String(c);
      th.dataset.type = column.type;
      if (th.textContent !== column.name) th.textContent = column.name;
    });
    while (this.body.children.length > table.rows.length) this.body.lastElementChild!.remove();
    while (this.body.children.length < table.rows.length) this.body.append(document.createElement('tr'));
    table.rows.forEach((row, r) => {
      const tr = this.body.children[r] as HTMLTableRowElement;
      this.resize(tr, table.columns.length, 'td');
      row.forEach((raw, c) => {
        const td = tr.children[c] as HTMLElement;
        td.dataset.r = String(r);
        td.dataset.c = String(c);
        const type = table.columns[c].type;
        td.dataset.type = type;
        if (type === 'checkbox') {
          let box = td.firstElementChild as HTMLInputElement | null;
          if (!box || box.tagName !== 'INPUT') { box = document.createElement('input'); box.type = 'checkbox'; box.setAttribute('aria-label', `${table.columns[c].name} row ${r + 1}`); td.replaceChildren(box); }
          box.checked = raw === 'true';
          box.disabled = !!this.item()?.locked;
          return;
        }
        const value = values[r][c];
        const text = typeof value === 'string' && value.startsWith('#') && raw.startsWith('=') ? value : display(value, type);
        if (td.firstElementChild) td.replaceChildren();
        if (td.textContent !== text) td.textContent = text;
        td.classList.toggle('formula', raw.startsWith('='));
        td.classList.toggle('error', text === '#ERR' || text === '#CYCLE');
        td.title = raw.startsWith('=') ? raw : '';
      });
    });
  }

  private resize(row: HTMLTableRowElement, count: number, tag: 'th' | 'td') {
    while (row.children.length > count) row.lastElementChild!.remove();
    while (row.children.length < count) row.append(document.createElement(tag));
  }
}
