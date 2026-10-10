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

SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)

def safe_name(title, extension):
    name = re.sub(r"[^A-Za-z0-9_.-]+", "_", title).strip("._")[:100] or "board"
    return name + "." + extension

def color(value, fallback="#29262e"):
    try:
        Image.new("RGBA", (1, 1), value)
        return value
    except (ValueError, TypeError):
        return fallback

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
    left = min(point[0] for point in corners) - 32
    top = min(point[1] for point in corners) - 32
    right = max(point[0] for point in corners) + 32
    bottom = max(point[1] for point in corners) + 32
    return left, top, max(1, right - left), max(1, bottom - top)

def image_source(item):
    image = original_image(item["asset_id"])
    if isinstance(item.get("data", {}).get("crop"), dict):
        image = image.crop(crop_bounds(item, image.width, image.height))
    data = item.get("data", {})
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
    text_color = color(data.get("text_color", "#f5f5f5"), "#f5f5f5")
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
        draw_formatted(draw, item, padding, padding, width - 2 * padding, height - 2 * padding, size, text_color)
    elif item["kind"] == "swatch":
        patch_height = round(height * 0.28)
        draw.rectangle((0, patch_height, width - 1, height - 1), fill="#191919")
        label = {"text": swatch_label(item), "data": {"text_format": "plain"}}
        draw_formatted(draw, label, padding, patch_height + padding, width - 2 * padding, height - patch_height - 2 * padding, max(8, 12 * scale), "#f5f5f5")
    else:
        text = item.get("text") if item["kind"] == "note" else title
        if item["kind"] == "link":
            text += "\n" + item.get("url", "")
        if item["kind"] == "image":
            text += "\n" + str(data.get("unresolved_source_path", "Please relink this image."))
        draw_text(draw, text or title, padding, padding, max(1, width - 2 * padding), selected_font, text_color, height - padding)
    return image

