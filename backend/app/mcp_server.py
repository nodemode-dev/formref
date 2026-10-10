import asyncio
import base64
import binascii
from contextlib import asynccontextmanager
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlparse
import uuid
import httpx
from mcp.server.fastmcp import FastMCP
from mcp.types import ToolAnnotations
from .core.config import settings

API_URL = os.environ.get("FORMREF_API_URL", "http://127.0.0.1:8196").rstrip("/")
_api_parts = urlparse(API_URL)
if _api_parts.scheme != "http" or _api_parts.hostname not in {"localhost", "127.0.0.1", "::1"} or _api_parts.username or _api_parts.password or _api_parts.path not in {"", "/"} or _api_parts.query or _api_parts.fragment:
    raise ValueError("FORMREF_API_URL must be a loopback HTTP service URL.")
IMPORT_DIR = Path(os.environ.get("FORMREF_MCP_IMPORT_DIR", str(Path.home() / ".formref" / "imports"))).expanduser().resolve()
_owned_process = None
_api_lock = asyncio.Lock()
_read = ToolAnnotations(readOnlyHint=True, destructiveHint=False, idempotentHint=True, openWorldHint=False)
_write = ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=False, openWorldHint=False)
_remove = ToolAnnotations(readOnlyHint=False, destructiveHint=True, idempotentHint=False, openWorldHint=False)

async def ensure_api():
    global _owned_process
    async with _api_lock:
        async with httpx.AsyncClient(timeout=2, trust_env=False) as client:
            try:
                response = await client.get(API_URL + "/api/health")
                response.raise_for_status()
                if response.json().get("app") != "formref":
                    raise ValueError("Configured port belongs to another service.")
                return
            except httpx.ConnectError:
                pass
            except httpx.HTTPError as exc:
                raise ValueError("FormRef API is reachable but unhealthy.") from exc
            if _owned_process is not None and _owned_process.poll() is None:
                raise ValueError("Owned FormRef API is starting or unavailable.")
            port = _api_parts.port or 80
            host = "::1" if _api_parts.hostname == "::1" else "127.0.0.1"
            _owned_process = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", host, "--port", str(port)], cwd=str(Path(__file__).resolve().parent.parent), stdin=subprocess.DEVNULL, stdout=sys.stderr, stderr=sys.stderr, env=os.environ.copy())
            for attempt in range(60):
                if _owned_process.poll() is not None:
                    raise ValueError("FormRef API failed to start. Check stderr and run ./formref doctor.")
                await asyncio.sleep(0.1)
                try:
                    response = await client.get(API_URL + "/api/health")
                    response.raise_for_status()
                    if response.json().get("app") == "formref":
                        return
                except httpx.HTTPError:
                    continue
            raise ValueError("FormRef API did not become ready within six seconds.")

async def api(method, path, **kwargs):
    await ensure_api()
    async with httpx.AsyncClient(timeout=60, trust_env=False) as client:
        response = await client.request(method, API_URL + path, **kwargs)
    if response.is_error:
        try:
            detail = response.json().get("detail", response.text)
        except ValueError:
            detail = response.text
        raise ValueError(f"FormRef API {response.status_code}: {detail}")
    return response

async def json_api(method, path, **kwargs):
    return (await api(method, path, **kwargs)).json()

async def command(board_id, value):
    checked_id(board_id)
    return await json_api("POST", f"/api/boards/{board_id}/commands", json={"command": value})

def checked_id(value):
    if not isinstance(value, str) or not value or len(value) > 96 or not all(character.isascii() and (character.isalnum() or character in "_-") for character in value):
        raise ValueError("Invalid board identifier.")
    return value

@asynccontextmanager
async def lifespan(server):
    try:
        yield {}
    finally:
        if _owned_process is not None and _owned_process.poll() is None:
            _owned_process.terminate()
            try:
                await asyncio.to_thread(_owned_process.wait, timeout=3)
            except subprocess.TimeoutExpired:
                _owned_process.kill()
                await asyncio.to_thread(_owned_process.wait, timeout=3)

