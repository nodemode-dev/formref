import hashlib
import json
import re
import shutil
from pathlib import Path

import pytest

from app import agent_manifest, cli

ROOT = Path(__file__).resolve().parents[2]
DOCK = ROOT / "frontend" / "src" / "dock"
SOURCE = ROOT / "frontend" / "src"


def _imports(path):
    return set(re.findall(r"(?:from|import)\s*\(?'([^']+)'", path.read_text(encoding="utf-8")))


def test_the_shared_dock_files_match_their_manifest():
    kept = json.loads((DOCK / "MANIFEST.json").read_text(encoding="utf-8"))
    assert kept["module"] == "dock" and kept["version"] == "2.1.0"
    now = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in DOCK.iterdir() if p.is_file() and p.name != "MANIFEST.json"}
    assert kept["files"] == now
    assert f"Module version {kept['version']}." in (DOCK / "CONTRACT.md").read_text(encoding="utf-8")
    assert agent_manifest.dock_problems() == []


def test_agents_sync_names_a_shared_file_edited_in_place(tmp_path, monkeypatch):
    copy = tmp_path / "frontend" / "src" / "dock"
    shutil.copytree(DOCK, copy)
    monkeypatch.setattr(agent_manifest, "ROOT", tmp_path)
    monkeypatch.setattr(agent_manifest, "DOCK_FOLDER", copy)
    assert agent_manifest.dock_problems() == []
    with open(copy / "dock.ts", "a", encoding="utf-8") as f:
        f.write("\n")
    said = "frontend/src/dock/dock.ts: does not match MANIFEST.json (the shared dock module changes only as a whole new version)"
    assert agent_manifest.dock_problems() == [said]
    for args in (["sync", "--check"], ["sync"]):
        with pytest.raises(SystemExit) as stop:
            cli.agents_sync(args)
        assert said in str(stop.value)
    (copy / "extra.ts").write_text("export {};\n", encoding="utf-8")
    assert "frontend/src/dock/extra.ts" in " ".join(agent_manifest.dock_problems())


LOOKUP = "backend/app/agent/agent_lookup.py"


def test_the_shared_finder_matches_the_hash_recorded_for_its_version():
    version = re.search(r'^VERSION = "([^"]+)"$', (ROOT / LOOKUP).read_text(encoding="utf-8"), re.M).group(1)
    assert agent_manifest.LOOKUP == ROOT / LOOKUP
    assert agent_manifest.LOOKUP_HASHES[version] == hashlib.sha256((ROOT / LOOKUP).read_bytes()).hexdigest()
    assert agent_manifest.lookup_problems() == []


def test_agents_sync_names_the_shared_finder_edited_in_place_or_missing(tmp_path, monkeypatch):
    copy = tmp_path / LOOKUP
    copy.parent.mkdir(parents=True)
    shutil.copy(ROOT / LOOKUP, copy)
    monkeypatch.setattr(agent_manifest, "LOOKUP", copy)
    assert agent_manifest.lookup_problems() == []
    with open(copy, "a", encoding="utf-8") as f:
        f.write("\n")
    said = f"{LOOKUP}: does not match the hash recorded for version 1.0.0 (the shared finder changes only as a whole new version)"
    assert agent_manifest.lookup_problems() == [said]
    for args in (["sync", "--check"], ["sync"]):
        with pytest.raises(SystemExit) as stop:
            cli.agents_sync(args)
        assert said in str(stop.value)
    copy.unlink()
    assert agent_manifest.lookup_problems() == [f"{LOOKUP}: missing (the shared finder for the agent programs)"]


def test_the_shared_finder_imports_nothing_from_the_app():
    imports = set(re.findall(r"^\s*(?:from|import)\s+([\w.]+)", (ROOT / LOOKUP).read_text(encoding="utf-8"), re.M))
    assert imports == {"__future__", "dataclasses", "os", "pathlib", "re", "shutil", "signal", "subprocess", "sys", "threading", "time", "winreg"}


def test_the_shared_dock_imports_nothing_from_the_app():
    outside = sorted({i for p in DOCK.glob("*.ts") for i in _imports(p) if not i.startswith(("./", "@xterm/"))})
    assert outside == [], outside


def test_only_the_lazily_loaded_file_imports_the_emulator():
    assert {p.name for p in DOCK.glob("*.ts") if any(i.startswith("@xterm/") for i in _imports(p))} == {"terminal.ts"}
    dock = (DOCK / "dock.ts").read_text(encoding="utf-8")
    assert re.findall(r"^import (?!type)[^;]*'\./terminal'", dock, re.M) == [] and "import('./terminal')" in dock
    app = [p for p in SOURCE.rglob("*.ts") if DOCK not in p.parents]
    assert [p.name for p in app if any(i.startswith("@xterm/") for i in _imports(p))] == []


def test_the_page_reserves_the_dock_from_the_key_the_adapter_uses_and_moves_the_old_height():
    adapter = (SOURCE / "dock-adapter.ts").read_text(encoding="utf-8")
    page = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    assert "DOCK_KEY = 'formref.dock'" in adapter and "DOCK_OLD_HEIGHT = 'formref-term-dock-h'" in adapter
    assert "store.getItem('formref.dock')" in page and "store.getItem('formref-term-dock-h')" in page
    for name in ("data-ft-dock", "data-ft-dock-side", "data-ft-dock-h", "data-ft-dock-w", "--ft-dock-size", "--ft-dock-wsize"):
        assert f"'{name}'" in page, name
    assert 'id="term-dock"' not in page and 'id="consent-dialog"' not in page


def test_the_apps_own_tabs_use_an_entry_named_formref_tab():
    from app.agent import chat, claude_code
    from app.agent.service import agents

    token, path = claude_code.issue()
    try:
        assert list(json.loads(open(path, encoding="utf-8").read())["mcpServers"]) == ["formref_tab"]
    finally:
        claude_code.revoke(token)
    assert "--allowedTools mcp__formref_tab " in " ".join(claude_code.argv("claude", None, None, path))
    assert "--allowedTools mcp__formref_tab " in " ".join(chat._argv("claude", "hello", None, path))
    assert not agents.allows(token)
