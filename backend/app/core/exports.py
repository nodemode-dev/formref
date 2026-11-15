import base64
import io
import json
import math
from functools import lru_cache
from pathlib import Path
import re
import textwrap
import xml.etree.ElementTree as ET
import zipfile
from PIL import Image, ImageDraw, ImageFont, ImageOps
from .config import settings
from .store import store
from .media import original_image
from .sampling import crop_bounds, color_values
from .reference_text import parse_text, layout_text, markdown_source
from .xmp_write import with_tags
from .endpoints import DASHES, GROUP, anchors as endpoint_anchors, heads as endpoint_heads, path_data as endpoint_path, polyline as endpoint_polyline, box as endpoint_box, group_of, title as endpoint_title

SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)

def safe_name(title, extension):
    name = re.sub(r"[^A-Za-z0-9_.-]+", "_", title).strip("._")[:100] or "board"
    return name + "." + extension

def color(value, fallback="#29262e"):
    # Pillow reads None as "no colour" and would hand it back, so only strings count.
    if not isinstance(value, str):
        return fallback
    try:
        Image.new("RGBA", (1, 1), value)
        return value
    except (ValueError, TypeError):
        return fallback

def ink(item):
    """Text colour for a card: its own text colour, otherwise dark ink on light paper and light ink on dark paper, as the board draws it."""
    chosen = (item.get("data") or {}).get("text_color")
    if isinstance(chosen, str) and color(chosen, "") == chosen:
        return chosen
    try:
        red, green, blue = Image.new("RGB", (1, 1), color(item.get("color"), "#29262e")).getpixel((0, 0))
    except (ValueError, TypeError):
        return "#f5f5f5"
    return "#3b3329" if 0.2126 * red + 0.7152 * green + 0.0722 * blue >= 110 else "#f5f5f5"

def with_heading(item):
    """A note or document as exported: its title on top of its text, the way the card shows both."""
    title = (item.get("title") or "").strip()
    if not title:
        return item
    markdown = (item.get("data") or {}).get("text_format") == "markdown"
    heading = ("# " + title.replace("\n", " ") if markdown else title) + "\n"
    return {**item, "text": heading + (item.get("text") or "")}

def bounds(board):
    visible = [item for item in board["items"] if not item.get("hidden")]
    if not visible:
        return 0, 0, 1280, 720
    corners = []
    for item in visible:
        x, y, width, height = item["x"], item["y"], item["width"], item["height"]
        angle = math.radians(item.get("rotation", 0))
        cosine, sine = math.cos(angle), math.sin(angle)
        cx, cy = x + width / 2, y + height / 2
        for dx, dy in ((-width / 2, -height / 2), (width / 2, -height / 2), (width / 2, height / 2), (-width / 2, height / 2)):
            corners.append((cx + dx * cosine - dy * sine, cy + dx * sine + dy * cosine))
    for frame, name in group_frames(board):
        # Group frames reach 12 px past their items, and a title sits above the frame.
        corners.extend(((frame["x"] - 12, frame["y"] - (40 if name else 12)), (frame["x"] + frame["width"] + 12, frame["y"] + frame["height"] + 12)))
    left = min(point[0] for point in corners) - 32
    top = min(point[1] for point in corners) - 32
    right = max(point[0] for point in corners) + 32
    bottom = max(point[1] for point in corners) + 32
    return left, top, max(1, right - left), max(1, bottom - top)

def apply_mask(image, mask):
    """Lasso crop: keep only the inside of a polygon given in source-normalized coordinates."""
    if not isinstance(mask, list) or len(mask) < 3:
        return image
    points = [(float(p[0]) * image.width, float(p[1]) * image.height) for p in mask if isinstance(p, (list, tuple)) and len(p) == 2]
    if len(points) < 3:
        return image
    shape = Image.new("L", image.size, 0)
    ImageDraw.Draw(shape).polygon(points, fill=255)
    alpha = Image.composite(image.getchannel("A"), shape, shape)
    image = image.copy()
    image.putalpha(alpha)
    return image

def apply_adjust(image, adjust):
    """Brightness, contrast and saturation in percent, the same arithmetic as the CSS filters the board uses (brightness, then contrast about mid-grey, then the saturate matrix), so exports match what is on screen."""
    if not isinstance(adjust, dict):
        return image
    def percent(key):
        try:
            value = float(adjust.get(key, 100))
        except (TypeError, ValueError):
            return 1.0
        return max(0.0, min(200.0, value)) / 100 if math.isfinite(value) else 1.0
    brightness, contrast, saturation = percent("brightness"), percent("contrast"), percent("saturation")
    if (brightness, contrast, saturation) == (1.0, 1.0, 1.0):
        return image
    alpha = image.getchannel("A") if "A" in image.getbands() else None
    rgb = image.convert("RGB")
    if brightness != 1.0:
        rgb = rgb.point(lambda v: max(0, min(255, round(v * brightness))))
    if contrast != 1.0:
        rgb = rgb.point(lambda v: max(0, min(255, round((v - 127.5) * contrast + 127.5))))
    if saturation != 1.0:
        s = saturation
        rgb = rgb.convert("RGB", (0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0,
                                  0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0,
                                  0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s, 0))
    if alpha is not None:
        rgb = rgb.convert("RGBA")
        rgb.putalpha(alpha)
    return rgb

