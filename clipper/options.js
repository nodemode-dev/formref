const api = globalThis.browser ?? globalThis.chrome;
const DEFAULTS = { server: 'http://127.0.0.1:8196', token: '', board: '' };
const $ = id => document.getElementById(id);
const ALL = { origins: ['<all_urls>'] };

function status(text, kind = '') {
  $('status').textContent = text;
  $('status').className = 'status ' + kind;
}

async function fillBoards(selected) {
  const { server, token } = await api.storage.local.get(['server', 'token']);
  const response = await fetch((server || DEFAULTS.server).replace(/\/+$/, '') + '/api/clip/boards', { headers: { 'X-FormRef-Clip-Token': token || '' } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `FormRef answered ${response.status}.`);
  const select = $('board');
  for (const option of [...select.options].slice(1)) option.remove();
  for (const board of body.boards) select.add(new Option(board.title, board.id, false, board.id === selected));
  return body.boards.length;
}

async function connect() {
  const server = $('server').value.trim() || DEFAULTS.server;
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(server)) { status('Use the loopback address FormRef prints, such as http://127.0.0.1:8196.', 'bad'); return; }
  await api.storage.local.set({ server, token: $('token').value.trim() });
  status('Connecting...');
  try {
    const count = await fillBoards($('board').value);
    status(`Connected. ${count} board${count === 1 ? '' : 's'} found.`, 'ok');
  } catch (error) {
    status(error instanceof TypeError ? `FormRef is not reachable at ${server}.` : error.message, 'bad');
  }
}

async function init() {
  const saved = { ...DEFAULTS, ...(await api.storage.local.get(Object.keys(DEFAULTS))) };
  $('server').value = saved.server;
  $('token').value = saved.token;
  $('download').checked = await api.permissions.contains(ALL);
  if (saved.token) {
    try { const count = await fillBoards(saved.board); status(`Connected. ${count} board${count === 1 ? '' : 's'} found.`, 'ok'); } catch (error) { status(error.message, 'bad'); }
  }
}

$('connect').addEventListener('click', () => void connect());
$('board').addEventListener('change', () => void api.storage.local.set({ board: $('board').value }));
$('download').addEventListener('change', async () => {
  // Asking for every site is optional and only for images FormRef itself cannot fetch.
  const box = $('download');
  box.checked = box.checked ? await api.permissions.request(ALL) : !(await api.permissions.remove(ALL));
});
void init();
