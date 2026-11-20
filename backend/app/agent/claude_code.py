import os
import secrets
import time
from pathlib import Path

from ..core.config import ROOT, settings
from . import agent_lookup, terminal
from .service import agents

OVERRIDES = {"claude": ("FORMREF_CLAUDE_BIN",), "codex": ("FORMREF_CODEX_BIN",), "cursor": ("FORMREF_CURSOR_BIN",), "antigravity": ("FORMREF_ANTIGRAVITY_BIN",)}
SETTINGS = {"claude": "claude_bin", "codex": "codex_bin", "cursor": "cursor_bin", "antigravity": "antigravity_bin"}
OTHERWISE = {kind: "give its path in the Agent panel" for kind in SETTINGS}
NOTE =("You are Claude Code running in the terminal dock inside FormRef, the reference board app open on this computer. "
        "Work on boards with the formref_tab MCP server's tools: start with list_boards or get_board to learn ids, "
        "and use get_board_image to look at the board before and after a change. They act on the board open in the window, "
        "the person sees every change happen, and each change is one undo step. Respect locked items.")
_cache: dict = {"at": 0.0, "value": None}


def _pref(key: str) -> str:
    value = agents.settings().get(key)
    return value.strip() if isinstance(value, str) else ""


def setting(kind: str) -> str | None:
    return _pref(SETTINGS[kind]) if kind in SETTINGS else None


def child_env(path: str | None = None, extra: dict | None = None) -> dict:
    return agent_lookup.child_env(path, base=terminal.base_env(), extra=extra, front=[] if os.name == "nt" else [ROOT], shell_timeout=10.0)


def located(kind: str, fresh: bool = False) -> agent_lookup.Found:
    found = agent_lookup.find(kind, setting=setting(kind), override_vars=OVERRIDES.get(kind, ()), shell_timeout=10.0, fresh=fresh)
    return agent_lookup.check(found, child_env(found.path), 15.0, fresh)


def said(found: agent_lookup.Found) -> str:
    return agent_lookup.sentence(found, agent_lookup.install(found.program), OTHERWISE.get(found.program, ""))


def _runnable(path: str) -> bool:
    p = Path(path).expanduser()
    return p.is_file() and os.access(p, os.X_OK)


def cli() -> str | None:
    return located("claude").path


def info(fresh: bool = False) -> dict:
    if not fresh and _cache["value"] is not None and time.time() - _cache["at"] < 60:
        return _cache["value"]
    _cache["value"], _cache["at"] = agent_lookup.answer(located("claude", fresh), agent_lookup.install("claude"), OTHERWISE["claude"]), time.time()
    return _cache["value"]


def issue() -> tuple[str, str]:
    token = secrets.token_urlsafe(32)
    path = agents.token_file(token, {"mcpServers": {"formref_tab": {"type": "http", "url": terminal.API_URL + "/mcp", "headers": {"x-formref-inapp": token}}}})
    agents.tokens.add(token)
    return token, path


def revoke(token: str) -> None:
    agents.revoke(token)


def workdir() -> Path:
    raw = _pref("claude_folder") or os.environ.get("FORMREF_AGENT_DIR", "").strip()
    folder = Path(raw).expanduser() if raw else settings.data_dir / "Agent"
    try:
        folder.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        raise ValueError(f"Claude Code cannot start in {folder}: {e.strerror or e}. Choose another folder in the Agent panel.") from None
    return folder


def argv(path: str, prompt: str | None, resume: str | None, mcp_file: str) -> list[str]:
    cmd = [path, "--mcp-config", mcp_file, "--allowedTools", "mcp__formref_tab", "--append-system-prompt", NOTE]
    if resume:
        cmd += ["--resume", resume]
    if prompt:
        cmd.append(prompt)
    return agent_lookup.start_argv(cmd)


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
        raise ValueError(found["said"])
    prompt = prompt or _pref("claude_first_message") or None
    title = "Claude Code (resumed)" if resume else "Claude Code"
    token, mcp_file = issue()
    try:
        session = terminal.open_session(str(workdir()), cols or 100, rows or 30, title, argv(found["path"], prompt, resume, mcp_file), child_env(found["path"]), "claude")
    except BaseException:
        revoke(token)
        raise
    session.on_close.append(lambda: revoke(token))
    return session.describe()