def image_source(item):
    image = apply_mask(original_image(item["asset_id"]), item.get("data", {}).get("mask"))
    if isinstance(item.get("data", {}).get("crop"), dict):
        image = image.crop(crop_bounds(item, image.width, image.height))
    data = item.get("data", {})
    image = apply_adjust(image, data.get("adjust"))
    if data.get("flip_x"):
        image = ImageOps.mirror(image)
    if data.get("flip_y"):
        image = ImageOps.flip(image)
    if data.get("grayscale"):
        alpha = image.getchannel("A")
        image = ImageOps.grayscale(image).convert("RGBA")
        image.putalpha(alpha)
    return image

@lru_cache(maxsize=128)
def font(size, strong=False, emphasis=False):
    suffix = "-BoldOblique" if strong and emphasis else "-Bold" if strong else "-Oblique" if emphasis else ""
    mac = "Arial Bold Italic" if strong and emphasis else "Arial Bold" if strong else "Arial Italic" if emphasis else "Arial"
    windows = "arialbi" if strong and emphasis else "arialbd" if strong else "ariali" if emphasis else "arial"
    for path in ("/usr/share/fonts/truetype/dejavu/DejaVuSans" + suffix + ".ttf", "/System/Library/Fonts/Supplemental/" + mac + ".ttf", "C:/Windows/Fonts/" + windows + ".ttf"):
        if Path(path).is_file():
            return ImageFont.truetype(path, max(8, round(size)))
    return ImageFont.load_default(size=max(8, round(size)))

def draw_text(draw, text, x, y, max_width, selected_font, fill, max_height):
    line_height = selected_font.getbbox("Ag")[3] + 5
    for paragraph in str(text).splitlines() or [""]:
        words = paragraph.split(" ")
        line = ""
        for word in words:
            candidate = line + (" " if line else "") + word
            if draw.textlength(candidate, font=selected_font) <= max_width or not line:
                line = candidate
            else:
                draw.text((x, y), line, fill=fill, font=selected_font)
                y += line_height
                if y + line_height > max_height:
                    return
                line = word
        draw.text((x, y), line, fill=fill, font=selected_font)
        y += line_height
        if y + line_height > max_height:
            return

def formatted_layout(item, width, height, size):
    measurement = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    def measure(text, selected_size, run):
        return measurement.textlength(text, font=font(selected_size, run["strong"], run["emphasis"]))
    return layout_text(parse_text(item.get("text", ""), item.get("data", {}).get("text_format", "plain")), size, max(1, width), max(0, height), measure)

def draw_formatted(draw, item, x, y, width, height, size, fill):
    for line in formatted_layout(item, width, height, size):
        for run in line["runs"]:
            selected_font = font(line["size"], run["strong"], run["emphasis"])
            position = (x + run["x"], y + line["y"] + line["size"])
            draw.text(position, run["text"], font=selected_font, fill=fill, anchor="ls")
            if run.get("href"):
                draw.line((position[0], position[1] + 2, position[0] + run["width"], position[1] + 2), fill=fill, width=1)

def swatch_label(item):
    rgba = tuple(bytes.fromhex(item["color"][1:]))
    if len(rgba) == 3:
        rgba += (255,)
    values = color_values(rgba)
    hue, saturation, value = values["hsv"]
    return (item.get("title") or "Swatch") + "\n" + values["hex"] + "\nRGB " + ", ".join(str(component) for component in values["rgb"]) + f"\nHSV {hue:.0f}°, {saturation:.0f}%, {value:.0f}%"

