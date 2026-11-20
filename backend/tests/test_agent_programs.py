import json
import os
import stat
from pathlib import Path

import pytest

REFUSED = {"detail": "Only the FormRef window can do this"}


SHELL = """#!/bin/sh
login=0; inter=0; script=""
while [ $# -gt 0 ]; do
  case "$1" in -l) login=1 ;; -i) inter=1 ;; -c) shift; script="$1" ;; esac
  shift
done
if [ "$login" = 1 ] && [ -f "$HOME/.zprofile-path" ]; then PATH="$(cat "$HOME/.zprofile-path"):$PATH"; fi
if [ "$inter" = 1 ] && [ -f "$HOME/.zshrc-path" ]; then PATH="$(cat "$HOME/.zshrc-path"):$PATH"; fi
export PATH
if [ -n "$script" ]; then exec /bin/sh -c "$script"; fi
exec /bin/sh
"""


@pytest.fixture
def own_shell(tmp_path, monkeypatch):
    from app.agent import agent_lookup

    home = tmp_path / "home"
    shell = tmp_path / "shell" / "zsh"
    home.mkdir()
    shell.parent.mkdir()
    shell.write_text(SHELL)
    shell.chmod(0o755)
    monkeypatch.setenv("SHELL", str(shell))
    monkeypatch.setenv("HOME", str(home))
    monkeypatch.setenv("USERPROFILE", str(home))
    monkeypatch.setattr(agent_lookup, "system_folders", lambda platform=None: [])
    agent_lookup.forget()
    yield home
    agent_lookup.forget()


@pytest.fixture
def stand_ins(tmp_path, monkeypatch, own_shell):
    folder = tmp_path / "bin"
    folder.mkdir()
    for name in ("codex", "cursor-agent", "agy"):
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
def nothing_installed(tmp_path, monkeypatch, own_shell):
    monkeypatch.setenv("PATH", f"/usr/bin{os.pathsep}/bin")
    monkeypatch.setenv("FORMREF_CLAUDE_BIN", str(tmp_path / "no-claude"))


def test_the_status_route_is_the_windows_alone(bare):
    from conftest import window_headers

    r = bare.get("/api/agent/status")
    assert r.status_code == 403 and r.json() == REFUSED
    assert bare.get("/api/agent/status", headers={**window_headers(), "x-formref-client": "outside"}).status_code == 403


def test_the_status_names_each_missing_program_with_its_install_line(client, nothing_installed):
    found = client.get("/api/agent/status?fresh=1").json()
    assert set(found) == {"claude", "codex", "cursor", "antigravity"}
    for kind in found:
        assert found[kind]["installed"] is False and found[kind]["path"] is None and found[kind]["version"] is None and found[kind]["signedIn"] is None
        assert found[kind]["install"] and "\n" not in found[kind]["install"]
        assert found[kind]["finding"] == "missing" and found[kind]["how"] == "" and len(found[kind]["looked"]) >= 3
        assert found[kind]["said"].startswith(f"{found[kind]['title']} was not found. Looked in: ") and found[kind]["install"] in found[kind]["said"]
    assert found["claude"]["looked"][0] == "your setting (empty)" and found["claude"]["said"].endswith(", or give its path in the Agent panel.")
    assert "your setting" not in found["codex"]["said"] and "Agent panel" not in found["codex"]["said"]


@pytest.mark.skipif(os.name == "nt", reason="the stand-ins are shell scripts")
def test_the_status_finds_each_program_with_its_version(client, stand_ins):
    found = client.get("/api/agent/status?fresh=1").json()
    assert found["codex"] == {"installed": True, "path": str(stand_ins / "codex"), "version": "0.99.1", "finding": "runs", "how": "path", "looked": [], "error": "",
                              "said": f"Codex is at {stand_ins / 'codex'} (the engine's PATH).", "signedIn": None, "install": found["codex"]["install"], "title": "Codex"}
    assert found["cursor"]["path"] == str(stand_ins / "cursor-agent") and found["cursor"]["version"] == "0.99.1"
    assert found["antigravity"]["path"] == str(stand_ins / "agy") and found["antigravity"]["finding"] == "runs" and found["antigravity"]["signedIn"] is None
    assert found["claude"]["installed"] is True and found["claude"]["version"] == "2.9.9" and found["claude"]["signedIn"] is False
    assert found["claude"]["how"] == "override" and found["claude"]["looked"] == ["your setting (empty)"]


@pytest.mark.skipif(os.name == "nt", reason="the stand-ins are shell scripts")
def test_a_program_in_a_known_folder_or_on_the_shell_path_is_found_and_one_that_cannot_start_says_why(client, nothing_installed, own_shell):
    home = own_shell
    elsewhere = home.parent / "elsewhere"
    for folder, name, first in ((home / ".npm-global" / "bin", "codex", "#!/bin/sh"), (elsewhere, "agy", "#!/bin/sh"), (home / ".local" / "bin", "cursor-agent", "#!/usr/bin/env node-that-is-not-here")):
        folder.mkdir(parents=True)
        (folder / name).write_text(f'{first}\necho "{name} 0.99.1"\n')
        (folder / name).chmod(0o755)
    (home / ".zshrc-path").write_text(str(elsewhere))
    found = client.get("/api/agent/status?fresh=1").json()
    assert (found["codex"]["finding"], found["codex"]["how"], found["codex"]["path"], found["codex"]["version"]) == ("runs", "folder", str(home / ".npm-global" / "bin" / "codex"), "0.99.1")
    assert (found["antigravity"]["finding"], found["antigravity"]["how"], found["antigravity"]["path"]) == ("runs", "shell", str(elsewhere / "agy"))
    assert found["cursor"]["installed"] is False and found["cursor"]["finding"] == "broken" and found["cursor"]["path"] == str(home / ".local" / "bin" / "cursor-agent")
    assert "node-that-is-not-here" in found["cursor"]["error"] and "but does not start: " in found["cursor"]["said"]
    refused = client.post("/api/terminal/agent", json={"kind": "cursor"})
    assert refused.status_code == 404 and refused.json()["detail"] == found["cursor"]["said"]


