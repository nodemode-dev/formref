# Agent

FormRef has an Agent panel in the right dock (Ctrl+J, or Ask Agent in the right-click menu). Type a request about the open board and an agent edits it through FormRef's own MCP tools while you watch.

## Runners

| Runner | Needs | How FormRef runs it |
| --- | --- | --- |
| Claude Code | `claude` on PATH, signed in | `claude -p` with stream-json output, FormRef's MCP server passed inline and every other tool turned off |
| Codex | `codex` on PATH or in its usual install places (npm's global folder, `~/.local/bin`, Homebrew, the app bundle on a Mac), signed in, this folder trusted in Codex | `codex exec --json`, reading `.codex/config.toml` |
| Cursor | `agent` or `cursor-agent` on PATH or in its usual install places, signed in | `agent -p` with stream-json output and MCP approval, reading `.cursor/mcp.json` |
| Ollama | `ollama serve` on a loopback address and a pulled model with tool support | In-process: FormRef lists its MCP tools, sends them to Ollama's OpenAI-compatible chat endpoint and calls the tools Ollama picks |

The runner list shows which are installed and why one is not. Settings (runner, model, Ollama address and model) are saved in the data folder. The Ollama address must be loopback.

## A turn

Each turn takes a snapshot of the board, streams text and every tool call with its result into the panel, and ends with a done or error line. Stop ends the turn and kills the runner. Undo This Turn restores the snapshot as one undoable step, so a later Ctrl+Z brings the agent's changes back.

## Asking before big changes

When an agent tries to remove items, delete the board, or move, pack, sort, align, distribute, snap or resize 10 or more items in one step, the change waits and a Confirm card appears in the panel saying exactly what it wants to do. Allow lets that one change through, Allow all lets this and any further big changes through until the turn ends, and Decline refuses it; the agent is told nothing changed and not to retry. With no answer in five minutes it is declined. Turn this off with "Ask me before an agent removes items or moves 10 or more at once" under the panel.

## Seeing the board

Models that read images can call `get_board_image` to see the whole board as a picture, with the world rectangle it covers so they can map what they see back to item positions.

## Outside agents

An MCP client started outside FormRef (for example Claude Code in a terminal using `.mcp.json`) is refused with 403 until you allow outside agents in the panel. The first refusal opens a prompt in FormRef asking whether to allow them. Turns started from the panel carry their own token and are always allowed.

## Source

`backend/app/agent/runners.py` builds each command line and parses its stream; `backend/app/agent/service.py` owns settings, turns, snapshots and the consent counter; `frontend/src/ui/panels/agent.ts` is the panel.
