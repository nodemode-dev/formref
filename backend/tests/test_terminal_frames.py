import json
import os
import time

import pytest

from conftest import window_headers


def _frames(client, sid, first, count):
    with client.websocket_connect(f"ws://127.0.0.1:8320/api/terminal/{sid}/ws") as ws:
        ws.send_text(json.dumps(first))
        return [ws.receive() for _ in range(count)]


@pytest.mark.skipif(os.name == "nt", reason="the stand-in is a shell command")
def test_a_socket_that_asks_for_typed_frames_gets_its_notices_as_bytes(client):
    from app.agent import terminal

    key = next(iter(window_headers().values()))
    session = terminal.open_session(argv=["/bin/sh", "-c", "printf done"])
    try:
        deadline = time.monotonic() + 10
        while session.alive and time.monotonic() < deadline:
            time.sleep(0.05)
        assert session.alive is False
        typed = _frames(client, session.id, {"type": "key", "key": key, "frames": "typed"}, 3)
        hello, exited = json.loads(typed[0]["bytes"]), json.loads(typed[2]["bytes"])
        assert hello == {"type": "hello", "id": session.id, "kind": "shell", "alive": False}
        assert typed[1]["text"] == "done"
        assert exited == {"type": "exit", "id": session.id, "kind": "shell", "alive": False}
        plain = _frames(client, session.id, {"type": "key", "key": key}, 2)
        assert [f.get("text") for f in plain] == ["done", json.dumps({"type": "exit"})]
    finally:
        terminal.close(session.id)
