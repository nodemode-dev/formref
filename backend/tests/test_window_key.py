import json
import os
import subprocess
import sys
import time
import urllib.request

import pytest
from starlette.websockets import WebSocketDisconnect

from conftest import BACKEND, free_port, window_headers

URL = "ws://127.0.0.1:8320/api/terminal/none/ws"


def _close(client, first):
    try:
        with client.websocket_connect(URL) as ws:
            if first is not None:
                ws.send_text(first)
            return ws.receive()["code"]
    except WebSocketDisconnect as closed:
        return closed.code


def test_a_socket_without_the_key_cannot_drive_a_terminal(bare):
    assert _close(bare, None) == 4403
    assert _close(bare, "not json") == 4403
    assert _close(bare, json.dumps({"type": "input", "data": "id\r"})) == 4403
    assert _close(bare, json.dumps({"type": "key", "key": "x" * 43})) == 4403


def test_a_socket_with_the_key_reaches_the_session_lookup(bare):
    assert _close(bare, json.dumps({"type": "key", "key": next(iter(window_headers().values()))})) == 4404


def test_a_ticket_needs_the_key_and_works_once(bare):
    assert bare.post("/api/window/ticket").status_code == 403
    ticket = bare.post("/api/window/ticket", headers=window_headers()).json()["ticket"]
    from app.core import window_key

    assert window_key.spend(ticket) is True
    assert window_key.spend(ticket) is False
    assert window_key.spend("") is False
    assert bare.get("/api/chat/events?ticket=wrong").status_code == 403


def test_an_expired_ticket_is_refused(bare, monkeypatch):
    from app.core import window_key

    ticket = window_key.ticket()
    window_key.TICKETS[ticket] -= window_key.TICKET_LIFE + 1
    assert window_key.spend(ticket) is False


def _launch(env_extra):
    port = free_port()
    env = dict(os.environ, FORMREF_PORT=str(port), **env_extra)
    env.pop("FORMREF_WINDOW_KEY_STDOUT", None) if "FORMREF_WINDOW_KEY_STDOUT" not in env_extra else None
    proc = subprocess.Popen([sys.executable, "formref_engine.py"], cwd=BACKEND, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    base = f"http://127.0.0.1:{port}"
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline and proc.poll() is None:
        try:
            urllib.request.urlopen(base + "/api/health", timeout=1).read()
            return proc, base
        except OSError:
            time.sleep(0.25)
    proc.kill()
    raise RuntimeError("engine did not start")


def _post(url):
    req = urllib.request.Request(url, method="POST", data=b"")
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def _stop(proc):
    proc.terminate()
    try:
        return proc.communicate(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()
        return proc.communicate()


def test_a_packaged_engine_prints_the_key_once_before_the_address_and_has_no_bootstrap():
    proc, base = _launch({"FORMREF_WINDOW_KEY_STDOUT": "1"})
    try:
        assert _post(base + "/api/window/key")[0] == 404
    finally:
        out, err = _stop(proc)
    lines = [line for line in out.splitlines() if line.strip()]
    assert lines[0].startswith("formref-window-key: ") and len(lines[0].split(": ", 1)[1]) >= 32
    assert (out + err).count(lines[0].split(": ", 1)[1]) == 1
    assert "formref-window-key" not in err
    assert not any("formref-window-key" in line for line in lines[1:])


def test_a_development_engine_prints_nothing_and_gives_the_key_once():
    proc, base = _launch({})
    try:
        status, body = _post(base + "/api/window/key")
        again = _post(base + "/api/window/key")
        refused = _post(base + "/api/boards")
        settings = json.loads(urllib.request.urlopen(base + "/api/agent/settings", timeout=5).read())
    finally:
        out, err = _stop(proc)
    assert status == 200 and len(body["key"]) >= 32
    assert again[0] == 409
    assert refused[0] == 403
    assert settings["second_window_claim"] is True
    assert body["key"] not in out + err
    assert "formref-window-key" not in out
