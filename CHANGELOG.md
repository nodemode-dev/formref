# FormRef changelog

## v0.4.9 · 2026-10-11

Background removal.

- Remove Background (Images menu and inspector) makes a plain background transparent: anything touching the image edges in the background colour, with soft edges and a Tolerance slider. The original is kept; Restore Background brings it back, and both are one undo step.
- Works on product shots, scans, logos, sketches and studio photos. Photos whose subject blends into its surroundings, or busy backgrounds, are refused with a reason rather than cut badly; they need a segmentation model.
- A cut-out image sits on the canvas without its card.
- MCP: `remove_background`; 33 tools.
- Fixed: the toast slid sideways when its message changed.

## v0.4.8 · 2026-10-11

Desktop window modes.

- In the desktop shell, Preferences adds Window opacity (see other apps through the board) and Click-through (clicks pass to the app underneath); Ctrl+Alt+K, or Cmd+Alt+K on macOS, toggles click-through from anywhere. Always on top, fullscreen and frameless were already there.
- The desktop shell has now been built and run on Linux.
- Fixed: some icons drew far too large in Safari and the desktop shell.

## v0.4.7 · 2026-10-11

Synced notes and map cards.

- Synced Copy makes a linked copy of a note or document: edit any copy and the others follow, in one undo step. Stop Syncing unlinks one.
- Google Maps and OpenStreetMap links become map cards.
- Fixed: text typed into a note on the board was lost if you then clicked empty canvas; it now saves.

## v0.4.6 · 2026-10-11

GIF frames and document export.

- GIFs in the reference view get frame controls: pause and play (K), step (comma, full stop), a frame slider, speed and Keep frame, which adds the frame to the board.
- Export any note or document on its own as PDF, Word, Markdown or plain text from its editor.

## v0.4.5 · 2026-10-11

Video, audio and table cards.

- Video and audio files play on the board, with Play automatically (muted) and Loop in the inspector. YouTube, Vimeo, Spotify and SoundCloud links become players.
- Table cards: typed columns (text, number, currency, percent, date, checkbox), double-click to edit cells, and formulas such as =SUM(B1:B3) or =B2*1.2.
- MCP: `create_table`; 32 tools.
- The Inspector tab no longer shifts when the selection count appears.

## v0.4.4 · 2026-10-11

Present a board.

- Present (P): the board full screen with every panel hidden and nothing editable. Click a card to enlarge it, use the arrow keys to step through, Escape to close and Escape again to leave. Presenting never changes the saved board.
- Web capture now connects only to the address it checked, so a site cannot swap in a local address between the check and the download.

## v0.4.3 · 2026-10-11

Coloured labels and images from the web.

- Labels: each board has its own coloured labels. Put them on items from the inspector; rename or recolour one and every item follows; delete it and it comes off every item. Labels show along the bottom of each item and Find searches them.
- Web images: drag an image from a browser, paste an address, or use Add Images from the Web. An image is downloaded and placed; a page shows its images so you can pick. Only public addresses are fetched.
- MCP: `capture_from_web`, `define_labels`, `label_items`; 31 tools.

## v0.4.2 · 2026-10-11

Comments and templates.

- Comments: select an item to see its thread in the inspector, add a comment, resolve or reopen it, or delete it; each is one undo step. Items with open comments show a count. Agents can comment too, signed Agent.
- Templates: New from template starts a board from a moodboard, character sheet, storyboard or project plan, or from your own; Save as Template keeps any board for reuse.
- MCP: `add_comment`, `resolve_comment`, `list_templates`, `create_board_from_template`; 28 tools.

## v0.4.1 · 2026-10-11

Trash and your own shortcuts.

- Trash: deleting a board moves it to the Trash, and anything removed from a board (by you, an outside agent or the Agent panel) waits there too. Restore puts items back where they were as one undoable step or brings a board back to the list. Open it from the left panel or the palette.
- Shortcuts: click any key in the shortcut sheet (?) and press new keys. Keys the browser keeps are refused, keys already in use move over with a note, and Reset All restores the defaults. Your keys are saved and come back on the next launch.
- MCP: `list_trash` and `restore_from_trash`; 24 tools.
- The agent's Confirm card now uses the right accent colour.

## v0.4.0 · 2026-10-11

The recovery build: iStack's behaviour and menu in the Form family shell, with an embedded agent that asks before big changes.

