# Agent

FormRef has an Agent panel in the right dock (Ctrl+J, or Ask Agent in the right-click menu). Type a request about the open board and an agent edits it through FormRef's own MCP tools while you watch.

## Runners

| Runner | Needs | How FormRef runs it |
| --- | --- | --- |
| Claude Code | `claude` on PATH, signed in | `claude -p` with stream-json output, FormRef's MCP server passed inline and every other tool turned off |
| Codex | `codex` on PATH, signed in, this folder trusted in Codex | `codex exec --json`, reading `.codex/config.toml` |
| Cursor | `agent` or `cursor-agent` on PATH, signed in | `agent -p` with stream-json output and MCP approval, reading `.cursor/mcp.json` |
| Ollama | `ollama serve` on a loopback address and a pulled model with tool support | In-process: FormRef lists its MCP tools, sends them to Ollama's OpenAI-compatible chat endpoint and calls the tools Ollama picks |

The runner list shows which are installed and why one is not. Settings (runner, model, Ollama address and model) are saved in the data folder. The Ollama address must be loopback.

## A turn

Each turn takes a snapshot of the board, streams text and every tool call with its result into the panel, and ends with a done or error line. Stop ends the turn and kills the runner. Undo This Turn restores the snapshot as one undoable step, so a later Ctrl+Z brings the agent's changes back.

## Outside agents

An MCP client started outside FormRef (for example Claude Code in a terminal using `.mcp.json`) is refused with 403 until you allow outside agents in the panel. The first refusal opens a prompt in FormRef asking whether to allow them. Turns started from the panel carry their own token and are always allowed.

## Source

`backend/app/agent/runners.py` builds each command line and parses its stream; `backend/app/agent/service.py` owns settings, turns, snapshots and the consent counter; `frontend/src/ui/panels/agent.ts` is the panel.
