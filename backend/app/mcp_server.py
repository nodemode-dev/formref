import asyncio
import base64
import binascii
import contextvars
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
from mcp.server.fastmcp import FastMCP, Image
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

CLIENT_TOKEN = contextvars.ContextVar("formref_client_token", default=os.environ.get("FORMREF_AGENT_TOKEN", "outside"))

async def api(method, path, **kwargs):
    await ensure_api()
    kwargs.setdefault("headers", {})["X-FormRef-Client"] = CLIENT_TOKEN.get()
    # Writes may wait for the person to confirm a deletion or bulk move in the Agent panel (up to five minutes).
    async with httpx.AsyncClient(timeout=60 if method == "GET" else 330, trust_env=False) as client:
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

async def command(board_id, value, expected_revision=None):
    checked_id(board_id)
    body = {"command": value}
    if expected_revision is not None:
        body["expected_revision"] = expected_revision
    return await json_api("POST", f"/api/boards/{board_id}/commands", json=body)

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

@mcp.tool(annotations=_read)
async def sample_image(board_id: str, item_id: str, u: float, v: float) -> dict:
    """Sample an original managed image pixel at normalized painted-image coordinates u,v in 0..1 inclusive. Crop and flips are applied; the caller inverts rotation/camera. Return source x/y, RGBA and RGB bytes, HSV degrees/percent/percent, HEX, asset ID and unchanged revision. Opacity and grayscale are ignored; animated sources use frame zero."""
    return await json_api("GET", f"/api/boards/{checked_id(board_id)}/items/{checked_id(item_id)}/sample", params={"u": u, "v": v})

@mcp.tool(annotations=_write)
async def create_swatch(board_id: str, color: str, title: str = "", x: float = 0, y: float = 0, width: float = 180, height: float = 150) -> dict:
    """Create an editable, undoable color swatch. color must be #RRGGBB or #RRGGBBAA. RGB/HSV display values are derived from this one canonical color. Edit through update_items with color/title fields."""
    return await command(board_id, {"type": "add", "items": [{"id": uuid.uuid4().hex, "kind": "swatch", "color": color, "title": title, "x": x, "y": y, "width": width, "height": height}]})

@mcp.tool(annotations=_write)
async def create_document(board_id: str, text: str, title: str = "Document", text_format: str = "markdown", x: float = 0, y: float = 0, width: float = 360, height: float = 280) -> dict:
    """Create an undoable document card with one authoritative text source and plain or markdown format. Markdown supports h1-h3, lists, strong/emphasis and absolute HTTP(S) links; supplied HTML stays literal. UTF-8 text is limited to 1 MiB by Rust."""
    return await command(board_id, {"type": "add", "items": [{"id": uuid.uuid4().hex, "kind": "document", "text": text, "title": title, "data": {"text_format": text_format}, "x": x, "y": y, "width": width, "height": height}]})

@mcp.tool(annotations=_write)
async def set_formatted_text(board_id: str, item_id: str, text: str, text_format: str = "markdown") -> dict:
    """Set note/document text and plain or markdown format as one undoable shared-engine update. Preserve existing data fields. A concurrent board mutation rejects this operation with revision_conflict instead of overwriting changed data."""
    state = await get_board(board_id)
    item = next((entry for entry in state["board"]["items"] if entry["id"] == item_id), None)
    if item is None or item["kind"] not in {"note", "document"}:
        raise ValueError("Formatted text requires an existing note or document item.")
    data = dict(item.get("data", {}))
    data["text_format"] = text_format
    return await command(board_id, {"type": "update", "ids": [item_id], "patch": {"text": text, "data": data}}, expected_revision=state["board"]["revision"])

@mcp.tool(annotations=_write)
async def add_items(board_id: str, items: list[dict]) -> dict:
    """Add image, note, document, swatch, link, board, column, todo, shape, stroke or file items atomically. Geometry is x,y,width,height; image asset_id must reference an imported asset. Optional fields receive engine defaults."""
    return await command(board_id, {"type": "add", "items": items})

@mcp.tool(annotations=_write)
async def update_items(board_id: str, ids: list[str], patch: dict) -> dict:
    """Update selected item fields in one undo step. data is an object; read the board and preserve existing data fields when changing image settings."""
    return await command(board_id, {"type": "update", "ids": ids, "patch": patch})

