import asyncio
import json
import time
import uuid
from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException
from fastapi.responses import Response, StreamingResponse
from ..core.config import settings
from ..core.builtins import registry
from ..core.store import store, MissingBoard
from ..models.requests import CreateBoard, BoardCommand
from ..core.sampling import sample_image
from ..core.features import duplicates, enrich
from ..core.media import preview
from ..core.pdf_pages import page_items
from ..core.capture import capture
from ..core.doc_export import export_item
from ..core.cutout import change_background, DEFAULT_TOLERANCE
from ..core import models as cutout_models
from urllib.parse import quote
from ..core.templates import delete_template, list_templates, save_template, use_template
from ..agent.service import agents

router = APIRouter(prefix="/api")

async def read_upload(file: UploadFile):
    chunks = []
    size = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        size += len(chunk)
        if size > settings.max_upload_bytes:
            await file.close()
            raise HTTPException(status_code=413, detail="Uploads are limited to 64 MiB.")
        chunks.append(chunk)
    await file.close()
    return b"".join(chunks)

@router.get("/boards")
def list_boards():
    return store.list_boards()

@router.post("/boards/{board_id}/items/{item_id}/pdf-pages")
async def pdf_pages(board_id: str, item_id: str, first: int = 1, last: int = 0, dpi: int = 150):
    return await asyncio.to_thread(page_items, board_id, item_id, first, last, dpi)

@router.get("/boards/{board_id}/duplicates")
def board_duplicates(board_id: str, distance: int = 4):
    if not 0 <= distance <= 16:
        raise HTTPException(status_code=422, detail="distance is from 0 (identical pictures) to 16.")
    try:
        return {"groups": duplicates(board_id, distance)}
    except MissingBoard:
        raise HTTPException(status_code=404, detail="No such board.")

@router.post("/boards", status_code=201)
def create_board(body: CreateBoard):
    return store.create(body.title)

@router.get("/boards/{board_id}")
def get_board(board_id: str):
    return store.get(board_id)

@router.get("/boards/{board_id}/items/{item_id}/sample")
def sample(board_id: str, item_id: str, u: float, v: float):
    return sample_image(board_id, item_id, u, v)

@router.post("/boards/{board_id}/commands")
def apply_command(board_id: str, body: BoardCommand):
    return store.mutate(board_id, command=enrich(board_id, body.command), expected_revision=body.expected_revision)

@router.post("/boards/{board_id}/undo")
def undo(board_id: str):
    return store.mutate(board_id, history="undo")

@router.post("/boards/{board_id}/redo")
def redo(board_id: str):
    return store.mutate(board_id, history="redo")

@router.delete("/boards/{board_id}")
def delete_board(board_id: str):
    return store.delete(board_id)

def edit_comments(board_id: str, item_id: str, change):
    """Read the item, change its comment list, write it back as one guarded update (one undo step)."""
    with store.lock:
        board = store.get(board_id)["board"]
        target = next((entry for entry in board["items"] if entry["id"] == item_id), None)
        if target is None:
            raise MissingBoard("That item does not exist on this board.")
        data = dict(target.get("data") or {})
        # The engine merges data shallowly, so an emptied thread is written as [] rather than dropped.
        data["comments"] = change(list(data.get("comments") or []))
        return store.mutate(board_id, {"type": "update", "ids": [item_id], "patch": {"data": data}}, expected_revision=board["revision"])

@router.post("/boards/{board_id}/items/{item_id}/comments", status_code=201)
def add_comment(board_id: str, item_id: str, body: dict, request: Request):
    text = body.get("text")
    if not isinstance(text, str) or not text.strip() or len(text) > 4000:
        raise ValueError("A comment needs 1 to 4000 characters of text.")
    author = body.get("author") if isinstance(body.get("author"), str) and body.get("author").strip() else ("Agent" if request.headers.get("x-formref-client") else "You")
    entry = {"id": uuid.uuid4().hex, "text": text.strip(), "author": author.strip()[:80], "at": time.time() * 1000, "resolved": False}
    return edit_comments(board_id, item_id, lambda comments: comments + [entry])

