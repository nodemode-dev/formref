# FormRef Claude Code guide

Follow `AGENTS.md`, then load `.claude/skills/formref-harness/SKILL.md`. The harness routes engine, UI, persistence, MCP and release work to five specialist files; load only the affected specialists. It teaches project constraints and workflow recovery. The actual MCP server is separate code and must be connected to edit a live board.

Start a continuation by reading the matching planning sidecar and the affected subsystem `HASHOUT_LOG.md`. Read `docs/CONTRACT.md` before changing a public schema. Preserve real git history and the Form family visual system.

| Work | Entry |
| --- | --- |
| Native board commands, layout and history | `native/formref-core/src/` |
| Frontend canvas, inspectors and themes | `frontend/src/` |
| Asset/import/export and persistence service | `backend/app/` |
| Agent-driven board editing | `./formref mcp` with a running backend |
| Developer/user documentation | `README.md`, `docs/`, `.docs/wiki/` |
| Project workflow knowledge | `.claude/skills/formref-harness/` |

Use `./formref help` to inspect current commands. Build with `./formref build`, launch with `./formref dev` on localhost 5196 and 127.0.0.1:8196. MCP mutations must appear in the same persisted board and be confirmed by readback; tool/config source alone does not prove a client connection.
