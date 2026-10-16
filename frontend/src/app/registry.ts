import type { IconName } from '../ui/icons';

export interface CommandParam {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  required?: boolean;
  enum?: ReadonlyArray<string | number>;
  min?: number;
  max?: number;
  description?: string;
}

export interface CommandDef {
  id: string;
  label: string;
  group: string;
  icon?: IconName;
  keys?: string[];
  run: (params?: Record<string, unknown>) => unknown;
  enabled?: () => boolean;
  checked?: () => boolean;
  palette?: boolean;
  description?: string;
  when?: string;
  params?: Record<string, CommandParam>;
  mutates?: boolean;
  risky?: boolean;
  agent?: 'allow' | 'window-only';
}

type Listener = (added: CommandDef[], removed: string[]) => void;

export class Registry {
  readonly byId = new Map<string, CommandDef>();
  readonly defaults = new Map<string, string[]>();
  private readonly listeners: Listener[] = [];

  add(...commands: CommandDef[]): void {
    for (const command of commands) {
      if (this.byId.has(command.id)) throw new Error(`Duplicate command ${command.id}`);
      this.byId.set(command.id, command);
      this.defaults.set(command.id, [...(command.keys || [])]);
    }
    this.emit(commands, []);
  }

  remove(id: string): void {
    if (!this.byId.delete(id)) return;
    this.defaults.delete(id);
    this.emit([], [id]);
  }

  get(id: string): CommandDef | undefined {
    return this.byId.get(id);
  }

  all(): CommandDef[] {
    return [...this.byId.values()];
  }

  onChange(listener: Listener): void {
    this.listeners.push(listener);
  }

  private emit(added: CommandDef[], removed: string[]): void {
    for (const listener of this.listeners) listener(added, removed);
  }
}

export const registry = new Registry();
