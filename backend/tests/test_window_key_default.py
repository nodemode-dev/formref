import re

import pytest

READS = {"GET", "HEAD", "OPTIONS"}
OPEN = {("POST", "/mcp"), ("DELETE", "/mcp"), ("POST", "/api/window/key"), ("POST", "/api/clip")}
REFUSED = {"detail": "Only the FormRef window can do this"}


def write_operations(app):
    return [(m.upper(), path) for path, item in app.openapi()["paths"].items() for m in item if m.upper() not in READS]


def test_the_open_list_is_short_and_named():
    from app.core import window_key

    assert set(window_key.OPEN) == {"/mcp", "/api/window/key", "/api/clip"}


def test_every_write_route_needs_the_window_key(app, bare):
    ops = write_operations(app)
    assert len(ops) > 50
    answered = []
    for method, path in ops:
        if (method, path) in OPEN:
            continue
        url = re.sub(r"\{[^}]+\}", "x", path)
        for headers in ({}, {"x-formref-window-key": "x" * 43}):
            r = bare.request(method, url, json={}, headers=headers)
            if r.status_code != 403 or r.json() != REFUSED:
                answered.append(f"{method} {path} {r.status_code}")
    assert not answered, "write routes that answer without the window key (add the key, or name the route in window_key.OPEN with its caller): " + ", ".join(answered)


def test_the_key_opens_every_write_route(app, client):
    ops = write_operations(app)
    refused = [f"{m} {p}" for m, p in ops if client.request(m, re.sub(r"\{[^}]+\}", "x", p), json={}).json() == REFUSED]
    assert not refused, refused


@pytest.mark.parametrize("path", ["/api/terminal", "/api/claudecode", "/api/chat", "/api/chat/sessions", "/api/clip/token", "/api/commands/next", "/api/cloud/dropbox/files", "/api/chat/events"])
def test_reads_that_return_a_secret_or_a_session_refuse_without_the_key(bare, path):
    r = bare.get(path)
    assert r.status_code == 403 and r.json() == REFUSED


def test_the_terminal_and_agent_routes_refuse_a_caller_that_names_itself_an_outside_agent(bare):
    for method, path in (("POST", "/api/terminal"), ("POST", "/api/agent/settings"), ("POST", "/api/agent/turns"), ("POST", "/api/agent/confirm/x"), ("POST", "/api/claudecode"), ("POST", "/api/chat")):
        r = bare.request(method, path, json={}, headers={"x-formref-client": "outside"})
        assert r.status_code == 403 and r.json() == REFUSED, (method, path)


def test_the_bridge_routes_reach_the_consent_check_not_the_key_check(bare):
    r = bare.post("/api/boards", json={"title": "x"}, headers={"x-formref-client": "outside"})
    assert r.status_code == 403
    assert r.json().get("code") == "outside_agents_off"


def test_an_empty_client_header_is_not_the_bridge(bare):
    r = bare.post("/api/boards", json={"title": "x"}, headers={"x-formref-client": ""})
    assert r.status_code == 403 and r.json() == REFUSED


def test_the_clip_route_keeps_its_own_checks(bare):
    r = bare.post("/api/clip", json={"kind": "text", "text": "x"}, headers={"origin": "chrome-extension://abcdefghijklmnop"})
    assert r.status_code == 401
    assert r.json().get("code") == "not_paired"


def test_open_routes_still_answer_without_the_key(bare):
    r = bare.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "ping", "params": {}}, headers={"mcp-protocol-version": "2025-11-25", "accept": "application/json, text/event-stream"})
    assert r.status_code == 200
