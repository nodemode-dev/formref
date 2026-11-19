import hmac
import json
import os
import re
import secrets
import time

from fastapi import HTTPException, Request

HEADER = "x-formref-window-key"
CLIENT_HEADER = "x-formref-client"
STDOUT_ENV = "FORMREF_WINDOW_KEY_STDOUT"
LINE = "formref-window-key: "
REFUSED = "Only the FormRef window can do this"
TICKET_LIFE = 30.0
READS = ("GET", "HEAD", "OPTIONS")
OPEN = ("/mcp", "/api/window/key", "/api/clip")
BRIDGE = tuple((method, re.compile(pattern)) for method, pattern in (
    ("POST", r"/api/boards"),
    ("POST", r"/api/boards/[^/]+/(commands|undo|redo|background)"),
    ("POST", r"/api/boards/[^/]+/items/[^/]+/(palette|comments)"),
    ("POST", r"/api/boards/[^/]+/items/[^/]+/comments/[^/]+/resolve"),
    ("POST", r"/api/assets"),
    ("POST", r"/api/capture"),
    ("POST", r"/api/models/[^/]+/download"),
    ("POST", r"/api/templates/[^/]+/use"),
    ("POST", r"/api/trash/(boards/[^/]+|items/[^/]+/[^/]+)/restore"),
    ("POST", r"/api/commands/[^/]+/run"),
    ("PUT", r"/api/session"),
))
KEY = secrets.token_urlsafe(32)
STATE = {"claimed": False, "secondClaim": False}
TICKETS: dict[str, float] = {}


def stdout_mode() -> bool:
    return os.environ.get(STDOUT_ENV) == "1"


def valid(value) -> bool:
    return isinstance(value, str) and bool(value) and hmac.compare_digest(value.encode("utf-8"), KEY.encode("utf-8"))


def require(request: Request) -> None:
    if not valid(request.headers.get(HEADER)):
        raise HTTPException(403, REFUSED)


def claim() -> str | None:
    if STATE["claimed"]:
        STATE["secondClaim"] = True
        return None
    STATE["claimed"] = True
    return KEY


def ticket() -> str:
    now = time.monotonic()
    for old in [t for t, at in TICKETS.items() if now - at > TICKET_LIFE]:
        TICKETS.pop(old, None)
    value = secrets.token_urlsafe(24)
    TICKETS[value] = now
    return value


def spend(value) -> bool:
    if not isinstance(value, str) or not value:
        return False
    at = TICKETS.pop(value, None)
    return at is not None and time.monotonic() - at <= TICKET_LIFE


def open_path(path: str) -> bool:
    return path in OPEN or path.startswith("/mcp/")


def bridge(method: str, path: str) -> bool:
    return any(method == m and pattern.fullmatch(path) for m, pattern in BRIDGE)


class WindowKeyGuard:
    def __init__(self, app) -> None:
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        method, path = scope.get("method"), str(scope.get("path", ""))
        if method in READS or open_path(path):
            await self.app(scope, receive, send)
            return
        headers = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope.get("headers", [])}
        if valid(headers.get(HEADER)) or (headers.get(CLIENT_HEADER) and bridge(method, path)):
            await self.app(scope, receive, send)
            return
        body = json.dumps({"detail": REFUSED}).encode("utf-8")
        await send({"type": "http.response.start", "status": 403, "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]})
        await send({"type": "http.response.body", "body": body})
