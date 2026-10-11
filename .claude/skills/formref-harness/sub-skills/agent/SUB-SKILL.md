---
name: agent
description: FormRef's embedded agent. Load for the Agent panel, adding or fixing a runner (Claude Code, Codex, Cursor, Ollama), turn streaming, Stop, Undo This Turn, or the outside-agent consent switch and prompt.
---

# Agent

FormVis is the model. The panel runs a turn on a runner; runners act only through FormRef's MCP tools, so every change is an engine step.

## Map

| File | Owns |
| --- | --- |
| `backend/app/agent/runners.py` | CLI detection, command lines, system prompt, event parsing per runner |
| `backend/app/agent/service.py` | settings in `agent.json`, per-turn tokens, turn loop, Ollama loop over FastMCP, Stop, Undo This Turn by snapshot, refusal counter |
| `backend/app/routers/agent.py` | `/api/agent/runners`, `/settings`, `/turns` (SSE), `/turns/[id]/stop`, `/turns/[id]/undo`, `/confirm/[id]`, `/api/session` |
| `backend/app/main.py` | the consent gate on mutating requests that carry `X-FormRef-Client` |
| `frontend/src/ui/panels/agent.ts` | the panel; `frontend/src/main.ts` wires it and the consent dialog |

## Runner facts, checked against vendor docs on 2026-10-11

- Claude Code: `claude -p PROMPT --output-format stream-json --verbose --mcp-config JSON --strict-mcp-config --tools "" --allowedTools mcp__formref --append-system-prompt TEXT`. The MCP child runs with this backend's own interpreter, `-m app.mcp_server`, so it can never pick a different Python.
- Codex: `codex exec --json PROMPT`; it reads `.codex/config.toml` only after the folder is trusted in Codex.
- Cursor: `agent -p PROMPT --output-format stream-json --approve-mcps`; it reads the project `.cursor/mcp.json`.
- Ollama: OpenAI-compatible `/v1/chat/completions` with tools from the in-process FastMCP instance.

Re-check flags against the vendor pages before changing them; do not rely on memory. Codex and Cursor parsing is defensive because their event shapes are only partly documented.

## Consent

Mutations carrying `X-FormRef-Client` pass when the value is a live turn token, when a FormRef-started CLI turn is running, or when `outside_agents` is on. Otherwise they get 403 `outside_agents_off`, the refusal counter rises, the board event stream emits `consent`, and the page offers Allow or Not now. Default is off.

## Confirmation

`Agents.review` names a risky write (any `remove`, a board DELETE, or a move-type command over `BULK` ids); `Agents.confirm` holds that request in the middleware, puts a `confirm` event on the turn's queue and waits for `POST /api/agent/confirm/[id]`, five minutes at most. The turn stream is a queue fed by a pump task, so the middleware can add events while the runner streams. Declines return 403 `declined`, and the system prompt tells the agent not to retry. The MCP client's write timeout (330 s) must stay longer than the wait. `confirm_changes` in `agent.json` turns it off.

## Proving it

A real turn on an installed runner from the panel in a throttled browser: tool cards complete, the board changes, Undo This Turn restores it. State plainly which runners were not installed and therefore untested.
