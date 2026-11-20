import json
import os
import secrets
import subprocess
import time
from pathlib import Path

from ..core.config import settings
from . import agent_lookup, claude_code, terminal
from .service import agents

REPORTED = ("claude", "codex", "cursor", "antigravity")
INSTALL = {kind: agent_lookup.install(kind) for kind in REPORTED}
TITLES = {"codex": "Codex", "cursor": "Cursor", "antigravity": "Antigravity"}
TAB_ENTRY = "formref_tab"
TOKEN_VAR = "FORMREF_AGENT_TOKEN"
URL_VAR = "FORMREF_MCP_URL"
HEADER = "x-formref-inapp"
FOLDER = "AgentTabs"
OWN_FOLDERS = "antigravity"
STATUS_SECONDS = 60
_cache: dict = {"at": 0.0, "value": None}


def _claude_signed_in(path: str) -> bool | None:
    if os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("CLAUDE_CODE_OAUTH_TOKEN"):
        return True
    try:
        data = json.loads(agent_lookup.run([path, "auth", "status"], claude_code.child_env(path), 15.0).stdout or "")
    except (OSError, subprocess.SubprocessError, ValueError):
        return None
    return bool(data.get("loggedIn")) if isinstance(data, dict) and "loggedIn" in data else None


def status(fresh: bool = False) -> dict:
    if not fresh and _cache["value"] is not None and time.time() - _cache["at"] < STATUS_SECONDS:
        return _cache["value"]
    out = {}
    for kind in REPORTED:
        found = claude_code.located(kind, fresh)
        signed = _claude_signed_in(found.path) if kind == "claude" and found.state == "runs" else None
        out[kind] = agent_lookup.answer(found, INSTALL[kind], claude_code.OTHERWISE.get(kind, "")) | {"signedIn": signed, "install": INSTALL[kind], "title": found.title}
    _cache["value"], _cache["at"] = out, time.time()
    return out


def _private(path: Path, text: str) -> None:
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    try:
        if path.read_text(encoding="utf-8") == text:
            os.chmod(path, 0o600)
            return
    except OSError:
        pass
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        handle.write(text)
    os.chmod(path, 0o600)


def workdir() -> Path:
    folder = settings.data_dir / FOLDER
    folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    url = terminal.API_URL + "/mcp"
    _private(folder / ".codex" / "config.toml", f'[mcp_servers.formref_tab]\nurl = "{url}"\nenv_http_headers = {{ "{HEADER}" = "{TOKEN_VAR}" }}\n')
    _private(folder / ".cursor" / "mcp.json", json.dumps({"mcpServers": {"formref_tab": {"url": url, "headers": {HEADER: "${env:" + TOKEN_VAR + "}"}}}}, indent=2) + "\n")
    return folder


def _mcp_file(folder: Path) -> Path:
    return folder / ".agents" / "mcp_config.json"


class TabFile(OSError):
    pass


def _servers(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8") or "{}") if path.exists() else {}
    except ValueError:
        data = None
    if not isinstance(data, dict) or not isinstance(data.get("mcpServers", {}), dict):
        raise TabFile(f"{path} is not an MCP servers file FormRef can read, so it was left alone and the Antigravity tab was not opened.")
    return data


def _replace(path: Path, data: dict) -> None:
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    part = path.with_name(path.name + f".part-{os.getpid()}")
    with os.fdopen(os.open(part, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w", encoding="utf-8") as handle:
        handle.write(json.dumps(data, indent=2) + "\n")
    os.replace(part, path)


def write_tab_entry(folder: Path, token: str) -> None:
    path = _mcp_file(folder)
    data = _servers(path)
    data.setdefault("mcpServers", {})[TAB_ENTRY] = {"serverUrl": terminal.API_URL + "/mcp", "headers": {HEADER: token}}
    _replace(path, data)


def remove_tab_entry(folder: Path, token: str) -> None:
    path = _mcp_file(folder)
    try:
        data = _servers(path)
        entry = data.get("mcpServers", {}).get(TAB_ENTRY)
        if not isinstance(entry, dict) or (entry.get("headers") or {}).get(HEADER) != token:
            return
        del data["mcpServers"][TAB_ENTRY]
        _replace(path, data)
    except (OSError, ValueError):
        return


def tab_folder() -> Path:
    folder = workdir() / OWN_FOLDERS / secrets.token_hex(6)
    folder.mkdir(mode=0o700, parents=True)
    return folder


def leave_tab_folder(folder: Path, token: str) -> None:
    remove_tab_entry(folder, token)
    path = _mcp_file(folder)
    try:
        if _servers(path) == {"mcpServers": {}}:
            path.unlink()
    except OSError:
        pass
    for emptied in (path.parent, folder):
        try:
            emptied.rmdir()
        except OSError:
            return


def open_tab(kind: str, cols: int = 100, rows: int = 30) -> dict:
    found = claude_code.located(kind)
    if found.state != "runs":
        found = claude_code.located(kind, fresh=True)
    if found.state != "runs":
        raise LookupError(claude_code.said(found))
    filed = kind == "antigravity"
    folder = tab_folder() if filed else workdir()
    token = secrets.token_urlsafe(32)
    env = claude_code.child_env(found.path, {TOKEN_VAR: token, URL_VAR: terminal.API_URL + "/mcp"})
    argv = agent_lookup.start_argv([found.path])
    agents.tokens.add(token)
    try:
        if filed:
            write_tab_entry(folder, token)
        session = terminal.open_session(str(folder), cols, rows, TITLES[kind], argv, env, kind)
    except BaseException:
        agents.revoke(token)
        if filed:
            leave_tab_folder(folder, token)
        raise
    session.on_close.append(lambda: agents.revoke(token))
    if filed:
        session.on_close.append(lambda: leave_tab_folder(folder, token))
    return session.describe()
