---
name: ui-shell
description: FormRef's TypeScript shell. Load for the right-click menu, the command table and shortcuts, the command palette, board tabs, collapsible docks, icons, the inspector, gestures, drawing tools, the slideshow or any layout or flicker problem in the canvas.
---

# UI shell

Vanilla TypeScript and Vite, no framework, no icon library. `frontend/src/main.ts` only wires modules.

## Map

| Module | Owns |
| --- | --- |
| `app/editor.ts` | board state `S`, selection, camera, engine queue `execute`, `applyState`, outline and inspector patching, dialogs, add and upload |
| `app/commands.ts` | the one command table: id, label, icon, keys, run, enabled |
| `app/menu.ts` | the right-click menu built from the table in iStack's order |
| `app/gestures.ts` | pointer, wheel, eraser, drop, paste, context menu, keyboard from the table |
| `app/bindings.ts` | inspector and preferences inputs, file inputs, palette, generated shortcut sheet, note fonts |
| `app/tabs.ts` | board tabs, session save and restore |
| `app/trash.ts` | the Trash dialog: put removed items back, restore deleted boards, empty |
| `app/comments.ts` | the inspector comment thread, keyed rows patched in place, via `onInspector` |
| `app/templates.ts` | New from Template and Save as Template |
| `app/present.ts` | the presenter view: read-only capture-phase guards, enlarged card, reading order; never writes the viewport |
| `app/labels.ts` | label chips in the inspector and the Board labels dialog |
| `app/capture.ts` | web capture: dropped and pasted addresses, the page image picker; `placeAssets` in `editor.ts` places the results |
| `ui/context-menu.ts` | menu renderer: submenus, keyboard navigation, edge flipping, overlay root |
| `ui/dock.ts` | dock collapse and the right panel tabs |
| `ui/icons.ts` | every glyph; throws on an unknown name |
| `ui/scene.ts` | keyed board item nodes, patched in place; `NOTE_FONTS` |
| `ui/reference-view.ts` | slideshow and focus view, speed and fade |
| `styles/tokens.css`, `styles/main.css`, `styles/shell.css` | tokens and z scale, legacy layout, shell additions |

## Changing a command or shortcut

Edit its row in `commands.ts`. The menu, palette, keys and sheet follow. Row keys are the defaults; people can reassign them in the shortcut sheet, which stores only the differences through `/api/preferences` and applies them with `applyKeyOverrides` at start. Use `assignKey` and `onKeysChanged` rather than writing `command.keys` directly, so the keymap and every key label stay in step. `RESERVED_KEYS` lists what a page cannot take. Where a key collides with iStack's, iStack keeps it. Browsers reserve Ctrl+T, Ctrl+W and Ctrl+N; do not advertise a key a page cannot catch, except Ctrl+N, which iStack used and the desktop shell receives.

## DOM rules

Before any DOM change, name the node and property written, what stays untouched, and what space is reserved. Patch keyed nodes, never clear a visible container. Docks and theme are set by the head script; the shell is hidden until the inline `shell-ready` script after its markup runs, because a throttled network otherwise paints a half-parsed toolbar. New panels reserve their height (fixed result lines, scrolling logs). Every z-index is a token.

## Proving it

`npx tsc --noEmit -p .` and `npm run build` in `frontend/`, then the verification specialist's throttled run covering every path the change touched. Record the result in `frontend/HASHOUT_LOG.md`.
