import type { Asset, Command, State, Summary } from './types';
const base = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE || '';
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base}/api${path}`, { ...init, headers: init.body instanceof FormData ? init.headers : { 'Content-Type': 'application/json', ...init.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.detail === 'string' ? body.detail : `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}
export const api = {
  list: () => request<Summary[] | { boards: Summary[] }>('/boards'),
  create: (title: string) => request<State>('/boards', { method: 'POST', body: JSON.stringify({ title }) }),
  get: (id: string) => request<State>(`/boards/${id}`),
  command: (id: string, command: Command) => request<State>(`/boards/${id}/commands`, { method: 'POST', body: JSON.stringify({ command }) }),
  history: (id: string, direction: 'undo' | 'redo') => request<State>(`/boards/${id}/${direction}`, { method: 'POST' }),
  duplicate: (id: string) => request<State>(`/boards/${id}/duplicate`, { method: 'POST' }),
  remove: (id: string) => request<unknown>(`/boards/${id}`, { method: 'DELETE' }),
  upload: async (file: File) => { const form = new FormData(); form.append('file', file); return request<Asset>('/assets', { method: 'POST', body: form }); },
  import: async (file: File) => { const form = new FormData(); form.append('file', file); return request<State & { warnings?: string[] }>('/import', { method: 'POST', body: form }); },
  relink: async (id: string, item_id: string, file: File) => { const form = new FormData(); form.append('file', file); form.append('item_id', item_id); return request<State>(`/boards/${id}/relink`, { method: 'POST', body: form }); },
  exportUrl: (id: string, format: string) => `${base}/api/boards/${id}/export?format=${format}`,
  assetUrl: (id: string) => `${base}/api/assets/${id}`,
  events: (id: string) => new EventSource(`${base}/api/boards/${id}/events`)
};
