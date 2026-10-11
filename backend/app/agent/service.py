import asyncio
import json
import os
import secrets
import uuid

import httpx

from ..core.config import ROOT, settings
from ..core.store import store
from . import runners

API_URL = os.environ.get("FORMREF_API_URL", "http://127.0.0.1:8196").rstrip("/")
DEFAULTS = {"runner": "claude", "ollama_url": "http://127.0.0.1:11434", "ollama_model": "", "outside_agents": False, "model": ""}
MAX_STEPS = 12
SNAPSHOT_KEYS = ("items", "connections", "settings", "title", "background")


class Agents:
    def __init__(self):
        self.tokens: set[str] = set()
        self.turns: dict[str, dict] = {}
        self.processes: dict[str, asyncio.subprocess.Process] = {}
        self.stopped: set[str] = set()
        self.cli_turns = 0

    @property
    def path(self):
        return settings.data_dir / "agent.json"

    def settings(self) -> dict:
        try:
            saved = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            saved = {}
        return {**DEFAULTS, **{k: v for k, v in saved.items() if k in DEFAULTS}}

    def save(self, patch: dict) -> dict:
        current = self.settings()
        for key, value in patch.items():
            if key not in DEFAULTS:
                raise ValueError(f"Unknown agent setting {key}.")
            if key == "outside_agents" and not isinstance(value, bool):
                raise ValueError("outside_agents must be true or false.")
            if key == "runner" and value not in ("claude", "codex", "cursor", "ollama"):
                raise ValueError("runner must be claude, codex, cursor or ollama.")
            if key in ("ollama_url", "ollama_model", "model") and not isinstance(value, str):
                raise ValueError(f"{key} must be text.")
            if key == "ollama_url" and not value.startswith(("http://127.0.0.1", "http://localhost", "http://[::1]")):
                raise ValueError("ollama_url must be a loopback address.")
            current[key] = value
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        store.atomic_write(self.path, json.dumps(current, indent=1).encode())
        return current

    def allows(self, client: str) -> bool:
        if client in self.tokens:
            return True
        if client == "outside" and self.cli_turns > 0:
            return True
        return bool(self.settings()["outside_agents"])

    async def available(self) -> list[dict]:
        rows = []
        for key, spec in runners.CLI.items():
            path = runners.find(key)
            rows.append({"id": key, "label": spec["label"], "available": bool(path), "path": path or "", "note": "" if path else spec["install"]})
        url = self.settings()["ollama_url"]
        models = []
        try:
            async with httpx.AsyncClient(timeout=1.5, trust_env=False) as client:
                response = await client.get(url + "/api/tags")
                response.raise_for_status()
                models = [m.get("name", "") for m in response.json().get("models", [])]
            note = "" if models else "Ollama is running but has no models; pull one with `ollama pull <model>`."
        except (httpx.HTTPError, ValueError):
            note = f"Ollama is not answering at {url}. Start it with `ollama serve`."
        rows.append({"id": "ollama", "label": "Ollama", "available": bool(models), "path": url, "note": note, "models": models})
        return rows

    def snapshot(self, board_id: str) -> dict:
        board = store.get(board_id)["board"]
        return {k: board.get(k) for k in SNAPSHOT_KEYS}

    def undo_turn(self, turn_id: str) -> dict:
        turn = self.turns.get(turn_id)
        if not turn:
            raise ValueError("That turn is no longer known to this session.")
        state = store.get(turn["board_id"])
        for _ in range(100):
            if {k: state["board"].get(k) for k in SNAPSHOT_KEYS} == turn["before"]:
                return {"restored": True, "state": state}
            if not state["can_undo"]:
                break
            state = store.mutate(turn["board_id"], history="undo")
        return {"restored": {k: state["board"].get(k) for k in SNAPSHOT_KEYS} == turn["before"], "state": state}

    def stop(self, turn_id: str) -> bool:
        self.stopped.add(turn_id)
        process = self.processes.get(turn_id)
        if process and process.returncode is None:
            process.terminate()
        return True

    async def turn(self, board_id: str, message: str, runner: str):
        config = self.settings()
        runner = runner or config["runner"]
        turn_id = uuid.uuid4().hex
        token = secrets.token_hex(16)
        self.turns[turn_id] = {"board_id": board_id, "before": self.snapshot(board_id), "runner": runner}
        self.tokens.add(token)
        prompt = f"The open board id is {board_id}.\n\n{message}"
        yield {"type": "start", "turn_id": turn_id, "runner": runner}
        try:
            if runner == "ollama":
                async for event in self._ollama(turn_id, prompt, token, config):
                    yield event
            else:
                async for event in self._cli(turn_id, runner, prompt, token, config):
                    yield event
        except Exception as exc:
            yield {"type": "error", "message": str(exc)}
        finally:
            self.tokens.discard(token)
            self.processes.pop(turn_id, None)
            after = self.snapshot(board_id)
            yield {"type": "done", "turn_id": turn_id, "changed": after != self.turns[turn_id]["before"], "stopped": turn_id in self.stopped}

    async def _cli(self, turn_id, runner, prompt, token, config):
        binary = runners.find(runner)
        if not binary:
            raise ValueError(f"{runners.CLI[runner]['label']} is not installed on this computer. {runners.CLI[runner]['install']}")
        env = {**os.environ, "FORMREF_API_URL": API_URL, "FORMREF_AGENT_TOKEN": token}
        self.cli_turns += 1
        try:
            process = await asyncio.create_subprocess_exec(*runners.argv(runner, binary, prompt, token, API_URL, config["model"]),
                                                           cwd=str(ROOT), env=env, stdin=asyncio.subprocess.DEVNULL,
                                                           stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, limit=8 * 1024 * 1024)
            self.processes[turn_id] = process
            async for raw in process.stdout:
                for event in runners.parse(runner, raw.decode("utf-8", "replace").strip()):
                    yield event
            code = await process.wait()
            if code and turn_id not in self.stopped:
                tail = (await process.stderr.read()).decode("utf-8", "replace").strip()[-800:]
                yield {"type": "error", "message": f"{runners.CLI[runner]['label']} exited with code {code}. {tail}"}
        finally:
            self.cli_turns -= 1

    async def _ollama(self, turn_id, prompt, token, config):
        from .. import mcp_server
        model = config["ollama_model"]
        if not model:
            raise ValueError("Choose an Ollama model in the agent settings first.")
        listed = await mcp_server.mcp.list_tools()
        tools = [{"type": "function", "function": {"name": t.name, "description": t.description or "", "parameters": t.inputSchema}} for t in listed]
        messages = [{"role": "system", "content": runners.SYSTEM}, {"role": "user", "content": prompt}]
        marker = mcp_server.CLIENT_TOKEN.set(token)
        try:
            async with httpx.AsyncClient(timeout=180, trust_env=False) as client:
                for _ in range(MAX_STEPS):
                    if turn_id in self.stopped:
                        return
                    response = await client.post(config["ollama_url"] + "/v1/chat/completions", json={"model": model, "messages": messages, "tools": tools, "stream": False})
                    response.raise_for_status()
                    reply = response.json()["choices"][0]["message"]
                    messages.append(reply)
                    if reply.get("content"):
                        yield {"type": "text", "text": reply["content"]}
                    calls = reply.get("tool_calls") or []
                    if not calls:
                        return
                    for call in calls:
                        name = call["function"]["name"]
                        try:
                            args = json.loads(call["function"].get("arguments") or "{}")
                        except ValueError:
                            args = {}
                        yield {"type": "tool", "name": name, "args": args, "id": call.get("id", "")}
                        try:
                            result = await mcp_server.mcp.call_tool(name, args)
                            content = result[0] if isinstance(result, tuple) else result
                            text = "\n".join(getattr(part, "text", "") for part in content) if isinstance(content, list) else json.dumps(content, default=str)
                            ok = True
                        except Exception as exc:
                            text, ok = str(exc), False
                        yield {"type": "tool_result", "id": call.get("id", ""), "ok": ok, "summary": runners._short(text)}
                        messages.append({"role": "tool", "tool_call_id": call.get("id", ""), "content": text[:20000]})
                yield {"type": "error", "message": f"Stopped after {MAX_STEPS} steps."}
        finally:
            mcp_server.CLIENT_TOKEN.reset(marker)


agents = Agents()
