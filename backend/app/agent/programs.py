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
TITLES = {"codex": "Codex", "cursor": "Cursor"}
TOKEN_VAR = "FORMREF_AGENT_TOKEN"
URL_VAR = "FORMREF_MCP_URL"
HEADER = "x-formref-inapp"
FOLDER = "AgentTabs"
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


def open_tab(kind: str, cols: int = 100, rows: int = 30) -> dict:
    found = claude_code.located(kind)
    if found.state != "runs":
        found = claude_code.located(kind, fresh=True)
    if found.state != "runs":
        raise LookupError(claude_code.said(found))
    folder = workdir()
    token = secrets.token_urlsafe(32)
    env = claude_code.child_env(found.path, {TOKEN_VAR: token, URL_VAR: terminal.API_URL + "/mcp"})
    argv = agent_lookup.start_argv([found.path])
    agents.tokens.add(token)
    try:
        session = terminal.open_session(str(folder), cols, rows, TITLES[kind], argv, env, kind)
    except BaseException:
        agents.revoke(token)
        raise
    session.on_close.append(lambda: agents.revoke(token))
    return session.describe()
