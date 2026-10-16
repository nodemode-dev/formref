"""BeeRef .bee boards in and out (researched wishlist: move boards between reference tools). A .bee file is SQLite with application_id 2060242126 and user_version 2: an items table (type pixmap or text, x, y, z, scale, rotation, flip, data JSON) and an sqlar table holding each picture. Written independently; how BeeRef applies rotation and mirroring was confirmed by reading its item loading and flip routines and by loading these files with it outside the repository. No BeeRef code is copied.

Geometry: a BeeRef item maps a local point p to the scene as pos + F(flip) * R(rotation) * scale * p, with local coordinates in the picture's pixels and rotation about the local origin; the horizontal mirror F applies after rotation, so a mirrored item stores the negated rotation. Crop is a rectangle in those pixels. A FormRef item is a box rotated about its centre that shows its crop of the picture, mirrored by flip_x; flip_y is a horizontal flip plus a half turn."""
import io
import json
import math
import os
import sqlite3
import tempfile
import uuid
from pathlib import Path

from PIL import Image

from .exports import apply_mask
from .media import original_image
from .store import store

APPLICATION_ID = 2060242126
USER_VERSION = 2
SCHEMA = [
    "CREATE TABLE items (id INTEGER PRIMARY KEY, type TEXT NOT NULL, x REAL DEFAULT 0, y REAL DEFAULT 0, z REAL DEFAULT 0, scale REAL DEFAULT 1, rotation REAL DEFAULT 0, flip INTEGER DEFAULT 1, data JSON)",
    "CREATE TABLE sqlar (name TEXT PRIMARY KEY, item_id INTEGER NOT NULL UNIQUE, mode INT, mtime INT default current_timestamp, sz INT, data BLOB, FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE ON UPDATE NO ACTION)",
]
EXTENSIONS = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/bmp": "bmp"}


def _rotate(x, y, degrees):
    a = math.radians(degrees)
    return x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)


def export_bee(board) -> tuple[bytes, int]:
    fd, path = tempfile.mkstemp(suffix=".bee")
    os.close(fd)
    count = 0
    try:
        db = sqlite3.connect(path)
        db.execute(f"PRAGMA application_id={APPLICATION_ID}")
        db.execute(f"PRAGMA user_version={USER_VERSION}")
        db.execute("PRAGMA foreign_keys=ON")
        for statement in SCHEMA:
            db.execute(statement)
        for item in sorted(board["items"], key=lambda entry: entry["z"]):
            if item.get("hidden"):
                continue
            data = item.get("data") or {}
            rotation = float(item.get("rotation") or 0)
            cx, cy = item["x"] + item["width"] / 2, item["y"] + item["height"] / 2
            if item["kind"] == "image" and item.get("asset_id"):
                try:
                    info, blob = store.asset_bytes(item["asset_id"])
                except ValueError:
                    continue
                width, height = int(info.get("width") or 0), int(info.get("height") or 0)
                mime = info.get("mime", "")
                if not width or not height or mime == "image/svg+xml" or data.get("mask"):
                    image = apply_mask(original_image(item["asset_id"]), data.get("mask"))
                    out = io.BytesIO()
                    image.save(out, "PNG")
                    blob, mime, (width, height) = out.getvalue(), "image/png", image.size
                crop = {"x": 0, "y": 0, "width": 1, "height": 1, **(data.get("crop") or {})}
                cw, ch = crop["width"] * width, crop["height"] * height
                scale = (item["width"] / cw + item["height"] / ch) / 2
                flip = -1 if data.get("flip_x") else 1
                if data.get("flip_y"):
                    flip, rotation = -flip, rotation + 180
                lx, ly = crop["x"] * width + cw / 2, crop["y"] * height + ch / 2
                ox, oy = _rotate(flip * lx * scale, ly * scale, rotation)
                cursor = db.execute("INSERT INTO items (type, x, y, z, scale, rotation, flip, data) VALUES ('pixmap', ?, ?, ?, ?, ?, ?, ?)",
                                    (cx - ox, cy - oy, float(item["z"]), scale, (rotation * flip) % 360, flip, json.dumps({"filename": item.get("title") or None, "opacity": float(item.get("opacity", 1)), "grayscale": bool(data.get("grayscale")), "crop": [crop["x"] * width, crop["y"] * height, cw, ch]})))
                name = f"{cursor.lastrowid:04d}-{Path(item.get('title') or 'image').stem[:60]}.{EXTENSIONS.get(mime, 'png')}"
                db.execute("INSERT INTO sqlar (item_id, name, mode, sz, data) VALUES (?, ?, ?, ?, ?)", (cursor.lastrowid, name, 0o644, len(blob), blob))
                count += 1
            elif item["kind"] in {"note", "document", "todo", "link"} and (item.get("text") or item.get("title")):
                text = "\n".join(part for part in (item.get("title"), item.get("text"), item.get("url")) if part)
                ox, oy = _rotate(item["width"] / 2, item["height"] / 2, rotation)
                db.execute("INSERT INTO items (type, x, y, z, scale, rotation, flip, data) VALUES ('text', ?, ?, ?, 1, ?, 1, ?)", (cx - ox, cy - oy, float(item["z"]), rotation % 360, json.dumps({"text": text})))
                count += 1
        db.commit()
        db.execute("VACUUM")
        db.close()
        return Path(path).read_bytes(), count
    finally:
        Path(path).unlink(missing_ok=True)


