import type { Command, Item, Label } from '../lib/types';
import { icon } from '../ui/icons';
import { $, S, error, execute, onInspector, selected } from './editor';

export const LABEL_COLORS: [string, string][] = [
  ['Red', '#ef4444'], ['Orange', '#f97316'], ['Yellow', '#eab308'], ['Green', '#22c55e'], ['Teal', '#14b8a6'],
  ['Blue', '#3b82f6'], ['Violet', '#8b5cf6'], ['Pink', '#ec4899'], ['Grey', '#9ca3af'],
];

const chips = $('label-chips');
const section = $('label-section');
const dialog = $<HTMLDialogElement>('label-dialog');
const rows = $('label-rows');

const labels = (): Label[] => S.state?.board.settings?.labels || [];
const itemLabels = (item: Item): string[] => (Array.isArray(item.data.labels) ? item.data.labels as string[] : []);
const uid = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : String(Date.now()) + Math.random().toString(16).slice(2));

async function saveLabels(next: Label[]) {
  await execute({ type: 'settings', patch: { labels: next } } as Command);
  if (dialog.open) renderRows();
}

/** Toggle a label on the selection: if every unlocked selected item has it, remove it; otherwise add it. */
async function toggle(id: string) {
  const items = selected().filter(item => !item.locked);
  if (!items.length) return;
  const all = items.every(item => itemLabels(item).includes(id));
  const commands: Command[] = items.map(item => {
    const current = itemLabels(item);
    const next = all ? current.filter(x => x !== id) : current.includes(id) ? current : [...current, id];
    return { type: 'update', ids: [item.id], patch: { data: { labels: next } } } as Command;
  });
  if (!all && items.some(item => itemLabels(item).length >= 12 && !itemLabels(item).includes(id))) throw new Error('An item can carry at most 12 labels.');
  await execute(commands.length === 1 ? commands[0] : { type: 'batch', commands } as Command);
}

function renderChips(items: Item[]) {
  const editable = items.filter(item => !item.locked);
  section.hidden = !items.length;
  const defined = labels();
  const want = defined.length ? defined : [];
  while (chips.children.length > want.length + 1) chips.lastElementChild!.remove();
  want.forEach((label, index) => {
    let chip = chips.children[index] as HTMLButtonElement | undefined;
    if (!chip || !chip.dataset.label) {
      chip = document.createElement('button');
      chip.className = 'label-chip';
      chip.addEventListener('click', () => void toggle(chip!.dataset.label!).catch(error));
      chips.insertBefore(chip, chips.children[index] || null);
    }
    chip.dataset.label = label.id;
    if (chip.textContent !== label.name) chip.textContent = label.name;
    chip.style.setProperty('--label', label.color);
    const on = editable.length > 0 && editable.every(item => itemLabels(item).includes(label.id));
    const some = !on && editable.some(item => itemLabels(item).includes(label.id));
    chip.classList.toggle('on', on);
    chip.classList.toggle('some', some);
    chip.setAttribute('aria-pressed', String(on));
    chip.disabled = !editable.length;
  });
  let hint = chips.children[want.length] as HTMLElement | undefined;
  if (!hint || hint.dataset.label) {
    hint = document.createElement('span');
    hint.className = 'field-description';
    chips.append(hint);
  }
  const text = want.length ? '' : 'No labels yet.';
  if (hint.textContent !== text) hint.textContent = text;
  hint.hidden = !text;
}
onInspector(renderChips);

function colorSelect(current: string, onChange: (value: string) => void): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = 'label-color';
  select.setAttribute('aria-label', 'Label colour');
  for (const [name, value] of LABEL_COLORS) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = name;
    select.append(option);
  }
  if (!LABEL_COLORS.some(([, value]) => value === current)) {
    const option = document.createElement('option');
    option.value = current;
    option.textContent = current;
    select.append(option);
  }
  select.value = current;
  select.style.setProperty('--label', current);
  select.addEventListener('change', () => onChange(select.value));
  return select;
}

function renderRows() {
  const defined = labels();
  rows.replaceChildren(...defined.map(label => {
    const row = document.createElement('div');
    row.className = 'trash-row label-row';
    const dot = document.createElement('span');
    dot.className = 'label-dot';
    dot.style.setProperty('--label', label.color);
    const name = document.createElement('input');
    name.value = label.name;
    name.maxLength = 40;
    name.setAttribute('aria-label', 'Label name');
    name.addEventListener('change', () => {
      const value = name.value.trim();
      if (!value) { name.value = label.name; return; }
      void saveLabels(labels().map(l => l.id === label.id ? { ...l, name: value } : l)).catch(error);
    });
    const color = colorSelect(label.color, value => void saveLabels(labels().map(l => l.id === label.id ? { ...l, color: value } : l)).catch(error));
    const remove = document.createElement('button');
    remove.className = 'button compact danger';
    remove.title = `Delete ${label.name} from the board and every item`;
    remove.append(icon('delete'), document.createTextNode('Delete'));
    remove.addEventListener('click', () => void saveLabels(labels().filter(l => l.id !== label.id)).catch(error));
    row.append(dot, name, color, remove);
    return row;
  }));
  if (!defined.length) {
    const note = document.createElement('p');
    note.className = 'field-description';
    note.textContent = 'No labels yet.';
    rows.append(note);
  }
  $<HTMLButtonElement>('label-add').disabled = defined.length >= 32;
}

export function openLabels() {
  renderRows();
  if (!dialog.open) dialog.showModal();
}

$('label-add').addEventListener('click', () => {
  const used = new Set(labels().map(l => l.color));
  const color = (LABEL_COLORS.find(([, value]) => !used.has(value)) || LABEL_COLORS[0])[1];
  void saveLabels([...labels(), { id: uid(), name: `Label ${labels().length + 1}`, color }])
    .then(() => {
      (rows.lastElementChild?.querySelector('input') as HTMLInputElement | null)?.select();
    }).catch(error);
});
