import json

import pytest

from app import cli
from app.core.config import settings


@pytest.fixture
def layout(tmp_path, monkeypatch):
    skills = tmp_path / ".claude" / "skills"
    reference = skills / "formref-harness" / "references" / "commands.md"
    mirror = tmp_path / ".agents" / "skills"
    (skills / "formref-harness" / "sub-skills").mkdir(parents=True)
    (skills / "formref-harness" / "SKILL.md").write_text("new", encoding="utf-8")
    (skills / "formref-harness" / "sub-skills" / "one.md").write_text("one", encoding="utf-8")
    (mirror / "formref-harness" / "agents").mkdir(parents=True)
    (mirror / "formref-harness" / "SKILL.md").write_text("old", encoding="utf-8")
    (mirror / "formref-harness" / "agents" / "openai.yaml").write_text("keep", encoding="utf-8")
    monkeypatch.setattr(cli, "REFERENCE", reference)
    monkeypatch.setattr(cli, "SKILLS", skills)
    monkeypatch.setattr(cli, "MIRROR", mirror)
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    catalogue = settings.data_dir / "commands-catalogue.json"
    catalogue.write_text(json.dumps({"commands": [{"id": "x", "group": "G", "label": "X", "description": "does x"}]}), encoding="utf-8")
    yield skills, mirror
    catalogue.unlink()


def test_check_fails_then_sync_copies_then_check_passes(layout, capsys):
    skills, mirror = layout
    with pytest.raises(SystemExit):
        cli.agents_sync(["sync", "--check"])
    cli.agents_sync(["sync"])
    assert (mirror / "formref-harness" / "SKILL.md").read_text(encoding="utf-8") == "new"
    assert (mirror / "formref-harness" / "sub-skills" / "one.md").read_text(encoding="utf-8") == "one"
    assert (mirror / "formref-harness" / "references" / "commands.md").is_file()
    assert (mirror / "formref-harness" / "agents" / "openai.yaml").read_text(encoding="utf-8") == "keep"
    cli.agents_sync(["sync", "--check"])
    assert "up to date" in capsys.readouterr().out


def test_check_fails_when_one_skill_file_changes(layout):
    skills, mirror = layout
    cli.agents_sync(["sync"])
    (skills / "formref-harness" / "sub-skills" / "one.md").write_text("changed", encoding="utf-8")
    with pytest.raises(SystemExit):
        cli.agents_sync(["sync", "--check"])
