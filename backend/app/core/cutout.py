"""Background removal without a model.

The background is taken to be whatever touches the image edges: the dominant edge colours are found,
every pixel close to one of them and connected to an edge becomes transparent, and a short ramp keeps
edges soft. This suits product shots, scans, sketches and studio photos; busy photographic backgrounds
need a segmentation model, which is left to the owner to choose. The original asset is never changed:
the item points at a new PNG and remembers the original, so Restore puts it back exactly.
"""
import io
from collections import deque
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter, ImageStat
from .media import original_image
from .store import store, MissingBoard

ANALYSIS_EDGE = 512
DEFAULT_TOLERANCE = 12
BUSY_TEXTURE = 8
EDGE_MARGIN = 24


def edge_colours(image):
    """Up to four colours that together cover most of the image border."""
    width, height = image.size
    pixels = image.load()
    border = [pixels[x, 0] for x in range(width)] + [pixels[x, height - 1] for x in range(width)]
    border += [pixels[0, y] for y in range(1, height - 1)] + [pixels[width - 1, y] for y in range(1, height - 1)]
    strip = Image.new("RGB", (len(border), 1))
    strip.putdata(border)
    quantized = strip.quantize(colors=4, method=Image.Quantize.MEDIANCUT)
    palette = quantized.getpalette()
    counts = sorted(quantized.getcolors() or [], reverse=True)
    wanted = [tuple(palette[index * 3:index * 3 + 3]) for count, index in counts if count >= len(border) * 0.08]
    return wanted or [tuple(palette[counts[0][1] * 3:counts[0][1] * 3 + 3])]


def distance(image, colours):
    """Per pixel, the largest channel difference to the nearest edge colour (0 to 255)."""
    nearest = None
    for colour in colours:
        red, green, blue = ImageChops.difference(image, Image.new("RGB", image.size, colour)).split()
        spread = ImageChops.lighter(ImageChops.lighter(red, green), blue)
        nearest = spread if nearest is None else ImageChops.darker(nearest, spread)
    return nearest


def edge_connected(candidate):
    """Mask (255) of candidate pixels reachable from the border through other candidates."""
    width, height = candidate.size
    inside = bytearray(candidate.tobytes())
    region = bytearray(width * height)
    queue = deque()
    for x in range(width):
        queue.extend((x, (height - 1) * width + x))
    for y in range(height):
        queue.extend((y * width, y * width + width - 1))
    while queue:
        index = queue.popleft()
        if region[index] or not inside[index]:
            continue
        region[index] = 255
        x = index % width
        if x > 0:
            queue.append(index - 1)
        if x < width - 1:
            queue.append(index + 1)
        if index >= width:
            queue.append(index - width)
        if index < (height - 1) * width:
            queue.append(index + width)
    return Image.frombytes("L", (width, height), bytes(region)), region.count(255) / float(width * height)


