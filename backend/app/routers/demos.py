import asyncio
import re
from fastapi import APIRouter, HTTPException
from ..core.builtins import registry
from ..core.config import ROOT
from ..core.store import store

router = APIRouter(prefix="/api")


def open_demo(demo: str) -> dict:
    """Imports a demo board that ships with the window (frontend/dist/demos/<id>/board.formref) as a new board, read from disk here, so the window neither downloads nor uploads the file. The demo's pictures come with their 256 px previews (made by this service's own preview code), which go into the preview cache, so the first open resamples nothing at that size."""
    folder = ROOT / "frontend" / "dist" / "demos" / demo
    path = folder / "board.formref"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="The demo could not open.")
    state = registry.importers["project"](f"{demo}.formref", path.read_bytes())
    cache = store.assets_dir / "previews"
    for asset in {item["asset_id"] for item in state["board"]["items"] if item.get("kind") == "image" and item.get("asset_id")}:
        shipped, kept = folder / "previews" / f"{asset}_256.webp", cache / f"{asset}_256.webp"
        if re.fullmatch(r"[0-9a-f]{64}", asset) and shipped.is_file() and not kept.is_file():
            cache.mkdir(parents=True, exist_ok=True)
            with store.lock:
                store.atomic_write(kept, shipped.read_bytes())
    return state


@router.post("/demos/{demo}/open", status_code=201)
async def demo_board(demo: str):
    if not re.fullmatch(r"[a-z0-9-]{1,40}", demo):
        raise HTTPException(status_code=404, detail="The demo could not open.")
    return await asyncio.to_thread(open_demo, demo)
