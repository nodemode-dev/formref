---
name: formref-harness
description: "Builds, repairs and operates FormRef reference boards. Use when asked to continue the FormRef build, fix its Rust engine or TypeScript canvas, migrate an iStack board, arrange images and notes, debug its FastAPI persistence or MCP tools, or ship a FormRef release. Routes through engine, UI, persistence, MCP and release specialists while keeping the Form family appearance and shared command semantics. Applies to this FormRef repository and its local MCP server; excludes generic moodboard advice and other Form apps."
---

# FormRef Harness

Develop and operate the local FormRef reference-board app through its shared Rust command engine, FastAPI service and TypeScript canvas. Keep the app's Form family appearance, portable files and real MCP state consistent.

## Start and route

Locate the FormRef repository from its `formref` dispatcher and `docs/CONTRACT.md`. Paths to source below are relative to that repository; skill paths are relative to this folder. Read root `AGENTS.md`, `CLAUDE.md`, the planning sidecar's `DEV_PLAN.md` and `BUILD_NOTES.md`, then the subsystem's `HASHOUT_LOG.md` before changing code. Preserve existing git history.

For broad build work, identify the observable outcome and route each part to one specialist. For board operations, begin with the MCP specialist and use the connected server rather than changing project files behind the service.

| Request | Load | Hand-back |
| --- | --- | --- |
| Board model, geometry, undo, layout or command validation | [engine](sub-skills/engine/SUB-SKILL.md) | Engine command and state evidence |
| Canvas gestures, controls, inspector, themes or rendering stability | [ui](sub-skills/ui/SUB-SKILL.md) | Browser-visible behavior and stability evidence |
| Save/open, iStack migration, missing assets or exports | [persistence](sub-skills/persistence/SUB-SKILL.md) | Round trip and asset evidence |
| Arrange a board through agents, connect tools or recover failed calls | [mcp](sub-skills/mcp/SUB-SKILL.md) | Verified board changes and recovery state |
| Install, build, document, version or package a release | [release](sub-skills/release/SUB-SKILL.md) | Checked release and declared limits |

## Shared rules

- Keep Rust authoritative for board mutations. UI previews are transient; UI, REST and MCP commit through the same commands so undo and persisted revision agree.
- Read the live schema in `docs/CONTRACT.md` and exact tool schemas from MCP discovery. Do not invent commands, parameters or success results.
- Keep edits handmade and confined to one region read this turn. Do not use patch files, bulk replacements or codemods. New modules are permitted; read-only reference projects stay untouched.
- Preserve mounted keyed DOM nodes, focus, selection and reserved panel geometry. Decode replacement media before swapping it. Font/theme boot must precede reveal.
- Use the shared CSS token and stacking scales, dark default and inline currentColor SVG icons. Keep Vite `server.host: false` with explicit ports.
- Read PureRef, BeeRef and Milanote only as feature references. Never copy BeeRef source. Owned iStack may guide migration; missing source files stay visible and recoverable.
- Run applicable builds and observable runtime checks. Do not write development tests unless the user explicitly asks; record behavior and edge cases in the sidecar `TEST_PLAN.md`.
- Keep unsupported cloud collaboration, native OS window modes and foreign proprietary project formats labeled as gaps until implemented and verified.

## Completion gate

Confirm the requested behavior from a real engine, service or browser result. Record the precise input, output and meaningful limits, update subsystem logs and user documentation, then use the release specialist for delivery. A tool returning success is insufficient when its result cannot be read back from the same board.

For DOM work, report the cold-load CPU/network-throttled check or explicitly state that it was not performed. For import/export, report asset counts and visible missing-source handling. For MCP, report the actual connected tool call and subsequent board revision.

## Integration metadata

`agents/openai.yaml` supplies optional Codex UI metadata; consult it only when exposing this same repository-local skill in another supported client. It does not install or connect an MCP server. Claude Code loads this master from `.claude/skills/formref-harness/SKILL.md`; Codex follows repository `AGENTS.md` to the same files.
