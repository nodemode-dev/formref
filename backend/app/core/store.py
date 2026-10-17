import copy
import hashlib
import io
import json
import mimetypes
import os
from pathlib import Path
import re
import threading
import time
import uuid
import warnings
import defusedxml.ElementTree as ET
from PIL import Image
from .config import settings
from .engine import broker, EngineError
from .keywords import embedded_keywords, embedded_rating
from .endpoints import present as endpoint_present, remap as remap_endpoint

ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,96}$")
ASSET_PATTERN = re.compile(r"^[0-9a-f]{64}$")
TRASH_ENTRIES = 100


def media_signature(mime: str, data: bytes) -> bool:
    """True when the bytes start like the audio or video container the file name claims."""
    head = data[:16]
    if mime in {"video/mp4", "video/quicktime", "audio/mp4", "audio/x-m4a", "audio/aac"} and head[4:8] == b"ftyp":
        return True
    if mime in {"video/webm", "audio/webm", "video/x-matroska"}:
        return head[:4] == b"\x1aE\xdf\xa3"
    if mime in {"audio/ogg", "video/ogg", "audio/opus"}:
        return head[:4] == b"OggS"
    if mime == "audio/mpeg":
        return head[:3] == b"ID3" or (len(head) > 1 and head[0] == 0xFF and head[1] & 0xE0 == 0xE0)
    if mime in {"audio/wav", "audio/x-wav", "audio/wave"}:
        return head[:4] == b"RIFF" and head[8:12] == b"WAVE"
    if mime in {"audio/flac", "audio/x-flac"}:
        return head[:4] == b"fLaC"
    return False
Image.MAX_IMAGE_PIXELS = settings.max_image_pixels

class MissingBoard(ValueError):
    pass

class RevisionConflict(ValueError):
    pass