@mcp.tool(annotations=_write)
async def arrange_items(board_id: str, ids: list[str], action: str, options: dict | None = None) -> dict:
    """Arrange items using align, distribute, pack, sort, normalize, order, group, ungroup or duplicate. Options: align mode (left, right, top, bottom, center_x, center_y); distribute axis/gap; pack gap/columns; sort key (filename, aspect, similarity), gap, descending; normalize mode/value; order mode (front, forward, backward, back); group group_id; duplicate synced (true makes note and document copies whose title, text, colour and format stay in sync with the source). Similarity sort computes colour features from the original images."""
    if action not in {"align", "distribute", "pack", "sort", "normalize", "order", "group", "ungroup", "duplicate"}:
        raise ValueError("Unsupported arrangement action.")
    value = dict(options or {})
    value.update(type=action, ids=ids)
    return await command(board_id, value)

@mcp.tool(annotations=_write)
async def adjust_items(board_id: str, ids: list[str], action: str, options: dict | None = None) -> dict:
    """Adjust items in one undoable step. rotate: degrees (default 90) about each item's own centre. opacity: value 0..1. image (images only): toggle list of flip_x, flip_y, grayscale and/or set {flip_x, flip_y, grayscale, sampling: smooth or nearest}. crop (images only): rect {x, y, width, height} normalised to the source, or reset true. Locked items reject the whole step."""
    if action not in {"rotate", "opacity", "image", "crop"}:
        raise ValueError("Unsupported adjustment action.")
    value = dict(options or {})
    value.update(type=action, ids=ids)
    return await command(board_id, value)

@mcp.tool(annotations=_write)
async def configure_canvas(board_id: str, grid_visible: bool | None = None, grid_size: float | None = None, snap_enabled: bool | None = None, grayscale: bool | None = None) -> dict:
    """Configure persistent canvas settings in one undoable step. Omitted values are preserved. grid_size is finite and between 4 and 512 world units. grayscale changes the canvas preview only and preserves original assets and rendered exports."""
    patch = {key: value for key, value in {"grid_visible": grid_visible, "grid_size": grid_size, "snap_enabled": snap_enabled, "grayscale": grayscale}.items() if value is not None}
    return await command(board_id, {"type": "settings", "patch": patch})

@mcp.tool(annotations=_write)
async def snap_items(board_id: str, ids: list[str], grid_size: float | None = None) -> dict:
    """Snap selected items and their related groups/descendants to the nearest world-grid intersection in one undoable step. Uses the board grid unless grid_size (4 to 512) is supplied. Unit offsets are preserved; locked content rejects the whole operation."""
    value = {"type": "snap", "ids": ids}
    if grid_size is not None:
        value["grid_size"] = grid_size
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
async def capture_from_web(board_id: str, url: str, x: float = 0, y: float = 0) -> dict:
    """Fetch an http or https address for the board. An image address is downloaded and placed at x, y as one undoable step; a page address returns {"page", "images"} listing the images it shows, so call again with the image addresses you want. Private and local network addresses are refused."""
    checked_id(board_id)
    result = await json_api("POST", "/api/capture", json={"url": url})
    if "asset" not in result:
        return result
    asset = result["asset"]
    width = min(400, asset.get("width") or 300)
    height = width * ((asset.get("height") or 200) / (asset.get("width") or 300))
    kind = "image" if str(asset.get("mime", "")).startswith("image/") else "file"
    return await command(board_id, {"type": "add", "items": [{"id": uuid.uuid4().hex, "kind": kind, "x": x, "y": y, "width": width, "height": height, "title": asset["name"], "asset_id": asset["id"], "url": result.get("url", url), "data": {"mime": asset["mime"], "size": asset["size"], "natural_width": asset.get("width"), "natural_height": asset.get("height")}}]})

@mcp.tool(annotations=_write)
async def create_table(board_id: str, columns: list[dict], rows: list[list[str]], title: str = "Table", x: float = 0, y: float = 0, width: float = 420, height: float = 260) -> dict:
    """Create a table card. columns is a list of {name, type} with type text, number, currency, percent, date (YYYY-MM-DD) or checkbox (cells "true" or "false"); rows is a list of rows of cell text. A cell starting with = is a formula over cells such as A1 or B1:B4: + - * / ^, SUM, AVERAGE, MIN, MAX, COUNT, ROUND, ABS. At most 26 columns and 500 rows. One undoable step."""
    return await command(board_id, {"type": "add", "items": [{"id": uuid.uuid4().hex, "kind": "table", "title": title, "x": x, "y": y, "width": width, "height": height, "data": {"table": {"columns": columns, "rows": rows}}}]})

@mcp.tool(annotations=_write)
async def define_labels(board_id: str, labels: list[dict]) -> dict:
    """Replace the board's coloured labels with labels, a list of {id, name, color} (#RRGGBB, at most 32). Keep an existing id to rename or recolour it everywhere; leaving one out removes it from every item. One undoable step."""
    return await command(board_id, {"type": "settings", "patch": {"labels": labels}})

