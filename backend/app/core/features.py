import json

from .color_find import color_order
from .media import original_image
from .store import store

BINS = 4


def image_features(asset_id: str) -> list[float]:
    info = store.asset_info(asset_id)
    cached = info.get("features")
    if isinstance(cached, list) and cached:
        return cached
    image = original_image(asset_id).convert("RGB")
    image.thumbnail((128, 128))
    pixels = list(image.getdata())
    histogram = [0.0] * (BINS ** 3)
    step = 256 // BINS
    for r, g, b in pixels:
        histogram[(r // step) * BINS * BINS + (g // step) * BINS + (b // step)] += 1
    total = float(len(pixels)) or 1.0
    histogram = [round(v / total, 5) for v in histogram]
    layout = [round(v / 255.0, 5) for v in image.convert("L").resize((4, 4)).getdata()]
    vector = histogram + layout
    info["features"] = vector
    with store.lock:
        store.atomic_write(store.assets_dir / (asset_id + ".json"), json.dumps(info, separators=(",", ":")).encode())
    return vector


def image_hash(asset_id: str) -> int:
    info = store.asset_info(asset_id)
    cached = info.get("dhash")
    if isinstance(cached, str) and cached:
        return int(cached, 16)
    image = original_image(asset_id).convert("L").resize((9, 8))
    pixels = list(image.getdata())
    bits = 0
    for row in range(8):
        for col in range(8):
            bits = (bits << 1) | (1 if pixels[row * 9 + col] > pixels[row * 9 + col + 1] else 0)
    info["dhash"] = format(bits, "016x")
    with store.lock:
        store.atomic_write(store.assets_dir / (asset_id + ".json"), json.dumps(info, separators=(",", ":")).encode())
    return bits


def duplicates(board_id: str, distance: int = 4) -> list[list[str]]:
    images = [i for i in store.get(board_id)["board"]["items"] if i["kind"] == "image" and i.get("asset_id")]
    hashes: dict[str, int] = {}
    for item in images:
        if item["asset_id"] not in hashes:
            try:
                hashes[item["asset_id"]] = image_hash(item["asset_id"])
            except (ValueError, OSError):
                continue
    groups: list[list[dict]] = []
    for item in images:
        h = hashes.get(item["asset_id"])
        if h is None:
            continue
        for group in groups:
            first = group[0]
            if first["asset_id"] == item["asset_id"] or bin(hashes[first["asset_id"]] ^ h).count("1") <= distance:
                group.append(item)
                break
        else:
            groups.append([item])
    return [[i["id"] for i in group] for group in groups if len(group) > 1]


def color_enrich(board_id: str, command):
    """Sort by Colour reads data.color_order; it is refreshed from the picture each time, so a relinked picture sorts by its new colours."""
    wanted = set(command.get("ids") or [])
    updates = []
    for item in store.get(board_id)["board"]["items"]:
        if item["id"] not in wanted or item["kind"] != "image" or item.get("locked") or not item.get("asset_id"):
            continue
        try:
            order = color_order(item["asset_id"])
        except (ValueError, OSError):
            continue
        if order is not None and item.get("data", {}).get("color_order") != order:
            updates.append({"type": "update", "ids": [item["id"]], "patch": {"data": {"color_order": order}}})
    return {"type": "batch", "commands": updates + [command]} if updates else command


def enrich(board_id: str, command):
    if isinstance(command, dict) and command.get("type") == "sort" and command.get("key") == "color":
        return color_enrich(board_id, command)
    if not isinstance(command, dict) or command.get("type") != "sort" or command.get("key") != "similarity":
        return command
    wanted = set(command.get("ids") or [])
    board = store.get(board_id)["board"]
    updates = []
    for item in board["items"]:
        if item["id"] not in wanted or item["kind"] != "image" or item.get("locked") or not item.get("asset_id"):
            continue
        if isinstance(item.get("data", {}).get("features"), list):
            continue
        try:
            vector = image_features(item["asset_id"])
        except ValueError:
            continue
        updates.append({"type": "update", "ids": [item["id"]], "patch": {"data": {"features": vector}}})
    if not updates:
        return command
    return {"type": "batch", "commands": updates + [command]}