def item_raster(item, scale):
    width = max(1, min(settings.max_export_edge, round(item["width"] * scale)))
    height = max(1, min(settings.max_export_edge, round(item["height"] * scale)))
    data = item.get("data", {})
    if item["kind"] == "image" and item.get("asset_id"):
        image = image_source(item)
        sampling = Image.Resampling.NEAREST if data.get("sampling") == "nearest" else Image.Resampling.LANCZOS
        return image.resize((width, height), sampling)
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    stroke_width = max(1, round(float(data.get("stroke_width", 2)) * scale))
    selected_color = color(item.get("color"))
    if item["kind"] in {"shape", "stroke"}:
        points = [(float(point["x"]) * scale, float(point["y"]) * scale) for point in data.get("points", []) if isinstance(point, dict) and "x" in point and "y" in point]
        if item["kind"] == "stroke":
            if len(points) >= 2:
                draw.line(points, fill=selected_color, width=stroke_width, joint="curve")
                radius = stroke_width / 2
                for x, y in (points[0], points[-1]):
                    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=selected_color)
        else:
            fill = None if data.get("fill", "none") == "none" else color(data.get("fill"))
            shape = data.get("shape", "rect")
            inset = stroke_width / 2
            box = (inset, inset, max(inset, width - inset - 1), max(inset, height - inset - 1))
            if shape == "ellipse":
                draw.ellipse(box, fill=fill, outline=selected_color, width=stroke_width)
            elif shape == "line":
                endpoints = [points[0], points[-1]] if points else [(0, 0), (width, height)]
                if endpoints[0] != endpoints[-1]:
                    draw.line(endpoints, fill=selected_color, width=stroke_width)
            else:
                draw.rectangle(box, fill=fill, outline=selected_color, width=stroke_width)
        return image
    radius = max(2, round(10 * scale))
    draw.rounded_rectangle((0, 0, width - 1, height - 1), radius=radius, fill=selected_color, outline=color("#46404e"), width=max(1, round(scale)))
    padding = max(4, round(14 * scale))
    size = max(8, float(data.get("font_size", 16)) * scale)
    selected_font = font(size)
    text_color = ink(item)
    title = item.get("title", "")
    if item["kind"] == "image":
        title = "Missing reference: " + title
        text_color = "#fca5a5"
    if item["kind"] == "todo":
        checkbox = max(8, round(16 * scale))
        draw.rectangle((padding, padding, padding + checkbox, padding + checkbox), outline=text_color, width=max(1, round(2 * scale)))
        if data.get("checked"):
            draw.line([(padding + 3 * scale, padding + 8 * scale), (padding + 7 * scale, padding + 12 * scale), (padding + 14 * scale, padding + 3 * scale)], fill=text_color, width=max(1, round(2 * scale)))
        draw_text(draw, item.get("text") or title, padding + checkbox + padding, padding, max(1, width - checkbox - 3 * padding), selected_font, text_color, height - padding)
    elif item["kind"] in {"note", "document"}:
        draw_formatted(draw, with_heading(item), padding, padding, width - 2 * padding, height - 2 * padding, size, text_color)
    elif item["kind"] == "swatch":
        patch_height = round(height * 0.28)
        draw.rectangle((0, patch_height, width - 1, height - 1), fill="#191919")
        label = {"text": swatch_label(item), "data": {"text_format": "plain"}}
        draw_formatted(draw, label, padding, patch_height + padding, width - 2 * padding, height - patch_height - 2 * padding, max(8, 12 * scale), "#f5f5f5")
    else:
        text = item.get("text") if item["kind"] == "note" else title
        if item["kind"] == "table":
            headers, rows = table_cells(data)
            text = (title + "\n" if title else "") + "\n".join("   ".join(row) for row in [headers] + rows)
        if item["kind"] == "link":
            text += "\n" + item.get("url", "")
        if item["kind"] == "image":
            text += "\n" + str(data.get("unresolved_source_path", "Please relink this image."))
        draw_text(draw, text or title, padding, padding, max(1, width - 2 * padding), selected_font, text_color, height - padding)
    return image

def stroke_curve(draw, curve, fill, width, dashes, scale):
    """A sampled curve drawn solid, or (v0.28.0) dashed or dotted with the window's pattern in board units: dashes is (on, off), and an on length of 0 means round dots."""
    if not dashes:
        draw.line(curve, fill=fill, width=width, joint="curve")
        return
    on, off = dashes[0] * scale, dashes[1] * scale
    period = on + off
    walked = 0.0
    radius = width / 2
    for (x1, y1), (x2, y2) in zip(curve, curve[1:]):
        length = math.hypot(x2 - x1, y2 - y1)
        if length <= 0:
            continue
        start = walked
        walked += length
        phase = math.floor(start / period) * period
        while phase < walked:
            if on == 0:
                if phase >= start:
                    f = (phase - start) / length
                    x, y = x1 + (x2 - x1) * f, y1 + (y2 - y1) * f
                    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=fill)
            else:
                lo, hi = max(phase, start), min(phase + on, walked)
                if hi > lo:
                    f1, f2 = (lo - start) / length, (hi - start) / length
                    draw.line(((x1 + (x2 - x1) * f1, y1 + (y2 - y1) * f1), (x1 + (x2 - x1) * f2, y1 + (y2 - y1) * f2)), fill=fill, width=width)
            phase += period

def group_frames(board):
    """(box, title) for every visible group that a connection reaches or that has a title, in a stable order."""
    titles = (board.get("settings") or {}).get("group_titles") or {}
    ends = [GROUP + group for group in titles]
    for connection in board.get("connections", []):
        ends.extend(end for end in (connection["from"], connection["to"]) if group_of(end))
    out, seen = [], set()
    for end in ends:
        if end in seen:
            continue
        seen.add(end)
        frame = endpoint_box(board["items"], end)
        if frame and not frame.get("hidden"):
            out.append((frame, titles.get(group_of(end), "")))
    return out


