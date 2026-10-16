"""Find by Colour and Sort by Colour: which pictures on a board contain a colour, and the order of their main hues (reference-board gap: PureRef, BeeRef and Milanote search by name only)."""
import json
import math
import re

from PIL import Image

from .media import original_image
from .store import store

COLORS = 8
SAMPLE_EDGE = 160
MIN_SCORE = 0.03
HEX = re.compile(r"^#[0-9a-fA-F]{6}")


def lab(hex_value: str) -> tuple[float, float, float]:
    """CIE Lab (D65) of an sRGB hex colour; distances in Lab follow what the eye sees far better than distances in RGB."""
    def linear(channel: int) -> float:
        c = channel / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (linear(int(hex_value[i:i + 2], 16)) for i in (1, 3, 5))
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883

    def f(t: float) -> float:
        return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x), f(y), f(z)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def delta(first: tuple[float, float, float], second: tuple[float, float, float]) -> float:
    """CIEDE2000 colour difference. Plain distance in Lab overstates gaps between saturated colours (pure red and a barn red are about 40 apart); CIEDE2000 corrects for that, so one tolerance works across the range."""
    l1, a1, b1 = first
    l2, a2, b2 = second
    c_mean = (math.hypot(a1, b1) + math.hypot(a2, b2)) / 2
    g = 0.5 * (1 - math.sqrt(c_mean ** 7 / (c_mean ** 7 + 25 ** 7)))
    a1p, a2p = a1 * (1 + g), a2 * (1 + g)
    c1p, c2p = math.hypot(a1p, b1), math.hypot(a2p, b2)
    h1p = math.degrees(math.atan2(b1, a1p)) % 360 if c1p else 0.0
    h2p = math.degrees(math.atan2(b2, a2p)) % 360 if c2p else 0.0
    dl, dc = l2 - l1, c2p - c1p
    dh = 0.0
    if c1p and c2p:
        dh = h2p - h1p
        if dh > 180:
            dh -= 360
        elif dh < -180:
            dh += 360
    dhp = 2 * math.sqrt(c1p * c2p) * math.sin(math.radians(dh / 2))
    l_mean, cp_mean = (l1 + l2) / 2, (c1p + c2p) / 2
    if c1p and c2p:
        h_mean = (h1p + h2p) / 2 if abs(h1p - h2p) <= 180 else (h1p + h2p + 360) / 2 if h1p + h2p < 360 else (h1p + h2p - 360) / 2
    else:
        h_mean = h1p + h2p
    t = 1 - 0.17 * math.cos(math.radians(h_mean - 30)) + 0.24 * math.cos(math.radians(2 * h_mean)) + 0.32 * math.cos(math.radians(3 * h_mean + 6)) - 0.20 * math.cos(math.radians(4 * h_mean - 63))
    sl = 1 + 0.015 * (l_mean - 50) ** 2 / math.sqrt(20 + (l_mean - 50) ** 2)
    sc = 1 + 0.045 * cp_mean
    sh = 1 + 0.015 * cp_mean * t
    rt = -2 * math.sqrt(cp_mean ** 7 / (cp_mean ** 7 + 25 ** 7)) * math.sin(math.radians(60 * math.exp(-(((h_mean - 275) / 25) ** 2))))
    return math.sqrt((dl / sl) ** 2 + (dc / sc) ** 2 + (dhp / sh) ** 2 + rt * (dc / sc) * (dhp / sh))


def asset_colors(asset_id: str) -> list[dict]:
    """The main colours of the whole picture, most common first, each with its share of the opaque pixels; worked out once per picture and kept with it."""
    info = store.asset_info(asset_id)
    cached = info.get("colors")
    if isinstance(cached, list) and cached:
        return cached
    image = original_image(asset_id).convert("RGBA")
    image.thumbnail((SAMPLE_EDGE, SAMPLE_EDGE), Image.Resampling.BOX)
    pixels = [p[:3] for p in image.getdata() if p[3] >= 128]
    if not pixels:
        return []
    flat = Image.new("RGB", (len(pixels), 1))
    flat.putdata(pixels)
    quantized = flat.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, kmeans=2)
    palette = quantized.getpalette()
    total = len(pixels)
    shares: dict[str, float] = {}
    for count, index in quantized.getcolors(maxcolors=COLORS * 4) or []:
        hex_value = "#" + "".join(f"{c:02x}" for c in palette[3 * index: 3 * index + 3])
        shares[hex_value] = shares.get(hex_value, 0) + count / total
    colors = [{"hex": h, "share": round(s, 4)} for h, s in sorted(shares.items(), key=lambda pair: -pair[1])]
    info["colors"] = colors
    with store.lock:
        store.atomic_write(store.assets_dir / (asset_id + ".json"), json.dumps(info, separators=(",", ":")).encode())
    return colors


def color_order(asset_id: str) -> float | None:
    """A number that puts pictures in hue order: the hue angle (0 to 360) of the most common clearly coloured part, or, for black, white and grey pictures, 360 plus their darkness, so they follow the colours from light to dark."""
    colors = asset_colors(asset_id)
    if not colors:
        return None
    for color in colors:
        if color["share"] < 0.08:
            break
        lightness, a, b = lab(color["hex"])
        if math.hypot(a, b) >= 15:
            return round(math.degrees(math.atan2(b, a)) % 360, 3)
    lightness = sum(lab(c["hex"])[0] * c["share"] for c in colors) / (sum(c["share"] for c in colors) or 1)
    return round(360 + (100 - lightness), 3)


def find_by_color(board_id: str, color: str, tolerance: float = 20) -> dict:
    """Pictures and swatches on the board containing `color` within `tolerance` (a CIEDE2000 difference; 10 is close, 30 is loose). A picture's score is the share of its pixels near the colour; pictures under 3 percent do not count."""
    if not isinstance(color, str) or not HEX.match(color):
        raise ValueError("Give the color as #RRGGBB.")
    if not 1 <= tolerance <= 100:
        raise ValueError("Tolerance is from 1 to 100.")
    target = lab(color[:7].lower())
    found = []
    for item in store.get(board_id)["board"]["items"]:
        if item.get("hidden"):
            continue
        if item["kind"] == "swatch" and isinstance(item.get("color"), str) and HEX.match(item["color"]):
            if delta(lab(item["color"][:7].lower()), target) <= tolerance:
                found.append({"id": item["id"], "score": 1.0})
        elif item["kind"] == "image" and item.get("asset_id"):
            try:
                colors = asset_colors(item["asset_id"])
            except (ValueError, OSError):
                continue
            score = sum(c["share"] for c in colors if delta(lab(c["hex"]), target) <= tolerance)
            if score >= MIN_SCORE:
                found.append({"id": item["id"], "score": round(min(score, 1.0), 4)})
    found.sort(key=lambda entry: -entry["score"])
    return {"color": color[:7].lower(), "tolerance": tolerance, "matches": found}