mcp = FastMCP("FormRef", instructions="Edit reference boards through the authoritative Rust engine. Read the board before choosing item IDs. Every mutation updates the same local editor and persists. Arrange and transform commands respect locks. Never infer that absent iStack source files were recovered. Assets may be supplied as base64, or read from the configured FORMREF_MCP_IMPORT_DIR only.", lifespan=lifespan)

@mcp.tool(annotations=_read)
async def list_boards() -> list[dict]:
    """List persistent board IDs, titles, revisions and unresolved image counts."""
    return await json_api("GET", "/api/boards")

@mcp.tool(annotations=_write)
async def create_board(title: str = "Untitled board") -> dict:
    """Create and persist an empty reference board; return its engine state."""
    return await json_api("POST", "/api/boards", json={"title": title})

@mcp.tool(annotations=_read)
async def get_board(board_id: str) -> dict:
    """Read current authoritative board state and session undo/redo flags."""
    return await json_api("GET", "/api/boards/" + checked_id(board_id))

@mcp.tool(annotations=_write)
async def add_items(board_id: str, items: list[dict]) -> dict:
    """Add image, note, link, board, column, todo, shape, stroke or file items atomically. Geometry is x,y,width,height; image asset_id must reference an imported asset. Optional fields receive engine defaults."""
    return await command(board_id, {"type": "add", "items": items})

@mcp.tool(annotations=_write)
async def update_items(board_id: str, ids: list[str], patch: dict) -> dict:
    """Update selected item fields in one undo step. data is an object; read the board and preserve existing data fields when changing image settings."""
    return await command(board_id, {"type": "update", "ids": ids, "patch": patch})

@mcp.tool(annotations=_write)
async def arrange_items(board_id: str, ids: list[str], action: str, options: dict | None = None) -> dict:
    """Arrange items using align, distribute, pack, normalize, order, group, ungroup or duplicate. Options: align mode; distribute axis; pack gap/columns; normalize mode/value; order mode; group group_id."""
    if action not in {"align", "distribute", "pack", "normalize", "order", "group", "ungroup", "duplicate"}:
        raise ValueError("Unsupported arrangement action.")
    value = dict(options or {})
    value.update(type=action, ids=ids)
    return await command(board_id, value)

@mcp.tool(annotations=_write)
async def transform_items(board_id: str, ids: list[str], dx: float = 0, dy: float = 0, scale: float = 1, rotation: float = 0, pivot: dict | None = None) -> dict:
    """Move, scale and rotate selected items around their collective center or a supplied {x,y} pivot. Rotation is degrees."""
    value = {"type": "transform", "ids": ids, "dx": dx, "dy": dy, "scale": scale, "rotation": rotation}
    if pivot is not None:
        value["pivot"] = pivot
    return await command(board_id, value)

@mcp.tool(annotations=_remove)
async def remove_items(board_id: str, ids: list[str]) -> dict:
    """Remove item IDs and their connections in one undoable step."""
    return await command(board_id, {"type": "remove", "ids": ids})

@mcp.tool(annotations=_write)
async def undo(board_id: str) -> dict:
    """Undo the most recent successful mutation in the current service session."""
    return await json_api("POST", "/api/boards/" + checked_id(board_id) + "/undo")

@mcp.tool(annotations=_write)
async def redo(board_id: str) -> dict:
    """Redo the last undone mutation in the current service session."""
    return await json_api("POST", "/api/boards/" + checked_id(board_id) + "/redo")

