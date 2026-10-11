import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..agent.service import agents
from ..core.config import settings
from ..core.store import store

router = APIRouter(prefix="/api")


class Turn(BaseModel):
    board_id: str = Field(min_length=1, max_length=96)
    message: str = Field(min_length=1, max_length=20000)
    runner: str = ""


class Session(BaseModel):
    open: list[str] = Field(default_factory=list, max_length=64)
    active: str = ""


@router.get("/agent/runners")
async def runner_list():
    return {"runners": await agents.available(), "settings": agents.settings()}


@router.get("/agent/settings")
def agent_settings():
    return agents.settings()


@router.post("/agent/settings")
def save_agent_settings(patch: dict):
    return agents.save(patch)


@router.post("/agent/turns")
async def start_turn(body: Turn):
    store.get(body.board_id)

    async def stream():
        async for event in agents.turn(body.board_id, body.message, body.runner):
            yield "event: " + event["type"] + "\ndata: " + json.dumps(event, ensure_ascii=False) + "\n\n"
    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


class Answer(BaseModel):
    allow: bool
    whole_turn: bool = False


@router.post("/agent/confirm/{confirm_id}")
def answer_confirm(confirm_id: str, body: Answer):
    return {"answered": agents.answer(confirm_id, body.allow, body.whole_turn)}


@router.post("/agent/turns/{turn_id}/stop")
def stop_turn(turn_id: str):
    return {"stopped": agents.stop(turn_id)}


@router.post("/agent/turns/{turn_id}/undo")
def undo_turn(turn_id: str):
    return agents.undo_turn(turn_id)


@router.get("/session")
def get_session():
    try:
        saved = json.loads((settings.data_dir / "session.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        saved = {"open": [], "active": ""}
    known = {b["id"] for b in store.list_boards()}
    open_ids = [i for i in saved.get("open", []) if i in known]
    active = saved.get("active", "") if saved.get("active", "") in open_ids else (open_ids[0] if open_ids else "")
    return {"open": open_ids, "active": active}


@router.put("/session")
def put_session(body: Session):
    for board_id in body.open:
        store.checked_id(board_id)
    if body.active and body.active not in body.open:
        raise ValueError("The active board must be one of the open boards.")
    store.atomic_write(settings.data_dir / "session.json", json.dumps({"open": body.open, "active": body.active}).encode())
    return {"open": body.open, "active": body.active}
