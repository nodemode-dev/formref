---
name: formref-harness
description: Builds, repairs and operates FormRef, the Form family reference board (PureRef plus Milanote) with a Rust engine, FastAPI service and TypeScript canvas. Use when asked to continue the FormRef build, add or fix a board command, change the right-click menu, docks, tabs, icons or shortcuts, work on the embedded agent panel or its Claude Code, Codex, Cursor or Ollama runners, debug the MCP server or outside-agent consent, import an iStack board, export or persist boards, re-render the FormRef parity tab in the FormAI matrix, or cut a FormRef release. Also use to arrange a live board through the formref MCP tools. Not for other Form apps, generic moodboard advice, or PureRef and Milanote support questions.
---

# FormRef harness

Route every FormRef task through this file first. It maps the subsystems, states the rules that hold everywhere, and names the specialist to load. Paths to source are relative to the repository root (the folder holding the `formref` launcher); skill paths are relative to this folder.

## Subsystem map

| Subsystem | Root | Specialist |
| --- | --- | --- |
| Board model, commands, history | `native/formref-core/src/` | `sub-skills/engine/SUB-SKILL.md` |
| Shell, context menu, command table, docks, tabs, icons | `frontend/src/app/`, `frontend/src/ui/`, `frontend/index.html`, `frontend/src/styles/` | `sub-skills/ui-shell/SUB-SKILL.md` |
| Agent panel, runners, Undo This Turn, consent | `frontend/src/ui/panels/agent.ts`, `backend/app/agent/`, `backend/app/routers/agent.py` | `sub-skills/agent/SUB-SKILL.md` |
| MCP server and live board operation | `backend/app/mcp_server.py`, `.mcp.json`, `.cursor/mcp.json`, `.codex/config.toml` | `sub-skills/mcp/SUB-SKILL.md` |
| Store, assets, iStack import, exports, session | `backend/app/core/`, `backend/app/routers/boards.py` | `sub-skills/persistence/SUB-SKILL.md` |
| Browser clipper extension and its pairing | `clipper/`, `backend/app/core/clipper.py`, `backend/app/routers/clip.py` | `sub-skills/persistence/SUB-SKILL.md` |
| FormRef tab in the FormAI parity matrix | planning sidecar `parity_render.py`, `parity_rows.json` | `sub-skills/parity/SUB-SKILL.md` |
| Version, commits, the two zips | version sites listed in the release specialist | `sub-skills/release/SUB-SKILL.md` |
| Throttled browser and live service checks | a procedure, no repo code | `sub-skills/verification/SUB-SKILL.md` |

## Dependency graph

```text
canvas (frontend)  -> REST /api -> FastAPI service -> Rust engine (JSON lines)
MCP server (stdio) -> REST /api -> same service    -> same engine
agent panel        -> /api/agent -> runners -> MCP server (CLI runners) or FastMCP in-process (Ollama)
```

One engine owns every mutation, so the canvas, REST, MCP and the agent share one undo history. Never add a second path that edits a board file directly.

## Rules that hold everywhere

- **Engine first.** A new board behaviour is an engine command (`native/formref-core/src/commands/`), then a REST or MCP surface, then a command-table entry. The canvas previews gestures but commits through the engine.
- **One command registry.** Menu, palette, keyboard, shortcut sheet and the agent catalogue read `frontend/src/app/registry.ts`. Add a command once, in `commands.ts` or by `registry.add` in a feature module, with a `description` (the original table's words are in `command-meta.ts`); shortcuts live in `keys.ts`. Never hand-build a menu item or a key handler beside it. After adding or changing commands, open the app once and run `./formref agents sync` so `references/commands.md` (every command, its default keys and what it does) stays current; `--check` fails when it is stale. An `enabled` check must never throw (use `selected()`, not `selectedImages()`); `isEnabled` treats a throwing check as disabled, but it is a safety net, not a licence.
- **iStack wins key collisions.** The right-click menu keeps iStack's order, labels and shortcuts; FormRef-only actions go in Insert or at the end of a submenu.
- **Zero DOM flash.** Patch the changed node, reserve space before async content, theme and docks are set before first paint, the shell reveals only once parsed. Verify under throttling, not by eye.
- **One stacking scale.** Every `z-index` is a token from `frontend/src/styles/tokens.css`; overlays render into `#overlay-root`.
- **Icons mean one thing.** Add a glyph to `frontend/src/ui/icons.ts` named after its action; `icon()` throws on unknown names.
- **Surgical edits.** Edit existing files region by region; no codemods, patch files or bulk replacements. New modules are fine.
- **Tests only as the family plan names them.** `backend/tests` and `native/formref-core/tests` hold the suite FAMILY_TEST_PLAN names and CI runs it; add no other test code. Other testing pressure goes to the planning sidecar's `TEST_PLAN.md`.
- **References stay references.** BeeRef is GPL: read its docs, never its code. iStack is the owner's; its compiled bundle guides behaviour and format only.
- **Planning docs live in the sidecar.** `DEV_PLAN.md`, `BUILD_NOTES.md`, the root `HASHOUT_LOG.md`, `PARITY.md` and the parity data never enter the repository.

`agents/openai.yaml` holds the display name and default prompt Codex shows for this skill; keep it in step with the description when the scope changes.

## Starting a task

Read the sidecar's `DEV_PLAN.md` and `BUILD_NOTES.md`, then the `HASHOUT_LOG.md` beside the code you will touch, then the code. For broad build work, split the outcome by subsystem and load one specialist per part. For operating a live board, start with the MCP specialist and use the connected server.

## Completion gate

A task is done when the behaviour was observed, not inferred: an engine response, a REST or MCP readback, or a throttled browser run, each stated in the commit body. UI work states the throttled result. Every turn that changes FormRef also re-renders the parity tab (parity specialist) and ships through the release specialist.
