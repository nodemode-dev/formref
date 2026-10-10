import colorsys
import math
from .media import original_image
from .store import store


def crop_bounds(item, width, height):
    crop = item.get("data", {}).get("crop") or {}
    left = max(0, min(width - 1, math.floor(float(crop.get("x", 0)) * width)))
    top = max(0, min(height - 1, math.floor(float(crop.get("y", 0)) * height)))
    right = max(left + 1, min(width, math.ceil((float(crop.get("x", 0)) + float(crop.get("width", 1))) * width)))
    bottom = max(top + 1, min(height, math.ceil((float(crop.get("y", 0)) + float(crop.get("height", 1))) * height)))
    return left, top, right, bottom


def color_values(rgba):
    red, green, blue, alpha = rgba
    hue, saturation, value = colorsys.rgb_to_hsv(red / 255, green / 255, blue / 255)
    return {"rgba": [red, green, blue, alpha], "rgb": [red, green, blue], "hsv": [hue * 360, saturation * 100, value * 100], "hex": "#" + "".join(f"{component:02X}" for component in (rgba if alpha < 255 else rgba[:3]))}


def sample_image(board_id, item_id, u, v):
    if not all(isinstance(coordinate, (int, float)) and not isinstance(coordinate, bool) and math.isfinite(coordinate) and 0 <= coordinate <= 1 for coordinate in (u, v)):
        raise ValueError("Sampling coordinates u and v must be finite and within 0 to 1 inclusive.")
    with store.lock:
        state = store.get(board_id)
        board = state["board"]
        item = next((entry for entry in board["items"] if entry["id"] == item_id), None)
        if item is None:
            raise ValueError("Sampling item does not exist in this board.")
        if item["kind"] != "image":
            raise ValueError("Only image references can be sampled.")
        if not item.get("asset_id"):
            raise ValueError("Image reference has no registered source asset. Relink it before sampling.")
        image = original_image(item["asset_id"])
        left, top, right, bottom = crop_bounds(item, image.width, image.height)
        data = item.get("data", {})
        source_u = 1 - u if data.get("flip_x") else u
        source_v = 1 - v if data.get("flip_y") else v
        x = left + min(right - left - 1, math.floor(source_u * (right - left)))
        y = top + min(bottom - top - 1, math.floor(source_v * (bottom - top)))
        result = {"board_id": board_id, "item_id": item_id, "asset_id": item["asset_id"], "revision": board["revision"], "x": x, "y": y, "scope": "original", "frame": 0}
        result.update(color_values(image.getpixel((x, y))))
        image.close()
        return result
