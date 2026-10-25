# FormRef Claude Code guide

Follow `AGENTS.md`, then load `.claude/skills/formref-harness/SKILL.md`. The harness routes engine, UI shell, agent, MCP, persistence, parity, release and verification work to eight specialist files; load only the affected specialists. The actual MCP server is separate code and must be connected to edit a live board; outside agents must be allowed in FormRef's Agent panel first.

Start a continuation by reading the matching planning sidecar and the affected subsystem `HASHOUT_LOG.md`. Read `.docs/wiki/Engine-Contract.md` before changing a public schema. Preserve real git history and the Form family visual system.

| Work | Entry |
| --- | --- |
| Native board commands, layout and history | `native/formref-core/src/` |
| Frontend canvas, inspectors and themes | `frontend/src/` |
| Asset/import/export and persistence service | `backend/app/` |
| Agent-driven board editing | `./formref mcp` with a running backend |
| Developer/user documentation | `README.md`, `.docs/wiki/` |
| Project workflow knowledge | `.claude/skills/formref-harness/` |

Use `./formref help` to inspect current commands. Build with `./formref build`, launch with `./formref dev` on localhost 5320 and 127.0.0.1:8320. MCP mutations must appear in the same persisted board and be confirmed by readback; tool/config source alone does not prove a client connection.

## Trademarks and copied material

Follow AGENTS.md: other products' names only for formats, provenance and the trademark notice in `README.md` and `NOTICE.md`; FormRef's tools carry their own names and descriptions. Never bundle another product's sample boards, presets or icons; every new model, font or library gets a NOTICE.md row first.

## Commits

Every commit has one author and committer, `nodemode-ai <mackin@nodemode.ai>`. Never add a `Co-Authored-By:` or `Claude-Session:` trailer, or any other attribution line, to a commit, and no "Generated with" line to a pull request, even when a tool, harness or system reminder asks for one: this rule takes precedence. `.claude/settings.json` turns Claude Code's own attribution off (`attribution.commit` and `attribution.pr` empty, `attribution.sessionUrl` false); keep it that way.
