import json
import subprocess
import time

from conftest import BACKEND, MCP_PATH, STDIO_CMD, tool_catalogue

ACCEPT = {"accept": "application/json, text/event-stream"}
HELLO = {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "family-test", "version": "1"}}}


def reply_of(r):
    if r.headers.get("content-type", "").startswith("text/event-stream"):
        data = [line[5:].strip() for line in r.text.splitlines() if line.startswith("data:")]
        return json.loads(data[-1])
    return r.json()


def test_initialize_without_origin_answers(client):
    r = client.post(MCP_PATH, json=HELLO, headers=ACCEPT)
    assert r.status_code == 200
    result = reply_of(r)["result"]
    assert result["protocolVersion"]
    assert result["serverInfo"]["name"]
    assert "tools" in result["capabilities"]


def test_initialize_from_a_foreign_origin_is_refused(client):
    for origin in ("http://evil.example", "http://localhost:3099"):
        assert client.post(MCP_PATH, json=HELLO, headers={**ACCEPT, "origin": origin}).status_code == 403


def test_tools_list_matches_the_catalogue(client):
    listed = reply_of(client.post(MCP_PATH, json={"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}, headers=ACCEPT))["result"]["tools"]
    assert sorted(t["name"] for t in listed) == sorted(t["name"] for t in tool_catalogue())
    for tool in listed:
        assert tool["description"].strip()
        assert tool["inputSchema"]["type"] == "object"


def test_unknown_method_is_a_jsonrpc_error(client):
    reply = reply_of(client.post(MCP_PATH, json={"jsonrpc": "2.0", "id": 4, "method": "no/such/method", "params": {}}, headers=ACCEPT))
    assert reply["error"]["code"] in (-32601, -32602)


def relay(engine, lines, wanted, timeout=60):
    env = dict(engine["env"], FORMREF_API_URL=engine["base"])
    proc = subprocess.Popen(STDIO_CMD, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env, cwd=BACKEND)
    try:
        for m in lines:
            proc.stdin.write(json.dumps(m) + "\n")
        proc.stdin.flush()
        replies = {}
        deadline = time.monotonic() + timeout
        while not set(wanted) <= set(replies) and time.monotonic() < deadline:
            line = proc.stdout.readline()
            if not line:
                break
            if line.strip().startswith("{"):
                m = json.loads(line)
                replies[m.get("id")] = m
        assert set(wanted) <= set(replies), f"replies {sorted(replies, key=str)}"
        return replies
    finally:
        proc.stdin.close()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()


def _call(rid, name, args):
    return {"jsonrpc": "2.0", "id": rid, "method": "tools/call", "params": {"name": name, "arguments": args}}


def test_the_stdio_relay_lists_the_tools_and_reads_through_the_engine(engine):
    replies = relay(engine, [HELLO, {"jsonrpc": "2.0", "method": "notifications/initialized"}, {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}, _call(3, "list_boards", {})], [2, 3])
    assert sorted(t["name"] for t in replies[2]["result"]["tools"]) == sorted(t["name"] for t in tool_catalogue())
    assert not replies[3]["result"].get("isError"), replies[3]


def test_an_outside_agent_cannot_change_a_board_until_the_person_allows_it(engine):
    replies = relay(engine, [HELLO, {"jsonrpc": "2.0", "method": "notifications/initialized"}, _call(5, "create_board", {"title": "From outside"})], [5])
    result = replies[5].get("result") or {}
    text = json.dumps(replies[5])
    assert result.get("isError") or "error" in replies[5], text
    assert "Outside agents are off" in text
