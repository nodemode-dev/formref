import asyncio
import json
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from ..agent import claude_code, terminal

router = APIRouter(prefix="/api", tags=["terminal"])
LOCAL = {"localhost", "127.0.0.1", "::1", "tauri.localhost"}
EXIT = json.dumps({"type": "exit"})


def _local(origin: str | None) -> bool:
    if not origin:
        return True
    return (urlparse(origin).hostname or "") in LOCAL or origin.startswith("tauri://")


def _window_only(request: Request) -> None:
    if request.headers.get("x-formref-client"):
        raise HTTPException(status_code=403, detail="Terminals and Claude Code are only available in the FormRef window.")


class Open(BaseModel):
    cols: int = Field(default=100, ge=10, le=1000)
    rows: int = Field(default=30, ge=4, le=500)
    cwd: str = ""


class ClaudeOpen(BaseModel):
    prompt: str = Field(default="", max_length=20000)
    cols: int = Field(default=100, ge=10, le=1000)
    rows: int = Field(default=30, ge=4, le=500)
    fresh: bool = False
    resume: str = Field(default="", max_length=128)


def _found(sid: str):
    try:
        return terminal.get(sid)
    except KeyError:
        raise HTTPException(status_code=404, detail="No such terminal.") from None


@router.get("/terminal")
def list_terminals(request: Request):
    _window_only(request)
    return {"terminals": [s.describe() for s in terminal.SESSIONS.values()]}


@router.post("/terminal")
def open_terminal(body: Open, request: Request):
    _window_only(request)
    return terminal.open_session(body.cwd or None, body.cols, body.rows).describe()


@router.post("/terminal/{sid}/restart")
def restart_terminal(sid: str, request: Request):
    _window_only(request)
    _found(sid)
    return terminal.restart(sid).describe()


@router.delete("/terminal/{sid}")
def close_terminal(sid: str, request: Request):
    _window_only(request)
    terminal.close(sid)
    return {"closed": sid}


@router.get("/claudecode")
def claude_status(request: Request):
    _window_only(request)
    return claude_code.status()


@router.post("/claudecode")
def claude_open(body: ClaudeOpen, request: Request):
    _window_only(request)
    return claude_code.open_tab(body.prompt or None, body.cols, body.rows, body.fresh, body.resume or None)


@router.websocket("/terminal/{sid}/ws")
async def attach(ws: WebSocket, sid: str) -> None:
    if not _local(ws.headers.get("origin")) or (urlparse("http://" + ws.headers.get("host", "")).hostname not in {"localhost", "127.0.0.1", "::1"}):
        await ws.close(code=4403)
        return
    await ws.accept()
    try:
        session = terminal.get(sid)
    except KeyError:
        await ws.close(code=4404)
        return
    q: asyncio.Queue = asyncio.Queue()
    session.subscribers.add(q)

    async def outbound() -> None:
        backlog = session.scrollback()
        if backlog:
            await ws.send_text(backlog)
        if not session.alive:
            await ws.send_text(EXIT)
        while True:
            text = await q.get()
            await ws.send_text(EXIT if text is None else text)

    sender = asyncio.create_task(outbound())
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except ValueError:
                continue
            if msg.get("type") == "input" and session.alive:
                terminal.write(sid, str(msg.get("data", "")))
            elif msg.get("type") == "resize":
                terminal.resize(sid, int(msg.get("cols", 80)), int(msg.get("rows", 24)))
    except (WebSocketDisconnect, KeyError):
        pass
    finally:
        sender.cancel()
        session.subscribers.discard(q)