@router.post("/boards/{board_id}/items/{item_id}/comments/{comment_id}/resolve")
def resolve_comment(board_id: str, item_id: str, comment_id: str, body: dict):
    resolved = body.get("resolved", True)
    if not isinstance(resolved, bool):
        raise ValueError("resolved must be true or false.")
    def change(comments):
        if not any(c.get("id") == comment_id for c in comments):
            raise MissingBoard("That comment does not exist.")
        return [{**c, "resolved": resolved} if c.get("id") == comment_id else c for c in comments]
    return edit_comments(board_id, item_id, change)

@router.delete("/boards/{board_id}/items/{item_id}/comments/{comment_id}")
def delete_comment(board_id: str, item_id: str, comment_id: str):
    def change(comments):
        if not any(c.get("id") == comment_id for c in comments):
            raise MissingBoard("That comment does not exist.")
        return [c for c in comments if c.get("id") != comment_id]
    return edit_comments(board_id, item_id, change)

@router.get("/templates")
def templates():
    return {"templates": list_templates()}

@router.post("/templates", status_code=201)
def save_as_template(body: dict):
    return save_template(str(body.get("board_id", "")), str(body.get("title", "")), str(body.get("description", "")))

@router.post("/templates/{template_id}/use", status_code=201)
def new_from_template(template_id: str, body: dict | None = None):
    return use_template(template_id, str((body or {}).get("title", "")))

@router.delete("/templates/{template_id}")
def remove_template(template_id: str):
    return delete_template(template_id)

@router.get("/trash")
def trash(board_id: str = ""):
    return store.trash(board_id or None)

@router.post("/trash/boards/{board_id}/restore")
def restore_board(board_id: str):
    return store.restore_board(board_id)

@router.delete("/trash/boards/{board_id}")
def purge_board(board_id: str):
    return store.purge_board(board_id)

@router.post("/trash/items/{board_id}/{entry_id}/restore")
def restore_items(board_id: str, entry_id: str):
    return store.restore_items(board_id, entry_id)

@router.delete("/trash/items/{board_id}/{entry_id}")
def purge_items(board_id: str, entry_id: str):
    return store.purge_items(board_id, entry_id)

@router.delete("/trash")
def empty_trash():
    return store.empty_trash()

@router.post("/boards/{board_id}/duplicate", status_code=201)
def duplicate_board(board_id: str):
    return store.duplicate(board_id)

@router.post("/assets", status_code=201)
async def upload_asset(file: UploadFile = File(...)):
    filename = file.filename or "asset"
    data = await read_upload(file)
    return await asyncio.to_thread(store.import_asset, filename, data)

@router.get("/boards/{board_id}/items/{item_id}/export")
def export_document(board_id: str, item_id: str, format: str = "md"):
    item = next((entry for entry in store.get(board_id)["board"]["items"] if entry["id"] == item_id), None)
    if item is None:
        raise MissingBoard("That item does not exist on this board.")
    data, mime, name = export_item(item, format)
    return Response(content=data, media_type=mime, headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(name)}", "X-Content-Type-Options": "nosniff"})

@router.post("/boards/{board_id}/background")
async def background(board_id: str, body: dict):
    tolerance = body.get("tolerance", DEFAULT_TOLERANCE)
    return await asyncio.to_thread(change_background, board_id, body.get("ids"), str(body.get("action", "remove")), tolerance, str(body.get("method", "plain")), body.get("points"), body.get("box"))

# Background models, as FormCut registers them: listed, fetched on request (pinned), imported, or removed.
@router.get("/models")
def models_list():
    return cutout_models.listing()

@router.post("/models/{model}/download", status_code=202)
def models_download(model: str):
    return cutout_models.start_download(model)

@router.post("/models/{model}/import")
async def models_import(model: str, file: UploadFile = File(...)):
    data = await read_upload(file)
    return await asyncio.to_thread(cutout_models.import_file, model, file.filename or "", data)

@router.delete("/models/{model}")
def models_remove(model: str):
    return cutout_models.remove(model)

@router.post("/capture")
async def capture_url(body: dict):
    return await capture(str(body.get("url", "")))

