import asyncio
import json
import re

from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from ..agent import chat, claude_code, terminal
from ..core import origins

router = APIRouter(prefix="/api", tags=["terminal"])
EXIT = json.dumps({"type": "exit"})


def _local(origin: str | None, host: str) -> bool:
    if not origins.loopback_host(host):
        return False
    return not origin or origins.allowed(origin, host)


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


class ChatSend(BaseModel):
    text: str = Field(min_length=1, max_length=20000)
    context: str = Field(default="", max_length=20000)
    note: str = Field(default="", max_length=200)


class ChatAdopt(BaseModel):
    session: str = Field(default="", max_length=128)


@router.get("/chat")
def chat_state(request: Request):
    _window_only(request)
    return chat.state()


@router.post("/chat")
def chat_send(body: ChatSend, request: Request):
    _window_only(request)
    try:
        return chat.send(body.text, body.context, body.note)
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e)) from None


@router.post("/chat/cancel")
def chat_cancel(request: Request):
    _window_only(request)
    return chat.cancel()


@router.post("/chat/reset")
def chat_reset(request: Request):
    _window_only(request)
    return chat.reset()


@router.get("/chat/sessions")
def chat_sessions(request: Request):
    _window_only(request)
    return chat.sessions()


@router.post("/chat/adopt")
def chat_adopt(body: ChatAdopt, request: Request):
    _window_only(request)
    try:
        return chat.adopt(body.session)
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e)) from None
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from None


@router.get("/chat/image/{name}")
def chat_image(name: str, request: Request):
    _window_only(request)
    if not re.fullmatch(r"[0-9a-f]{32}\.(jpg|png|webp)", name):
        raise HTTPException(status_code=404, detail="No such image.")
    path = chat.images_dir() / name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="No such image.")
    return FileResponse(path)


@router.get("/chat/events")
async def chat_events(request: Request):
    _window_only(request)
    q: asyncio.Queue = asyncio.Queue()
    chat.SUBSCRIBERS.add(q)

    async def stream():
        try:
            yield ": connected\n\n"
            while not await request.is_disconnected():
                try:
                    event = await asyncio.wait_for(q.get(), 15)
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
                    continue
                yield "data: " + json.dumps(event, ensure_ascii=False) + "\n\n"
        finally:
            chat.SUBSCRIBERS.discard(q)
    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.websocket("/terminal/{sid}/ws")
async def attach(ws: WebSocket, sid: str) -> None:
    if not _local(ws.headers.get("origin"), ws.headers.get("host", "")):
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
