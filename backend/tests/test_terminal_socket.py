import json

import pytest
from starlette.websockets import WebSocketDisconnect

from conftest import window_headers

URL = "ws://127.0.0.1:8320/api/terminal/none/ws"


def _close_code(client, url, headers, first=None):
    try:
        with client.websocket_connect(url, headers=headers) as ws:
            if first is not None:
                ws.send_text(first)
            message = ws.receive()
    except WebSocketDisconnect as closed:
        return closed.code
    assert message["type"] == "websocket.close", message
    return message["code"]


@pytest.mark.parametrize("origin", ["http://evil.example", "http://localhost:3099", "http://127.0.0.1:3099", "null", "chrome-extension://abcdefghijklmnop"])
def test_a_terminal_socket_from_another_origin_is_refused(client, origin):
    assert _close_code(client, URL, {"origin": origin}) == 4403


def test_a_terminal_socket_with_a_foreign_host_is_refused(client):
    assert _close_code(client, "ws://evil.example/api/terminal/none/ws", {}) == 4403


@pytest.mark.parametrize("headers", [{}, {"origin": "http://localhost:5320"}, {"origin": "http://127.0.0.1:8320"}])
def test_the_window_gets_past_the_guard_to_the_session_lookup(client, headers):
    first = json.dumps({"type": "key", "key": next(iter(window_headers().values()))})
    assert _close_code(client, URL, headers, first) == 4404