@router.get("/assets/{asset_id}")
def asset(asset_id: str, request: Request):
    info, data = store.asset_bytes(asset_id)
    headers = {"Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Accept-Ranges": "bytes"}
    media = info["mime"].startswith(("video/", "audio/"))
    if not info["mime"].startswith("image/") and not media:
        headers["Content-Disposition"] = "attachment"
    # Byte ranges let video and audio cards seek without downloading the whole file again.
    wanted = request.headers.get("range", "")
    if media and wanted.startswith("bytes=") and "," not in wanted:
        first, _, last = wanted[6:].partition("-")
        try:
            start = int(first) if first else max(0, len(data) - int(last))
            end = min(int(last), len(data) - 1) if first and last else len(data) - 1
        except ValueError:
            start, end = 0, -1
        if 0 <= start <= end < len(data):
            headers["Content-Range"] = f"bytes {start}-{end}/{len(data)}"
            return Response(content=data[start:end + 1], status_code=206, media_type=info["mime"], headers=headers)
        return Response(status_code=416, headers={"Content-Range": f"bytes */{len(data)}"})
    return Response(content=data, media_type=info["mime"], headers=headers)

@router.get("/assets/{asset_id}/preview")
async def asset_preview(asset_id: str, edge: int, request: Request):
    try:
        data = await asyncio.to_thread(preview, asset_id, edge)
    except ValueError:
        data = None
    if data is None:
        return asset(asset_id, request)
    return Response(content=data, media_type="image/webp", headers={"Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox"})

@router.post("/import", status_code=201)
async def import_board(file: UploadFile = File(...)):
    filename = file.filename or "Imported board"
    data = await read_upload(file)
    return await asyncio.to_thread(registry.importers["project"], filename, data)

@router.post("/boards/{board_id}/relink")
async def relink_asset(board_id: str, item_id: str = Form(...), file: UploadFile = File(...)):
    state = await asyncio.to_thread(store.get, board_id)
    item = next((entry for entry in state["board"]["items"] if entry["id"] == item_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="Item does not exist.")
    if item["kind"] != "image":
        raise HTTPException(status_code=422, detail="Only image references can be relinked.")
    if item.get("locked"):
        raise HTTPException(status_code=409, detail="Unlock the reference before relinking it.")
    data = await read_upload(file)
    asset = await asyncio.to_thread(store.import_asset, file.filename or "Relinked image", data)
    if not asset["mime"].startswith("image/"):
        raise HTTPException(status_code=422, detail="Relinking requires an image file.")
    item_data = dict(item.get("data", {}))
    item_data.update(unresolved=False, unresolved_source_path="")
    return await asyncio.to_thread(store.mutate, board_id, {"type": "update", "ids": [item_id], "patch": {"asset_id": asset["id"], "data": item_data}})

@router.get("/boards/{board_id}/export")
def export(board_id: str, format: str = "portable", paper: str = "a4"):
    state = store.get(board_id)
    handler = registry.exporters.get(format)
    if handler is None:
        raise ValueError("Export format is not registered.")
    if format.startswith("pdf") and paper not in {"a4", "letter", "a3", "tabloid"}:
        raise ValueError("Paper is a4, letter, a3 or tabloid.")
    data, mime, headers = handler(state, paper=paper) if format.startswith("pdf") else handler(state)
    return Response(content=data, media_type=mime, headers=headers)

@router.get("/boards/{board_id}/events")
async def events(board_id: str, request: Request):
    await asyncio.to_thread(store.get, board_id)
    async def stream():
        last_revision = None
        heartbeat = 0
        refusals = agents.refusals
        while not await request.is_disconnected():
            if agents.refusals != refusals:
                refusals = agents.refusals
                yield "event: consent\ndata: " + json.dumps({"refusals": refusals}) + "\n\n"
            try:
                record = await asyncio.to_thread(store.stored_record, board_id)
            except MissingBoard:
                yield "event: deleted\ndata: " + json.dumps({"board_id": board_id}) + "\n\n"
                return
            board = record["board"]
            revision = board["revision"]
            if revision != last_revision:
                event = {"board_id": board_id, "revision": revision, "title": board["title"]}
                yield "id: " + str(revision) + "\nevent: revision\ndata: " + json.dumps(event) + "\n\n"
                last_revision = revision
                heartbeat = 0
            elif heartbeat >= 30:
                yield ": keepalive\n\n"
                heartbeat = 0
            heartbeat += 1
            await asyncio.sleep(0.5)
    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