def png_export(board):
    left, top, world_width, world_height = bounds(board)
    scale = min(1.0, settings.max_export_edge / world_width, settings.max_export_edge / world_height, math.sqrt(settings.max_export_pixels / (world_width * world_height)))
    width, height = max(1, round(world_width * scale)), max(1, round(world_height * scale))
    canvas = Image.new("RGBA", (width, height), color(board.get("background"), "#1c1b1d"))
    draw = ImageDraw.Draw(canvas)
    for frame, name in group_frames(board):
        draw.rounded_rectangle(((frame["x"] - 12 - left) * scale, (frame["y"] - 12 - top) * scale, (frame["x"] + frame["width"] + 12 - left) * scale, (frame["y"] + frame["height"] + 12 - top) * scale), radius=max(1, round(12 * scale)), outline="#8c8a90", width=max(1, round(1.5 * scale)))
        if name:
            draw.text(((frame["x"] - 12 - left) * scale, (frame["y"] - 34 - top) * scale), name, fill="#a4a4a4", font=font(max(6, round(13 * scale)), True))
    for connection in board.get("connections", []):
        source, target = endpoint_box(board["items"], connection["from"]), endpoint_box(board["items"], connection["to"])
        if not source or not target or source.get("hidden") or target.get("hidden"):
            continue
        arrow = connection.get("arrow", "")
        route = connection.get("route", "")
        ax, ay, tx, ty = endpoint_anchors(source, target, arrow)
        ends, triangles = endpoint_heads(ax, ay, tx, ty, arrow, route)
        steps = min(4096, math.ceil((abs(ends[2] - ends[0]) + abs(ends[3] - ends[1])) * scale / 2))
        curve = [((x - left) * scale, (y - top) * scale) for x, y in endpoint_polyline(ax, ay, tx, ty, ends, route, steps)]
        stroke = color(connection.get("color"), "#f97316")
        stroke_curve(draw, curve, stroke, max(1, round(2 * scale)), DASHES.get(connection.get("line", "")), scale)
        for triangle in triangles:
            draw.polygon([((x - left) * scale, (y - top) * scale) for x, y in triangle], fill=stroke)
        if connection.get("label"):
            draw.text((((ax + tx) / 2 - left) * scale, ((ay + ty) / 2 - top) * scale - 8 * scale), connection["label"], font=font(11 * scale), fill="#a4a4a4", anchor="ls", stroke_width=max(1, round(5 * scale / 2)), stroke_fill=color(board.get("background"), "#1c1b1d"))
    for item in sorted(board["items"], key=lambda entry: entry["z"]):
        if item.get("hidden") or item.get("opacity", 1) <= 0:
            continue
        image = item_raster(item, scale)
        opacity = max(0, min(1, item.get("opacity", 1)))
        if opacity < 1:
            image.putalpha(image.getchannel("A").point(lambda alpha: round(alpha * opacity)))
        rotation = item.get("rotation", 0)
        if rotation:
            image = image.rotate(-rotation, resample=Image.Resampling.BICUBIC, expand=True)
        center_x = (item["x"] + item["width"] / 2 - left) * scale
        center_y = (item["y"] + item["height"] / 2 - top) * scale
        canvas.alpha_composite(image, (round(center_x - image.width / 2), round(center_y - image.height / 2)))
    output = io.BytesIO()
    canvas.save(output, format="PNG")
    return output.getvalue(), {"X-FormRef-Scale": str(scale), "X-FormRef-Width": str(width), "X-FormRef-Height": str(height), "X-FormRef-Left": str(left), "X-FormRef-Top": str(top)}

def svg_element(parent, tag, attributes=None, text=None):
    element = ET.SubElement(parent, "{" + SVG_NS + "}" + tag, {key: str(value) for key, value in (attributes or {}).items()})
    if text is not None:
        element.text = str(text)
    return element

def svg_formatted(parent, item, x, y, width, height, size, fill):
    for line in formatted_layout(item, width, height, size):
        for run in line["runs"]:
            container = svg_element(parent, "a", {"href": run["href"]}) if run.get("href") else parent
            attributes = {"x": x + run["x"], "y": y + line["y"] + line["size"], "fill": fill, "font-size": line["size"], "font-family": "sans-serif", "font-weight": "bold" if run["strong"] else "normal", "font-style": "italic" if run["emphasis"] else "normal"}
            if run.get("href"):
                attributes["text-decoration"] = "underline"
            svg_element(container, "text", attributes, run["text"])

def png_data_uri(image, item):
    output = io.BytesIO()
    image.save(output, format="PNG")
    return "data:image/png;base64," + base64.b64encode(output.getvalue()).decode("ascii")

def item_tags(board, item):
    """The item's label names (board labels it carries) then its tags, each once ignoring case."""
    labels = {label["id"]: label["name"] for label in (board.get("settings") or {}).get("labels") or []}
    data = item.get("data") or {}
    names = [labels[i] for i in data.get("labels") or [] if i in labels]
    names += [t.strip() for t in data.get("tags") or [] if isinstance(t, str) and t.strip()]
    out = []
    for name in names:
        if not any(name.lower() == seen.lower() for seen in out):
            out.append(name)
    return out


