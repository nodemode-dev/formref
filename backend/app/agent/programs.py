import json
import os
import re
import secrets
import shlex
import subprocess
import sys
import time
from pathlib import Path

from ..core.config import settings
from . import claude_code, runners, terminal
from .service import agents

INSTALL = {
    "claude": "irm https://claude.ai/install.ps1 | iex" if sys.platform == "win32" else "curl -fsSL https://claude.ai/install.sh | bash",
    "codex": "npm install -g @openai/codex",
    "cursor": "curl https://cursor.com/install -fsS | bash",
}
TITLES = {"codex": "Codex", "cursor": "Cursor"}
TOKEN_VAR = "FORMREF_AGENT_TOKEN"
URL_VAR = "FORMREF_MCP_URL"
HEADER = "x-formref-inapp"
FOLDER = "AgentTabs"
STATUS_SECONDS = 60
_cache: dict = {"at": 0.0, "value": None}


def _run(argv: list[str], env: dict) -> str | None:
    try:
        out = subprocess.run(argv, capture_output=True, text=True, timeout=10, env=env, stdin=subprocess.DEVNULL)
    except (OSError, subprocess.SubprocessError):
        return None
    return out.stdout


def _version(path: str) -> str | None:
    found = re.search(r"\d+(?:\.\d+)+[\w.+-]*", _run([path, "--version"], terminal.base_env()) or "")
    return found.group(0) if found else None


def _claude_signed_in(path: str) -> bool | None:
    if os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("CLAUDE_CODE_OAUTH_TOKEN"):
        return True
    try:
        data = json.loads(_run([path, "auth", "status"], claude_code.child_env()) or "")
    except ValueError:
        return None
    return bool(data.get("loggedIn")) if isinstance(data, dict) and "loggedIn" in data else None


def status(fresh: bool = False) -> dict:
    if not fresh and _cache["value"] is not None and time.time() - _cache["at"] < STATUS_SECONDS:
        return _cache["value"]
    found = claude_code.info(fresh)
    out = {"claude": {"installed": found["installed"], "path": found["path"], "version": found["version"],
                      "signedIn": _claude_signed_in(found["path"]) if found["installed"] else None, "install": INSTALL["claude"]}}
    for kind in TITLES:
        path = runners.find(kind)
        out[kind] = {"installed": bool(path), "path": path or None, "version": _version(path) if path else None, "signedIn": None, "install": INSTALL[kind]}
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
    _private(folder / ".codex" / "config.toml", f'[mcp_servers.formref]\nurl = "{url}"\nenv_http_headers = {{ "{HEADER}" = "{TOKEN_VAR}" }}\n')
    _private(folder / ".cursor" / "mcp.json", json.dumps({"mcpServers": {"formref": {"url": url, "headers": {HEADER: "${env:" + TOKEN_VAR + "}"}}}}, indent=2) + "\n")
    return folder


def open_tab(kind: str, cols: int = 100, rows: int = 30) -> dict:
    path = runners.find(kind)
    if not path:
        raise LookupError(f"{runners.CLI[kind]['label']} is not installed on this computer. {runners.CLI[kind]['install']}")
    folder = workdir()
    token = secrets.token_urlsafe(32)
    env = terminal.base_env() | {TOKEN_VAR: token, URL_VAR: terminal.API_URL + "/mcp"}
    argv = [path] if os.name == "nt" else terminal.login_shell() + ["-c", "exec " + shlex.quote(path)]
    agents.tokens.add(token)
    try:
        session = terminal.open_session(str(folder), cols, rows, TITLES[kind], argv, env, kind)
    except BaseException:
        agents.revoke(token)
        raise
    session.on_close.append(lambda: agents.revoke(token))
    return session.describe()
