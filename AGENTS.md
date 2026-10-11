# FormRef repository instructions

FormRef is a local reference-board editor. The Rust engine owns board state and commands; FastAPI owns assets, durable files, exports and the real MCP service; TypeScript/Vite renders engine state and previews interactions.

Read `.claude/skills/formref-harness/SKILL.md` and its relevant specialist before working here. Read the planning sidecar's `DEV_PLAN.md`, `BUILD_NOTES.md` and root `HASHOUT_LOG.md` first on a continuation, then the subsystem `HASHOUT_LOG.md` before changing source. `.docs/wiki/Engine-Contract.md` describes the shared model, commands and API; inspect actual source and MCP discovery before relying on a documented signature. The right-click menu, palette, keys and shortcut sheet all come from `frontend/src/app/commands.ts`; change commands there.

- Make handmade, single-region edits against files read this turn. Do not use patch files, scripted replacements, codemods or history rewrites. Read-only attached references stay unchanged.
- Keep Rust authoritative; UI/REST/MCP share commands, persisted revision and history. Validate a batch before replacing live state; failed commands preserve existing state.
- Keep keyed DOM, focused inputs and panel geometry mounted. Apply theme before reveal, await fonts and decode media before replacement. Verify touched paths under CPU and network throttling.
- Use Form family theme/spacing/stacking tokens and inline currentColor SVG icons. Vite must bind loopback with `server.host: false` and explicit frontend 5196/backend 8196 ports.
- Never copy BeeRef source. Use verified public documentation for product parity and owned iStack only as permitted input/reference; preserve missing media during migration.
- Do not add test code unless the user explicitly asks for tests. Run builds and manual runtime checks; record future behavioral checks in the planning sidecar's `TEST_PLAN.md`.
- Keep rationale in the nearest `HASHOUT_LOG.md`, and update the manual, wiki and parity evidence in the same change. Keep comments sparse.
- No emoji or em dash in Markdown. No secret values, dependency trees or runtime data in the release.
- Retain real commits with author and committer `nodemode-ai` and `mackin@nodemode.ai`. Releases use `v[major].[minor].[patch]`, repository ZIP including `.git`, and matching planning sidecar ZIP.

Use `./formref help` for the current commands. Typical sequence: `./formref install`, `./formref doctor`, `./formref dev`; `./formref build` builds the production frontend and native core, and `./formref mcp` launches the stdio MCP server. Verify command outputs and report actual platform limits.