def svg_export(board, picture=png_data_uri):
    """The board as SVG; `picture(image, item)` turns each processed picture into the href it is embedded with (full-resolution PNG unless a caller such as the phone viewer asks for something lighter)."""
    left, top, width, height = bounds(board)
    root = ET.Element("{" + SVG_NS + "}svg", {"width": str(width), "height": str(height), "viewBox": f"{left} {top} {width} {height}"})
    svg_element(root, "title", text=board["title"])
    svg_element(root, "rect", {"x": left, "y": top, "width": width, "height": height, "fill": color(board.get("background"), "#1c1b1d")})
    # Connected or titled groups get the dashed frame the window draws, with the title above it, so they read as one node in the picture too.
    for frame, name in group_frames(board):
        svg_element(root, "rect", {"x": frame["x"] - 12, "y": frame["y"] - 12, "width": frame["width"] + 24, "height": frame["height"] + 24, "rx": 12, "fill": "none", "stroke": "#8c8a90", "stroke-width": 1.5, "stroke-dasharray": "6 5"})
        if name:
            svg_element(root, "text", {"x": frame["x"] - 12, "y": frame["y"] - 20, "fill": "#a4a4a4", "font-size": 13, "font-weight": 600, "font-family": "sans-serif"}, name)
    for connection in board.get("connections", []):
        source, target = endpoint_box(board["items"], connection["from"]), endpoint_box(board["items"], connection["to"])
        if not source or not target or source.get("hidden") or target.get("hidden"):
            continue
        arrow = connection.get("arrow", "")
        route = connection.get("route", "")
        ax, ay, bx, by = endpoint_anchors(source, target, arrow)
        ends, triangles = endpoint_heads(ax, ay, bx, by, arrow, route)
        stroke = color(connection.get("color"), "#f97316")
        attributes = {"d": endpoint_path(ax, ay, bx, by, ends, route), "fill": "none", "stroke": stroke, "stroke-width": 2}
        if connection.get("line") in DASHES:
            attributes.update({"stroke-dasharray": " ".join(map(str, DASHES[connection["line"]])), "stroke-linecap": "round" if connection["line"] == "dotted" else "butt"})
        svg_element(root, "path", attributes)
        for triangle in triangles:
            svg_element(root, "path", {"d": "M" + " L".join(f"{x},{y}" for x, y in triangle) + " Z", "fill": stroke})
        if connection.get("label"):
            svg_element(root, "text", {"x": (ax + bx) / 2, "y": (ay + by) / 2 - 8, "fill": "#a4a4a4", "font-size": 11, "font-family": "sans-serif", "stroke": color(board.get("background"), "#1c1b1d"), "stroke-width": 5, "paint-order": "stroke"}, connection["label"])
    for item in sorted(board["items"], key=lambda entry: entry["z"]):
        if item.get("hidden"):
            continue
        x, y, width, height = item["x"], item["y"], item["width"], item["height"]
        cx, cy = x + width / 2, y + height / 2
        group = svg_element(root, "g", {"transform": f"rotate({item.get('rotation', 0)} {cx} {cy}) translate({x} {y})", "opacity": item.get("opacity", 1)})
        tags = item_tags(board, item)
        if tags:
            # The phone viewer filters by these; other SVG readers ignore data attributes.
            group.set("data-tags", json.dumps(tags, ensure_ascii=False))
        stars = (item.get("data") or {}).get("rating")
        if item["kind"] == "image" and isinstance(stars, int) and 1 <= stars <= 5:
            group.set("data-rating", str(stars))
        data = item.get("data", {})
        selected_color = color(item.get("color"))
        if item["kind"] == "image" and item.get("asset_id"):
            svg_element(group, "image", {"width": width, "height": height, "href": picture(image_source(item), item), "preserveAspectRatio": "none", "style": "image-rendering:pixelated" if data.get("sampling") == "nearest" else "image-rendering:auto"})
        elif item["kind"] in {"stroke", "shape"}:
            attributes = {"stroke": selected_color, "stroke-width": data.get("stroke_width", 2), "fill": "none" if data.get("fill", "none") == "none" else color(data["fill"])}
            if data.get("style") in {"dashed", "dotted"}:
                attributes["stroke-dasharray"] = "8 5" if data["style"] == "dashed" else "2 4"
            if item["kind"] == "stroke":
                points = data.get("points") or []
                if len(points) >= 2:
                    attributes.update(points=" ".join(f"{point['x']},{point['y']}" for point in points), fill="none", **{"stroke-linecap": "round", "stroke-linejoin": "round"})
                    svg_element(group, "polyline", attributes)
            elif data.get("shape") == "line":
                points = data.get("points") or [{"x": 0, "y": 0}, {"x": width, "y": height}]
                first, last = points[0], points[-1]
                svg_element(group, "line", {**attributes, "x1": first["x"], "y1": first["y"], "x2": last["x"], "y2": last["y"], "fill": "none"})
            elif data.get("shape") == "ellipse":
                svg_element(group, "ellipse", {**attributes, "cx": width / 2, "cy": height / 2, "rx": width / 2, "ry": height / 2})
            else:
                svg_element(group, "rect", {**attributes, "width": width, "height": height})
        elif item["kind"] in {"note", "document"}:
            svg_element(group, "rect", {"width": width, "height": height, "rx": 10, "fill": selected_color, "stroke": "#46404e"})
            size = max(8, min(160, float(data.get("font_size", 16))))
            svg_formatted(group, with_heading(item), 14, 14, width - 28, height - 28, size, ink(item))
        elif item["kind"] == "swatch":
            patch_height = height * 0.28
            alpha = int(item["color"][7:9], 16) / 255 if len(item["color"]) == 9 else 1
            svg_element(group, "rect", {"width": width, "height": height, "rx": 10, "fill": item["color"][:7], "fill-opacity": alpha, "stroke": "#46404e"})
            svg_element(group, "rect", {"y": patch_height, "width": width, "height": height - patch_height, "fill": "#191919"})
            label = {"text": swatch_label(item), "data": {"text_format": "plain"}}
            svg_formatted(group, label, 14, patch_height + 14, width - 28, height - patch_height - 28, 12, "#f5f5f5")
        else:
            svg_element(group, "rect", {"width": width, "height": height, "rx": 10, "fill": selected_color, "stroke": "#46404e"})
            title = item.get("text") or item.get("title", "")
            if item["kind"] == "image":
                title = "Missing reference: " + item.get("title", "")
            if item["kind"] == "link":
                title += "\n" + item.get("url", "")
            if item["kind"] == "todo":
                title = ("[x] " if data.get("checked") else "[ ] ") + title
            size = max(8, min(160, float(data.get("font_size", 16))))
            text = svg_element(group, "text", {"x": 14, "y": 14 + size, "fill": ink(item), "font-size": size, "font-family": "sans-serif"})
            max_chars = max(1, round((width - 28) / (size * 0.58)))
            lines = []
            for line in title.splitlines():
                lines.extend(textwrap.wrap(line, max_chars) or [""])
            for index, line in enumerate(lines[:max(1, int((height - 28) / (size * 1.4)))]):
                svg_element(text, "tspan", {"x": 14, "dy": 0 if index == 0 else size * 1.4}, line)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)

