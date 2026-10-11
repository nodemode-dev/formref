import json

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


def enrich(board_id: str, command):
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
