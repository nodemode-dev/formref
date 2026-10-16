import json
import os
import secrets
import shlex
import shutil
import subprocess
import time
from pathlib import Path

from ..core.config import settings
from . import terminal
from .runners import mcp_server
from .service import agents

KEEP_ENV = {"CLAUDE_CODE_OAUTH_TOKEN", "CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX", "CLAUDE_CONFIG_DIR"}
CANDIDATES = (".claude/local/claude", ".local/bin/claude", ".npm-global/bin/claude", ".bun/bin/claude", ".volta/bin/claude")
SYSTEM_PATHS = ("/opt/homebrew/bin/claude", "/usr/local/bin/claude", "/usr/bin/claude")
INSTALL = "Claude Code is not installed: install it from https://claude.com/claude-code, run claude once in a terminal to sign in, then open it here again."
NOTE = ("You are Claude Code running in the terminal dock inside FormRef, the reference board app open on this computer. "
        "Work on boards with the formref MCP server's tools: start with list_boards or get_board to learn ids, "
        "and use get_board_image to look at the board before and after a change. They act on the board open in the window, "
        "the person sees every change happen, and each change is one undo step. Respect locked items.")
INAPP_TOKEN = secrets.token_urlsafe(24)
agents.tokens.add(INAPP_TOKEN)
_cache: dict = {"at": 0.0, "value": None}


def _pref(key: str) -> str:
    value = agents.settings().get(key)
    return value.strip() if isinstance(value, str) else ""


def child_env() -> dict:
    return {k: v for k, v in terminal.base_env().items() if not k.startswith("CLAUDE") or k in KEEP_ENV}


def _runnable(path: str) -> bool:
    p = Path(path).expanduser()
    return p.is_file() and os.access(p, os.X_OK)


def _from_login_shell() -> str | None:
    if os.name == "nt":
        return None
    try:
        out = subprocess.run(terminal.login_shell() + ["-c", "command -v claude"], capture_output=True, text=True, timeout=10, env=child_env())
    except (OSError, subprocess.SubprocessError):
        return None
    found = out.stdout.strip().splitlines()[-1:] if out.returncode == 0 else []
    return found[0] if found and os.path.isabs(found[0]) else None


def cli() -> str | None:
    chosen = _pref("claude_bin")
    if chosen and _runnable(chosen):
        return str(Path(chosen).expanduser())
    found = os.environ.get("FORMREF_CLAUDE_BIN") or shutil.which("claude")
    if found:
        return found
    home = Path.home()
    for p in [home / c for c in CANDIDATES] + [Path(s) for s in SYSTEM_PATHS]:
        if p.is_file() and os.access(p, os.X_OK):
            return str(p)
    return _from_login_shell()


def info(fresh: bool = False) -> dict:
    if not fresh and _cache["value"] is not None and time.time() - _cache["at"] < 60:
        return _cache["value"]
    path, version = cli(), None
    if path:
        try:
            out = subprocess.run([path, "--version"], capture_output=True, text=True, timeout=15, env=child_env())
            version = (out.stdout.strip().split() or [None])[0]
        except (OSError, subprocess.SubprocessError):
            path = None
    _cache["value"], _cache["at"] = {"installed": bool(path), "path": path, "version": version}, time.time()
    return _cache["value"]


def mcp_config() -> str:
    return json.dumps({"mcpServers": {"formref": mcp_server(INAPP_TOKEN, terminal.API_URL)}})


def workdir() -> Path:
    raw = _pref("claude_folder") or os.environ.get("FORMREF_AGENT_DIR", "").strip()
    folder = Path(raw).expanduser() if raw else settings.data_dir / "Agent"
    try:
        folder.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        raise ValueError(f"Claude Code cannot start in {folder}: {e.strerror or e}. Choose another folder in the Agent panel.") from None
    return folder


def argv(path: str, prompt: str | None, resume: str | None = None) -> list[str]:
    cmd = [path, "--mcp-config", mcp_config(), "--allowedTools", "mcp__formref", "--append-system-prompt", NOTE]
    if resume:
        cmd += ["--resume", resume]
    if prompt:
        cmd.append(prompt)
    if os.name == "nt":
        return cmd
    return terminal.login_shell() + ["-c", "exec " + shlex.join(cmd)]


def status() -> dict:
    tab = next((s.describe() for s in terminal.SESSIONS.values() if s.kind == "claude"), None)
    chosen = _pref("claude_bin")
    note = f"{chosen} is not a program FormRef can run, so it uses the one found on this computer." if chosen and not _runnable(chosen) else ""
    return info(fresh=True) | {"folder": str(workdir()), "terminal": tab, "binNote": note, "firstMessage": _pref("claude_first_message")}


def open_tab(prompt: str | None = None, cols: int | None = None, rows: int | None = None, fresh: bool = False, resume: str | None = None) -> dict:
    running = next((s for s in terminal.SESSIONS.values() if s.kind == "claude" and s.alive), None)
    if running is not None and not fresh and not resume:
        if prompt:
            terminal.write(running.id, prompt + "\r")
        return running.describe()
    found = info(fresh=True)
    if not found["installed"]:
        raise ValueError(INSTALL)
    prompt = prompt or _pref("claude_first_message") or None
    title = "Claude Code (resumed)" if resume else "Claude Code"
    session = terminal.open_session(str(workdir()), cols or 100, rows or 30, title, argv(found["path"], prompt, resume), child_env(), "claude")
    return session.describe()