PAPERS = {"a4": (595.28, 841.89), "letter": (612.0, 792.0), "a3": (841.89, 1190.55), "tabloid": (792.0, 1224.0)}
PDF_MAX = 14400.0
PX_TO_PT = 0.75


def item_box(item):
    """Board-space box around an item, rotation included."""
    angle = math.radians(item.get("rotation", 0))
    cosine, sine = abs(math.cos(angle)), abs(math.sin(angle))
    width = item["width"] * cosine + item["height"] * sine
    height = item["width"] * sine + item["height"] * cosine
    cx, cy = item["x"] + item["width"] / 2, item["y"] + item["height"] / 2
    return cx - width / 2, cy - height / 2, width, height


def reading_order(items):
    """Top to bottom in rows, then left to right, as a person reads a board."""
    rows = []
    for item in sorted(items, key=lambda entry: item_box(entry)[1]):
        box = item_box(item)
        row = next((r for r in rows if abs(r[0] - box[1]) < max(24.0, box[3] * 0.4)), None)
        if row:
            row[1].append(item)
        else:
            rows.append([box[1], [item]])
    return [entry for _, row in rows for entry in sorted(row, key=lambda entry: item_box(entry)[0])]


def pdf_export(board, layout="board", paper="a4"):
    """PDF of the board at full resolution: the whole board on one page, one page per top-level item in reading order fitted to the paper, or the board at 100 percent tiled across paper pages for printing large."""
    try:
        import cairocffi as cairo
        from cairosvg.parser import Tree
        from cairosvg.surface import PDFSurface
    except (ImportError, OSError) as exc:
        raise ValueError("PDF export requires CairoSVG and a system libCairo installation. On macOS run brew install cairo; on Windows install a compatible libCairo runtime.") from exc

    page_w, page_h = PAPERS.get(paper, PAPERS["a4"])
    source = svg_export(board) if layout != "pages" else None
    output = io.BytesIO()
    shared = cairo.PDFSurface(output, page_w, page_h)
    shared.set_metadata(cairo.PDF_METADATA_TITLE, board.get("title") or "Board")
    shared.set_metadata(cairo.PDF_METADATA_CREATOR, "FormRef")

    class Page(PDFSurface):
        def _create_surface(self, width, height):
            shared.set_size(width, height)
            return shared, width, height

    def page(view, width_pt, height_pt, svg=None, caption=""):
        tree = Tree(bytestring=svg or source, unsafe=False)
        tree["viewBox"] = " ".join(f"{value:.3f}" for value in view)
        tree["width"], tree["height"] = f"{width_pt / PX_TO_PT:.3f}", f"{height_pt / PX_TO_PT:.3f}"
        tree["preserveAspectRatio"] = "xMidYMid meet"
        Page(tree, None, 96)
        if caption:
            # One page per item: the title and tags in the bottom margin, cut to the page width.
            context = cairo.Context(shared)
            context.select_font_face("sans-serif")
            context.set_font_size(8)
            context.set_source_rgb(0.42, 0.42, 0.45)
            text = caption
            while text and context.text_extents(text)[4] > width_pt - 72:
                text = text[:-2] + "…"
            context.move_to(36, height_pt - 16)
            context.show_text(text)
        shared.show_page()

    left, top, width, height = bounds(board)
    count = 0
    if layout == "pages":
        items = [item for item in board["items"] if not item.get("hidden") and not item.get("parent_id")]
        for item in reading_order(items):
            inside = {item["id"]}
            for entry in board["items"]:
                if entry.get("parent_id") in inside and not entry.get("hidden"):
                    inside.add(entry["id"])
            alone = {**board, "items": [entry for entry in board["items"] if entry["id"] in inside], "connections": []}
            x, y, w, h = bounds(alone)
            margin = 36.0
            landscape = w > h
            pw, ph = (page_h, page_w) if landscape else (page_w, page_h)
            scale = min((pw - 2 * margin) / w, (ph - 2 * margin) / h)
            vw, vh = pw / scale, ph / scale
            tags = item_tags(board, item)
            caption = " · ".join(part for part in [(item.get("title") or "").replace("\n", " ").strip(), ", ".join(tags)] if part)
            page((x - (vw - w) / 2, y - (vh - h) / 2, vw, vh), pw, ph, svg_export(alone), caption)
            count += 1
    elif layout == "tiles":
        landscape = width > height
        pw, ph = (page_h, page_w) if landscape else (page_w, page_h)
        tile_w, tile_h = pw / PX_TO_PT, ph / PX_TO_PT
        columns, rows = max(1, math.ceil(width / tile_w)), max(1, math.ceil(height / tile_h))
        if columns * rows > 400:
            raise ValueError(f"At 100 percent this board needs {columns * rows} pages; export it as one page or one page per item instead.")
        for row in range(rows):
            for column in range(columns):
                page((left + column * tile_w, top + row * tile_h, tile_w, tile_h), pw, ph)
                count += 1
    else:
        scale = min(1.0, PDF_MAX / (width * PX_TO_PT), PDF_MAX / (height * PX_TO_PT))
        page((left, top, width, height), width * PX_TO_PT * scale, height * PX_TO_PT * scale)
        count = 1
    if not count:
        raise ValueError("There is nothing on this board to put on a page.")
    shared.finish()
    return output.getvalue(), count


