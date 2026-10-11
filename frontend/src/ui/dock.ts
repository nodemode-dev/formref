type Side = 'left' | 'right';

const KEYS: Record<Side, string> = { left: 'formref-left-dock', right: 'formref-right-dock' };
const ATTR: Record<Side, 'leftDock' | 'rightDock'> = { left: 'leftDock', right: 'rightDock' };

function remember(side: Side, value: string) {
  try { localStorage.setItem(KEYS[side], value); } catch { }
}

export function isCollapsed(side: Side): boolean {
  return document.documentElement.dataset[ATTR[side]] === 'collapsed';
}

export function setDock(side: Side, collapsed: boolean, onChange?: () => void) {
  const value = collapsed ? 'collapsed' : 'open';
  if (document.documentElement.dataset[ATTR[side]] === value) return;
  document.documentElement.dataset[ATTR[side]] = value;
  remember(side, value);
  document.querySelectorAll<HTMLButtonElement>(`[data-dock-toggle="${side}"]`).forEach(button => {
    button.setAttribute('aria-expanded', String(!collapsed));
    button.title = `${collapsed ? 'Expand' : 'Collapse'} ${side} panel`;
  });
  onChange?.();
}

export function toggleDock(side: Side, onChange?: () => void) {
  setDock(side, !isCollapsed(side), onChange);
}

export function showPanel(name: string) {
  setDock('right', false);
  selectPanel(name);
}

function selectPanel(name: string) {
  document.documentElement.dataset.rightPanel = name;
  try { localStorage.setItem('formref-right-panel', name); } catch { }
  document.querySelectorAll<HTMLButtonElement>('[data-panel-tab]').forEach(tab => {
    const active = tab.dataset.panelTab === name;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
}

export function bindDocks(onChange: () => void) {
  for (const side of ['left', 'right'] as Side[]) {
    const collapsed = isCollapsed(side);
    document.querySelectorAll<HTMLButtonElement>(`[data-dock-toggle="${side}"]`).forEach(button => {
      button.setAttribute('aria-expanded', String(!collapsed));
      button.addEventListener('click', () => toggleDock(side, onChange));
    });
  }
  document.querySelectorAll<HTMLButtonElement>('[data-panel-tab]').forEach(tab => {
    tab.addEventListener('click', () => showPanel(tab.dataset.panelTab!));
  });
  document.querySelectorAll<HTMLButtonElement>('[data-rail-panel]').forEach(button => {
    button.addEventListener('click', () => {
      const side = button.closest('.sidebar') ? 'left' : 'right';
      setDock(side, false, onChange);
      if (side === 'right') showPanel(button.dataset.railPanel!);
      else document.getElementById(button.dataset.railPanel!)?.focus();
    });
  });
  selectPanel(document.documentElement.dataset.rightPanel || 'inspector');
}