def import_bee(filename: str, data: bytes):
    fd, path = tempfile.mkstemp(suffix=".bee")
    with os.fdopen(fd, "wb") as handle:
        handle.write(data)
    try:
        db = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        try:
            app = db.execute("PRAGMA application_id").fetchone()[0]
            if app not in (APPLICATION_ID, 0):
                raise ValueError("This SQLite file is not a BeeRef board.")
            tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            if "items" not in tables:
                raise ValueError("This BeeRef board has no items table.")
            columns = {row[1] for row in db.execute("PRAGMA table_info(items)")}
            has_data = "data" in columns
            rows = db.execute(f"SELECT id, type, x, y, z, scale, rotation, flip, {'data' if has_data else 'NULL'} FROM items").fetchall()
            blobs = {row[0]: (row[1], row[2]) for row in db.execute("SELECT item_id, name, data FROM sqlar")} if "sqlar" in tables else {}
        finally:
            db.close()
        items, skipped = [], 0
        for item_id, kind, x, y, z, scale, rotation, flip, raw in rows:
            extra = json.loads(raw) if raw else {}
            scale, rotation, flip = float(scale or 1), float(rotation or 0), (-1 if (flip or 1) < 0 else 1)
            rotation *= flip
            if kind == "pixmap" and item_id in blobs:
                name, blob = blobs[item_id]
                try:
                    asset = store.import_asset(name or f"beeref-{item_id}.png", blob)
                except ValueError:
                    skipped += 1
                    continue
                width, height = int(asset.get("width") or 0), int(asset.get("height") or 0)
                if not width or not height:
                    skipped += 1
                    continue
                cx_, cy_, cw, ch = (extra.get("crop") or [0, 0, width, height])[:4]
                cx_, cy_ = max(0.0, float(cx_)), max(0.0, float(cy_))
                cw, ch = max(1.0, min(width - cx_, float(cw))), max(1.0, min(height - cy_, float(ch)))
                ox, oy = _rotate(flip * (cx_ + cw / 2) * scale, (cy_ + ch / 2) * scale, rotation)
                w, h = cw * scale, ch * scale
                centre = (float(x) + ox, float(y) + oy)
                crop = {"x": cx_ / width, "y": cy_ / height, "width": cw / width, "height": ch / height}
                item = {"id": uuid.uuid4().hex, "kind": "image", "x": centre[0] - w / 2, "y": centre[1] - h / 2, "width": w, "height": h, "rotation": ((rotation + 180) % 360) - 180, "z": float(z or 0), "opacity": max(0.0, min(1.0, float(extra.get("opacity", 1)))), "locked": False, "hidden": False, "group_id": None, "parent_id": None, "title": str(extra.get("filename") or name or "BeeRef image")[:200], "text": "", "color": "#ffffff", "asset_id": asset["id"], "url": "",
                        "data": {"flip_x": flip < 0, "grayscale": bool(extra.get("grayscale")), "natural_width": width, "natural_height": height, "mime": asset.get("mime"), "source_format": "beeref", **({"crop": crop} if crop != {"x": 0, "y": 0, "width": 1, "height": 1} else {})}}
                items.append(item)
            elif kind == "text" and isinstance(extra.get("text"), str):
                text = extra["text"][:20000]
                lines = text.splitlines() or [""]
                heading, text = lines[0].strip()[:200], "\n".join(lines[1:]).strip("\n")
                body = text.splitlines() or [""]
                w, h = max(240.0, min(1200.0, max(len(heading) * 13.0, max(len(line) for line in body) * 8.0) + 48)) * scale, (150.0 + len(body) * 22.0) * scale
                ox, oy = _rotate(w / 2, h / 2, rotation)
                item = {"id": uuid.uuid4().hex, "kind": "note", "x": float(x) + ox - w / 2, "y": float(y) + oy - h / 2, "width": w, "height": h, "rotation": ((rotation + 180) % 360) - 180, "z": float(z or 0), "opacity": 1, "locked": False, "hidden": False, "group_id": None, "parent_id": None, "title": heading, "text": text, "color": "#fde68a", "asset_id": None, "url": "", "data": {"source_format": "beeref"}}
                items.append(item)
            else:
                skipped += 1
        if not items:
            raise ValueError("No pictures or text could be read from this BeeRef board.")
        for rank, item in enumerate(sorted(items, key=lambda entry: entry["z"]), 1):
            item["z"] = rank
        report = {"source_format": "beeref", "source_name": Path(filename).name, "imported_item_count": len(items), "skipped_records": skipped}
        board = {"id": "import", "title": Path(filename).stem or "BeeRef board", "version": 1, "revision": 0, "items": items, "connections": [], "viewport": {"x": 64, "y": 64, "zoom": 1}, "background": "#1c1b1d"}
        return store.open_import(board, report)
    except sqlite3.DatabaseError as exc:
        raise ValueError("This file is not a readable BeeRef board.") from exc
    finally:
        Path(path).unlink(missing_ok=True)
