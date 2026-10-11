# FormRef changelog

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

Rust, frontend, live HTTP, restart persistence, actual MCP and throttled browser checks passed. Native desktop compilation and Windows execution remain unverified. See `docs/VERIFICATION.md` and `docs/PARITY.md`.
