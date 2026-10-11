import { request } from '../lib/api';
import type { State } from '../lib/types';
import { $, S, applyState, open, toast } from './editor';

/** Opt-in Google Drive and Dropbox, ported from FormCut: Preferences rows, Save Board to Cloud, Open from Cloud. */
type Service = 'google' | 'dropbox';
interface ServiceState { configured: boolean; connected: boolean; clientId: string; fullDrive: boolean }
interface Entry { id: string; name: string; folder: boolean; size: number }
const LABEL: Record<Service, string> = { google: 'Google Drive', dropbox: 'Dropbox' };
const PROJECTS = /\.(formref|istack|json)$/i;
const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));
const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));
const states = () => request<Record<Service, ServiceState>>('/cloud');
const set = (node: Element, value: string) => { if (node.textContent !== value) node.textContent = value; };

// Preferences -------------------------------------------------------------------------------------------------

function row(service: Service) { return document.querySelector<HTMLElement>(`[data-cloud="${service}"]`)!; }

function draw(service: Service, state: ServiceState) {
  const root = row(service);
  const badge = root.querySelector<HTMLElement>('[data-cloud-state]')!;
  set(badge, state.connected ? 'Connected' : state.configured ? 'Ready to connect' : 'Not set up');
  badge.dataset.state = state.connected ? 'good' : state.configured ? 'set' : 'none';
  root.querySelector<HTMLButtonElement>('[data-cloud-act="connect"]')!.disabled = !state.configured || state.connected;
  root.querySelector<HTMLButtonElement>('[data-cloud-act="disconnect"]')!.disabled = !state.connected;
}

export async function refreshCloudPreferences() {
  try {
    const found = await states();
    for (const service of ['google', 'dropbox'] as Service[]) {
      const id = row(service).querySelector<HTMLInputElement>('[data-cloud-id]')!;
      if (document.activeElement !== id) id.value = found[service].clientId;
      const full = row(service).querySelector<HTMLInputElement>('[data-cloud-full]');
      if (full) full.checked = found[service].fullDrive;
      draw(service, found[service]);
    }
  } catch { /* the section stays as it was */ }
}

for (const service of ['google', 'dropbox'] as Service[]) {
  const root = row(service);
  const say = (text: string) => set(root.querySelector('[data-cloud-say]')!, text);
  root.addEventListener('click', event => {
    const act = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-cloud-act]')?.dataset.cloudAct;
    if (!act) return;
    if (act === 'save') {
      const secret = root.querySelector<HTMLInputElement>('[data-cloud-secret]');
      const body = { clientId: root.querySelector<HTMLInputElement>('[data-cloud-id]')!.value.trim(), fullDrive: !!root.querySelector<HTMLInputElement>('[data-cloud-full]')?.checked, ...(secret?.value.trim() ? { clientSecret: secret.value.trim() } : {}) };
      void request<ServiceState>(`/cloud/${service}/app`, { method: 'PUT', body: JSON.stringify(body) }).then(state => { if (secret) secret.value = ''; say(''); draw(service, state); }, error => say(reason(error)));
    } else if (act === 'connect') {
      void request<{ url: string; paste: boolean }>(`/cloud/${service}/start`, { method: 'POST' }).then(async started => {
        window.open(started.url, '_blank', 'noopener');
        if (started.paste) { root.querySelector<HTMLElement>('[data-cloud-paste]')!.hidden = false; say('Sign in to Dropbox in the new tab, then paste the code it shows.'); return; }
        say('Finish signing in to Google in the new tab.');
        const deadline = Date.now() + 600_000;
        while (Date.now() < deadline && $<HTMLDialogElement>('preferences-dialog').open) {
          await wait(1500);
          const state = (await states())[service];
          if (state.connected) { say(''); draw(service, state); return; }
        }
      }, error => say(reason(error)));
    } else if (act === 'finish') {
      const code = root.querySelector<HTMLInputElement>('[data-cloud-code]')!;
      void request<ServiceState>('/cloud/dropbox/code', { method: 'POST', body: JSON.stringify({ code: code.value }) }).then(state => { code.value = ''; root.querySelector<HTMLElement>('[data-cloud-paste]')!.hidden = true; say(''); draw(service, state); }, error => say(reason(error)));
    } else if (act === 'disconnect') {
      void request<ServiceState>(`/cloud/${service}`, { method: 'DELETE' }).then(state => draw(service, state), error => say(reason(error)));
    }
  });
}

// The cloud dialog ---------------------------------------------------------------------------------------------

