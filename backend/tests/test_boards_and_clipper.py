import base64
import io
import json

import pytest
from PIL import Image

EXTENSION = {"origin": "chrome-extension://abcdefghijklmnopabcdefghijklmnop"}


def _board(client, title="Board"):
    r = client.post("/api/boards", json={"title": title})
    assert r.status_code == 201, r.text
    return r.json()["board"]["id"]


def _command(client, board_id, command):
    r = client.post(f"/api/boards/{board_id}/commands", json={"command": command})
    assert r.status_code == 200, r.text
    return r.json()["board"]


def _filled(client):
    bid = _board(client, "Filled")
    _command(client, bid, {"type": "add", "items": [
        {"id": "n1", "kind": "note", "text": "first note", "x": 10, "y": 20, "width": 120, "height": 80},
        {"id": "n2", "kind": "note", "text": "second note", "x": 200, "y": 20, "width": 120, "height": 80},
    ]})
    _command(client, bid, {"type": "group", "ids": ["n1", "n2"], "group_id": "g1"})
    _command(client, bid, {"type": "connect", "connection": {"id": "c1", "from": "n1", "to": "n2", "label": "next"}})
    return bid


def _shape(board):
    items = sorted((i["id"], i["kind"], i.get("text"), i["x"], i["y"], i.get("group_id")) for i in board["items"])
    links = sorted((c["from"], c["to"], c.get("label")) for c in board["connections"])
    return items, links, board["title"]


def test_a_board_reads_back_the_same_after_the_engine_restarts(client):
    from app.core.engine import broker

    bid = _filled(client)
    before = client.get(f"/api/boards/{bid}").json()["board"]
    broker.close()
    after = client.get(f"/api/boards/{bid}").json()["board"]
    assert _shape(after) == _shape(before)
    assert after["revision"] == before["revision"]


def test_undo_through_the_service_restores_the_board_and_redo_brings_it_back(client):
    bid = _filled(client)
    with_link = _shape(client.get(f"/api/boards/{bid}").json()["board"])
    r = client.post(f"/api/boards/{bid}/undo")
    assert r.status_code == 200
    assert r.json()["board"]["connections"] == []
    r = client.post(f"/api/boards/{bid}/redo")
    assert _shape(r.json()["board"]) == with_link


def test_a_stale_revision_is_refused(client):
    bid = _filled(client)
    r = client.post(f"/api/boards/{bid}/commands", json={"command": {"type": "rename", "title": "Late"}, "expected_revision": 0})
    assert r.status_code == 409


def test_a_portable_export_imports_as_the_same_board(client):
    bid = _filled(client)
    original = client.get(f"/api/boards/{bid}").json()["board"]
    exported = client.get(f"/api/boards/{bid}/export?format=portable")
    assert exported.status_code == 200 and exported.content[:4] == b"PK\x03\x04"
    r = client.post("/api/import", files={"file": ("Filled.formref", exported.content, "application/zip")})
    assert r.status_code == 201, r.text
    imported = r.json()["board"]
    assert imported["id"] != original["id"]
    items, links, _ = _shape(imported)
    assert [i[1:3] for i in items] == [i[1:3] for i in _shape(original)[0]]
    assert len(links) == 1 and links[0][2] == "next"


def _png(color):
    buf = io.BytesIO()
    Image.new("RGB", (8, 6), color).save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def test_an_istack_project_imports_its_items_groups_and_drawings(client):
    project = {
        "format": "istack", "version": 3, "bgColor": "#202020", "zoom": 1.5,
        "items": [
            {"id": 1, "type": "image", "name": "Red swatch", "x": 0, "y": 0, "w": 80, "h": 60, "groupId": "A", "_imageData": _png((200, 30, 30)), "flipH": True},
            {"id": 2, "type": "note", "name": "Idea", "x": 100, "y": 0, "w": 160, "h": 90, "text": "warm palette", "groupId": "A"},
            {"id": 3, "type": "image", "name": "Lost file", "x": 0, "y": 100, "w": 80, "h": 60, "_sourcePath": "/Volumes/Old/ref.jpg"},
            {"id": 4, "type": "video", "name": "Not supported"},
        ],
        "drawings": [{"tool": "line", "color": "#00ff00", "size": 3, "startPos": {"x": 0, "y": 200}, "points": [{"x": 50, "y": 250}]}],
    }
    r = client.post("/api/import", files={"file": ("Moodboard.istack", json.dumps(project).encode(), "application/json")})
    assert r.status_code == 201, r.text
    state = r.json()
    board = state["board"]
    by_title = {i["title"]: i for i in board["items"]}
    assert set(by_title) == {"Red swatch", "Idea", "Lost file", "Imported line"}
    assert by_title["Red swatch"]["asset_id"] and by_title["Red swatch"]["data"]["flip_x"] is True
    assert by_title["Idea"]["text"] == "warm palette"
    assert by_title["Red swatch"]["group_id"] == by_title["Idea"]["group_id"] is not None
    assert by_title["Lost file"]["group_id"] is None
    assert by_title["Lost file"]["data"]["unresolved"] is True
    assert by_title["Imported line"]["kind"] == "shape"
    assert board["title"] == "Moodboard" and board["background"] == "#202020"
    report = state["import_report"]
    assert report["imported_item_count"] == 4
    assert [u["source_path"] for u in report["unresolved_assets"]] == ["/Volumes/Old/ref.jpg"]
    assert len(report["unsupported_records"]) == 1
    assert report["id_mapping"].keys() == {"1", "2", "3"}


@pytest.mark.parametrize("project", [{"format": "istack"}, {"format": "istack", "items": "nope"}, {"format": "istack", "items": [1]}])
def test_a_broken_istack_project_is_refused(client, project):
    r = client.post("/api/import", files={"file": ("Bad.istack", json.dumps(project).encode(), "application/json")})
    assert r.status_code == 422


def test_the_clipper_needs_its_pairing_token(client):
    token = client.get("/api/clip/token").json()["token"]
    for headers in ({}, {"x-formref-clip-token": "wrong"}, {"x-formref-clip-token": token[:-1]}):
        assert client.post("/api/clip", json={"kind": "text", "text": "clipped"}, headers={**EXTENSION, **headers}).status_code == 401
        assert client.get("/api/clip/boards", headers={**EXTENSION, **headers}).status_code == 401
    r = client.post("/api/clip", json={"kind": "text", "text": "clipped words", "page_title": "A page"}, headers={**EXTENSION, "x-formref-clip-token": token})
    assert r.status_code == 201, r.text
    landed = r.json()
    board = client.get(f"/api/boards/{landed['board_id']}").json()["board"]
    note = next(i for i in board["items"] if i["id"] == landed["item_id"])
    assert note["kind"] == "note" and note["text"].startswith("clipped words")


def test_the_clipper_token_is_only_for_formrefs_own_page(client):
    assert client.get("/api/clip/token", headers=EXTENSION).status_code == 403
    assert client.post("/api/clip/token/reset", headers=EXTENSION).status_code == 403
    assert client.get("/api/boards", headers=EXTENSION).status_code == 403


def test_resetting_the_token_unpairs_the_old_one(client):
    old = client.get("/api/clip/token").json()["token"]
    new = client.post("/api/clip/token/reset").json()["token"]
    assert new != old
    assert client.get("/api/clip/boards", headers={**EXTENSION, "x-formref-clip-token": old}).status_code == 401
    assert client.get("/api/clip/boards", headers={**EXTENSION, "x-formref-clip-token": new}).status_code == 200
