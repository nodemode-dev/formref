import json
import re

import pytest

from conftest import window_headers


@pytest.fixture
def reset_agents():
    from app.agent.service import agents

    yield agents
    agents.path.unlink(missing_ok=True)
    agents.cli_turns = 0
    agents.cli_active.clear()
    agents.turns.clear()


@pytest.mark.parametrize("url", [
    "http://127.0.0.1.attacker.example",
    "http://127.0.0.1.attacker.example:11434",
    "http://localhost.evil.com:11434",
    "http://localhostx",
    "http://127.0.0.1@evil.com",
    "http://evil.com\\@127.0.0.1",
    "http://localhost.",
    "http://0.0.0.0:11434",
    "https://127.0.0.1:11434",
    "http://127.0.0.1:99999",
    " http://127.0.0.1:11434",
    "",
])
def test_an_ollama_address_that_is_not_loopback_is_refused(client, reset_agents, url):
    r = client.post("/api/agent/settings", json={"ollama_url": url})
    assert r.status_code == 422


@pytest.mark.parametrize("url", ["http://127.0.0.1:11434", "http://localhost:11434", "http://[::1]:11434", "http://127.0.0.2:11434", "http://LOCALHOST:11434"])
def test_an_ollama_address_that_is_loopback_is_accepted(client, reset_agents, url):
    r = client.post("/api/agent/settings", json={"ollama_url": url})
    assert r.status_code == 200 and r.json()["ollama_url"] == url


def test_a_hand_edited_ollama_address_is_not_used(client, reset_agents):
    reset_agents.path.write_text(json.dumps({"ollama_url": "http://127.0.0.1.attacker.example"}), encoding="utf-8")
    assert reset_agents.settings()["ollama_url"] == "http://127.0.0.1:11434"


def test_an_outside_agent_cannot_change_any_agent_setting(client, bare, reset_agents):
    client.post("/api/agent/settings", json={"outside_agents": True})
    for patch in ({"confirm_changes": False}, {"outside_agents": False}, {"claude_bin": "/tmp/x"}, {"runner": "ollama"}):
        r = bare.post("/api/agent/settings", json=patch, headers={"x-formref-client": "outside"})
        assert r.status_code == 403, patch
    shown = client.get("/api/agent/settings").json()
    assert shown["confirm_changes"] is True and shown["outside_agents"] is True and shown["claude_bin"] == ""


def test_the_window_can_still_change_confirm_changes(client, reset_agents):
    r = client.post("/api/agent/settings", json={"confirm_changes": False})
    assert r.status_code == 200 and r.json()["confirm_changes"] is False


def test_an_unrelated_outside_caller_is_not_let_in_by_a_running_panel_turn(bare, reset_agents):
    reset_agents.cli_turns = 1
    reset_agents.cli_active.append("t1")
    reset_agents.turns["t1"] = {"runner": "claude"}
    assert reset_agents.allows("outside") is False
    r = bare.post("/api/boards", json={"title": "x"}, headers={"x-formref-client": "outside"})
    assert r.status_code == 403 and r.json()["code"] == "outside_agents_off"


def test_the_panel_turn_token_is_still_let_in(reset_agents):
    reset_agents.tokens.add("turn-token")
    try:
        assert reset_agents.allows("turn-token") is True
        assert reset_agents.allows("another") is False
    finally:
        reset_agents.tokens.discard("turn-token")


def test_a_tab_token_is_one_per_tab_in_a_private_file_and_dies_with_the_tab(reset_agents, tmp_path):
    import os
    import stat

    from app.agent import claude_code

    first, path = claude_code.issue()
    second, other = claude_code.issue()
    try:
        assert first != second and path != other
        assert reset_agents.allows(first) and reset_agents.allows(second)
        assert stat.S_IMODE(os.stat(path).st_mode) == 0o600 if os.name != "nt" else True
        assert first in json.loads(open(path, encoding="utf-8").read())["mcpServers"]["formref_tab"]["headers"]["x-formref-inapp"]
        claude_code.revoke(first)
        assert not reset_agents.allows(first) and not os.path.exists(path)
        assert reset_agents.allows(second)
    finally:
        claude_code.revoke(first)
        claude_code.revoke(second)


def test_a_tab_command_line_never_carries_the_token(reset_agents):
    from app.agent import claude_code

    token, path = claude_code.issue()
    try:
        cmd = claude_code.argv("/usr/bin/claude", "hello", None, path)
        assert token not in " ".join(cmd)
        assert path in " ".join(cmd)
    finally:
        claude_code.revoke(token)


def test_a_panel_turn_hands_claude_a_private_file_not_the_token(reset_agents):
    from app.agent import runners

    cmd = runners.argv("claude", "/usr/bin/claude", "hi", "secret-turn-token", "http://127.0.0.1:8320", "", "/tmp/cfg.json")
    assert "secret-turn-token" not in " ".join(cmd)
    assert "/tmp/cfg.json" in cmd


def test_a_plain_terminal_does_not_inherit_the_key_variable(monkeypatch):
    from app.agent import terminal

    monkeypatch.setenv("FORMREF_WINDOW_KEY_STDOUT", "1")
    env = terminal.base_env()
    assert "FORMREF_WINDOW_KEY_STDOUT" not in env
    assert not any(re.search(r"window.?key", k, re.I) for k in env)
