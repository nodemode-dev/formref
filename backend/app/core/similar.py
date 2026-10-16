"""Find Similar: the pictures on a board that look like a chosen one (reference-board gap: PureRef and BeeRef have no image search; Milanote searches text only). Each picture gets a small look signature once, kept with its asset."""
import json
import math

from PIL import Image, ImageOps

from .media import original_image
from .store import MissingBoard, store

LEVELS = {"close": 0.82, "related": 0.7, "loose": 0.58}
BINS = 4


def look(asset_id: str) -> dict:
    """The picture's signature, worked out once and kept with the asset."""
    info = store.asset_info(asset_id)
    cached = info.get("look")
    if isinstance(cached, dict) and cached.get("v") == 1:
        return cached
    signature = signature_of(original_image(asset_id))
    info["look"] = signature
    with store.lock:
        store.atomic_write(store.assets_dir / (asset_id + ".json"), json.dumps(info, separators=(",", ":")).encode())
    return signature


def signature_of(source: Image.Image) -> dict:
    """Colour mix (a 64-bin RGB histogram), an 8 by 8 grey layout and a 4 by 4 colour layout of the whole picture; transparent pixels count as mid grey."""
    image = source.convert("RGBA")
    flat = Image.new("RGBA", image.size, (128, 128, 128, 255))
    flat.alpha_composite(image)
    rgb = flat.convert("RGB")
    small = rgb.copy()
    small.thumbnail((96, 96), Image.Resampling.BOX)
    histogram = [0.0] * (BINS ** 3)
    step = 256 // BINS
    pixels = list(small.getdata())
    for r, g, b in pixels:
        histogram[(r // step) * BINS * BINS + (g // step) * BINS + (b // step)] += 1
    total = float(len(pixels)) or 1.0
    return {
        "v": 1,
        "hist": [round(v / total, 5) for v in histogram],
        "grey": list(rgb.convert("L").resize((8, 8), Image.Resampling.BOX).getdata()),
        "grey_flipped": list(ImageOps.mirror(rgb).convert("L").resize((8, 8), Image.Resampling.BOX).getdata()),
        "colors": [list(p) for p in rgb.resize((4, 4), Image.Resampling.BOX).getdata()],
    }


def correlation(a: list[float], b: list[float]) -> float:
    """How alike two grey layouts are regardless of brightness and contrast: 1 the same pattern, 0 unrelated. A flat picture has no pattern, so two flat pictures count as alike."""
    n = len(a)
    ma, mb = sum(a) / n, sum(b) / n
    da, db = [x - ma for x in a], [y - mb for y in b]
    va, vb = math.sqrt(sum(x * x for x in da)), math.sqrt(sum(y * y for y in db))
    if va < 1e-6 or vb < 1e-6:
        return 1.0 if va < 1e-6 and vb < 1e-6 else 0.0
    return max(0.0, sum(x * y for x, y in zip(da, db)) / (va * vb))


def likeness(a: dict, b: dict) -> float:
    """0 to 1. Colour mix counts 0.4 (histogram intersection), grey layout 0.35 (the better of b as is and mirrored, since references are often flipped), colour layout 0.25 (mean RGB distance over 4 by 4 cells)."""
    mix = sum(min(x, y) for x, y in zip(a["hist"], b["hist"]))
    pattern = max(correlation(a["grey"], b["grey"]), correlation(a["grey"], b["grey_flipped"]))
    cells = sum(math.dist(p, q) for p, q in zip(a["colors"], b["colors"])) / (len(a["colors"]) * math.dist((0, 0, 0), (255, 255, 255)))
    return 0.4 * mix + 0.35 * pattern + 0.25 * (1 - cells)


def find_similar(board_id: str, item_id: str, level: str = "related") -> dict:
    """Every other picture on the board scored against the chosen one, best first; `matches` keeps those at or above the level's score (close, related or loose)."""
    if level not in LEVELS:
        raise ValueError("Choose close, related or loose.")
    items = store.get(board_id)["board"]["items"]
    sample = next((i for i in items if i["id"] == item_id), None)
    if sample is None:
        raise MissingBoard("That item does not exist on this board.")
    if sample["kind"] != "image" or not sample.get("asset_id"):
        raise ValueError("Find Similar works on pictures.")
    reference = look(sample["asset_id"])
    scored = []
    for item in items:
        if item["id"] == item_id or item.get("hidden") or item["kind"] != "image" or not item.get("asset_id"):
            continue
        try:
            score = 1.0 if item["asset_id"] == sample["asset_id"] else likeness(reference, look(item["asset_id"]))
        except (ValueError, OSError):
            continue
        scored.append({"id": item["id"], "score": round(score, 4)})
    scored.sort(key=lambda entry: -entry["score"])
    threshold = LEVELS[level]
    return {"item_id": item_id, "level": level, "threshold": threshold, "matches": [s for s in scored if s["score"] >= threshold], "scores": scored}
