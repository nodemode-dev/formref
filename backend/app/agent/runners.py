import json
import sys
from pathlib import Path

from ..core.config import ROOT
from . import agent_lookup

SYSTEM = ("You are the agent inside FormRef, a reference board for images, notes and cards. Act on the open board only through the "
          "formref MCP tools: call get_board first to learn item ids, then make each change with one tool call so it is one undoable "
          "step. Respect locked items. If you can read images, get_board_image shows the board as a picture for judging layout. "
          "Removing items or moving many at once waits for the person to confirm; if they decline, do not retry it. "
          "Keep replies short and say what you changed.")

CLI = {
    "claude": {"label": "Claude Code", "binaries": ["claude"], "install": "Install Claude Code and sign in with `claude`, then reopen FormRef."},
    "codex": {"label": "Codex", "binaries": ["codex"], "install": "Install the Codex CLI and sign in; trust this folder in Codex so it reads .codex/config.toml."},
    "cursor": {"label": "Cursor", "binaries": ["agent", "cursor-agent"], "install": "Install the Cursor CLI (agent) and sign in; it reads .cursor/mcp.json in this folder."},
}


def places(runner: str, platform: str = "") -> list[Path]:
    return agent_lookup.candidates(runner, platform=platform or None)


def located(runner: str, fresh: bool = False) -> agent_lookup.Found:
    from . import claude_code

    return claude_code.located(runner, fresh)


def said(found: agent_lookup.Found) -> str:
    from . import claude_code

    return claude_code.said(found)


def find(runner: str):
    return located(runner).path


def mcp_server(token: str, api_url: str) -> dict:
    return {"command": sys.executable, "args": ["-m", "app.mcp_server"],
            "env": {"FORMREF_API_URL": api_url, "FORMREF_AGENT_TOKEN": token, "PYTHONPATH": str(ROOT / "backend")}}


def argv(runner: str, binary: str, prompt: str, token: str, api_url: str, model: str = "", mcp_file: str = "") -> list[str]:
    if runner == "claude":
        config = mcp_file or json.dumps({"mcpServers": {"formref": mcp_server(token, api_url)}})
        args = [binary, "-p", prompt, "--output-format", "stream-json", "--verbose", "--mcp-config", config,
                "--strict-mcp-config", "--tools", "", "--allowedTools", "mcp__formref", "--append-system-prompt", SYSTEM]
        return args + (["--model", model] if model else [])
    if runner == "codex":
        return [binary, "exec", "--json", SYSTEM + "\n\n" + prompt]
    if runner == "cursor":
        return [binary, "-p", SYSTEM + "\n\n" + prompt, "--output-format", "stream-json", "--approve-mcps"]
    raise ValueError("Unknown runner.")


def _short(value, limit=600) -> str:
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    return text if len(text) <= limit else text[:limit] + " ..."


def parse(runner: str, line: str) -> list[dict]:
    try:
        event = json.loads(line)
    except ValueError:
        return [{"type": "text", "text": line}] if line.strip() else []
    if not isinstance(event, dict):
        return []
    kind = event.get("type", "")
    out = []
    if runner in ("claude", "cursor") and kind in ("assistant", "user"):
        for block in (event.get("message") or {}).get("content") or []:
            if not isinstance(block, dict):
                continue
            if block.get("type") == "text" and block.get("text"):
                out.append({"type": "text", "text": block["text"]})
            elif block.get("type") == "tool_use":
                out.append({"type": "tool", "name": block.get("name", ""), "args": block.get("input", {}), "id": block.get("id", "")})
            elif block.get("type") == "tool_result":
                out.append({"type": "tool_result", "id": block.get("tool_use_id", ""), "ok": not block.get("is_error"), "summary": _short(block.get("content", ""))})
    elif runner == "cursor" and kind == "tool_call":
        out.append({"type": "tool", "name": _short(event.get("tool_call", event), 120), "args": {}, "id": event.get("call_id", "")})
    elif kind == "result":
        if event.get("is_error"):
            out.append({"type": "error", "message": _short(event.get("result", "The run failed."))})
    elif runner == "codex" and kind.startswith("item."):
        item = event.get("item") or {}
        itype = item.get("type", "")
        if kind == "item.completed" and itype == "agent_message":
            out.append({"type": "text", "text": item.get("text", "")})
        elif itype == "mcp_tool_call":
            out.append({"type": "tool", "name": item.get("tool", ""), "args": item.get("arguments", {}), "id": item.get("id", ""),
                        "ok": item.get("status") != "failed", "summary": _short(item.get("result") or item.get("error") or "")})
    elif kind in ("error", "turn.failed"):
        out.append({"type": "error", "message": _short(event.get("message") or event.get("error") or event)})
    return out
