import asyncio
import json
import time
import uuid

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

from ..agent.service import agents
from ..core.config import settings
from ..core.store import store

router = APIRouter(prefix="/api/commands", tags=["commands"])
CATALOGUE: dict[str, dict] = {}
JOBS: asyncio.Queue = asyncio.Queue()
WAITING: dict[str, asyncio.Future] = {}
STATE = {"polled": 0.0}
POLL_SECONDS = 25
RUN_SECONDS = 60
GONE = "formref.poll_gone"


def _window_only(request: Request) -> None:
    if request.headers.get("x-formref-client"):
        raise HTTPException(status_code=403, detail="Only the FormRef window may call this.")


class Mirror(BaseModel):
    commands: list[dict] = Field(max_length=2000)


class Run(BaseModel):
    params: dict = Field(default_factory=dict)


@router.post("/catalogue")
def mirror(body: Mirror, request: Request):
    _window_only(request)
    CATALOGUE.clear()
    for entry in body.commands:
        if isinstance(entry.get("id"), str):
            CATALOGUE[entry["id"]] = entry
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    store.atomic_write(settings.data_dir / "commands-catalogue.json", json.dumps({"at": time.time(), "size": len(CATALOGUE), "commands": list(CATALOGUE.values())}, indent=1).encode())
    return {"size": len(CATALOGUE)}


def _need_window() -> None:
    if not CATALOGUE or time.time() - STATE["polled"] > POLL_SECONDS + 10:
        raise HTTPException(status_code=409, detail="The FormRef window is not open, so its commands cannot run. Ask the person to open FormRef.")


@router.get("")
def list_commands(group: str = "", text: str = ""):
    _need_window()
    words = text.lower().split()
    found = [e for e in CATALOGUE.values() if (not group or e.get("group", "").lower() == group.lower())
             and all(w in (e.get("label", "") + " " + e.get("description", "") + " " + e["id"]).lower() for w in words)]
    return {"count": len(found), "groups": sorted({e.get("group", "") for e in CATALOGUE.values()}),
            "commands": [{k: e.get(k) for k in ("id", "label", "group", "keys", "mutates", "risky", "agent", "enabled")} for e in found]}


@router.get("/next")
async def next_job(request: Request):
    _window_only(request)
    STATE["polled"] = time.time()
    gone = request.scope.get(GONE) or asyncio.Event()
    take = asyncio.ensure_future(JOBS.get())
    left = asyncio.ensure_future(gone.wait())
    await asyncio.wait({take, left}, timeout=POLL_SECONDS, return_when=asyncio.FIRST_COMPLETED)
    left.cancel()
    if not take.done() and take.cancel():
        if not gone.is_set():
            STATE["polled"] = time.time()
        return Response(status_code=204)
    job = take.result()
    if gone.is_set():
        JOBS.put_nowait(job)
        return Response(status_code=204)
    STATE["polled"] = time.time()
    return job


class PollWatch:
    """Marks a long poll whose window has gone, so a closed window's pending poll never takes a job."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("path") != "/api/commands/next":
            await self.app(scope, receive, send)
            return
        gone = scope[GONE] = asyncio.Event()

        async def watch():
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    gone.set()
                    return

        watcher = asyncio.ensure_future(watch())
        try:
            await self.app(scope, receive, send)
        finally:
            watcher.cancel()


@router.post("/result/{rid}")
def job_result(rid: str, result: dict, request: Request):
    _window_only(request)
    future = WAITING.pop(rid, None)
    if future is not None and not future.done():
        future.set_result(result)
    return {"ok": True}


@router.get("/{command_id}")
def describe(command_id: str):
    _need_window()
    entry = CATALOGUE.get(command_id)
    if entry is None:
        raise HTTPException(status_code=404, detail=f"No command {command_id}. Use list_commands for the ids.")
    return entry


@router.post("/{command_id}/run")
async def run(command_id: str, body: Run, request: Request):
    _need_window()
    entry = CATALOGUE.get(command_id)
    if entry is None:
        raise HTTPException(status_code=404, detail=f"No command {command_id}. Use list_commands for the ids.")
    client = request.headers.get("x-formref-client")
    if client and entry.get("agent") == "window-only":
        raise HTTPException(status_code=403, detail=f"{entry.get('label', command_id)} is only available to the person in the FormRef window.")
    if client and entry.get("risky"):
        turn_id = agents.token_turn.get(client)
        if not turn_id or turn_id not in agents.queues:
            raise HTTPException(status_code=403, detail=f"{entry.get('label', command_id)} cannot be undone safely; ask the person to do it, or use the dedicated tool, which asks them first.")
        if not await agents.confirm(client, f"{entry.get('label', command_id)}."):
            raise HTTPException(status_code=403, detail=f"The person declined {entry.get('label', command_id)}. Nothing was changed.")
    rid = uuid.uuid4().hex
    future = asyncio.get_running_loop().create_future()
    WAITING[rid] = future
    await JOBS.put({"rid": rid, "id": command_id, "params": body.params})
    try:
        result = await asyncio.wait_for(future, RUN_SECONDS)
    except asyncio.TimeoutError:
        WAITING.pop(rid, None)
        raise HTTPException(status_code=504, detail="The FormRef window did not answer within a minute.") from None
    if not result.get("ok"):
        raise HTTPException(status_code=422, detail=result.get("error") or "The command failed.")
    return result
