# FormRef changelog

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
