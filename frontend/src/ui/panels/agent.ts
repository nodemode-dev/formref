import { icon } from '../icons';

interface Runner { id: string; label: string; available: boolean; path: string; note: string; models?: string[] }
interface AgentSettings { runner: string; ollama_url: string; ollama_model: string; outside_agents: boolean; model: string }
type AgentEvent =
  | { type: 'start'; turn_id: string; runner: string }
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string; args: unknown; id: string; ok?: boolean; summary?: string }
  | { type: 'tool_result'; id: string; ok: boolean; summary: string }
  | { type: 'error'; message: string }
  | { type: 'done'; turn_id: string; changed: boolean; stopped: boolean };

export interface AgentHooks {
  boardId(): string | null;
  selection(): string[];
  afterTurn(): void;
  notify(message: string): void;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export class AgentPanel {
  private readonly runnerSelect = $<HTMLSelectElement>('agent-runner');
  private readonly modelSelect = $<HTMLSelectElement>('agent-model');
  private readonly modelField = $('agent-model-field');
  private readonly runnerNote = $('agent-runner-note');
  private readonly log = $('agent-log');
  private readonly input = $<HTMLTextAreaElement>('agent-input');
  private readonly send = $<HTMLButtonElement>('agent-send');
  private readonly stop = $<HTMLButtonElement>('agent-stop');
  private readonly undo = $<HTMLButtonElement>('agent-undo');
  private readonly outside = $<HTMLInputElement>('agent-outside');
  private readonly status = $('agent-status');
  private runners: Runner[] = [];
  private settings: AgentSettings | null = null;
  private turnId: string | null = null;
  private lastTurn: string | null = null;
  private busy = false;
  private loaded = false;
  private readonly cards = new Map<string, HTMLElement>();

  constructor(private readonly hooks: AgentHooks) {
    this.send.addEventListener('click', () => void this.submit());
    this.input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        void this.submit();
      }
    });
    this.stop.addEventListener('click', () => void this.halt());
    this.undo.addEventListener('click', () => void this.undoTurn());
    this.runnerSelect.addEventListener('change', () => {
      this.showRunner();
      void this.save({ runner: this.runnerSelect.value });
    });
    this.modelSelect.addEventListener('change', () => void this.save({ ollama_model: this.modelSelect.value }));
    this.outside.addEventListener('change', () => void this.save({ outside_agents: this.outside.checked }));
  }

  async load() {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const response = await fetch('/api/agent/runners');
      const data = await response.json() as { runners: Runner[]; settings: AgentSettings };
      this.runners = data.runners;
      this.settings = data.settings;
      for (const runner of this.runners) {
        const option = document.createElement('option');
        option.value = runner.id;
        option.textContent = runner.available ? runner.label : `${runner.label} (not found)`;
        this.runnerSelect.append(option);
      }
      const ollama = this.runners.find(r => r.id === 'ollama');
      for (const model of ollama?.models || []) {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        this.modelSelect.append(option);
      }
      this.runnerSelect.value = data.settings.runner;
      this.modelSelect.value = data.settings.ollama_model;
      this.outside.checked = data.settings.outside_agents;
      this.showRunner();
    } catch {
      this.loaded = false;
      this.setStatus('The local service did not answer. Start FormRef and reopen this panel.');
    }
  }

  focus(prefill = '') {
    void this.load();
    if (prefill && !this.input.value) this.input.value = prefill;
    this.input.focus({ preventScroll: true });
  }

  private showRunner() {
    const runner = this.runners.find(r => r.id === this.runnerSelect.value);
    this.modelField.hidden = runner?.id !== 'ollama';
    const note = !runner ? '' : runner.available ? (runner.id === 'ollama' ? `Local models at ${runner.path}` : `Runs ${runner.path} on this computer with FormRef's tools attached.`) : runner.note;
    if (this.runnerNote.textContent !== note) this.runnerNote.textContent = note;
    this.updateButtons();
  }

  private async save(patch: Partial<AgentSettings>) {
    const response = await fetch('/api/agent/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (!response.ok) this.hooks.notify('Agent settings were not saved.');
    else this.settings = await response.json() as AgentSettings;
  }

  private setStatus(text: string) {
    if (this.status.textContent !== text) this.status.textContent = text;
  }

  private updateButtons() {
    const runner = this.runners.find(r => r.id === this.runnerSelect.value);
    this.send.disabled = this.busy || !runner?.available || !this.hooks.boardId();
    this.stop.disabled = !this.busy;
    this.undo.disabled = this.busy || !this.lastTurn;
    this.runnerSelect.disabled = this.busy;
  }

  private entry(kind: string, text: string): HTMLElement {
    const node = document.createElement('div');
    node.className = `agent-entry ${kind}`;
    node.textContent = text;
    this.log.append(node);
    this.log.scrollTop = this.log.scrollHeight;
    return node;
  }

  private toolCard(event: Extract<AgentEvent, { type: 'tool' }>) {
    const card = document.createElement('div');
    card.className = 'agent-entry agent-call pending';
    const head = document.createElement('div');
    head.className = 'agent-tool-head';
    const name = document.createElement('strong');
    name.textContent = event.name.replace(/^mcp__formref__/, '');
    const state = document.createElement('span');
    state.className = 'agent-tool-state';
    state.textContent = 'running';
    head.append(icon('commands'), name, state);
    const args = document.createElement('code');
    args.textContent = JSON.stringify(event.args);
    const result = document.createElement('p');
    result.className = 'agent-tool-result';
    card.append(head, args, result);
    this.log.append(card);
    this.log.scrollTop = this.log.scrollHeight;
    if (event.id) this.cards.set(event.id, card);
    if (event.ok !== undefined) this.finishCard(card, event.ok, event.summary || '');
  }

  private finishCard(card: HTMLElement, ok: boolean, summary: string) {
    card.classList.remove('pending');
    card.classList.toggle('failed', !ok);
    const state = card.querySelector('.agent-tool-state')!;
    state.textContent = ok ? 'done' : 'failed';
    const result = card.querySelector('.agent-tool-result')!;
    result.textContent = summary.length > 280 ? summary.slice(0, 280) + ' ...' : summary;
  }

  private handle(event: AgentEvent) {
    if (event.type === 'start') {
      this.turnId = event.turn_id;
      this.setStatus(`Working with ${this.runners.find(r => r.id === event.runner)?.label || event.runner}…`);
    } else if (event.type === 'text') this.entry('reply', event.text);
    else if (event.type === 'tool') this.toolCard(event);
    else if (event.type === 'tool_result') {
      const card = this.cards.get(event.id);
      if (card) this.finishCard(card, event.ok, event.summary);
    } else if (event.type === 'error') this.entry('error', event.message);
    else if (event.type === 'done') {
      this.lastTurn = event.changed ? event.turn_id : this.lastTurn;
      this.setStatus(event.stopped ? 'Stopped.' : event.changed ? 'Done. Each change is on the undo stack; Undo This Turn reverts all of them.' : 'Done. The board did not change.');
      if (event.changed) this.hooks.afterTurn();
    }
  }

  private async submit() {
    const message = this.input.value.trim();
    const boardId = this.hooks.boardId();
    if (!message || !boardId || this.busy) return;
    const ids = this.hooks.selection();
    const text = ids.length ? `${message}\n\nSelected item ids: ${ids.join(', ')}` : message;
    this.input.value = '';
    this.entry('user', message);
    this.busy = true;
    this.updateButtons();
    try {
      const response = await fetch('/api/agent/turns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ board_id: boardId, message: text, runner: this.runnerSelect.value }) });
      if (!response.ok || !response.body) throw new Error(`The agent service answered ${response.status}.`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let cut: number;
        while ((cut = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, cut);
          buffer = buffer.slice(cut + 2);
          const data = block.split('\n').find(line => line.startsWith('data: '));
          if (data) this.handle(JSON.parse(data.slice(6)) as AgentEvent);
        }
      }
    } catch (reason) {
      this.entry('error', reason instanceof Error ? reason.message : String(reason));
      this.setStatus('The turn did not finish.');
    } finally {
      this.busy = false;
      this.turnId = null;
      this.updateButtons();
    }
  }

  private async halt() {
    if (!this.turnId) return;
    await fetch(`/api/agent/turns/${this.turnId}/stop`, { method: 'POST' });
    this.setStatus('Stopping…');
  }

  private async undoTurn() {
    if (!this.lastTurn) return;
    const response = await fetch(`/api/agent/turns/${this.lastTurn}/undo`, { method: 'POST' });
    const data = response.ok ? await response.json() as { restored: boolean } : { restored: false };
    this.setStatus(data.restored ? 'The board is back to how it was before that turn.' : 'Undo could not reach the earlier board; use Undo to step back further.');
    this.lastTurn = null;
    this.updateButtons();
    this.hooks.afterTurn();
  }

  refresh() {
    this.updateButtons();
  }

  async allowOutside() {
    await this.save({ outside_agents: true });
    this.outside.checked = true;
  }
}