def portable_export(state):
    board = state["board"]
    asset_ids = {item["asset_id"] for item in board["items"] if item.get("asset_id")}
    # An image with its background removed keeps its original, so Restore still works after import.
    asset_ids |= {item["data"]["cutout"]["original"] for item in board["items"] if isinstance((item.get("data") or {}).get("cutout"), dict) and isinstance(item["data"]["cutout"].get("original"), str)}
    asset_ids = sorted(asset_ids)
    assets = [store.asset_info(asset_id) for asset_id in asset_ids]
    manifest = {"format": "formref", "version": 1, "board": board, "assets": assets}
    if state.get("import_report"):
        manifest["import_report"] = state["import_report"]
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        archive.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, allow_nan=False, indent=2))
        for asset_id in asset_ids:
            info, data = store.asset_bytes(asset_id)
            archive.writestr("assets/" + asset_id + ".blob", data)
    return output.getvalue()

IMAGE_EXTENSIONS = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/bmp": "bmp", "image/svg+xml": "svg", "image/tiff": "tif", "image/avif": "avif", "image/heic": "heic"}

def images_export(board):
    """Every picture on the board as its original file, numbered in reading order; a picture used several times is written once. Tagged or rated pictures carry their labels and tags (from every use), title and highest star rating as XMP: inside JPEG and PNG files, as a .xmp sidecar beside other formats; untagged, unrated pictures are the original bytes."""
    pictures = [item for item in board["items"] if item["kind"] == "image" and item.get("asset_id") and not (item.get("data") or {}).get("unresolved")]
    tags_of: dict[str, list[str]] = {}
    rating_of: dict[str, int] = {}
    for item in reading_order(pictures):
        stars = (item.get("data") or {}).get("rating")
        if isinstance(stars, int) and 1 <= stars <= 5:
            rating_of[item["asset_id"]] = max(stars, rating_of.get(item["asset_id"], 0))
        merged = tags_of.setdefault(item["asset_id"], [])
        for tag in item_tags(board, item):
            if not any(tag.lower() == seen_tag.lower() for seen_tag in merged):
                merged.append(tag)
    output, seen, used = io.BytesIO(), set(), set()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_STORED) as archive:
        for item in reading_order(pictures):
            if item["asset_id"] in seen:
                continue
            seen.add(item["asset_id"])
            try:
                info, data = store.asset_bytes(item["asset_id"])
            except (KeyError, ValueError, OSError):
                continue
            stem = re.sub(r'[\\/:*?"<>|\x00-\x1f]+', "_", Path(item.get("title") or info.get("name") or "image").stem).strip(" ._")[:80] or "image"
            extension = IMAGE_EXTENSIONS.get(info.get("mime"), Path(info.get("name") or "").suffix.lstrip(".").lower() or "bin")
            name = f"{len(seen):03d} {stem}.{extension}"
            while name in used:
                name = f"{len(seen):03d} {stem} {len(used)}.{extension}"
            used.add(name)
            tags = tags_of.get(item["asset_id"]) or []
            stars = rating_of.get(item["asset_id"], 0)
            sidecar = None
            if tags or stars:
                data, sidecar = with_tags(data, info.get("mime", ""), tags, (item.get("title") or "").replace("\n", " ").strip(), stars)
            archive.writestr(name, data)
            if sidecar is not None:
                archive.writestr(name.rsplit(".", 1)[0] + ".xmp", sidecar)
    return output.getvalue(), len(used)

def table_cells(data):
    """Column names and raw cell text of a table card; formulas are exported as written."""
    table = data.get("table") if isinstance(data.get("table"), dict) else {}
    columns = [str(column.get("name", "")) for column in table.get("columns", []) if isinstance(column, dict)]
    rows = [[str(value) for value in row[:len(columns)]] + [""] * (len(columns) - len(row)) for row in table.get("rows", []) if isinstance(row, list)]
    return columns, rows

