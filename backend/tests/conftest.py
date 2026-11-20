import importlib
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
REPO = BACKEND.parent

APP_ID = "formref"
APP_MODULE = "app.main:app"
ENV_PREFIX = "FORMREF"
DATA_ENV = "FORMREF_DATA_DIR"
PORT_ENV = "FORMREF_PORT"
ENGINE_PORT = 8320
HEALTH_PATH = "/api/health"
VERSION_PATH = "/api/health"
VERSION_KEY = "version"
WINDOW_ORIGINS = ["http://localhost:5320", "http://127.0.0.1:5320", "http://localhost:5321", "http://127.0.0.1:5321", "tauri://localhost", "http://tauri.localhost"]
WS_PATH = "/api/terminal/none/ws"
MCP_PATH = "/mcp"
STDIO_CMD = [sys.executable, "-m", "app.mcp_server"]
READ_TOOL = None
CHANGING_TOOL = None
INAPP_HEADER = None
VERSION_SITES = [
    ("backend/app/core/config.py", r'^VERSION = "([^"]+)"'),
    ("CHANGELOG.md", r"^## v(\S+) ·"),
    ("README.md", r"badge/version-v([0-9.]+)-"),
    ("clipper/manifest.json", r'^  "version": "([^"]+)"'),
    ("frontend/package.json", r'^  "version": "([^"]+)"'),
    ("frontend/index.html", r"FORM FAMILY<span>v([0-9.]+)</span>"),
    ("native/formref-core/Cargo.toml", r'^version = "([^"]+)"'),
    ("src-tauri/Cargo.toml", r'^version = "([^"]+)"'),
    ("src-tauri/tauri.conf.json", r'^  "version": "([^"]+)"'),
]
STRIP_EXEMPT = []


def tool_catalogue():
    import asyncio

    server = importlib.import_module("app.mcp_server").mcp
    return [{"name": t.name} for t in asyncio.run(server.list_tools())]


def consent_refusals():
    return {}


def set_policy(mode):
    return None


def inapp_token():
    return None


def window_headers():
    key = importlib.import_module("app.core.window_key")
    return {key.HEADER: key.KEY}


_SANDBOX = Path(tempfile.mkdtemp(prefix=f"{APP_ID}-tests-"))
for _name in ("data", "home"):
    (_SANDBOX / _name).mkdir()
os.environ[DATA_ENV] = str(_SANDBOX / "data")
os.environ[PORT_ENV] = str(ENGINE_PORT)
os.environ["HOME"] = str(_SANDBOX / "home")
os.environ["USERPROFILE"] = str(_SANDBOX / "home")
if os.name != "nt":
    _SHELL = _SANDBOX / "zsh"
    _SHELL.write_text('#!/bin/sh\nscript=""\nwhile [ $# -gt 0 ]; do\n  case "$1" in -c) shift; script="$1" ;; esac\n  shift\ndone\nif [ -n "$script" ]; then exec /bin/sh -c "$script"; fi\nexec /bin/sh\n')
    _SHELL.chmod(0o755)
    os.environ["SHELL"] = str(_SHELL)
    os.environ["PATH"] = "/usr/bin:/bin:/usr/sbin:/sbin"
for _key in ("NPM_CONFIG_PREFIX", "npm_config_prefix", "PNPM_HOME", "VOLTA_HOME", "BUN_INSTALL", "NVM_SYMLINK"):
    os.environ.pop(_key, None)
for _key in [k for k in os.environ if k.startswith(f"{ENV_PREFIX}_") and k not in (DATA_ENV, PORT_ENV, "FORMREF_ENGINE_PATH")]:
    os.environ.pop(_key)
sys.path.insert(0, str(BACKEND))


def pytest_sessionfinish(session, exitstatus):
    shutil.rmtree(_SANDBOX, ignore_errors=True)


def own_origin():
    return f"http://127.0.0.1:{ENGINE_PORT}"


@pytest.fixture(scope="session", autouse=True)
def only_stand_in_programs():
    lookup = importlib.import_module("app.agent.agent_lookup")
    kept = lookup.system_folders
    lookup.system_folders = lambda platform=None: []
    lookup.forget()
    yield
    lookup.system_folders = kept
    lookup.forget()


@pytest.fixture(scope="session")
def app():
    module, _, attr = APP_MODULE.partition(":")
    return getattr(importlib.import_module(module), attr)


@pytest.fixture(scope="session")
def client(app):
    from fastapi.testclient import TestClient

    with TestClient(app, base_url=own_origin(), client=("127.0.0.1", 50000), headers=window_headers()) as c:
        yield c


@pytest.fixture(scope="session")
def bare(client, app):
    from fastapi.testclient import TestClient

    return TestClient(app, base_url=own_origin(), client=("127.0.0.1", 50000))


@pytest.fixture(scope="session")
def repo_versions():
    found = {}
    for rel, pattern in VERSION_SITES:
        text = (REPO / rel).read_text(encoding="utf-8")
        match = re.search(pattern, text, re.MULTILINE)
        found[rel] = match.group(1) if match else None
    return found


@pytest.fixture(scope="session")
def repo_version(repo_versions):
    return next(iter(repo_versions.values()))


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def get_json(url, timeout=2.0):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return r.status, json.loads(r.read().decode("utf-8") or "null")


@pytest.fixture(scope="session")
def engine():
    port = free_port()
    data = _SANDBOX / "engine-data"
    data.mkdir()
    env = dict(os.environ, **{DATA_ENV: str(data), PORT_ENV: str(port)})
    module = APP_MODULE
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", module, "--host", "127.0.0.1", "--port", str(port)],
        cwd=BACKEND, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    base = f"http://127.0.0.1:{port}"
    deadline = time.monotonic() + 60
    ready = False
    while time.monotonic() < deadline and proc.poll() is None:
        try:
            status, _ = get_json(base + HEALTH_PATH)
            ready = status == 200
        except OSError:
            ready = False
        if ready:
            break
        time.sleep(0.25)
    if not ready:
        proc.kill()
        out = proc.communicate(timeout=5)[0].decode("utf-8", "replace")
        raise RuntimeError(f"engine did not answer {HEALTH_PATH} within 60 s:\n{out[-4000:]}")
    yield {"base": base, "port": port, "data": data, "env": env, "proc": proc}
    proc.terminate()
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()
