# FormRef changelog

## v0.6.6 · 2026-10-16

More shape tools, blending modes and duplicate detection.

- Add Arc, Add Spiral, Add Rectangular Grid and Add Polar Grid, with Illustrator's options for agents (slope, decay, segments, dividers and more).
- Blending mode for every item (Multiply, Screen, Overlay, Difference and the rest of Illustrator's sixteen), under Opacity in the inspector.
- Select Duplicate Images selects the extra copies of pictures that appear more than once, the same file or a near-identical copy, leaving one of each.

## v0.6.5 · 2026-10-16

Several anchors at once, Outline Stroke, the Pencil and multi-stop gradients.

- Direct Selection: drag a box on empty canvas to select the anchors inside it, or Shift-click anchors; dragging, Delete and the arrow keys act on all of them.
- Average (both, horizontal or vertical) and Delete Segment between two selected neighbouring anchors.
- Outline Stroke turns a stroke into a filled shape with its caps, joins and miter limit.
- Pencil (Shift+N): freehand that becomes a smooth editable path, with Pencil Fidelity from 1 (accurate) to 5 (smooth); end near the start to close it.
- Gradients take up to 16 stops, each with its own opacity (Gradient stops field in the inspector).
- Fix: the inspector showed Round caps and corners for paths that were drawn with butt caps and miter corners; it now shows what is drawn, and the miter limit draws at 10 as shown.

## v0.6.4 · 2026-10-16

Smart Guides, the Curvature tool, deeper search and hiding.

- Smart Guides (Ctrl/Cmd+U): moved items snap to the edges and centres of other items, with guide lines.
- Curvature tool (Shift+~): click points and the curve bends through them; click a placed point again to make it a corner.
- Search also finds words in comments and table cells, ignoring case and accents.
- Hide Selected (Ctrl/Cmd+3), Show All (Ctrl/Cmd+Alt+3), Isolate Selected and Unlock All (Ctrl/Cmd+Alt+2).

## v0.6.3 · 2026-10-16

More Pathfinder, Offset Path and continuing paths.

- Pathfinder: Divide, Trim, Merge and Crop, which keep several pieces.
- Offset Path: a new path a set distance outside (or inside, with a negative value) the selected shapes, with round joins; the originals stay.
- The Pen continues an open path: select it, press Shift+P and click one of its ends.
- German: the save status and the colour-capture buttons no longer spill out of their space.

## v0.6.2 · 2026-10-16

Chat in the dock, 26 languages, Pathfinder, arrowheads and gradients.

- Chat (Ctrl/Cmd+Alt+J): a Chat tab in the terminal dock, as in formlit. Claude answers in formatted text through FormRef's tools, with each tool call shown, a memory and cost meter, Stop, New Chat, Open in Claude Code and From Claude Code. The Agent panel keeps its title-bar button.
- MCP over HTTP at http://127.0.0.1:8196/mcp. The dock's Claude Code and Chat use it, and other MCP clients on this computer can too (outside-agent consent still applies). New `run_commands` runs several window commands in order.
- Languages: the whole window in 26 languages, English by default (Preferences, Language): Spanish, Mexican Spanish, Brazilian Portuguese, French, Canadian French, German, Italian, Dutch, Danish, Finnish, Norwegian Bokmål, Swedish, Russian, Polish, Czech, Hungarian, Ukrainian, Turkish, Simplified and Traditional Chinese, Japanese, Korean, Indonesian, Thai and Vietnamese. It switches in place, your own board text is never translated, and a saved language shows from the first frame.
- Pathfinder: Unite, Minus Front, Intersect, Exclude, Minus Back.
- Direct Selection: click an anchor to select it, then Delete removes it and the arrow keys nudge it (Shift for 10 px); double-click a segment to add an anchor; Cut Path at Selected Anchor (Ctrl/Cmd+Shift+X).
- Arrowheads (Arrow, Open arrow, Circle, Square, Bar) with a scale, and linear and radial gradient fills.

## v0.6.1 · 2026-10-16

Vector paths with Illustrator's Live Corners, and one command registry agents can use.

- Round corner points: Round Corners rounds every corner of a shape or path (Round, Inverted round or Chamfer), and the inspector shows the largest radius that fits. Rectangles, ellipses, lines and freehand strokes become editable paths the first time.
- Direct Selection tool (A): anchors, handles and a corner widget on every corner. Drag a widget to round all corners (Shift for one), Alt-click it to change the style, drag anchors and handles, Alt-click an anchor to switch corner and smooth.
- Pen tool (Shift+P): click for corners, drag for curves, click the first point to close, Enter to finish.
- Stroke options: caps, corners, miter limit, dashes. Add Polygon and Add Star (3 to 1000). Path commands: Convert to Path, Add Anchor Points, Simplify, Smooth, Reverse Path Direction, Join (Ctrl/Cmd+Shift+E).
- Every menu, palette and shortcut command lives in one registry, as in formvis and formlit; agents can list, describe and run them (`list_commands`, `describe_command`, `run_command`), except window-only commands, and risky ones need your yes.

## v0.6.0 · 2026-10-16

A terminal and Claude Code inside FormRef, and one build script.

- Terminal dock (Ctrl/Cmd+J): real login shells in tabs under the canvas, resizable, kept running while hidden.
- Claude Code (Ctrl/Cmd+Shift+J): your own Claude Code sign-in in a dock tab, already connected to FormRef's tools, so it can arrange, add and edit on the open board while you watch. The Ask line sends a request with the board and the selected items. Set its start folder, program and first message in the Agent panel.
- The Agent panel moves to Ctrl/Cmd+Alt+J. Alt shortcuts now work on macOS.
- `./build_app` (or `build_app.bat`) builds everything from the repo root: tools check, install, Rust core, window and desktop packages. `--web` stops after the web build.
- `./formref claude` starts Claude Code in your own terminal with FormRef's tools.

## v0.5.4 · 2026-10-13

`./formref desktop build` builds the desktop app from the repo root: the Rust core, then the Tauri build. The app still loads its window from the FormRef backend on 127.0.0.1:8196, so the backend has to be running.

## v0.5.3 · 2026-10-11

Background models and cloud storage, from FormCut.

- Remove Background has a Method: FormCut's models alongside the model-free plain-background cut. Object (U2Net small) is built in and works offline; Person (U2Net), Sharp edges (IS-Net), Subject (Auto) and Click to select (SAM 2.1) download from the inspector, each checked against its published checksum. Click to select: pick points on the image, Alt-click to leave something out.
- Import file adds a model you already have, for machines that cannot reach the download hosts.
- Cloud storage, opt-in: connect Google Drive or Dropbox in Preferences with your own app credentials, then Save Board to Cloud (FormRef board, picture or Markdown) and Open from Cloud (a board opens; an image goes onto the board). Agents cannot use it.
- The command palette runs the first match on Enter, and the arrow keys move through it.
- MCP: `list_background_models`, `download_background_model`, and `remove_background` takes a method and points; 35 tools.

## v0.5.2 · 2026-10-11

Regression fixes.

- Fixed: since v0.4.9 the right-click menu did not open unless an image was selected (right-clicking empty canvas or a note did nothing). Menus, the palette and shortcuts now treat a failing check as a disabled command instead of stopping.
- The clipper passes Mozilla's add-on linter with no errors; it now needs Firefox 128 or later and declares that it collects no data.

## v0.5.1 · 2026-10-11

Editing while presenting, always on bottom, clipper command. Versions now follow `v*.**.*`, so this release follows v0.4.10.

- Presenting has an Edit button: turn it on to move, resize and edit cards in front of an audience, with the panels still hidden. Turn it off to lock the board again.
- Presenting never saves the audience's zoom as the board's view; zooming while presenting used to.
- Desktop shell: Always on bottom keeps the board behind other windows. It and Always on top switch each other off.
- `./formref clipper` prints the clipper folder and pairing token; `./formref clipper --new` makes a new token.

## v0.4.10 · 2026-10-11

Browser clipper.

- FormRef Clipper, a Chrome and Firefox extension in `clipper/`: right-click an image, selected text, a link or the page and choose Save to FormRef. The toolbar button saves the page. Clips land on the board open in FormRef (or one you choose) in a free spot, keeping the page they came from.
- Pair it once: Preferences, Browser clipper, Copy, then paste into the clipper options. New token unpairs it. Web pages cannot save to FormRef.
- Images FormRef cannot fetch itself are downloaded by the browser instead.
- Fixed: link, board, file and document cards drew a huge clipped arrow that hid the address and the Double-click hint.

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
