import { mediaKind } from '../lib/media';
import { readTable } from '../lib/table';
import type { ColumnType, Table } from '../lib/table';
import type { Item } from '../lib/types';
import { $, error, execute, onInspector, setInput } from './editor';

/** Inspector controls for table cards (shape and column types) and video or audio cards (autoplay, loop). */
const tableSection = $('table-properties');
const mediaSection = $('media-properties');
const columnSelect = $<HTMLSelectElement>('table-column');
const typeSelect = $<HTMLSelectElement>('table-type');
let current: Item | null = null;

function writeTable(table: Table) {
  if (!current) return Promise.resolve();
  return execute({ type: 'update', ids: [current.id], patch: { data: { table } } });
}

function render(items: Item[]) {
  current = items.length === 1 ? items[0] : null;
  const table = current?.kind === 'table';
  tableSection.hidden = !table;
  mediaSection.hidden = !current || !['video', 'audio'].includes(mediaKind(current.kind, current.data.mime, current.asset_id, current.url));
  if (current && !mediaSection.hidden) {
    setInput('media-autoplay', !!current.data.autoplay);
    setInput('media-loop', !!current.data.loop);
  }
  if (!current || !table) return;
  const { columns } = readTable(current.data.table);
  const keep = Math.min(Number(columnSelect.value) || 0, columns.length - 1);
  while (columnSelect.options.length > columns.length) columnSelect.lastElementChild!.remove();
  columns.forEach((column, index) => {
    let option = columnSelect.options[index];
    if (!option) { option = document.createElement('option'); columnSelect.append(option); }
    option.value = String(index);
    const text = `${String.fromCharCode(65 + index)} · ${column.name || 'Untitled'}`;
    if (option.textContent !== text) option.textContent = text;
  });
  columnSelect.value = String(Math.max(0, keep));
  typeSelect.value = columns[Math.max(0, keep)]?.type || 'text';
  for (const control of tableSection.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('button, select')) control.disabled = current.locked;
}
onInspector(render);

columnSelect.addEventListener('change', () => {
  if (!current) return;
  typeSelect.value = readTable(current.data.table).columns[Number(columnSelect.value)]?.type || 'text';
});

typeSelect.addEventListener('change', () => {
  if (!current) return;
  const table = readTable(current.data.table);
  const index = Number(columnSelect.value);
  table.columns[index] = { ...table.columns[index], type: typeSelect.value as ColumnType };
  // A column turned into checkboxes keeps only true or false values.
  if (typeSelect.value === 'checkbox') table.rows = table.rows.map(row => row.map((cell, c) => (c === index ? String(/^(true|yes|1|x)$/i.test(cell.trim())) : cell)));
  void writeTable(table).catch(error);
});

tableSection.addEventListener('click', event => {
  const action = (event.target as HTMLElement).closest<HTMLElement>('[data-table]')?.dataset.table;
  if (!action || !current) return;
  const table = readTable(current.data.table);
  const index = Number(columnSelect.value);
  if (action === 'add-row') {
    if (table.rows.length >= 500) return void error(new Error('A table has at most 500 rows.'));
    table.rows.push(table.columns.map(column => (column.type === 'checkbox' ? 'false' : '')));
  } else if (action === 'remove-row') {
    if (table.rows.length <= 1) return;
    table.rows.pop();
  } else if (action === 'add-column') {
    if (table.columns.length >= 26) return void error(new Error('A table has at most 26 columns.'));
    table.columns.splice(index + 1, 0, { name: `Column ${table.columns.length + 1}`, type: 'text' });
    table.rows = table.rows.map(row => { const next = [...row]; next.splice(index + 1, 0, ''); return next; });
  } else if (action === 'remove-column') {
    if (table.columns.length <= 1) return;
    table.columns.splice(index, 1);
    table.rows = table.rows.map(row => row.filter((_, c) => c !== index));
  }
  void writeTable(table).catch(error);
});

for (const key of ['autoplay', 'loop'] as const) {
  $<HTMLInputElement>(`media-${key}`).addEventListener('change', event => {
    if (!current) return;
    void execute({ type: 'update', ids: [current.id], patch: { data: { [key]: (event.target as HTMLInputElement).checked } } }).catch(error);
  });
}