- The agent asks first: when it wants to remove items, delete the board, or move, pack, sort, align, distribute, snap or resize 10 or more items at once, a Confirm card in the Agent panel offers Allow, Allow all (for the rest of the turn) or Decline. No answer in five minutes counts as Decline. You can turn this off under the panel.
- Agents that read images can see the whole board as a picture (`get_board_image`, 22 MCP tools).
- Notes on dark paper, such as notes an agent adds without a colour, now use light text.
- The item count beside each board in the left panel stays current.

Since v0.3.0 this release has also brought: planning documents out of the repository history, engine commands for iStack's Images and Organize menus, the rebuilt shell with collapsible panels and iStack's right-click menu, board tabs, the eraser, note fonts, slideshow speed and fade, the Agent panel on Claude Code, Codex, Cursor or Ollama, and a FormRef tab in the FormAI parity matrix.

## v0.3.4 · 2026-10-11

Board tabs, iStack's drawing and slideshow controls, and the outside-agent prompt.

- Boards open as tabs: Ctrl+N for a new tab, Alt+W to close, click to switch. The open tabs come back when FormRef starts.
- Eraser (E) removes whole strokes it passes over, as one undo step.
- Notes can use any of the bundled fonts.
- Slideshow has a seconds-per-image setting and a fade or no transition.
- The first time an outside agent is refused, FormRef asks whether to allow outside agents.
- Project harness rebuilt with eight specialists and mirrored for Codex and Cursor; new wiki pages for the engine contract, the shell and the agent.

## v0.3.3 · 2026-10-11

The interface rebuilt in the Form family layout.

- Right-click anywhere on the board for iStack's menu: File, Edit, Canvas (grid, snap grid scales, grayscale canvas, background colour, fit, reset zoom), Organize (pack, sort by aspect, filename or similarity, group), Images (flip, grayscale, pixel art, opacity, crop, rotate 90, save image as), Layer, Lock, Add Note, Draw Mode, Slideshow, Delete, plus Insert and Ask Agent.
- Shortcuts follow iStack: D draw, L lock, C crop, R rotate 90, Ctrl+P pack, Ctrl+G and Ctrl+Shift+G group and ungroup, Shift+S slideshow. Duplicate moved to Ctrl+D, link to Shift+L, connect to Shift+C, rectangle to Shift+R.
- Both side panels collapse to rails and stay collapsed after a reload.
- Every icon has one meaning; new rectangle, circle and line tools.
- Press ? for a shortcut sheet generated from the same command table as the menu.
- Agent panel (Ctrl+J): pick Claude Code, Codex, Cursor or Ollama, watch each tool call, Stop, Undo This Turn, and allow or refuse outside agents.

## v0.3.2 · 2026-10-11

Engine commands for iStack's menus and the embedded agent service.

- Engine: rotate (90 degrees about each item's centre), opacity, image flags (flip, grayscale, smooth or nearest sampling), crop and reset, and sort by filename, aspect ratio or similarity. Each is one undoable step.
- Similarity sort uses colour and layout vectors computed once from the original pixels.
- MCP: `adjust_items` for the new image commands, `sort` in `arrange_items`; 21 tools.
- Agent service: turns on Claude Code, Codex or Cursor with FormRef's MCP attached, or on Ollama, with Stop and Undo This Turn. The panel arrives with the new interface.
- Outside agents are refused until allowed, as in FormVis.
- Session route stores open board tabs for restore.

## v0.3.1 · 2026-10-11

Repository hygiene before the v0.4.0 recovery build.

- Planning, research and verification documents removed from every commit; they live only in the planning sidecar now.
- Licence notices follow the Form family layout: `NOTICE.md` at the root and licence texts under `licenses/`.
- No application behaviour changed.

## v0.1.0 · 2026-10-10

First local Form family reference workspace.

- Added a headless Rust document engine with atomic commands, hierarchical transforms, locking, layout and undo/redo.
- Added a vanilla TypeScript/Vite canvas with stable keyed views, media controls, drawing, notes, tasks, links, columns, nested boards, connectors and project management.
- Added FastAPI asset storage, atomic persistence, iStack migration, relinking and five export formats.
- Added the official SDK MCP stdio service with 14 tools, board resources and an organization prompt.
- Added repo-local formref-harness specialists, startup scripts, source-only Tauri development shell and dependency notices.
- Researched PureRef, BeeRef and Milanote using official documentation; recorded row-level implementation scope and gaps.

Rust, frontend, live HTTP, restart persistence, actual MCP and throttled browser checks passed. Native desktop compilation and Windows execution remain unverified. The verification records of that release now live in the planning sidecar; see `docs/VERIFICATION.md` and `docs/PARITY.md`.