def png_export(board):
    left, top, world_width, world_height = bounds(board)
    scale = min(1.0, settings.max_export_edge / world_width, settings.max_export_edge / world_height, math.sqrt(settings.max_export_pixels / (world_width * world_height)))
    width, height = max(1, round(world_width * scale)), max(1, round(world_height * scale))
    canvas = Image.new("RGBA", (width, height), color(board.get("background"), "#1c1b1d"))
    draw = ImageDraw.Draw(canvas)
    by_id = {item["id"]: item for item in board["items"]}
    for connection in board.get("connections", []):
        source, target = by_id.get(connection["from"]), by_id.get(connection["to"])
        if not source or not target or source.get("hidden") or target.get("hidden"):
            continue
        a = ((source["x"] + source["width"] / 2 - left) * scale, (source["y"] + source["height"] / 2 - top) * scale)
        b = ((target["x"] + target["width"] / 2 - left) * scale, (target["y"] + target["height"] / 2 - top) * scale)
        midpoint_x = (a[0] + b[0]) / 2
        steps = max(8, min(4096, math.ceil((abs(b[0] - a[0]) + abs(b[1] - a[1])) / 2)))
        curve = []
        for index in range(steps + 1):
            t = index / steps
            inverse = 1 - t
            curve.append((inverse ** 3 * a[0] + 3 * inverse ** 2 * t * midpoint_x + 3 * inverse * t ** 2 * midpoint_x + t ** 3 * b[0], inverse ** 3 * a[1] + 3 * inverse ** 2 * t * a[1] + 3 * inverse * t ** 2 * b[1] + t ** 3 * b[1]))
        draw.line(curve, fill=color(connection.get("color"), "#f97316"), width=max(1, round(2 * scale)))
        if connection.get("label"):
            draw.text(((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 8 * scale), connection["label"], font=font(11 * scale), fill="#a4a4a4", anchor="ls", stroke_width=max(1, round(5 * scale / 2)), stroke_fill=color(board.get("background"), "#1c1b1d"))
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
    return output.getvalue(), {"X-FormRef-Scale": str(scale), "X-FormRef-Width": str(width), "X-FormRef-Height": str(height)}

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

def svg_export(board):
    left, top, width, height = bounds(board)
    root = ET.Element("{" + SVG_NS + "}svg", {"width": str(width), "height": str(height), "viewBox": f"{left} {top} {width} {height}"})
    svg_element(root, "title", text=board["title"])
    svg_element(root, "rect", {"x": left, "y": top, "width": width, "height": height, "fill": color(board.get("background"), "#1c1b1d")})
    by_id = {item["id"]: item for item in board["items"]}
    for connection in board.get("connections", []):
        source, target = by_id.get(connection["from"]), by_id.get(connection["to"])
        if not source or not target or source.get("hidden") or target.get("hidden"):
            continue
        ax, ay = source["x"] + source["width"] / 2, source["y"] + source["height"] / 2
        bx, by = target["x"] + target["width"] / 2, target["y"] + target["height"] / 2
        svg_element(root, "path", {"d": f"M{ax},{ay} C{(ax + bx) / 2},{ay} {(ax + bx) / 2},{by} {bx},{by}", "fill": "none", "stroke": color(connection.get("color"), "#f97316"), "stroke-width": 2})
        if connection.get("label"):
            svg_element(root, "text", {"x": (ax + bx) / 2, "y": (ay + by) / 2 - 8, "fill": "#a4a4a4", "font-size": 11, "font-family": "sans-serif", "stroke": color(board.get("background"), "#1c1b1d"), "stroke-width": 5, "paint-order": "stroke"}, connection["label"])
    for item in sorted(board["items"], key=lambda entry: entry["z"]):
        if item.get("hidden"):
            continue
        x, y, width, height = item["x"], item["y"], item["width"], item["height"]
        cx, cy = x + width / 2, y + height / 2
        group = svg_element(root, "g", {"transform": f"rotate({item.get('rotation', 0)} {cx} {cy}) translate({x} {y})", "opacity": item.get("opacity", 1)})
        data = item.get("data", {})
        selected_color = color(item.get("color"))
        if item["kind"] == "image" and item.get("asset_id"):
            image = image_source(item)
            output = io.BytesIO()
            image.save(output, format="PNG")
            encoded = base64.b64encode(output.getvalue()).decode("ascii")
            svg_element(group, "image", {"width": width, "height": height, "href": "data:image/png;base64," + encoded, "preserveAspectRatio": "none", "style": "image-rendering:pixelated" if data.get("sampling") == "nearest" else "image-rendering:auto"})
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
            svg_formatted(group, item, 14, 14, width - 28, height - 28, size, color(data.get("text_color"), "#f5f5f5"))
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
            text = svg_element(group, "text", {"x": 14, "y": 14 + size, "fill": color(data.get("text_color"), "#f5f5f5"), "font-size": size, "font-family": "sans-serif"})
            max_chars = max(1, round((width - 28) / (size * 0.58)))
            lines = []
            for line in title.splitlines():
                lines.extend(textwrap.wrap(line, max_chars) or [""])
            for index, line in enumerate(lines[:max(1, int((height - 28) / (size * 1.4)))]):
                svg_element(text, "tspan", {"x": 14, "dy": 0 if index == 0 else size * 1.4}, line)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)

def portable_export(state):
    board = state["board"]
    asset_ids = sorted({item["asset_id"] for item in board["items"] if item.get("asset_id")})
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
    if board.get("connections"):
        lines.extend(["## Connections", ""])
        titles = {item["id"]: item.get("title") or item["kind"] for item in board["items"]}
        for connection in board["connections"]:
            lines.append("- " + titles.get(connection["from"], "Item") + " -> " + titles.get(connection["to"], "Item") + (": " + connection["label"] if connection.get("label") else ""))
    return "\n".join(lines).encode("utf-8")

def export_board(state, format):
    board = state["board"]
    headers = {}
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
        raise ValueError("Export format must be portable, json, png, svg, or markdown.")
    headers["Content-Disposition"] = 'attachment; filename="' + safe_name(board["title"], extension) + '"'
    return data, mime, headers