def markdown_export(board):
    lines = ["# " + board["title"].replace("\n", " "), ""]
    for item in sorted(board["items"], key=lambda entry: (entry["y"], entry["x"])):
        if item.get("hidden"):
            continue
        title = item.get("title", "").replace("\n", " ")
        if item["kind"] == "todo":
            lines.extend(["- [" + ("x" if item.get("data", {}).get("checked") else " ") + "] " + (item.get("text") or title), ""])
        elif item["kind"] in {"note", "document"}:
            lines.extend(["## " + markdown_source(title or item["kind"].title(), "plain"), "", markdown_source(item.get("text", ""), item.get("data", {}).get("text_format", "plain")), ""])
        elif item["kind"] == "swatch":
            lines.extend(["## " + markdown_source(title or "Swatch", "plain"), "", markdown_source(swatch_label(item), "plain"), ""])
        elif item["kind"] == "link":
            lines.extend(["## " + (title or "Link"), "", item.get("url", ""), "", item.get("text", ""), ""])
        elif item["kind"] == "table":
            headers, rows = table_cells(item.get("data", {}))
            cell = lambda value: value.replace("|", "\\|").replace("\n", " ") or " "
            lines.extend(["## " + (title or "Table"), "", "| " + " | ".join(map(cell, headers)) + " |", "|" + "---|" * len(headers)])
            lines.extend("| " + " | ".join(map(cell, row)) + " |" for row in rows)
            lines.append("")
        elif item["kind"] in {"image", "file"}:
            lines.extend(["## " + (title or "Reference"), ""])
            if item.get("asset_id"):
                info, data = store.asset_bytes(item["asset_id"])
                prefix = "!" if item["kind"] == "image" else ""
                lines.extend([prefix + "[" + title.replace("[", "\\[").replace("]", "\\]") + "](data:" + info["mime"] + ";base64," + base64.b64encode(data).decode() + ")", ""])
            else:
                lines.extend(["Missing asset: " + str(item.get("data", {}).get("unresolved_source_path", title)), ""])
        else:
            lines.extend(["## " + (title or item["kind"].title()), "", item.get("text", ""), ""])
        tags = item_tags(board, item)
        if tags:
            lines.extend(["Tags: " + markdown_source(", ".join(tags), "plain"), ""])
    if board.get("connections"):
        lines.extend(["## Connections", ""])
        for connection in board["connections"]:
            titles = (board.get("settings") or {}).get("group_titles") or {}
            lines.append("- " + endpoint_title(board["items"], connection["from"], titles) + {"start": " <- ", "both": " <-> "}.get(connection.get("arrow", ""), " -> ") + endpoint_title(board["items"], connection["to"], titles) + (": " + connection["label"] if connection.get("label") else ""))
    return "\n".join(lines).encode("utf-8")

def export_board(state, format, paper="a4", stacks=False):
    board = state["board"]
    headers = {}
    if stacks and format in {"png", "svg", "pdf", "pdf-pages", "pdf-tiles", "viewer"}:
        # Picture exports may show collapsed groups as their stack cards (v0.32.0); data exports always keep every item.
        from .stacks import stacked
        board = stacked(board)
    if format == "bee":
        from .beeref import export_bee
        data, count = export_bee(board)
        headers["X-FormRef-Items"] = str(count)
        headers["Content-Disposition"] = 'attachment; filename="' + safe_name(board["title"], "bee") + '"'
        return data, "application/vnd.sqlite3", headers
    if format == "viewer":
        from .viewer import viewer_export
        data, count = viewer_export(board)
        headers["X-FormRef-Items"] = str(count)
        headers["Content-Disposition"] = 'attachment; filename="' + safe_name(board["title"], "html") + '"'
        return data, "text/html; charset=utf-8", headers
    if format == "images":
        data, count = images_export(board)
        if not count:
            raise ValueError("This board has no pictures to export.")
        headers["X-FormRef-Items"] = str(count)
        headers["Content-Disposition"] = 'attachment; filename="' + safe_name(board["title"] + "_images", "zip") + '"'
        return data, "application/zip", headers
    if format in {"pdf", "pdf-pages", "pdf-tiles"}:
        data, pages = pdf_export(board, {"pdf": "board", "pdf-pages": "pages", "pdf-tiles": "tiles"}[format], paper)
        headers["X-FormRef-Pages"] = str(pages)
        headers["Content-Disposition"] = 'attachment; filename="' + safe_name(board["title"], "pdf") + '"'
        return data, "application/pdf", headers
    if format == "portable":
        data, mime, extension = portable_export(state), "application/zip", "formref"
    elif format == "json":
        data, mime, extension = json.dumps(state, ensure_ascii=False, allow_nan=False, indent=2).encode(), "application/json", "json"
    elif format == "png":
        data, headers = png_export(board)
        mime, extension = "image/png", "png"
    elif format == "svg":
        data, mime, extension = svg_export(board), "image/svg+xml", "svg"
    elif format == "markdown":
        data, mime, extension = markdown_export(board), "text/markdown; charset=utf-8", "md"
    else:
        raise ValueError("Export format must be portable, json, png, svg, markdown, pdf, pdf-pages, pdf-tiles, bee, images or viewer.")
    headers["Content-Disposition"] = 'attachment; filename="' + safe_name(board["title"], extension) + '"'
    return data, mime, headers
