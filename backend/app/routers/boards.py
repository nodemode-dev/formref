import asyncio
import json
from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException
from fastapi.responses import Response, StreamingResponse
from ..core.config import settings
from ..core.builtins import registry
from ..core.store import store, MissingBoard
from ..models.requests import CreateBoard, BoardCommand
from ..core.sampling import sample_image

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
    return store.mutate(board_id, command=body.command, expected_revision=body.expected_revision)

@router.post("/boards/{board_id}/undo")
def undo(board_id: str):
    return store.mutate(board_id, history="undo")

@router.post("/boards/{board_id}/redo")
def redo(board_id: str):
    return store.mutate(board_id, history="redo")

@router.delete("/boards/{board_id}")
def delete_board(board_id: str):
    return store.delete(board_id)

@router.post("/boards/{board_id}/duplicate", status_code=201)
def duplicate_board(board_id: str):
    return store.duplicate(board_id)

@router.post("/assets", status_code=201)
async def upload_asset(file: UploadFile = File(...)):
    filename = file.filename or "asset"
    data = await read_upload(file)
    return await asyncio.to_thread(store.import_asset, filename, data)

@router.get("/assets/{asset_id}")
def asset(asset_id: str):
    info, data = store.asset_bytes(asset_id)
    headers = {"Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox"}
    if not info["mime"].startswith("image/"):
        headers["Content-Disposition"] = "attachment"
    return Response(content=data, media_type=info["mime"], headers=headers)

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
def export(board_id: str, format: str = "portable"):
    state = store.get(board_id)
    handler = registry.exporters.get(format)
    if handler is None:
        raise ValueError("Export format is not registered.")
    data, mime, headers = handler(state)
    return Response(content=data, media_type=mime, headers=headers)

@router.get("/boards/{board_id}/events")
async def events(board_id: str, request: Request):
    await asyncio.to_thread(store.get, board_id)
    async def stream():
        last_revision = None
        heartbeat = 0
        while not await request.is_disconnected():
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