const dialog = $<HTMLDialogElement>('cloud-dialog');
const list = $<HTMLUListElement>('cloud-list');
let mode: 'save' | 'browse' = 'browse';
let service: Service = 'google';
let known: Record<Service, ServiceState> | null = null;
let trail: Entry[] = [];
let cursor = '';
const note = (text: string) => set($('cloud-note'), text);

function tabs() {
  for (const tab of dialog.querySelectorAll<HTMLButtonElement>('[data-cloud-service]')) tab.setAttribute('aria-checked', String(tab.dataset.cloudService === service));
}

function line(entry: Entry): HTMLLIElement {
  // Names come from the cloud service, so they are only ever text, never markup.
  const item = document.createElement('li');
  item.className = 'cloud-row';
  const name = document.createElement('span');
  name.className = 'cloud-name';
  name.textContent = entry.folder ? `${entry.name} /` : entry.name;
  const size = document.createElement('span');
  size.className = 'cloud-size';
  size.textContent = entry.folder ? '' : entry.size >= 1e6 ? `${(entry.size / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(entry.size / 1e3))} KB`;
  const button = document.createElement('button');
  button.className = 'button compact';
  button.textContent = entry.folder ? 'Open' : PROJECTS.test(entry.name) ? 'Open board' : 'Add to board';
  button.addEventListener('click', () => {
    if (entry.folder) { trail = [...trail, entry]; void load(true); return; }
    button.disabled = true;
    note(`Opening ${entry.name}...`);
    void request<{ opened: string; board_id: string; state: State }>(`/cloud/${service}/open`, { method: 'POST', body: JSON.stringify({ id: entry.id, name: entry.name, board_id: S.state?.board.id || '' }) })
      .then(async result => {
        if (result.opened === 'board') { dialog.close(); await open(result.board_id, result.state); toast(`Opened ${entry.name} from ${LABEL[service]}.`); }
        else { applyState(result.state); note(`Added ${entry.name} to the board.`); }
      }, error => note(reason(error))).finally(() => { button.disabled = false; });
  });
  item.append(name, size, button);
  return item;
}

async function load(reset: boolean) {
  tabs();
  if (reset) { cursor = ''; list.replaceChildren(); }
  $('cloud-back').hidden = !trail.length;
  set($('cloud-where'), [LABEL[service], ...trail.map(entry => entry.name)].join(' / '));
  $<HTMLButtonElement>('cloud-save-button').disabled = !known?.[service].connected;
  if (!known?.[service].connected) { $('cloud-more').hidden = true; note(`Connect ${LABEL[service]} in Preferences, Cloud storage, first.`); return; }
  note('');
  if (mode === 'save') return;
  try {
    const folder = trail.length ? trail[trail.length - 1].id : '';
    const page = await request<{ entries: Entry[]; cursor: string }>(`/cloud/${service}/files?${new URLSearchParams({ folder, cursor })}`);
    list.append(...page.entries.map(line));
    cursor = page.cursor;
    $('cloud-more').hidden = !cursor;
    if (!list.children.length) note('Nothing here.');
  } catch (error) { note(reason(error)); }
}

export async function openCloud(which: 'save' | 'browse') {
  mode = which;
  trail = [];
  set($('cloud-title'), which === 'save' ? 'Save board to cloud' : 'Open from cloud');
  $('cloud-save').hidden = which !== 'save';
  $('cloud-browse').hidden = which !== 'browse';
  list.replaceChildren();
  note('');
  if (!dialog.open) dialog.showModal();
  try { known = await states(); } catch (error) { note(reason(error)); return; }
  if (!known[service].connected) service = (['google', 'dropbox'] as Service[]).find(name => known![name].connected) || service;
  await load(true);
}

dialog.addEventListener('click', event => {
  const tab = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-cloud-service]');
  if (tab && tab.dataset.cloudService !== service) { service = tab.dataset.cloudService as Service; trail = []; void load(true); }
});
$('cloud-back').addEventListener('click', () => { trail = trail.slice(0, -1); void load(true); });
$('cloud-more').addEventListener('click', () => void load(false));
$('cloud-save-button').addEventListener('click', () => {
  if (!S.state) return;
  const button = $<HTMLButtonElement>('cloud-save-button');
  button.disabled = true;
  note(`Saving to ${LABEL[service]}...`);
  void request<{ name: string }>(`/cloud/${service}/save`, { method: 'POST', body: JSON.stringify({ board_id: S.state.board.id, format: $<HTMLSelectElement>('cloud-format').value }) })
    .then(saved => note(`Saved ${saved.name} to the formref folder in ${LABEL[service]}.`), error => note(reason(error)))
    .finally(() => { button.disabled = false; });
});
