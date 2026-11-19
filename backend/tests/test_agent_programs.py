import os
import stat

import pytest

REFUSED = {"detail": "Only the FormRef window can do this"}


@pytest.fixture
def stand_ins(tmp_path, monkeypatch):
    folder = tmp_path / "bin"
    folder.mkdir()
    for name in ("codex", "cursor-agent"):
        script = folder / name
        script.write_text(f'#!/bin/sh\nif [ "$1" = "--version" ]; then echo "{name} 0.99.1"; exit 0; fi\necho "stand-in started"\nread line\n')
        script.chmod(0o755)
    claude = folder / "claude"
    claude.write_text('#!/bin/sh\nif [ "$1" = "--version" ]; then echo "2.9.9 (Claude Code)"; exit 0; fi\nif [ "$1" = "auth" ]; then echo \'{"loggedIn": false}\'; exit 0; fi\n')
    claude.chmod(0o755)
    monkeypatch.setenv("PATH", f"{folder}{os.pathsep}/usr/bin{os.pathsep}/bin")
    monkeypatch.setenv("FORMREF_CLAUDE_BIN", str(claude))
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("CLAUDE_CODE_OAUTH_TOKEN", raising=False)
    return folder


@pytest.fixture
def nothing_installed(tmp_path, monkeypatch):
    from app.agent import runners

    monkeypatch.setenv("PATH", f"/usr/bin{os.pathsep}/bin")
    monkeypatch.setenv("FORMREF_CLAUDE_BIN", str(tmp_path / "no-claude"))
    monkeypatch.setattr(runners, "_login_shell_lookup", lambda runner: None)
    monkeypatch.setattr(runners, "places", lambda runner, platform="": [])


def test_the_status_route_is_the_windows_alone(bare):
    from conftest import window_headers

    r = bare.get("/api/agent/status")
    assert r.status_code == 403 and r.json() == REFUSED
    assert bare.get("/api/agent/status", headers={**window_headers(), "x-formref-client": "outside"}).status_code == 403


def test_the_status_names_each_missing_program_with_its_install_line(client, nothing_installed):
    found = client.get("/api/agent/status?fresh=1").json()
    assert set(found) == {"claude", "codex", "cursor"}
    for kind in found:
        assert found[kind]["installed"] is False and found[kind]["path"] is None and found[kind]["version"] is None and found[kind]["signedIn"] is None
        assert found[kind]["install"] and "\n" not in found[kind]["install"]


@pytest.mark.skipif(os.name == "nt", reason="the stand-ins are shell scripts")
def test_the_status_finds_each_program_with_its_version(client, stand_ins):
    found = client.get("/api/agent/status?fresh=1").json()
    assert found["codex"] == {"installed": True, "path": str(stand_ins / "codex"), "version": "0.99.1", "signedIn": None, "install": found["codex"]["install"]}
    assert found["cursor"]["path"] == str(stand_ins / "cursor-agent") and found["cursor"]["version"] == "0.99.1"
    assert found["claude"]["installed"] is True and found["claude"]["version"] == "2.9.9" and found["claude"]["signedIn"] is False


@pytest.mark.skipif(os.name == "nt", reason="the stand-ins are shell scripts")
def test_the_status_is_kept_until_it_is_asked_for_fresh(client, stand_ins, monkeypatch):
    from app.agent import programs

    first = client.get("/api/agent/status?fresh=1").json()
    monkeypatch.setattr(programs, "_version", lambda path: "changed")
    assert client.get("/api/agent/status").json() == first
    assert client.get("/api/agent/status?fresh=1").json()["codex"]["version"] == "changed"


@pytest.mark.skipif(os.name == "nt", reason="the stand-ins are shell scripts")
@pytest.mark.parametrize("kind,title", [("codex", "Codex"), ("cursor", "Cursor")])
def test_a_program_tab_has_its_own_token_in_its_environment_until_it_closes(client, bare, stand_ins, kind, title):
    from app.agent import programs, terminal
    from app.agent.service import agents
    from app.core.config import settings

    opened = client.post("/api/terminal/agent", json={"kind": kind, "cols": 80, "rows": 20})
    assert opened.status_code == 200 and opened.json()["kind"] == kind and opened.json()["title"] == title
    session = terminal.SESSIONS[opened.json()["id"]]
    try:
        token = session.env[programs.TOKEN_VAR]
        assert token in agents.tokens and all(token not in part for part in session.argv)
        assert session.env[programs.URL_VAR].endswith("/mcp")
        folder = settings.data_dir / programs.FOLDER
        assert session.cwd == str(folder)
        for path in (folder / ".codex" / "config.toml", folder / ".cursor" / "mcp.json"):
            text = path.read_text(encoding="utf-8")
            assert stat.S_IMODE(path.stat().st_mode) == 0o600 and token not in text and programs.TOKEN_VAR in text
        made = bare.post("/api/boards", json={"title": "from a tab"}, headers={"x-formref-client": token})
        assert made.status_code == 201
        assert kind in [t["kind"] for t in client.get("/api/terminal").json()["terminals"]]
        assert client.post(f"/api/terminal/{session.id}/restart").json()["kind"] == kind
        assert token in agents.tokens
    finally:
        assert client.delete(f"/api/terminal/{session.id}").status_code == 200
    assert token not in agents.tokens
    after = bare.post("/api/boards", json={"title": "from a closed tab"}, headers={"x-formref-client": token})
    assert after.status_code == 403 and after.json().get("code") == "outside_agents_off"


def test_a_plain_shell_tab_gets_no_token(client):
    from app.agent import programs, terminal

    opened = client.post("/api/terminal", json={"cols": 80, "rows": 20}).json()
    try:
        assert programs.TOKEN_VAR not in terminal.SESSIONS[opened["id"]].env
    finally:
        client.delete(f"/api/terminal/{opened['id']}")


def test_a_missing_program_or_an_unknown_kind_is_refused(client, nothing_installed):
    missing = client.post("/api/terminal/agent", json={"kind": "codex"})
    assert missing.status_code == 404 and missing.json()["code"] == "not_installed"
    assert client.post("/api/terminal/agent", json={"kind": "vim"}).status_code == 422


def test_starting_a_program_tab_needs_the_window_key(bare, stand_ins):
    r = bare.post("/api/terminal/agent", json={"kind": "codex"})
    assert r.status_code == 403 and r.json() == REFUSED
