import json
import urllib.error
import urllib.request

FIELDS = {"refusals", "id", "agent", "what", "answers", "always", "expires", "held"}


def _send(url, body, headers):
    req = urllib.request.Request(url, method="POST", data=json.dumps(body).encode(), headers={"content-type": "application/json", **headers})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def _until(stream, name):
    while True:
        line = stream.readline().decode("utf-8")
        assert line, "the event stream ended"
        if line.strip() == f"event: {name}":
            return json.loads(stream.readline().decode("utf-8")[len("data: "):])


def test_a_refusal_tells_the_window_who_asked_and_what_for(engine):
    base = engine["base"]
    if "key" not in engine:
        engine["key"] = _send(base + "/api/window/key", {}, {})[1]["key"]
    status, made = _send(base + "/api/boards", {"title": "consent"}, {"x-formref-window-key": engine["key"]})
    assert status == 201
    with urllib.request.urlopen(base + f"/api/boards/{made['board']['id']}/events", timeout=10) as stream:
        _until(stream, "revision")
        status, refused = _send(base + "/api/boards", {"title": "x"}, {"x-formref-client": "outside", "x-formref-agent": "Probe Agent"})
        assert status == 403 and refused["code"] == "outside_agents_off"
        first = _until(stream, "consent")
        assert set(first) == FIELDS
        assert first["agent"] == "Probe Agent" and first["what"] == "create a board"
        assert first["answers"] == ["deny", "always"] and first["always"] == "all" and first["expires"] is None and first["held"] is False
        status, _ = _send(base + f"/api/boards/{made['board']['id']}/commands", {"command": {"type": "noop"}}, {"x-formref-client": "outside"})
        assert status == 403
        second = _until(stream, "consent")
        assert second["refusals"] == first["refusals"] + 1 and second["id"] != first["id"]
        assert second["agent"] == "" and second["what"] == "change a board"


def test_the_agent_name_is_kept_short_and_printable(bare):
    from app.agent.service import agents

    r = bare.post("/api/boards", json={"title": "x"}, headers={"x-formref-client": "outside", "x-formref-agent": "A" * 200})
    assert r.status_code == 403
    assert agents.refusal["agent"] == "A" * 64
