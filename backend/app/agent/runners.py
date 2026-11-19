import glob
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

from ..core.config import ROOT

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


SHELL_LOOKUP_SECONDS = 60
_shell_found: dict[str, tuple[float, str | None]] = {}


def places(runner: str, platform: str = "") -> list[Path]:
    """Where the Codex and Cursor command line programs usually live when the program that started FormRef (a desktop shortcut,
    the dock, the Start menu) has a shorter PATH than a terminal: npm's global folder, user-local bin folders, Homebrew,
    the installers' own folders and application bundles."""
    platform = platform or sys.platform
    home, env = Path.home(), os.environ
    names = CLI[runner]["binaries"]
    windows = platform.startswith("win")
    folders: list[Path] = []
    for key in ("NPM_CONFIG_PREFIX", "npm_config_prefix"):
        if env.get(key):
            folders.append(Path(env[key]) if windows else Path(env[key]) / "bin")
    if env.get("PNPM_HOME"):
        folders.append(Path(env["PNPM_HOME"]))
    if env.get("VOLTA_HOME"):
        folders.append(Path(env["VOLTA_HOME"]) / "bin")
    if env.get("BUN_INSTALL"):
        folders.append(Path(env["BUN_INSTALL"]) / "bin")
    exact: list[Path] = []
    if windows:
        roaming = Path(env.get("APPDATA") or home / "AppData" / "Roaming")
        local = Path(env.get("LOCALAPPDATA") or home / "AppData" / "Local")
        folders += [roaming / "npm", local / "pnpm", local / "Volta" / "bin", home / ".bun" / "bin", home / ".local" / "bin"]
        folders += [local / "Programs" / "OpenAI" / "Codex" / "bin", local / "cursor-agent"]
    else:
        folders += [home / ".local" / "bin", home / ".npm-global" / "bin", home / ".bun" / "bin", home / ".volta" / "bin", home / ".local" / "share" / "pnpm"]
        folders += [Path(p) for p in sorted(glob.glob(str(home / ".nvm" / "versions" / "node" / "*" / "bin")), reverse=True)]
        folders += [Path(p) for p in sorted(glob.glob(str(home / ".local" / "share" / "cursor-agent" / "versions" / "*")), reverse=True)]
        if platform == "darwin":
            folders += [Path("/opt/homebrew/bin"), Path("/usr/local/bin")]
            for apps in (Path("/Applications"), home / "Applications"):
                exact += [apps / "Codex.app" / "Contents" / "Resources" / "codex", apps / "Codex.app" / "Contents" / "Resources" / "bin" / "codex"]
        else:
            folders += [Path("/usr/local/bin"), Path("/usr/bin"), Path("/snap/bin"), Path("/home/linuxbrew/.linuxbrew/bin")]
    endings = (".exe", ".cmd", ".bat") if windows else ("",)
    out = [folder / (name + ending) for folder in folders for name in names for ending in endings]
    if runner == "codex":
        out += exact
    return list(dict.fromkeys(out))


def _usable(path: Path) -> bool:
    return path.is_file() and os.access(path, os.X_OK)


def _login_shell_lookup(runner: str) -> str | None:
    if os.name == "nt":
        return None
    cached = _shell_found.get(runner)
    if cached and time.time() - cached[0] < SHELL_LOOKUP_SECONDS:
        return cached[1]
    found = None
    try:
        from . import terminal

        script = " || ".join(f"command -v {name}" for name in CLI[runner]["binaries"])
        out = subprocess.run(terminal.login_shell() + ["-c", script], capture_output=True, text=True, timeout=10, env=dict(os.environ))
        lines = out.stdout.strip().splitlines()[-1:] if out.returncode == 0 else []
        found = lines[0] if lines and os.path.isabs(lines[0]) and _usable(Path(lines[0])) else None
    except (OSError, subprocess.SubprocessError):
        found = None
    _shell_found[runner] = (time.time(), found)
    return found


def find(runner: str):
    for name in CLI[runner]["binaries"]:
        path = shutil.which(name)
        if path:
            return path
    if runner == "claude":
        from . import claude_code
        return claude_code.info().get("path")
    for candidate in places(runner):
        if _usable(candidate):
            return str(candidate)
    return _login_shell_lookup(runner)


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
