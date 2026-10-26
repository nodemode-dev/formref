from conftest import HEALTH_PATH, VERSION_KEY, _SANDBOX, get_json


def test_engine_boots_on_a_free_port_with_an_empty_data_folder(engine):
    status, body = get_json(engine["base"] + HEALTH_PATH)
    assert status == 200 and body["status"] == "ok" and body["app"] == "formref"
    assert body["engine_built"] is True
    assert engine["proc"].poll() is None


def test_engine_reports_the_repository_version(engine, repo_version):
    _, body = get_json(engine["base"] + HEALTH_PATH)
    assert body[VERSION_KEY] == repo_version


def test_engine_keeps_its_boards_in_the_data_folder_it_was_given(engine):
    status, listing = get_json(engine["base"] + "/api/boards")
    assert status == 200
    assert not [p.name for p in (_SANDBOX / "home").iterdir()]
