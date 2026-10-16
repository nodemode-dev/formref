"""Browser clipper: the FormRef extension saves images, selected text, links and pages to a board.

A web page must never be able to write to the board, so a clip has to carry the pairing token. The token is
shown only to FormRef's own page (a loopback origin) and pasted into the extension once. Clips arrive from the
extension's own origin (chrome-extension or moz-extension), which the service accepts on the clip routes only.
"""
import base64
import binascii
import hmac
import json
import re
import secrets
import time
import uuid

from .capture import capture
from .config import settings
from .store import store, MissingBoard

TOKEN_FILE = "clipper.json"
MAX_TEXT = 20000
SLOT_W, SLOT_H, GAP = 320, 260, 24


def _path():
    return settings.data_dir / TOKEN_FILE


def token(reset: bool = False) -> str:
    """The pairing token, created on first use; reset makes a new one so old pairings stop working."""
    with store.lock:
        if not reset:
            try:
                saved = json.loads(_path().read_text(encoding="utf-8")).get("token")
                if isinstance(saved, str) and len(saved) >= 32:
                    return saved
            except (OSError, ValueError):
                pass
        value = secrets.token_urlsafe(32)
        store.atomic_write(_path(), json.dumps({"token": value}).encode())
        return value


def paired(value: str | None) -> bool:
    try:
        saved = json.loads(_path().read_text(encoding="utf-8")).get("token")
    except (OSError, ValueError):
        return False
    return isinstance(value, str) and isinstance(saved, str) and hmac.compare_digest(value.encode(), saved.encode())


def boards():
    from ..routers.agent import get_session
    session = get_session()
    return {"boards": [{"id": b["id"], "title": b["title"]} for b in store.list_boards()], "active": session["active"]}


def target_board(board_id: str | None) -> str:
    if board_id:
        store.checked_id(board_id)
        store.get(board_id)
        return board_id
    active = boards()["active"]
    if active:
        return active
    listed = store.list_boards()
    if listed:
        return listed[0]["id"]
    return store.create("Clippings")["board"]["id"]


def free_spot(board: dict, width: float, height: float):
    """A spot near the middle of the last saved view that does not cover anything already on the board."""
    view = board.get("viewport") or {}
    zoom = float(view.get("zoom") or 1) or 1
    cx = (640 - float(view.get("x") or 0)) / zoom
    cy = (400 - float(view.get("y") or 0)) / zoom
    boxes = [(i["x"], i["y"], i["x"] + i["width"], i["y"] + i["height"]) for i in board["items"] if not i.get("hidden")]
    for ring in range(0, 8):
        for row in range(-ring, ring + 1):
            for col in range(-ring, ring + 1):
                if max(abs(row), abs(col)) != ring:
                    continue
                x, y = cx + col * (SLOT_W + GAP) - width / 2, cy + row * (SLOT_H + GAP) - height / 2
                if not any(x < r and x + width > l and y < b and y + height > t for l, t, r, b in boxes):
                    return round(x), round(y)
    return round(cx - width / 2), round(cy - height / 2)


def _text(value, limit, name):
    if value is None:
        return ""
    if not isinstance(value, str) or len(value) > limit:
        raise ValueError(f"{name} must be text of at most {limit} characters.")
    return value.strip()


def _page_url(value):
    value = _text(value, 4096, "page_url")
    if value and not re.match(r"^https?://", value, re.I):
        return ""
    return value


def _data_image(value: str):
    match = re.fullmatch(r"data:(image/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)", value or "", re.I | re.S)
    if not match:
        raise ValueError("The image data must be a base64 data: address of an image.")
    if len(match.group(2)) > settings.max_upload_bytes * 4 // 3 + 16:
        raise ValueError("Clipped images are limited to 64 MiB.")
    try:
        return base64.b64decode(match.group(2), validate=False)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("The image data is not valid base64.") from exc


async def clip(body: dict):
    if not isinstance(body, dict):
        raise ValueError("A clip must be a JSON object.")
    kind = body.get("kind")
    if kind not in {"image", "text", "link", "page"}:
        raise ValueError("kind must be image, text, link or page.")
    page_url = _page_url(body.get("page_url"))
    page_title = _text(body.get("page_title"), 300, "page_title")[:200]
    source = {"source": page_url, "at": round(time.time() * 1000)}
    if kind == "image":
        if body.get("data_url"):
            asset = store.import_asset(_text(body.get("name"), 200, "name") or "clipped image", _data_image(body["data_url"]))
        else:
            result = await capture(_text(body.get("src"), 4096, "src"))
            if "asset" not in result:
                raise ValueError("That address is a web page, not an image.")
            asset = result["asset"]
        if not asset["mime"].startswith("image/"):
            raise ValueError("The clipped file is not an image.")
        width = min(400, asset.get("width") or 300)
        height = round(width * ((asset.get("height") or 200) / (asset.get("width") or 300)))
        item = {"kind": "image", "width": width, "height": height, "title": _text(body.get("alt"), 300, "alt")[:200] or asset["name"], "asset_id": asset["id"], "url": page_url,
                "data": {"mime": asset["mime"], "size": asset["size"], "natural_width": asset.get("width"), "natural_height": asset.get("height"), "clip": source, **({"tags": asset["keywords"]} if asset.get("keywords") else {})}}
    elif kind == "text":
        text = _text(body.get("text"), MAX_TEXT, "text")
        if not text:
            raise ValueError("Select some text to clip.")
        item = {"kind": "note", "width": 300, "height": 220, "title": page_title or "Clipping", "text": text + ("\n\n" + page_url if page_url else ""), "color": "#e7d4b4", "data": {"clip": source}}
    else:
        url = _page_url(body.get("url") if kind == "link" else body.get("url") or page_url)
        if not url:
            raise ValueError("Only http and https links can be clipped.")
        title = _text(body.get("title"), 300, "title")[:200] or (page_title if kind == "page" else "") or url
        item = {"kind": "link", "width": 260, "height": 190, "title": title, "text": _text(body.get("text"), 2000, "text"), "url": url, "data": {"clip": source}}
    board_id = target_board(body.get("board_id") or None)
    with store.lock:
        board = store.get(board_id)["board"]
        x, y = free_spot(board, item["width"], item["height"])
        z = max([i.get("z", 0) for i in board["items"]] + [0]) + 1
        item.update(id=uuid.uuid4().hex, x=x, y=y, z=z)
        store.mutate(board_id, {"type": "add", "items": [item]})
    return {"board_id": board_id, "board_title": board["title"], "item_id": item["id"], "kind": item["kind"]}


__all__ = ["token", "paired", "boards", "clip", "MissingBoard"]


if __name__ == "__main__":
    # ./formref clipper prints what the extension needs; ./formref clipper --new unpairs the old one first.
    import sys
    from pathlib import Path
    folder = Path(__file__).resolve().parents[3] / "clipper"
    value = token(reset="--new" in sys.argv[1:])
    print("FormRef Clipper")
    print(f"  Extension folder: {folder}")
    print("  Chrome: Extensions, Developer mode, Load unpacked, pick that folder.")
    print("  Firefox: about:debugging, This Firefox, Load Temporary Add-on, pick manifest.json in it.")
    print(f"  Pairing token: {value}")
    print("  Paste the token into the clipper options and press Save and connect.")