@pytest.mark.skipif(os.name == "nt", reason="the stand-ins are shell scripts")
def test_the_status_is_kept_until_it_is_asked_for_fresh(client, stand_ins):
    first = client.get("/api/agent/status?fresh=1").json()
    (stand_ins / "codex").write_text('#!/bin/sh\necho "codex 1.0.0"\n')
    assert client.get("/api/agent/status").json() == first
    assert client.get("/api/agent/status?fresh=1").json()["codex"]["version"] == "1.0.0"


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


@pytest.mark.skipif(os.name == "nt", reason="the stand-ins are shell scripts")
def test_each_antigravity_tab_has_a_folder_and_an_entry_of_its_own_until_it_closes(client, bare, stand_ins):
    from app.agent import programs, terminal
    from app.agent.service import agents
    from app.core.config import settings

    shared = settings.data_dir / programs.FOLDER
    first, second = (client.post("/api/terminal/agent", json={"kind": "antigravity", "cols": 80, "rows": 20}) for _ in range(2))
    assert first.status_code == 200 and first.json()["kind"] == "antigravity" and first.json()["title"] == "Antigravity" and second.status_code == 200
    one, two = terminal.SESSIONS[first.json()["id"]], terminal.SESSIONS[second.json()["id"]]
    try:
        assert one.cwd != two.cwd and {Path(one.cwd).parent, Path(two.cwd).parent} == {shared / programs.OWN_FOLDERS}
        tokens = []
        for session in (one, two):
            token = session.env[programs.TOKEN_VAR]
            path = Path(session.cwd) / ".agents" / "mcp_config.json"
            assert json.loads(path.read_text(encoding="utf-8")) == {"mcpServers": {programs.TAB_ENTRY: {"serverUrl": session.env[programs.URL_VAR], "headers": {programs.HEADER: token}}}}
            assert stat.S_IMODE(path.stat().st_mode) == 0o600 and token in agents.tokens and all(token not in part for part in session.argv)
            assert bare.post("/api/boards", json={"title": "from an antigravity tab"}, headers={"x-formref-client": token}).status_code == 201
            tokens.append(token)
        assert tokens[0] != tokens[1] and not (shared / ".agents").exists()
        kept = (Path(two.cwd) / ".agents" / "mcp_config.json").read_text(encoding="utf-8")
        assert client.delete(f"/api/terminal/{one.id}").status_code == 200
        assert not Path(one.cwd).exists() and tokens[0] not in agents.tokens
        assert (Path(two.cwd) / ".agents" / "mcp_config.json").read_text(encoding="utf-8") == kept and tokens[1] in agents.tokens
        assert bare.post("/api/boards", json={"title": "from the tab still open"}, headers={"x-formref-client": tokens[1]}).status_code == 201
        after = bare.post("/api/boards", json={"title": "from a closed tab"}, headers={"x-formref-client": tokens[0]})
        assert after.status_code == 403 and after.json().get("code") == "outside_agents_off"
    finally:
        for session in (one, two):
            if session.id in terminal.SESSIONS:
                assert client.delete(f"/api/terminal/{session.id}").status_code == 200
    assert not Path(two.cwd).exists() and tokens[1] not in agents.tokens


@pytest.mark.skipif(os.name == "nt", reason="the stand-ins are shell scripts")
def test_a_tab_folder_keeps_what_else_is_in_its_file_and_an_unreadable_file_is_a_sentence(client, stand_ins, tmp_path, monkeypatch):
    from app.agent import programs, terminal

    folder = tmp_path / "tab"
    path = folder / ".agents" / "mcp_config.json"
    path.parent.mkdir(parents=True)
    monkeypatch.setattr(programs, "tab_folder", lambda: folder)
    path.write_text("not json at all", encoding="utf-8")
    refused = client.post("/api/terminal/agent", json={"kind": "antigravity"})
    assert refused.status_code == 409 and refused.json()["code"] == "tab_file"
    assert refused.json()["detail"] == f"{path} is not an MCP servers file FormRef can read, so it was left alone and the Antigravity tab was not opened."
    assert path.read_text(encoding="utf-8") == "not json at all"
    seeded = {"mcpServers": {"other": {"command": "/somewhere/else", "args": ["mcp"]}}, "kept": {"a": 1}}
    path.write_text(json.dumps(seeded), encoding="utf-8")
    opened = client.post("/api/terminal/agent", json={"kind": "antigravity"})
    assert opened.status_code == 200
    session = terminal.SESSIONS[opened.json()["id"]]
    try:
        held = json.loads(path.read_text(encoding="utf-8"))
        assert held["mcpServers"]["other"] == seeded["mcpServers"]["other"] and held["kept"] == seeded["kept"] and programs.TAB_ENTRY in held["mcpServers"]
    finally:
        assert client.delete(f"/api/terminal/{session.id}").status_code == 200
    assert json.loads(path.read_text(encoding="utf-8")) == seeded


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
    assert missing.json()["detail"].startswith("Codex was not found. Looked in: ")
    assert client.post("/api/terminal/agent", json={"kind": "vim"}).status_code == 422


def test_starting_a_program_tab_needs_the_window_key(bare, stand_ins):
    r = bare.post("/api/terminal/agent", json={"kind": "codex"})
    assert r.status_code == 403 and r.json() == REFUSED
