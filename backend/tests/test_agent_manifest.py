import json

import pytest

from app import agent_manifest, cli
from app.agent.service import agents


def test_committed_manifest_is_current():
    assert agent_manifest.PATH.read_text(encoding="utf-8") == agent_manifest.text(), "agents/manifest.json is out of date; run ./formref agents sync."


def test_manifest_fields_follow_the_schema():
    value = json.loads(agent_manifest.text())
    assert list(value) == ["format", "version", "app", "mcp", "skills", "dock", "extensions"]
    mcp = value["mcp"]
    assert len(set(mcp["tools"])) == len(mcp["tools"])
    assert set(mcp["read_only"]) <= set(mcp["tools"]) and set(mcp["approval_gated"]) <= set(mcp["tools"])
    assert not set(mcp["read_only"]) & set(mcp["approval_gated"])
    assert mcp["transports"] == ["stdio", "http"]
    assert [skill["name"] for skill in value["skills"]] == ["formref-harness"]


def test_gated_types_are_the_ones_the_gate_asks_about():
    items = {str(n): {"id": str(n), "kind": "note", "title": "t"} for n in range(12)}
    ids = list(items)
    for kind in agent_manifest.GATED_TYPES:
        assert agents._risky({"type": kind, "ids": ids}, items), kind
    for kind in ("update", "add", "settings", "rotate", "opacity", "connect"):
        assert agents._risky({"type": kind, "ids": ids}, items) is None, kind


def test_gated_tools_are_the_ones_that_send_those_commands():
    gated = set(json.loads(agent_manifest.text())["mcp"]["approval_gated"])
    assert {"remove_items", "transform_items", "snap_items", "arrange_items", "run_command", "run_commands"} == gated


def test_check_names_the_file_when_the_manifest_differs(tmp_path, monkeypatch):
    held = tmp_path / "agents" / "manifest.json"
    held.parent.mkdir()
    held.write_text(agent_manifest.text().replace("list_boards", "list_all_boards"), encoding="utf-8")
    monkeypatch.setattr(agent_manifest, "PATH", held)
    monkeypatch.setattr(agent_manifest, "ROOT", tmp_path)
    with pytest.raises(SystemExit) as stopped:
        cli.agents_sync(["sync", "--check"])
    assert "agents/manifest.json" in str(stopped.value)
