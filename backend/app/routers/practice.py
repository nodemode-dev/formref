import json
import time

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from ..core.config import settings
from ..core.store import store

router = APIRouter(prefix="/api")

MAX_ENTRIES = 500


class Session(BaseModel):
    model_config = ConfigDict(extra="forbid")

    board_id: str = Field(default="", max_length=96)
    board_title: str = Field(default="", max_length=200)
    pictures: int = Field(ge=1, le=10000)
    seconds_each: int = Field(ge=0, le=3600)
    drawing_seconds: int = Field(ge=0, le=86400)


def read_log() -> list[dict]:
    try:
        saved = json.loads((settings.data_dir / "practice.json").read_text(encoding="utf-8"))
        entries = saved.get("sessions", []) if isinstance(saved, dict) else []
        return [entry for entry in entries if isinstance(entry, dict) and isinstance(entry.get("at"), (int, float))][-MAX_ENTRIES:]
    except (OSError, ValueError):
        return []


@router.get("/practice")
def get_log():
    return {"sessions": read_log()}


@router.post("/practice")
def add_session(body: Session):
    entries = read_log()
    entries.append({"at": int(time.time()), **body.model_dump()})
    entries = entries[-MAX_ENTRIES:]
    store.atomic_write(settings.data_dir / "practice.json", json.dumps({"sessions": entries}, ensure_ascii=False).encode())
    return {"sessions": entries}
