import asyncio
import re
import uuid

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, JSONResponse

from ..core import cloud
from ..core.builtins import registry
from ..core.clipper import free_spot
from ..core.store import store

router = APIRouter(prefix="/api/cloud")
PROJECTS = (".formref", ".istack", ".json")


def from_agent(request: Request):
    # Cloud transfers move boards off this computer, so only the person in FormRef makes them, never an agent.
    if request.headers.get("x-formref-client"):
        return JSONResponse(status_code=403, content={"detail": "Cloud transfers are made by the person in FormRef, not by agents.", "code": "cloud_person_only"})
    return None


def _failed(failure: Exception):
    return JSONResponse(status_code=502 if isinstance(failure, cloud.CloudError) else 422, content={"detail": str(failure)})


@router.get("")
def states():
    return cloud.states()


@router.put("/{name}/app")
def set_app(name: str, body: dict, request: Request):
    return from_agent(request) or cloud.set_app(name, body.get("clientId", ""), body.get("clientSecret"), bool(body.get("fullDrive")))


@router.post("/{name}/start")
def start(name: str, request: Request):
    return from_agent(request) or cloud.start(name, request.url.port or 8196)


@router.get("/google/callback", response_class=HTMLResponse)
def google_callback(state: str = "", code: str = "", error: str = ""):
    status, message = cloud.google_callback(state, code, error)
    page = f"<!doctype html><meta charset=utf-8><title>FormRef</title><body style='font:15px system-ui;margin:48px;background:#111113;color:#ececee'><p>{message}</p>"
    return HTMLResponse(page, status_code=status)


@router.post("/dropbox/code")
def dropbox_code(body: dict, request: Request):
    blocked = from_agent(request)
    if blocked:
        return blocked
    try:
        return cloud.dropbox_code(body.get("code", ""))
    except (cloud.CloudError, ValueError) as failure:
        return _failed(failure)


@router.delete("/{name}")
def disconnect(name: str, request: Request):
    return from_agent(request) or cloud.disconnect(name)


@router.get("/{name}/files")
async def files(name: str, request: Request, folder: str = "", cursor: str = ""):
    blocked = from_agent(request)
    if blocked:
        return blocked
    try:
        return await asyncio.to_thread(cloud.listing, name, folder, cursor)
    except (cloud.CloudError, ValueError) as failure:
        return _failed(failure)


@router.post("/{name}/save")
async def save_board(name: str, body: dict, request: Request):
    """Save a board to the service's formref folder: a FormRef archive (reopens with everything) or a picture."""
    blocked = from_agent(request)
    if blocked:
        return blocked
    fmt = str(body.get("format", "portable"))
    if fmt not in registry.exporters:
        return JSONResponse(status_code=422, content={"detail": "format must be portable, png, svg, markdown or json."})
    try:
        state = await asyncio.to_thread(store.get, str(body.get("board_id", "")))
        data, _mime, headers = await asyncio.to_thread(registry.exporters[fmt], state)
        filename = re.search(r'filename="([^"]+)"', headers.get("Content-Disposition", "")).group(1)
        return await asyncio.to_thread(cloud.upload, name, data, filename)
    except (cloud.CloudError, ValueError) as failure:
        return _failed(failure)


@router.post("/{name}/open")
async def open_file(name: str, body: dict, request: Request):
    """A .formref, .istack or .json board opens as a new board; anything else goes onto the given board."""
    blocked = from_agent(request)
    if blocked:
        return blocked
    item, filename = str(body.get("id", "")), str(body.get("name", "file"))[:200]
    try:
        data = await asyncio.to_thread(cloud.download, name, item)
        if filename.lower().endswith(PROJECTS):
            state = await asyncio.to_thread(registry.importers["project"], filename, data)
            return {"opened": "board", "board_id": state["board"]["id"], "state": state}
        asset = await asyncio.to_thread(store.import_asset, filename, data)
        board_id = str(body.get("board_id", ""))
        with store.lock:
            board = store.get(board_id)["board"]
            image = asset["mime"].startswith("image/")
            width = min(400, asset.get("width") or 300) if image else 240
            height = round(width * ((asset.get("height") or 200) / (asset.get("width") or 300))) if image else 180
            x, y = free_spot(board, width, height)
            new = {"id": uuid.uuid4().hex, "kind": "image" if image else "file", "x": x, "y": y, "width": width, "height": height, "z": max([i.get("z", 0) for i in board["items"]] + [0]) + 1,
                   "title": filename, "asset_id": asset["id"], "data": {"mime": asset["mime"], "size": asset["size"], "natural_width": asset.get("width"), "natural_height": asset.get("height"), "source": name}}
            state = store.mutate(board_id, {"type": "add", "items": [new]})
        return {"opened": "item", "board_id": board_id, "item_id": new["id"], "state": state}
    except (cloud.CloudError, ValueError) as failure:
        return _failed(failure)
