const paths = {
  cursor: '<path d="M5 3l14 8-6.5 1.6L9.8 19z"/>',
  hand: '<path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11M11 10.5V4a1.5 1.5 0 0 1 3 0v7M14 10.5V5.5a1.5 1.5 0 0 1 3 0V13c0 4.4-2.6 8-6.5 8-2.4 0-3.8-1.1-5-3l-2.6-4.1a1.6 1.6 0 0 1 2.6-1.8L8 14"/>',
  'image-add': '<rect x="3" y="5" width="13" height="13" rx="2"/><circle cx="7.5" cy="9.5" r="1.3"/><path d="M3 16l4-4 3 3 2-2 4 4M19 3v6M16 6h6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="M3 17l5-5 4 4 3-3 6 6"/>',
  note: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 11h8M8 15h6"/>',
  document: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 12h7M9 15h7M9 18h4"/>',
  swatch: '<rect x="4" y="3" width="16" height="18" rx="2"/><rect x="7" y="6" width="10" height="8" rx="1"/><path d="M7 17.5h6"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  todo: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  board: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="6.5" y="6.5" width="5" height="5" rx="1"/><rect x="13" y="6.5" width="4.5" height="11" rx="1"/><rect x="6.5" y="13" width="5" height="4.5" rx="1"/>',
  column: '<rect x="4" y="3" width="7" height="18" rx="1.5"/><rect x="13" y="3" width="7" height="12" rx="1.5"/>',
  paperclip: '<path d="M20 11.5l-8.4 8.4a5 5 0 0 1-7.1-7.1l8.4-8.4a3.3 3.3 0 0 1 4.7 4.7l-8.3 8.3a1.7 1.7 0 0 1-2.4-2.4l7.6-7.6"/>',
  pipette: '<path d="M14.5 4.5l5 5M12 7l5 5M16 3l5 5-3.5 3.5-5-5zM12.5 7.5L4.6 15.4 4 20l4.6-.6 7.9-7.9"/>',
  pen: '<path d="M16.5 3.5l4 4L8 20l-5 1 1-5z"/><path d="M14 6l4 4"/>',
  brush: '<path d="M20 4L10 14"/><path d="M10 14c-2.5-.5-5 1-5 4 0 1-.8 2-2 2 4 1.5 9 0 9-4"/>',
  eraser: '<path d="M8 20h12M5 15l9-9 5 5-8.5 8.5H9.5z"/><path d="M10 10l5 5"/>',
  'line-tool': '<path d="M5 19L19 5"/><circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="5" r="1.6"/>',
  'rect-tool': '<rect x="4" y="6" width="16" height="12" rx="1"/>',
  'circle-tool': '<circle cx="12" cy="12" r="8"/>',
  connect: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H13a3 3 0 0 1 3 3v6.5"/>',
  pack: '<rect x="3" y="3" width="8" height="10" rx="1"/><rect x="13" y="3" width="8" height="6" rx="1"/><rect x="3" y="15" width="8" height="6" rx="1"/><rect x="13" y="11" width="8" height="10" rx="1"/>',
  fit: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  'focus-mode': '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  'zoom-in': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6M11 8v6"/>',
  'zoom-out': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6"/>',
  navigator: '<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="11" y="11" width="7" height="5" rx="1"/>',
  'chevron-left': '<path d="M15 5l-7 7 7 7"/>',
  'chevron-right': '<path d="M9 5l7 7-7 7"/>',
  'chevron-down': '<path d="M5 9l7 7 7-7"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  undo: '<path d="M9 5L4 10l5 5"/><path d="M4 10h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="M15 5l5 5-5 5"/><path d="M20 10H10a6 6 0 0 0 0 12h3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  export: '<path d="M12 15V3M7.5 7.5L12 3l4.5 4.5M4 13v7h16v-7"/>',
  import: '<path d="M12 3v12M7.5 10.5L12 15l4.5-4.5M4 13v7h16v-7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  duplicate: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  trash: '<path d="M4 7h16M10 7V4h4v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
  comment: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  sync: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5"/>',
  unsync: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5M3 3l18 18"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M3 14.5h18M9.5 9v11M15.5 9v11"/>',
  video: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  audio: '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  present: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M10 7.5v5l4-2.5zM12 16v4M8 20h8"/>',
  label: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  'web-image': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  resolve: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16.5 9.5"/>',
  template: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
  'template-save': '<path d="M13 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8M3 9h18M9 9v12M18 16v6M15 19h6"/>',
  'trash-open': '<path d="M3.5 6.5l15-3M10 5.2l-.4-2 4-.8.4 2M6 9l1 12h10l1-12z"/>',
  restore: '<path d="M6 9l1 12h10l1-12M12 18v-7M9 13.5l3-3 3 3M4 5h16"/>',
  group: '<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 2.5"/><rect x="7" y="7" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/>',
  ungroup: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><path d="M15 4h5v5M4 15v5h5" stroke-dasharray="2 2"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.7-1.5"/>',
  'align-left': '<path d="M4 3v18"/><rect x="7" y="5" width="12" height="5" rx="1"/><rect x="7" y="14" width="8" height="5" rx="1"/>',
  'distribute-h': '<path d="M3 4v16M21 4v16"/><rect x="8" y="7" width="8" height="10" rx="1"/>',
  'distribute-v': '<path d="M4 3h16M4 21h16"/><rect x="7" y="8" width="10" height="8" rx="1"/>',
  normalize: '<rect x="3" y="8" width="7" height="7" rx="1"/><rect x="14" y="8" width="7" height="7" rx="1"/><path d="M3 4h18M3 19h18"/>',
  snap: '<path d="M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3z"/><path d="M6 7h4M14 7h4"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  'bring-front': '<rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M15 9V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h4" stroke-dasharray="2 2"/>',
  'send-back': '<rect x="4" y="4" width="11" height="11" rx="1.5" stroke-dasharray="2 2"/><path d="M9 15v4a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-4"/>',
  'flip-h': '<path d="M12 3v18"/><path d="M9 6L3 18h6zM15 6l6 12h-6z"/>',
  'flip-v': '<path d="M3 12h18"/><path d="M6 9L18 3v6zM6 15l12 6v-6z"/>',
  grayscale: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  pixel: '<path d="M4 4h5v5H4zM9 9h6v6H9zM15 4h5v5h-5zM4 15h5v5H4zM15 15h5v5h-5z"/>',
  opacity: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M12 7h4.5M12 11h6.5M12 15h6M12 19h3"/>',
  crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M2 6h14a2 2 0 0 1 2 2v14"/>',
  cutout: '<path d="M4 7V4h3M10 4h4M17 4h3v3M20 10v4M20 17v3h-3M14 20h-4M7 20H4v-3M4 14v-4"/><circle cx="12" cy="10" r="2.5"/><path d="M7.5 17c.8-2.4 2.5-3.5 4.5-3.5s3.7 1.1 4.5 3.5"/>',
  'reset-crop': '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M2 6h6"/><path d="M14 4a7 7 0 1 1-2 9"/>',
  rotate: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  sort: '<path d="M7 4v16M3.5 16.5L7 20l3.5-3.5"/><path d="M13 6h8M13 11h6M13 16h4"/>',
  similarity: '<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>',
  palette: '<path d="M12 3a9 9 0 0 0 0 18c1.4 0 2-1 2-2 0-1.6 1.2-2 2.5-2H18a3 3 0 0 0 3-3c0-6-4-11-9-11z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="14.5" cy="7" r="1.2"/>',
  grid: '<path d="M3 9h18M3 15h18M9 3v18M15 3v18"/><rect x="3" y="3" width="18" height="18" rx="2"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  'new-file': '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M12.5 11v6M9.5 14h6"/>',
  'new-tab': '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M8 6V4h8v2M12 13v4M10 15h4"/>',
  'open-folder': '<path d="M3 7V5a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v2"/><path d="M3 9h18l-2 10H5z"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
  paste: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h4"/>',
  'select-all': '<rect x="4" y="4" width="16" height="16" rx="1" stroke-dasharray="3 2"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  deselect: '<rect x="4" y="4" width="16" height="16" rx="1" stroke-dasharray="3 2"/><path d="M9 9l6 6M15 9l-6 6"/>',
  'arrow-right': '<path d="M4 12h16M14 6l6 6-6 6"/>',
  agent: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  'dock-left': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  'dock-right': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.8 1c0 1.7-2.3 2-2.3 3.5M12 17.5h.01"/>',
  commands: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/>',
  relink: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',
  sample: '<path d="M4 20l4-1 9-9-3-3-9 9z"/><path d="M14 7l3 3M17 4l3 3"/>',
  delete: '<path d="M4 7h16M10 7V4h4v3M6 7l1 14h10l1-14"/>',
  stroke: '<path d="M4 18c3-6 5-10 8-10s3 8 6 8 2-4 2-4"/>',
  shape: '<rect x="3" y="3" width="10" height="10" rx="1"/><circle cx="16" cy="16" r="5"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
  outline: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  inspector: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/><path d="M11.5 13.5L20 4"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>'
} as const;

export type IconName = keyof typeof paths;

export function hasIcon(name: string): name is IconName {
  return Object.prototype.hasOwnProperty.call(paths, name);
}

export function icon(name: IconName | string): SVGSVGElement {
  if (!hasIcon(name)) throw new Error(`Unknown icon "${name}"`);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.65');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = paths[name];
  return svg;
}

export function iconNames(): IconName[] {
  return Object.keys(paths) as IconName[];
}
