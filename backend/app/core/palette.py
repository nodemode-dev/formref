"""Extract Palette: the main colours of a picture as swatch cards beside it (reference-board gap: PureRef and BeeRef only sample one pixel at a time; painters build a palette from a reference)."""
import uuid

from PIL import Image

from .exports import apply_mask, crop_bounds
from .media import original_image
from .store import MissingBoard, store

SAMPLE_EDGE = 240


def palette_colors(item: dict, count: int) -> list[dict]:
    """The `count` main colours of the visible picture (its crop and lasso mask, not its grayscale view), most common first, each with its share of the opaque pixels."""
    image = apply_mask(original_image(item["asset_id"]), (item.get("data") or {}).get("mask"))
    if isinstance((item.get("data") or {}).get("crop"), dict):
        image = image.crop(crop_bounds(item, image.width, image.height))
    image = image.convert("RGBA")
    image.thumbnail((SAMPLE_EDGE, SAMPLE_EDGE), Image.Resampling.BOX)
    pixels = [p[:3] for p in image.getdata() if p[3] >= 128]
    if not pixels:
        raise ValueError("The visible part of this picture is transparent.")
    flat = Image.new("RGB", (len(pixels), 1))
    flat.putdata(pixels)
    # Median cut finds the main colour regions; kmeans refines each centre towards the true average of its pixels.
    quantized = flat.quantize(colors=count, method=Image.Quantize.MEDIANCUT, kmeans=3)
    palette = quantized.getpalette()[: 3 * count]
    counts = sorted(quantized.getcolors(maxcolors=count * 4) or [], reverse=True)
    total = sum(n for n, _ in counts) or 1
    out, seen = [], set()
    for n, index in counts:
        rgb = tuple(palette[3 * index: 3 * index + 3])
        hex_value = "#" + "".join(f"{c:02x}" for c in rgb)
        if hex_value in seen:
            continue
        seen.add(hex_value)
        out.append({"hex": hex_value, "share": round(n / total, 4)})
    return out


def extract_palette(board_id: str, item_id: str, count: int = 6) -> dict:
    if not isinstance(count, int) or isinstance(count, bool) or not 2 <= count <= 16:
        raise ValueError("Choose from 2 to 16 colours.")
    state = store.get(board_id)
    items = state["board"]["items"]
    item = next((entry for entry in items if entry["id"] == item_id), None)
    if item is None:
        raise MissingBoard("That item does not exist on this board.")
    if item["kind"] != "image" or not item.get("asset_id"):
        raise ValueError("Extract Palette works on pictures.")
    colors = palette_colors(item, count)
    size, gap = 140.0, 12.0
    group = uuid.uuid4().hex
    z = max([entry["z"] for entry in items] + [0]) + 1
    x, y = item["x"], item["y"] + item["height"] + 32
    width = len(colors) * (size + gap) - gap
    # Below the picture, moved further down past anything already there, so a second palette never lands on the first.
    moved = True
    while moved:
        moved = False
        for other in items:
            if other.get("hidden") or other["id"] == item_id:
                continue
            if other["x"] < x + width and other["x"] + other["width"] > x and other["y"] < y + size and other["y"] + other["height"] > y:
                y, moved = other["y"] + other["height"] + gap, True
    title = (item.get("title") or "Picture").rsplit(".", 1)[0][:120]
    swatches = []
    for index, color in enumerate(colors):
        swatches.append({"id": str(uuid.uuid4()), "kind": "swatch", "x": x + index * (size + gap), "y": y, "width": size, "height": size, "rotation": 0, "z": z + index, "opacity": 1, "locked": False, "hidden": False, "group_id": group, "parent_id": None, "title": f"{title} {index + 1}", "text": "", "color": color["hex"], "asset_id": None, "url": "",
                         "data": {"palette_source": {"item_id": item_id, "asset_id": item["asset_id"], "share": color["share"]}}})
    result = store.mutate(board_id, command={"type": "add", "items": swatches})
    return {**result, "added": [entry["id"] for entry in swatches], "colors": colors}
