import base64
import binascii
import copy
import io
import json
import math
from pathlib import Path
import re
import uuid
import zipfile
from .config import settings
from .store import store

def number(value, default=0):
    try:
        result = float(default if value is None else value)
    except (ValueError, TypeError) as exc:
        raise ValueError("Imported board contains invalid geometry.") from exc
    if not math.isfinite(result) or abs(result) > 1_000_000_000:
        raise ValueError("Imported board geometry is outside supported limits.")
    return result

def decode_image_data(value: str):
    if not isinstance(value, str) or len(value) > settings.max_upload_bytes * 4 // 3 + 4096:
        raise ValueError("Embedded image exceeds the 64 MiB limit.")
    match = re.fullmatch(r"data:(image/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=\r\n]+)", value)
    if not match:
        raise ValueError("Embedded image must be a base64 image data URI.")
    try:
        return base64.b64decode(match.group(2).replace("\n", "").replace("\r", ""), validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Embedded image base64 data is invalid.") from exc

def base_item(kind, title, x=0, y=0, width=240, height=180):
    return {"id": uuid.uuid4().hex, "kind": kind, "x": x, "y": y, "width": max(1, width), "height": max(1, height), "rotation": 0, "z": 0, "opacity": 1, "locked": False, "hidden": False, "group_id": None, "parent_id": None, "title": title, "text": "", "color": "#29262e", "asset_id": None, "url": "", "data": {}}

def import_istack(source: dict, filename: str):
    if source.get("format") != "istack" or not isinstance(source.get("items"), list):
        raise ValueError("Expected an iStack project with format='istack' and an items array.")
    if not isinstance(source.get("drawings", []), list):
        raise ValueError("iStack drawings must be an array.")
    if len(source["items"]) > 10000 or len(source.get("drawings", [])) > 10000:
        raise ValueError("Imported project exceeds the 10,000 item limit.")
    items = []
    id_map = {}
    group_map = {}
    unresolved = []
    unsupported = []
    embedded_bytes = 0
    for position, old in enumerate(source["items"]):
        if not isinstance(old, dict):
            raise ValueError("iStack items must be objects.")
        kind = old.get("type")
        if kind not in {"image", "note"}:
            unsupported.append(copy.deepcopy(old))
            continue
        item = base_item(kind, str(old.get("name") or ("Reference" if kind == "image" else "Note"))[:200], number(old.get("x")), number(old.get("y")), number(old.get("w"), 240), number(old.get("h"), 180))
        id_map[str(old.get("id", position))] = item["id"]
        item.update(rotation=number(old.get("rotation")), z=round(number(old.get("z"), position)), opacity=max(0, min(1, number(old.get("opacity"), 1))), locked=bool(old.get("locked")))
        if old.get("groupId") is not None:
            group_key = str(old["groupId"])
            item["group_id"] = group_map.setdefault(group_key, uuid.uuid4().hex)
        if kind == "note":
            item["text"] = str(old.get("text", ""))
            item["color"] = str(old.get("bgColor") or "#29262e")
            item["data"] = {"font_size": max(8, min(160, number(old.get("fontSize"), 16))), "text_color": str(old.get("color") or "#f5f5f5"), "source_format": "istack"}
        else:
            item["data"] = {"flip_x": bool(old.get("flipH")), "flip_y": bool(old.get("flipV")), "grayscale": bool(old.get("grayscale") or source.get("grayscaleCanvas")), "sampling": "nearest" if old.get("nearestNeighbor") else "smooth", "source_format": "istack", "source_name": str(old.get("source", ""))}
            crop = old.get("cropRect")
            if isinstance(crop, dict):
                width, height = item["width"], item["height"]
                item["data"]["crop"] = {"x": max(0, min(1, number(crop.get("x")) / width)), "y": max(0, min(1, number(crop.get("y")) / height)), "width": max(0.001, min(1, number(crop.get("w"), width) / width)), "height": max(0.001, min(1, number(crop.get("h"), height) / height))}
            if old.get("_imageData"):
                data = decode_image_data(old["_imageData"])
                embedded_bytes += len(data)
                if embedded_bytes > settings.max_archive_bytes:
                    raise ValueError("Embedded project assets exceed the 256 MiB import limit.")
                asset = store.import_asset(item["title"], data)
                item["asset_id"] = asset["id"]
            else:
                source_path = str(old.get("_sourcePath") or old.get("source") or old.get("name") or "Missing reference")[:4096]
                item["data"].update(unresolved=True, unresolved_source_path=source_path)
                unresolved.append({"item_id": item["id"], "source_path": source_path, "name": item["title"]})
        items.append(item)
    drawings = source.get("drawings", [])
    if not isinstance(drawings, list):
        raise ValueError("iStack drawings must be an array.")
    for drawing in drawings:
        if not isinstance(drawing, dict):
            raise ValueError("iStack drawing records must be objects.")
        tool = drawing.get("tool")
        points = drawing.get("points", [])
        if not isinstance(points, list) or len(points) > 50000:
            raise ValueError("Drawing exceeds the 50,000 point limit.")
        valid_points = [{"x": number(point.get("x")), "y": number(point.get("y"))} for point in points if isinstance(point, dict)]
        start = drawing.get("startPos")
        if isinstance(start, dict) and tool in {"line", "rect", "circle"}:
            valid_points.insert(0, {"x": number(start.get("x")), "y": number(start.get("y"))})
        if tool not in {"freehand", "line", "rect", "circle"} or len(valid_points) < 2:
            unsupported.append(copy.deepcopy(drawing))
            continue
        min_x, min_y = min(point["x"] for point in valid_points), min(point["y"] for point in valid_points)
        width = max(point["x"] for point in valid_points) - min_x
        height = max(point["y"] for point in valid_points) - min_y
        item = base_item("stroke" if tool == "freehand" else "shape", "Imported " + tool, min_x, min_y, max(1, width), max(1, height))
        item["z"] = len(items)
        item["color"] = str(drawing.get("color") or "#f97316")
        item["data"] = {"stroke_width": max(0.1, min(200, number(drawing.get("size"), 2))), "style": str(drawing.get("style") or "solid"), "source_format": "istack"}
        if tool == "freehand":
            item["data"]["points"] = [{"x": point["x"] - min_x, "y": point["y"] - min_y} for point in valid_points]
        else:
            item["data"].update(shape={"line": "line", "rect": "rect", "circle": "ellipse"}[tool], fill="none")
            if tool == "line":
                item["data"]["points"] = [{"x": point["x"] - min_x, "y": point["y"] - min_y} for point in [valid_points[0], valid_points[-1]]]
        items.append(item)
    report = {"source_format": "istack", "source_name": Path(filename).name, "id_mapping": id_map, "unresolved_assets": unresolved, "unsupported_records": unsupported, "imported_item_count": len(items), "source_settings": {key: source.get(key) for key in ("version", "canvasRect", "gridMode", "gridSize", "grayscaleCanvas") if key in source}}
    board = {"id": "import", "title": Path(filename).stem or "Imported iStack", "version": 1, "revision": 0, "items": items, "connections": [], "viewport": {"x": number(source.get("panX")), "y": number(source.get("panY")), "zoom": max(0.02, min(20, number(source.get("zoom"), 1)))}, "background": str(source.get("bgColor") or "#1c1b1d")}
    return store.open_import(board, report)

def import_portable(data: bytes):
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as exc:
        raise ValueError("Portable project is not a valid ZIP archive.") from exc
    with archive:
        entries = archive.infolist()
        if len(entries) > 10002 or sum(entry.file_size for entry in entries) > settings.max_archive_bytes:
            raise ValueError("Portable archive exceeds 10,002 files or 256 MiB expanded size.")
        if any(entry.flag_bits & 1 for entry in entries):
            raise ValueError("Encrypted portable archives are not supported.")
        try:
            manifest_data = archive.read("manifest.json")
        except KeyError as exc:
            raise ValueError("Portable archive is missing manifest.json.") from exc
        if len(manifest_data) > settings.max_upload_bytes:
            raise ValueError("Portable manifest exceeds 64 MiB.")
        try:
            manifest = json.loads(manifest_data)
        except (ValueError, UnicodeError) as exc:
            raise ValueError("Portable manifest is invalid JSON.") from exc
        if not isinstance(manifest, dict) or manifest.get("format") != "formref" or manifest.get("version") != 1 or not isinstance(manifest.get("board"), dict):
            raise ValueError("Portable archive is not a supported FormRef version 1 project.")
        assets = manifest.get("assets", [])
        if not isinstance(assets, list):
            raise ValueError("Portable assets manifest must be an array.")
        for info in assets:
            if not isinstance(info, dict) or not isinstance(info.get("id"), str) or not re.fullmatch(r"[0-9a-f]{64}", info["id"]):
                raise ValueError("Portable asset identifier is invalid.")
            try:
                asset_data = archive.read("assets/" + info["id"] + ".blob")
            except KeyError as exc:
                raise ValueError("Portable archive is missing a referenced asset.") from exc
            imported = store.import_asset(str(info.get("name") or "asset"), asset_data)
            if imported["id"] != info["id"]:
                raise ValueError("Portable asset failed its SHA-256 integrity check.")
        return store.open_import(manifest["board"], manifest.get("import_report"))

def import_project(filename: str, data: bytes):
    if len(data) > settings.max_upload_bytes:
        raise ValueError("Project uploads are limited to 64 MiB compressed size.")
    if data.startswith(b"PK\x03\x04"):
        return import_portable(data)
    try:
        source = json.loads(data)
    except (ValueError, UnicodeError) as exc:
        raise ValueError("Project must be a portable .formref archive or JSON .istack/.json document.") from exc
    if not isinstance(source, dict):
        raise ValueError("Project JSON root must be an object.")
    if source.get("format") == "istack":
        return import_istack(source, filename)
    board = source.get("board", source)
    if not isinstance(board, dict) or not isinstance(board.get("items"), list) or board.get("version") != 1:
        raise ValueError("JSON snapshot does not contain a supported FormRef board.")
    return store.open_import(board, source.get("import_report"))