class BoardStore:
    def __init__(self):
        self.lock = threading.RLock()
        self.loaded = {}
        self.boards_dir = settings.data_dir / "boards"
        self.assets_dir = settings.data_dir / "assets"
        self.boards_dir.mkdir(parents=True, exist_ok=True)
        self.assets_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def atomic_write(path: Path, data: bytes):
        temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
        try:
            with temporary.open("xb") as stream:
                stream.write(data)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, path)
        finally:
            temporary.unlink(missing_ok=True)

    @staticmethod
    def checked_id(value: str):
        if not ID_PATTERN.fullmatch(value):
            raise ValueError("Invalid board identifier.")
        return value

    def board_path(self, board_id: str):
        return self.boards_dir / (self.checked_id(board_id) + ".json")

    def stored_record(self, board_id: str):
        path = self.board_path(board_id)
        if not path.is_file():
            raise MissingBoard("Board does not exist.")
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ValueError("Saved board could not be read. Its file has been preserved.") from exc
        if not isinstance(record, dict) or not isinstance(record.get("board"), dict):
            raise ValueError("Saved board has an invalid format. Its file has been preserved.")
        return record

    def ensure_loaded(self, board_id: str):
        record = self.stored_record(board_id)
        broker.start()
        if self.loaded.get(board_id) != broker.generation:
            broker.call("board.open", {"board": record["board"]})
            self.loaded[board_id] = broker.generation
        return record

    def persist(self, state: dict, import_report=None):
        board = state["board"]
        path = self.board_path(board["id"])
        if import_report is None and path.is_file():
            import_report = self.stored_record(board["id"]).get("import_report")
        record = {"board": board, "updated_at": time.time()}
        if import_report:
            record["import_report"] = import_report
        self.atomic_write(path, json.dumps(record, allow_nan=False, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
        self.loaded[board["id"]] = broker.generation
        if import_report:
            state["import_report"] = import_report
        return state

    def list_boards(self):
        with self.lock:
            summaries = []
            for path in self.boards_dir.glob("*.json"):
                try:
                    record = self.stored_record(path.stem)
                    board = record["board"]
                    items = board.get("items", [])
                    summaries.append({"id": board["id"], "title": board["title"], "revision": board.get("revision", 0), "item_count": len(items), "image_count": sum(item.get("kind") == "image" for item in items), "unresolved_count": sum(bool(item.get("data", {}).get("unresolved")) for item in items), "updated_at": record.get("updated_at", 0)})
                except (ValueError, KeyError):
                    continue
            return sorted(summaries, key=lambda entry: entry["updated_at"], reverse=True)

    def create(self, title: str):
        title = title.strip() or "Untitled board"
        if len(title) > 200:
            raise ValueError("Board title cannot exceed 200 characters.")
        with self.lock:
            state = broker.call("board.create", {"id": uuid.uuid4().hex, "title": title})
            return self.persist(state)

    def get(self, board_id: str):
        with self.lock:
            record = self.ensure_loaded(board_id)
            state = broker.call("board.get", {"board_id": board_id})
            if record.get("import_report"):
                state["import_report"] = record["import_report"]
            return state

    def mutate(self, board_id: str, command=None, history=None, expected_revision=None):
        with self.lock:
            previous = self.ensure_loaded(board_id)
            if expected_revision is not None and previous["board"]["revision"] != expected_revision:
                raise RevisionConflict("Board changed since this edit began. Refresh saved state before retrying.")
            if history:
                state = broker.call("board." + history, {"board_id": board_id})
            else:
                self.validate_assets(command)
                state = broker.call("board.apply", {"board_id": board_id, "command": command})
            try:
                self.persist(state)
                if not history and '"remove"' in json.dumps(command):
                    try:
                        self.note_removed(previous["board"], state["board"])
                    except (OSError, ValueError):
                        pass  # the edit is saved; only its trash copy is lost
                return state
            except OSError:
                try:
                    broker.call("board.close", {"board_id": board_id})
                    broker.call("board.open", {"board": previous["board"]})
                except EngineError:
                    broker.close()
                    self.loaded.clear()
                raise

    def validate_assets(self, value):
        if isinstance(value, dict):
            asset_id = value.get("asset_id")
            if asset_id is not None:
                self.asset_info(asset_id)
            for child in value.values():
                self.validate_assets(child)
        elif isinstance(value, list):
            for child in value:
                self.validate_assets(child)

    def open_import(self, board: dict, import_report=None):
        with self.lock:
            board = copy.deepcopy(board)
            board["id"] = uuid.uuid4().hex
            board["version"] = 1
            board["revision"] = 0
            self.validate_assets(board)
            state = broker.call("board.open", {"board": board})
            return self.persist(state, import_report)

    def duplicate(self, board_id: str):
        with self.lock:
            state = self.get(board_id)
            board = copy.deepcopy(state["board"])
            board["title"] = board["title"] + " copy"
            mapping = {item["id"]: uuid.uuid4().hex for item in board["items"]}
            groups = {item["group_id"]: uuid.uuid4().hex for item in board["items"] if item.get("group_id")}
            for item in board["items"]:
                item["id"] = mapping[item["id"]]
                if item.get("parent_id"):
                    item["parent_id"] = mapping.get(item["parent_id"])
                if item.get("group_id"):
                    item["group_id"] = groups[item["group_id"]]
            for connection in board["connections"]:
                connection["id"] = uuid.uuid4().hex
                connection["from"] = remap_endpoint(connection["from"], mapping, groups)
                connection["to"] = remap_endpoint(connection["to"], mapping, groups)
            return self.open_import(board, state.get("import_report"))

    def delete(self, board_id: str):
        """Move a board to the trash; restore_board brings it back."""
        with self.lock:
            record = self.stored_record(board_id)
            record["deleted_at"] = time.time()
            self.trash_boards.mkdir(parents=True, exist_ok=True)
            self.atomic_write(self.trash_boards / (board_id + ".json"), json.dumps(record, allow_nan=False, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
            self.board_path(board_id).unlink()
            self.unload(board_id)
            return {"deleted": board_id, "trashed": True}

    def unload(self, board_id: str):
        if self.loaded.get(board_id) == broker.generation:
            try:
                broker.call("board.close", {"board_id": board_id})
            except EngineError:
                pass
        self.loaded.pop(board_id, None)

    @property
    def trash_boards(self):
        return settings.data_dir / "trash" / "boards"

    @property
    def trash_items(self):
        return settings.data_dir / "trash" / "items"

    def trashed_items(self, board_id: str) -> list:
        path = self.trash_items / (self.checked_id(board_id) + ".json")
        try:
            entries = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return []
        return entries if isinstance(entries, list) else []

    def save_trashed_items(self, board_id: str, entries: list):
        self.trash_items.mkdir(parents=True, exist_ok=True)
        path = self.trash_items / (self.checked_id(board_id) + ".json")
        if entries:
            self.atomic_write(path, json.dumps(entries[-TRASH_ENTRIES:], allow_nan=False, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
        else:
            path.unlink(missing_ok=True)

    def note_removed(self, before: dict, after: dict):
        """Keep items a command removed so they can be restored from the trash later."""
        kept = {item["id"] for item in after["items"]}
        items = [item for item in before["items"] if item["id"] not in kept]
        if not items:
            return
        links = {link["id"] for link in after.get("connections", [])}
        connections = [link for link in before.get("connections", []) if link["id"] not in links]
        entries = self.trashed_items(before["id"])
        entries.append({"id": uuid.uuid4().hex, "at": time.time(), "items": items, "connections": connections})
        self.save_trashed_items(before["id"], entries)

    def trash(self, board_id: str | None = None):
        with self.lock:
            boards = []
            for path in self.trash_boards.glob("*.json") if self.trash_boards.is_dir() else []:
                try:
                    record = json.loads(path.read_text(encoding="utf-8"))
                    board = record["board"]
                    boards.append({"id": board["id"], "title": board["title"], "item_count": len(board.get("items", [])), "deleted_at": record.get("deleted_at", 0)})
                except (OSError, ValueError, KeyError):
                    continue
            items = []
            if board_id:
                for entry in reversed(self.trashed_items(board_id)):
                    names = [item.get("title") or item.get("kind", "item") for item in entry["items"]]
                    items.append({"id": entry["id"], "at": entry["at"], "count": len(entry["items"]), "names": names[:6], "kinds": sorted({item.get("kind", "") for item in entry["items"]})})
            return {"boards": sorted(boards, key=lambda b: b["deleted_at"], reverse=True), "items": items}

    def restore_board(self, board_id: str):
        with self.lock:
            source = self.trash_boards / (self.checked_id(board_id) + ".json")
            if not source.is_file():
                raise MissingBoard("That board is not in the trash.")
            if self.board_path(board_id).is_file():
                raise ValueError("A board with that identifier already exists.")
            record = json.loads(source.read_text(encoding="utf-8"))
            record.pop("deleted_at", None)
            record["updated_at"] = time.time()
            self.atomic_write(self.board_path(board_id), json.dumps(record, allow_nan=False, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
            source.unlink()
            return {"restored": board_id, "title": record["board"]["title"]}

    def purge_board(self, board_id: str):
        with self.lock:
            source = self.trash_boards / (self.checked_id(board_id) + ".json")
            if not source.is_file():
                raise MissingBoard("That board is not in the trash.")
            source.unlink()
            (self.trash_items / (board_id + ".json")).unlink(missing_ok=True)
            return {"purged": board_id}

    def restore_items(self, board_id: str, entry_id: str):
        with self.lock:
            entries = self.trashed_items(board_id)
            entry = next((e for e in entries if e["id"] == entry_id), None)
            if entry is None:
                raise MissingBoard("Those items are not in the trash.")
            board = self.get(board_id)["board"]
            present = {item["id"] for item in board["items"]}
            items = [copy.deepcopy(item) for item in entry["items"] if item["id"] not in present]
            if not items:
                self.save_trashed_items(board_id, [e for e in entries if e["id"] != entry_id])
                raise ValueError("Those items are already back on the board.")
            ids = present | {item["id"] for item in items}
            for item in items:
                if item.get("parent_id") and item["parent_id"] not in ids:
                    item["parent_id"] = None
            links = {link["id"] for link in board.get("connections", [])}
            groups = {item["group_id"] for item in board["items"] + items if item.get("group_id")}
            commands = [{"type": "add", "items": items}] + [{"type": "connect", "connection": link} for link in entry["connections"] if link["id"] not in links and endpoint_present(link["from"], ids, groups) and endpoint_present(link["to"], ids, groups)]
            state = self.mutate(board_id, {"type": "batch", "commands": commands})
            self.save_trashed_items(board_id, [e for e in self.trashed_items(board_id) if e["id"] != entry_id])
            return state

    def purge_items(self, board_id: str, entry_id: str | None = None):
        with self.lock:
            self.save_trashed_items(board_id, [] if entry_id is None else [e for e in self.trashed_items(board_id) if e["id"] != entry_id])
            return {"purged": entry_id or "all"}

    def empty_trash(self):
        with self.lock:
            count = 0
            for folder in (self.trash_boards, self.trash_items):
                for path in folder.glob("*.json") if folder.is_dir() else []:
                    path.unlink()
                    count += 1
            return {"emptied": count}

    def asset_info(self, asset_id: str):
        if not isinstance(asset_id, str) or not ASSET_PATTERN.fullmatch(asset_id):
            raise ValueError("Invalid asset identifier.")
        path = self.assets_dir / (asset_id + ".json")
        if not path.is_file():
            raise ValueError("Referenced asset does not exist.")
        info = json.loads(path.read_text(encoding="utf-8"))
        return info

    def asset_bytes(self, asset_id: str):
        info = self.asset_info(asset_id)
        path = self.assets_dir / (asset_id + ".blob")
        if not path.is_file():
            raise ValueError("Registered asset bytes are missing.")
        return info, path.read_bytes()

    def import_asset(self, name: str, data: bytes):
        if not data:
            raise ValueError("The uploaded file is empty.")
        if len(data) > settings.max_upload_bytes:
            raise ValueError("Assets are limited to 64 MiB each.")
        name = Path(name.replace("\\", "/")).name[:200] or "asset"
        mime = "application/octet-stream"
        width = height = 0
        if data.lstrip().startswith(b"<svg") or (data.lstrip().startswith(b"<?xml") and b"<svg" in data[:4096]):
            width, height = self.check_svg(data)
            mime = "image/svg+xml"
        else:
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("error", Image.DecompressionBombWarning)
                    with Image.open(io.BytesIO(data)) as image:
                        width, height = image.size
                        if width * height > settings.max_image_pixels:
                            raise ValueError("Image exceeds the 64 megapixel limit.")
                        mime = Image.MIME.get(image.format, "application/octet-stream")
                        image.verify()
            except (Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
                raise ValueError("Image exceeds the 64 megapixel limit.") from exc
            except (OSError, SyntaxError):
                if Path(name).suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".svg"}:
                    raise ValueError("Uploaded image is invalid or unsupported.")
                mime = mimetypes.guess_type(name)[0] or "application/octet-stream"
                if mime.startswith(("video/", "audio/")) and not media_signature(mime, data):
                    mime = "application/octet-stream"  # an extension alone never makes a file playable
        asset_id = hashlib.sha256(data).hexdigest()
        info = {"id": asset_id, "url": "/api/assets/" + asset_id, "name": name, "mime": mime, "size": len(data), "width": width, "height": height}
        # Keywords stored in the picture (XMP, IPTC, Windows Tags) become the new item's tags.
        picture = mime.startswith("image/") and mime != "image/svg+xml"
        keywords = embedded_keywords(data) if picture else []
        if keywords:
            info["keywords"] = keywords
        # So does a star rating stored in it (xmp:Rating or the Windows Rating field).
        rating = embedded_rating(data) if picture else None
        if rating:
            info["rating"] = rating
        with self.lock:
            blob_path = self.assets_dir / (asset_id + ".blob")
            if not blob_path.exists():
                self.atomic_write(blob_path, data)
            metadata_path = self.assets_dir / (asset_id + ".json")
            if metadata_path.exists():
                info = self.asset_info(asset_id)
                # A picture first added before keywords were read gets them the next time it is added.
                added = False
                if keywords and "keywords" not in info:
                    info["keywords"] = keywords
                    added = True
                if rating and "rating" not in info:
                    info["rating"] = rating
                    added = True
                if added:
                    self.atomic_write(metadata_path, json.dumps(info, separators=(",", ":")).encode())
            else:
                self.atomic_write(metadata_path, json.dumps(info, separators=(",", ":")).encode())
        return info

    @staticmethod
    def check_svg(data):
        if b"<!DOCTYPE" in data.upper() or b"<!ENTITY" in data.upper():
            raise ValueError("SVG document declarations and entities are not permitted.")
        try:
            root = ET.fromstring(data)
        except ET.ParseError as exc:
            raise ValueError("SVG is not valid XML.") from exc
        if root.tag.rsplit("}", 1)[-1] != "svg":
            raise ValueError("SVG root element is missing.")
        for element in root.iter():
            if element.tag.rsplit("}", 1)[-1].lower() in {"script", "foreignobject", "iframe", "audio", "video", "style", "animate", "animatetransform", "set"}:
                raise ValueError("SVG active content is not supported.")
            for key, value in element.attrib.items():
                key = key.rsplit("}", 1)[-1].lower()
                urls = re.findall(r"url\(\s*([^)]*)\)", value, re.I)
                external_url = any(not re.fullmatch(r"['\"]?#[A-Za-z_][A-Za-z0-9_:.-]*['\"]?", target.strip()) for target in urls)
                if key.startswith("on") or key == "base" or "\\" in value or (key in {"href", "src"} and value and not value.startswith("#")) or external_url:
                    raise ValueError("SVG external references and active attributes are not supported.")
        viewbox = root.attrib.get("viewBox", "").replace(",", " ").split()
        def dimension(key, index):
            raw = root.attrib.get(key, "")
            if re.fullmatch(r"\d+(?:\.\d+)?(?:px)?", raw):
                return max(1, min(65536, round(float(raw.removesuffix("px")))))
            if len(viewbox) == 4:
                return max(1, min(65536, round(float(viewbox[index]))))
            return 512
        width, height = dimension("width", 2), dimension("height", 3)
        if width * height > settings.max_image_pixels:
            raise ValueError("SVG exceeds the 64 megapixel limit.")
        return width, height

store = BoardStore()
