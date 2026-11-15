import { request } from '../lib/api';
import type { State } from '../lib/types';
import { icon } from '../ui/icons';
import { $, S, error, inputDialog, open, refreshBoards, toast } from './editor';

export interface Template { id: string; title: string; description: string; built_in: boolean; item_count?: number }

const dialog = $<HTMLDialogElement>('template-dialog');
const builtIn = $('template-built-in');
const saved = $('template-saved');

function row(template: Template): HTMLElement {
  const node = document.createElement('div');
  node.className = 'trash-row';
  const text = document.createElement('div');
  text.className = 'trash-text';
  const name = document.createElement('strong');
  name.textContent = template.title;
  const small = document.createElement('small');
  small.textContent = template.built_in ? template.description : `${template.item_count ?? 0} items · saved from a board`;
  text.append(name, small);
  const use = document.createElement('button');
  use.className = 'button compact primary';
  use.append(icon('plus'), document.createTextNode('Use'));
  use.title = `New board from ${template.title}`;
  use.addEventListener('click', () => void useTemplate(template).catch(error));
  node.append(icon('template'), text, use);
  if (!template.built_in) {
    const remove = document.createElement('button');
    remove.className = 'button compact danger';
    remove.append(icon('delete'), document.createTextNode('Delete'));
    remove.title = `Delete the ${template.title} template`;
    remove.addEventListener('click', () => void (async () => {
      await request(`/templates/${template.id}`, { method: 'DELETE' });
      await render();
    })().catch(error));
    node.append(remove);
  } else {
    node.append(document.createElement('span'));
  }
  return node;
}

async function render() {
  const { templates } = await request<{ templates: Template[] }>('/templates');
  builtIn.replaceChildren(...templates.filter(t => t.built_in).map(row));
  const mine = templates.filter(t => !t.built_in).map(row);
  if (!mine.length) {
    const note = document.createElement('p');
    note.className = 'field-description';
    note.textContent = 'None yet. Use Save as Template on any board to add one here.';
    mine.push(note);
  }
  saved.replaceChildren(...mine);
}

export async function useTemplate(template: Template) {
  dialog.close();
  const form = await inputDialog(`New board from ${template.title}`, { name: template.title, submit: 'Create' });
  if (!form) return;
  const next = await request<State>(`/templates/${template.id}/use`, { method: 'POST', body: JSON.stringify({ title: form.name || template.title }) });
  await refreshBoards();
  await open(next.board.id, next);
}

export async function openTemplates() {
  await render();
  if (!dialog.open) dialog.showModal();
}

export async function saveAsTemplate() {
  if (!S.state) return;
  const form = await inputDialog('Save this board as a template', { name: S.state.board.title, label: 'Template name', description: 'The template keeps every item, link and canvas setting. Comments are left out. Images stay linked to the same files.', submit: 'Save template' });
  if (!form) return;
  await S.queue;
  await request('/templates', { method: 'POST', body: JSON.stringify({ board_id: S.state.board.id, title: form.name || S.state.board.title }) });
  toast(`Saved ${form.name || S.state.board.title} as a template. Find it under New from Template.`);
}