def cut_out(asset_id, tolerance):
    """Return PNG bytes of the asset with its edge-connected background made transparent."""
    if not isinstance(tolerance, int) or isinstance(tolerance, bool) or not 1 <= tolerance <= 60:
        raise ValueError("Tolerance must be a whole number from 1 to 60.")
    info, data = store.asset_bytes(asset_id)
    if info["mime"] != "image/svg+xml":
        with Image.open(io.BytesIO(data)) as probe:
            if getattr(probe, "n_frames", 1) > 1:
                raise ValueError("Background removal works on still images; this one is animated.")
    source = original_image(asset_id)
    rgb = source.convert("RGB")
    small = rgb.copy()
    small.thumbnail((ANALYSIS_EDGE, ANALYSIS_EDGE))
    colours = edge_colours(small)
    limit = round(tolerance * 2.55)
    analysis = distance(small, colours)
    region, share = edge_connected(analysis.point(lambda value: 255 if value <= limit else 0))
    if share < 0.01:
        raise ValueError("No plain background touches the edges of this image. Try a higher tolerance.")
    if share > 0.97:
        raise ValueError("The whole image matched the background. Try a lower tolerance.")
    # A plain background is smooth; a busy one (foliage, crowds, noise) would be eaten unpredictably, so refuse it.
    texture = ImageStat.Stat(small.convert("L").filter(ImageFilter.FIND_EDGES), mask=region).median[0]
    if texture > BUSY_TEXTURE:
        raise ValueError("The background of this image is too busy to remove without a segmentation model.")
    # Where the removed region stops, a real subject differs sharply from the background. In a photo whose
    # subject shades into its surroundings the region leaks and stops just past the tolerance instead.
    ring =ImageChops.subtract(region.filter(ImageFilter.MaxFilter(3)), region)
    if ImageStat.Stat(analysis, mask=ring).median[0] < limit + EDGE_MARGIN:
        raise ValueError("The subject of this image does not stand out clearly from its background, so it needs a segmentation model.")
    # Connectivity comes from the analysis size; the soft edge comes from full-resolution colour distance.
    zone = region.resize(source.size, Image.Resampling.BILINEAR).point(lambda value: 255 if value else 0).filter(ImageFilter.MaxFilter(3))
    soft = max(1, limit // 2)
    ramp = distance(rgb, colours).point(lambda value: 0 if value <= limit - soft else 255 if value >= limit else round((value - (limit - soft)) * 255 / soft))
    alpha = ImageChops.lighter(ramp, ImageChops.invert(zone))
    alpha = ImageChops.multiply(alpha, source.getchannel("A"))
    source.putalpha(alpha)
    output = io.BytesIO()
    source.save(output, "PNG")
    return output.getvalue(), info["name"]


def change_background(board_id, ids, action, tolerance=DEFAULT_TOLERANCE):
    """Remove or restore the background of image items as one undoable step."""
    if action not in {"remove", "restore"}:
        raise ValueError("action must be remove or restore.")
    if not isinstance(ids, list) or not ids or len(ids) > 50 or not all(isinstance(value, str) for value in ids):
        raise ValueError("ids must list 1 to 50 image items.")
    board = store.get(board_id)["board"]
    items = {item["id"]: item for item in board["items"]}
    missing = [value for value in ids if value not in items]
    if missing:
        raise MissingBoard("That item does not exist on this board.")
    planned, skipped = [], []
    for item_id in dict.fromkeys(ids):
        item = items[item_id]
        if item["kind"] != "image" or not item.get("asset_id"):
            raise ValueError("Only image references with a source can have their background changed.")
        cutout = (item.get("data") or {}).get("cutout")
        original = cutout.get("original") if isinstance(cutout, dict) else None
        if action == "restore":
            if original:
                info = store.asset_info(original)
                planned.append((item_id, item["asset_id"], {"asset_id": original, "data": {"cutout": None, "mime": info["mime"], "size": info["size"]}}))
            continue
        source_id = original or item["asset_id"]
        try:
            png, name = cut_out(source_id, tolerance)
        except ValueError as exc:
            # One unsuitable image in a selection should not stop the rest; it is reported back instead.
            if len(ids) == 1 or str(exc).startswith("Tolerance"):
                raise
            skipped.append({"id": item_id, "reason": str(exc)})
            continue
        asset = store.import_asset(Path(name).stem[:160] + " (no background).png", png)
        planned.append((item_id, item["asset_id"], {"asset_id": asset["id"], "data": {"cutout": {"original": source_id, "tolerance": tolerance}, "mime": asset["mime"], "size": asset["size"]}}))
    if not planned:
        raise ValueError(skipped[0]["reason"] if skipped else "None of those images has a removed background to restore.")
    with store.lock:
        current = {item["id"]: item for item in store.get(board_id)["board"]["items"]}
        # Skip any item whose image changed while the cutouts were being made.
        commands = [{"type": "update", "ids": [item_id], "patch": patch} for item_id, asset_id, patch in planned if item_id in current and current[item_id].get("asset_id") == asset_id]
        if not commands:
            raise ValueError("Those images changed while their backgrounds were being removed. Try again.")
        return {**store.mutate(board_id, {"type": "batch", "commands": commands}), "skipped": skipped}