@mcp.tool(annotations=_write)
async def label_items(board_id: str, ids: list[str], add: list[str] | None = None, remove: list[str] | None = None) -> dict:
    """Add and/or remove label ids (from define_labels or get_board settings.labels) on items, as one undoable step. An item holds at most 12 labels."""
    state = await get_board(board_id)
    by_id = {entry["id"]: entry for entry in state["board"]["items"]}
    commands = []
    for item_id in ids:
        if item_id not in by_id:
            raise ValueError(f"Item {item_id} is not on this board.")
        current = [label for label in by_id[item_id].get("data", {}).get("labels", []) if label not in (remove or [])]
        current += [label for label in (add or []) if label not in current]
        commands.append({"type": "update", "ids": [item_id], "patch": {"data": {"labels": current}}})
    return await command(board_id, {"type": "batch", "commands": commands}, expected_revision=state["board"]["revision"])

@mcp.tool(annotations=_write)
async def add_comment(board_id: str, item_id: str, text: str) -> dict:
    """Add a comment to an item's thread, signed Agent, as one undoable step. Comments are in the item's data.comments with id, text, author, at (epoch ms) and resolved."""
    return await json_api("POST", f"/api/boards/{checked_id(board_id)}/items/{checked_id(item_id)}/comments", json={"text": text})

@mcp.tool(annotations=_write)
async def resolve_comment(board_id: str, item_id: str, comment_id: str, resolved: bool = True) -> dict:
    """Mark a comment resolved (or reopen it with resolved false) as one undoable step."""
    return await json_api("POST", f"/api/boards/{checked_id(board_id)}/items/{checked_id(item_id)}/comments/{checked_id(comment_id)}/resolve", json={"resolved": resolved})

@mcp.tool(annotations=_read)
async def list_templates() -> dict:
    """List board templates: built-in ones (moodboard, character sheet, storyboard, project plan) and boards saved as templates."""
    return await json_api("GET", "/api/templates")

@mcp.tool(annotations=_write)
async def create_board_from_template(template_id: str, title: str = "") -> dict:
    """Create a new board from a template id returned by list_templates; title defaults to the template's name."""
    return await json_api("POST", f"/api/templates/{template_id}/use", json={"title": title})

@mcp.tool(annotations=_read)
async def list_trash(board_id: str = "") -> dict:
    """List deleted boards and, when board_id is given, groups of items removed from that board, newest first, with their entry ids."""
    return await json_api("GET", "/api/trash", params={"board_id": checked_id(board_id)} if board_id else None)

@mcp.tool(annotations=_write)
async def restore_from_trash(board_id: str, entry_id: str = "") -> dict:
    """Restore from the trash. With entry_id, put that group of removed items back on board_id as one undoable step; without it, restore the deleted board board_id."""
    checked_id(board_id)
    if entry_id:
        return await json_api("POST", f"/api/trash/items/{board_id}/{checked_id(entry_id)}/restore")
    return await json_api("POST", f"/api/trash/boards/{board_id}/restore")

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
async def get_board_image(board_id: str, max_edge: int = 1024):
    """Render the whole board as one PNG for models that read images, to judge layout, colour and overlaps. max_edge (256 to 2048) caps the longer side in pixels. Also returns the world rectangle the picture covers and world units per pixel, so a pixel (px, py) is at world x = world.x + px * units_per_pixel, y = world.y + py * units_per_pixel. Read get_board for exact IDs before editing."""
    checked_id(board_id)
    if not isinstance(max_edge, int) or not 256 <= max_edge <= 2048:
        raise ValueError("max_edge must be a whole number from 256 to 2048.")
    response = await api("GET", f"/api/boards/{board_id}/export?format=png")
    scale = float(response.headers.get("x-formref-scale") or 1)
    left = float(response.headers.get("x-formref-left") or 0)
    top = float(response.headers.get("x-formref-top") or 0)
    png, width, height = await asyncio.to_thread(_shrink_png, response.content, max_edge)
    full_width = int(response.headers.get("x-formref-width") or width)
    units = 1 / (scale * width / full_width)
    return [Image(data=png, format="png"), {"board_id": board_id, "pixels": {"width": width, "height": height}, "world": {"x": left, "y": top, "width": width * units, "height": height * units}, "units_per_pixel": units}]

def _shrink_png(data, max_edge):
    from PIL import Image as Picture
    import io
    picture = Picture.open(io.BytesIO(data))
    picture.thumbnail((max_edge, max_edge), Picture.Resampling.LANCZOS)
    output = io.BytesIO()
    picture.convert("RGB").save(output, format="PNG", optimize=True)
    return output.getvalue(), picture.width, picture.height

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