@mcp.tool(annotations=_write)
async def import_asset(name: str = "reference.png", data_base64: str = "", path: str = "") -> dict:
    """Import an asset into the shared store. Supply exactly one of data_base64 (raw base64, no URI prefix) or path. A path must stay beneath FORMREF_MCP_IMPORT_DIR; no arbitrary filesystem reads are permitted."""
    if bool(data_base64) == bool(path):
        raise ValueError("Supply exactly one of data_base64 or path.")
    if path:
        candidate = (IMPORT_DIR / path).expanduser().resolve()
        if not candidate.is_relative_to(IMPORT_DIR) or not candidate.is_file():
            raise ValueError("Asset path must reference a file within FORMREF_MCP_IMPORT_DIR.")
        if candidate.stat().st_size > settings.max_upload_bytes:
            raise ValueError("Asset exceeds 64 MiB.")
        data = await asyncio.to_thread(candidate.read_bytes)
        name = candidate.name
    else:
        if len(data_base64) > settings.max_upload_bytes * 4 // 3 + 4:
            raise ValueError("Base64 asset exceeds 64 MiB decoded size.")
        try:
            data = base64.b64decode(data_base64, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ValueError("Asset base64 is invalid.") from exc
    return await json_api("POST", "/api/assets", files={"file": (name, data, "application/octet-stream")})

@mcp.tool(annotations=_read)
async def export_board(board_id: str, format: str = "portable", include_content: bool = False) -> dict:
    """Generate portable, json, png, svg or markdown output. Return a loopback download URL and verified byte hash. include_content adds base64 output when at most 16 MiB. PNG scale is capped at 8192 pixels per edge and 32 megapixels."""
    checked_id(board_id)
    if format not in {"portable", "json", "png", "svg", "markdown"}:
        raise ValueError("Unsupported export format.")
    path = f"/api/boards/{board_id}/export?format={format}"
    response = await api("GET", path)
    result = {"board_id": board_id, "format": format, "download_url": API_URL + path, "bytes": len(response.content), "sha256": hashlib.sha256(response.content).hexdigest(), "mime": response.headers.get("content-type"), "disposition": response.headers.get("content-disposition"), "png_scale": response.headers.get("x-formref-scale")}
    if include_content:
        if len(response.content) > 16 * 1024 * 1024:
            raise ValueError("Generated export exceeds the 16 MiB MCP inline limit; use its download URL.")
        result["content_base64"] = base64.b64encode(response.content).decode()
    return result

@mcp.tool(annotations=_read)
async def search_items(query: str, board_id: str = "", kind: str = "") -> list[dict]:
    """Search titles, note text and link URLs in one board or all stored boards; return board and item identifiers."""
    needle = query.casefold()
    boards = [{"id": checked_id(board_id)}] if board_id else await list_boards()
    results = []
    for summary in boards:
        state = await get_board(summary["id"])
        for item in state["board"]["items"]:
            haystack = "\n".join(str(item.get(key, "")) for key in ("title", "text", "url")).casefold()
            if needle in haystack and (not kind or item["kind"] == kind):
                results.append({"board_id": summary["id"], "board_title": state["board"]["title"], "item": item})
    return results

@mcp.tool(annotations=_write)
async def connect_items(board_id: str, from_id: str, to_id: str, label: str = "", color: str = "#f97316") -> dict:
    """Create an undoable connector between two existing item IDs."""
    return await command(board_id, {"type": "connect", "connection": {"id": uuid.uuid4().hex, "from": from_id, "to": to_id, "label": label, "color": color}})

@mcp.resource("formref://boards")
async def boards_resource() -> str:
    """Current local project index."""
    return json.dumps(await list_boards(), ensure_ascii=False, indent=2)

@mcp.resource("formref://board/{board_id}")
async def board_resource(board_id: str) -> str:
    """Authoritative document state for a specific persistent reference board."""
    return json.dumps(await get_board(board_id), ensure_ascii=False, indent=2)

@mcp.prompt()
async def organize_references(board_id: str, objective: str = "Organize references into coherent groups") -> str:
    """Plan a reviewable board organization using current IDs and engine commands."""
    state = await get_board(board_id)
    board = state["board"]
    outline = [{"id": item["id"], "kind": item["kind"], "title": item.get("title"), "locked": item.get("locked"), "group_id": item.get("group_id")} for item in board["items"]]
    return "Objective: " + objective + "\nBoard: " + board["title"] + "\nRevision: " + str(board["revision"]) + "\nRead complete state using get_board before editing. Respect locked items, keep original assets, group by purpose and arrange using engine layout operations. Return the changed IDs and new revision. Missing source files require user-provided relinking.\nItems:\n" + json.dumps(outline, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    mcp.run(transport="stdio")
