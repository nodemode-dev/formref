---
name: mcp
description: FormRef's MCP server and operating a live board through it. Load to arrange, sort, adjust or edit a board with the formref tools, to add or change a tool, to connect Claude Code, Codex or Cursor, or to recover from a refused or failed tool call.
---

# MCP

`backend/app/mcp_server.py` is an official Python SDK (FastMCP) stdio server. It calls the loopback REST API and starts the service itself when nothing answers on `FORMREF_API_URL`. Every request carries `X-FormRef-Client` (a turn token from the agent service, or `outside`).

## Connecting

The repository ships `.mcp.json` (Claude Code), `.cursor/mcp.json` and `.codex/config.toml`, all launching `./formref mcp`, which uses `backend/venv`. Outside clients are refused (403 `outside_agents_off`) until the person allows outside agents in the Agent panel; the page then offers a prompt on the first refusal. Codex reads the project config only for a trusted folder.

## Tools

`list_boards`, `create_board`, `get_board`, `add_items`, `update_items`, `arrange_items` (align, distribute, pack, sort, normalize, order, group, ungroup, duplicate), `adjust_items` (rotate, opacity, image flags, crop), `configure_canvas`, `snap_items`, `transform_items`, `remove_items`, `connect_items`, `style_connections`, `undo`, `redo`, `import_asset`, `export_board`, `search_items`, `sample_image`, `create_swatch`, `create_document`, `set_formatted_text`, plus the `formref://boards` and `formref://board/[id]` resources and the `organize_references` prompt. Read the live list from discovery rather than this page when they differ.

## Operating a board

1. `get_board` first; use real item ids, never invented ones.
2. Make each change one call so it is one undo step; respect locked items (a locked item fails the whole call).
3. Read the board back after mutating and report the new revision and what moved.
4. On `outside_agents_off`, tell the person to allow outside agents in FormRef rather than retrying in a loop. On `revision_conflict`, re-read and retry once.

## Adding a tool

Add the engine command first (engine specialist), then a tool or an action in an existing tool, with annotations (`_read`, `_write`, `_remove`) and a docstring naming every option. Prove it with the SDK client (verification specialist). The in-app Ollama runner picks new tools up automatically because it reads this server's tool list. A tool that returns a picture returns FastMCP `Image` with no return annotation, so structured output does not try to serialize it; `get_board_image` is the pattern.
