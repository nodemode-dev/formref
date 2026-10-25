import asyncio
import json
import os
import secrets
import uuid

import httpx

from ..core.config import ROOT, settings
from ..core.store import store
from . import runners

API_URL = os.environ.get("FORMREF_API_URL", "http://127.0.0.1:8320").rstrip("/")
DEFAULTS = {"runner": "claude", "ollama_url": "http://127.0.0.1:11434", "ollama_model": "", "outside_agents": False, "model": "", "confirm_changes": True, "claude_folder": "", "claude_bin": "", "claude_first_message": ""}
MAX_STEPS = 12
SNAPSHOT_KEYS = ("items", "connections", "settings", "title", "background")
BULK = 10
CONFIRM_SECONDS = 300
MOVES = {"transform": "Move or resize", "pack": "Pack", "sort": "Sort and lay out", "distribute": "Distribute", "align": "Align", "snap": "Snap", "normalize": "Resize"}


class Agents:
    def __init__(self):
        self.tokens: set[str] = set()
        self.turns: dict[str, dict] = {}
        self.processes: dict[str, asyncio.subprocess.Process] = {}
        self.stopped: set[str] = set()
        self.cli_turns = 0
        self.cli_active: list[str] = []
        self.refusals = 0
        self.token_turn: dict[str, str] = {}
        self.queues: dict[str, asyncio.Queue] = {}
        self.pending: dict[str, dict] = {}
        self.approved: set[str] = set()

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
            if key in ("outside_agents", "confirm_changes") and not isinstance(value, bool):
                raise ValueError(f"{key} must be true or false.")
            if key == "runner" and value not in ("claude", "codex", "cursor", "ollama"):
                raise ValueError("runner must be claude, codex, cursor or ollama.")
            if key in ("ollama_url", "ollama_model", "model", "claude_folder", "claude_bin", "claude_first_message") and not isinstance(value, str):
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
        self._close_pending(turn_id)
        process = self.processes.get(turn_id)
        if process and process.returncode is None:
            process.terminate()
        return True

    def review(self, method: str, path: str, body: bytes) -> str | None:
        """Describe a deletion or bulk move that needs the person's yes, or None."""
        parts = path.strip("/").split("/")
        if parts[:2] != ["api", "boards"] or len(parts) < 3:
            return None
        if method == "DELETE" and len(parts) == 3:
            return "Delete this whole board."
        if method != "POST" or len(parts) != 4 or parts[3] != "commands":
            return None
        try:
            command = json.loads(body or b"{}").get("command")
            items = {item["id"]: item for item in store.get(parts[2])["board"]["items"]}
        except Exception:
            return None
        return self._risky(command, items)

    def _risky(self, command, items: dict) -> str | None:
        if not isinstance(command, dict):
            return None
        kind = command.get("type")
        ids = [i for i in command.get("ids") or [] if isinstance(i, str)] if isinstance(command.get("ids"), list) else []
        if kind == "batch" and isinstance(command.get("commands"), list):
            return " ".join(filter(None, (self._risky(part, items) for part in command["commands"]))) or None
        if kind == "remove" and ids:
            names = [items[i].get("title") or items[i]["kind"] for i in ids[:5] if i in items]
            more = f" and {len(ids) - 5} more" if len(ids) > 5 else ""
            return f"Remove {len(ids)} item{'s' if len(ids) != 1 else ''}: {', '.join(names)}{more}."
        if kind in MOVES and len(ids) >= BULK:
            return f"{MOVES[kind]} {len(ids)} items at once."
        return None

    async def confirm(self, client: str, summary: str) -> bool:
        """Hold a risky write from a panel turn until the person answers in the Agent panel."""
        turn_id = self.token_turn.get(client) or (self.cli_active[-1] if client == "outside" and self.cli_active else None)
        queue = self.queues.get(turn_id or "")
        if queue is None or turn_id in self.approved or not self.settings()["confirm_changes"]:
            return True
        confirm_id = uuid.uuid4().hex
        future = asyncio.get_running_loop().create_future()
        self.pending[confirm_id] = {"future": future, "turn_id": turn_id}
        await queue.put({"type": "confirm", "id": confirm_id, "summary": summary, "seconds": CONFIRM_SECONDS})
        try:
            return await asyncio.wait_for(future, CONFIRM_SECONDS)
        except asyncio.TimeoutError:
            await queue.put({"type": "confirm_closed", "id": confirm_id, "allowed": False, "reason": "No answer in five minutes, so it was declined."})
            return False
        finally:
            self.pending.pop(confirm_id, None)

    def answer(self, confirm_id: str, allow: bool, whole_turn: bool) -> bool:
        entry = self.pending.get(confirm_id)
        if not entry or entry["future"].done():
            return False
        if allow and whole_turn:
            self.approved.add(entry["turn_id"])
        entry["future"].set_result(allow)
        return True

    def _close_pending(self, turn_id: str):
        for entry in list(self.pending.values()):
            if entry["turn_id"] == turn_id and not entry["future"].done():
                entry["future"].set_result(False)

    async def turn(self, board_id: str, message: str, runner: str):
        config = self.settings()
        runner = runner or config["runner"]
        turn_id = uuid.uuid4().hex
        token = secrets.token_hex(16)
        self.turns[turn_id] = {"board_id": board_id, "before": self.snapshot(board_id), "runner": runner}
        self.tokens.add(token)
        self.token_turn[token] = turn_id
        queue = self.queues[turn_id] = asyncio.Queue()
        prompt = f"The open board id is {board_id}.\n\n{message}"
        yield {"type": "start", "turn_id": turn_id, "runner": runner}

        async def pump():
            try:
                source = self._ollama(turn_id, prompt, token, config) if runner == "ollama" else self._cli(turn_id, runner, prompt, token, config)
                async for event in source:
                    await queue.put(event)
            except Exception as exc:
                await queue.put({"type": "error", "message": str(exc)})
            finally:
                await queue.put(None)

        task = asyncio.create_task(pump())
        try:
            while (event := await queue.get()) is not None:
                yield event
        finally:
            if not task.done():
                self.stop(turn_id)
                task.cancel()
            self._close_pending(turn_id)
            self.tokens.discard(token)
            self.token_turn.pop(token, None)
            self.queues.pop(turn_id, None)
            self.approved.discard(turn_id)
            self.processes.pop(turn_id, None)
        after = self.snapshot(board_id)
        yield {"type": "done", "turn_id": turn_id, "changed": after != self.turns[turn_id]["before"], "stopped": turn_id in self.stopped}

    async def _cli(self, turn_id, runner, prompt, token, config):
        binary = runners.find(runner)
        if not binary:
            raise ValueError(f"{runners.CLI[runner]['label']} is not installed on this computer. {runners.CLI[runner]['install']}")
        env = {**os.environ, "FORMREF_API_URL": API_URL, "FORMREF_AGENT_TOKEN": token}
        self.cli_turns += 1
        self.cli_active.append(turn_id)
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
            self.cli_active.remove(turn_id)

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
