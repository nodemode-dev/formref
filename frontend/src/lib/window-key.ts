const HEADER = 'X-FormRef-Window-Key';
const STORE = 'formref-window-key';

let key = '';

function remembered(): string {
  try { return sessionStorage.getItem(STORE) ?? ''; } catch { return ''; }
}

function remember(value: string): void {
  try { sessionStorage.setItem(STORE, value); } catch { return; }
}

async function loadWindowKey(): Promise<void> {
  const holder = window as unknown as { __FORMREF_WINDOW_KEY?: unknown };
  const given = holder.__FORMREF_WINDOW_KEY;
  delete holder.__FORMREF_WINDOW_KEY;
  if (typeof given === 'string' && given) { key = given; return; }
  try {
    const res = await fetch('/api/window/key', { method: 'POST' });
    const body = res.ok ? await res.json() as { key?: unknown } : {};
    if (typeof body.key === 'string' && body.key) { key = body.key; remember(key); return; }
  } catch { key = ''; }
  key = remembered();
}

await loadWindowKey();

export const windowKey = (): string => key;

export const keyHeaders = (): Record<string, string> => (key ? { [HEADER]: key } : {});

export async function streamTicket(): Promise<string> {
  const res = await fetch('/api/window/ticket', { method: 'POST', headers: keyHeaders() });
  if (!res.ok) return '';
  const body = await res.json() as { ticket?: unknown };
  return typeof body.ticket === 'string' ? body.ticket : '';
}
