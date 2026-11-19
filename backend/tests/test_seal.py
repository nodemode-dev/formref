import json
import sys

import pytest

from conftest import window_headers


class MemoryKeyring:
    priority = 1

    def __init__(self):
        self.items = {}

    def get_password(self, service, username):
        return self.items.get((service, username))

    def set_password(self, service, username, password):
        self.items[(service, username)] = password

    def delete_password(self, service, username):
        self.items.pop((service, username), None)


@pytest.fixture
def keychain():
    import keyring
    from keyring.backend import KeyringBackend

    from app.agent.service import agents
    from app.core import seal

    backend = type("Standin", (MemoryKeyring, KeyringBackend), {})()
    previous = keyring.get_keyring()
    keyring.set_keyring(backend)
    seal.reset()
    yield backend
    keyring.set_keyring(previous)
    seal.reset()
    agents.path.unlink(missing_ok=True)


@pytest.fixture
def no_keychain(monkeypatch):
    from app.agent.service import agents
    from app.core import seal

    monkeypatch.setitem(sys.modules, "keyring", None)
    seal.reset()
    yield
    seal.reset()
    agents.path.unlink(missing_ok=True)


def _stored():
    from app.agent.service import agents

    return json.loads(agents.path.read_text(encoding="utf-8"))


def _hand_edit(**values):
    from app.agent.service import agents

    data = _stored()
    data.update(values)
    agents.path.write_text(json.dumps(data), encoding="utf-8")


def test_a_window_write_is_sealed_and_stands(client, keychain):
    r = client.post("/api/agent/settings", json={"outside_agents": True}, headers=window_headers())
    assert r.status_code == 200
    assert r.json()["seal"] == "ok"
    assert _stored()["seal"]
    shown = client.get("/api/agent/settings").json()
    assert shown["outside_agents"] is True and shown["seal_broken"] is False


def test_a_setting_that_is_not_sealed_keeps_the_seal_valid(client, keychain):
    client.post("/api/agent/settings", json={"outside_agents": True})
    r = client.post("/api/agent/settings", json={"confirm_changes": False})
    assert r.json()["seal"] == "ok" and r.json()["outside_agents"] is True


def test_a_hand_edit_of_the_stored_choice_is_caught(client, keychain):
    client.post("/api/agent/settings", json={"outside_agents": False})
    _hand_edit(outside_agents=True, claude_bin="/tmp/not-claude")
    shown = client.get("/api/agent/settings").json()
    assert shown["outside_agents"] is False
    assert shown["claude_bin"] == ""
    assert shown["seal"] == "broken" and shown["seal_broken"] is True


def test_the_window_can_confirm_after_a_broken_seal(client, keychain):
    client.post("/api/agent/settings", json={"outside_agents": False})
    _hand_edit(outside_agents=True)
    r = client.post("/api/agent/settings", json={"outside_agents": True})
    assert r.json()["outside_agents"] is True and r.json()["seal"] == "ok"


def test_an_unsealed_file_with_the_safe_defaults_is_not_broken(client, keychain):
    from app.agent.service import agents

    agents.path.write_text(json.dumps({"outside_agents": False}), encoding="utf-8")
    shown = client.get("/api/agent/settings").json()
    assert shown["seal"] == "unsealed" and shown["seal_broken"] is False


def test_an_unsealed_file_that_allows_outside_agents_is_treated_as_off(client, keychain):
    from app.agent.service import agents

    agents.path.write_text(json.dumps({"outside_agents": True}), encoding="utf-8")
    shown = client.get("/api/agent/settings").json()
    assert shown["outside_agents"] is False and shown["seal_broken"] is True


def test_without_a_keychain_the_engine_runs_and_reports_the_seal_as_unavailable(client, no_keychain):
    r = client.post("/api/agent/settings", json={"outside_agents": True})
    assert r.status_code == 200
    assert r.json()["outside_agents"] is True and r.json()["seal"] == "unavailable" and r.json()["seal_broken"] is False
    assert "seal" not in _stored()
    assert client.get("/api/health").status_code == 200
