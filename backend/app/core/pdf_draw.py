"""PDF pages drawn with PDFium (pypdfium2, which already reads PDFs here), so PDF export needs no system library on any platform.

Text is set in the faces the PNG export measures with (exports.font), with fallback faces for scripts they lack; each face is subset
to the characters used by fontTools and embedded. `svg_page` paints the part of SVG that exports.svg_export writes, so the board PDF
keeps matching the SVG export. Every page is drawn twice: a dry pass collects the characters, then the fonts are embedded and the
real pass draws."""
import base64
import ctypes
import datetime
import functools
import io
import logging
import math
import re
import threading
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageColor

PDFIUM = threading.RLock()
TOP_DOWN = (1.0, 0.0, 0.0, -1.0, 0.0, 0.0)
FALLBACKS = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf",
    "/usr/share/fonts/truetype/tlwg/Loma.ttf",
    "/usr/share/fonts/opentype/tlwg/Loma.otf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
    "C:/Windows/Fonts/msyh.ttc",
    "C:/Windows/Fonts/YuGothR.ttc",
    "C:/Windows/Fonts/malgun.ttf",
    "C:/Windows/Fonts/tahoma.ttf",
    "C:/Windows/Fonts/seguisym.ttf",
)


def serialized(function):
    """PDFium is not thread-safe, so every PDFium caller in the app takes the same lock."""
    @functools.wraps(function)
    def run(*args, **kwargs):
        with PDFIUM:
            return function(*args, **kwargs)
    return run


class Face:
    def __init__(self, source):
        from fontTools.ttLib import TTFont
        self.source = source
        font = TTFont(io.BytesIO(source) if isinstance(source, bytes) else source, fontNumber=0, lazy=True)
        self.cmap = font.getBestCmap() or {}
        self.metrics = font["hmtx"].metrics
        self.units = font["head"].unitsPerEm
        self.notdef = self.metrics[font.getGlyphOrder()[0]][0]
        font.close()

    def covers(self, char):
        return ord(char) in self.cmap

    def advance(self, char):
        name = self.cmap.get(ord(char))
        return (self.metrics[name][0] if name in self.metrics else self.notdef) / self.units


@functools.lru_cache(maxsize=32)
def face(source):
    return Face(source)


@functools.lru_cache(maxsize=1)
def fallback_faces():
    found = []
    for path in FALLBACKS:
        if Path(path).is_file():
            try:
                found.append(face(path))
            except Exception:
                continue
    return tuple(found)


def quadratic(font):
    """A CFF-outline font rewritten with TrueType outlines, which PDFium embeds as TrueType."""
    from fontTools.pens.cu2quPen import Cu2QuPen
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    from fontTools.ttLib import newTable
    order = font.getGlyphOrder()
    glyphs = font.getGlyphSet()
    glyf = newTable("glyf")
    glyf.glyphOrder = order
    glyf.glyphs = {}
    for name in order:
        pen = TTGlyphPen(glyphs)
        glyphs[name].draw(Cu2QuPen(pen, 1.0, reverse_direction=True))
        glyf.glyphs[name] = pen.glyph()
    font["loca"] = newTable("loca")
    font["glyf"] = glyf
    del font["CFF "]
    if "VORG" in font:
        del font["VORG"]
    hmtx = font["hmtx"]
    for name in order:
        glyf.glyphs[name].recalcBounds(glyf)
        hmtx.metrics[name] = (hmtx.metrics[name][0], getattr(glyf.glyphs[name], "xMin", 0))
    maxp = newTable("maxp")
    maxp.tableVersion = 0x00010000
    maxp.numGlyphs = len(order)
    for field in ("maxPoints", "maxContours", "maxCompositePoints", "maxCompositeContours", "maxTwilightPoints", "maxStorage", "maxFunctionDefs",
                  "maxInstructionDefs", "maxStackElements", "maxSizeOfInstructions", "maxComponentElements", "maxComponentDepth"):
        setattr(maxp, field, 0)
    maxp.maxZones = 1
    font["maxp"] = maxp
    post = font["post"]
    post.formatType = 2.0
    post.extraNames = []
    post.mapping = {}
    post.glyphOrder = order
    font.sfntVersion = "\x00\x01\x00\x00"


class Fonts:
    def __init__(self):
        self.used = {}
        self.handles = {}

    def primary(self, strong=False, emphasis=False):
        from .exports import font
        chosen = getattr(font(16, bool(strong), bool(emphasis)), "path", None)
        if hasattr(chosen, "getvalue"):
            chosen = chosen.getvalue()
        if chosen:
            try:
                return face(chosen)
            except Exception:
                pass
        return fallback_faces()[0]

    def pieces(self, text, strong=False, emphasis=False):
        main, out, previous = self.primary(strong, emphasis), [], None
        for char in text:
            chosen = main
            if not main.covers(char):
                if previous is not None and previous.covers(char):
                    chosen = previous
                else:
                    chosen = next((entry for entry in fallback_faces() if entry.covers(char)), main)
            if out and out[-1][0] is chosen:
                out[-1][1] += char
            else:
                out.append([chosen, char])
            previous = chosen
        return out

    def measure(self, text, size, strong=False, emphasis=False):
        return sum(entry.advance(char) for entry, piece in self.pieces(text, strong, emphasis) for char in piece) * size

    def note(self, text, strong=False, emphasis=False):
        for entry, piece in self.pieces(text, strong, emphasis):
            self.used.setdefault(entry, set()).update(piece)

    def embed(self, document):
        import pypdfium2.raw as raw
        from fontTools import subset
        logging.getLogger("fontTools.subset").setLevel(logging.ERROR)
        for entry, chars in self.used.items():
            options = subset.Options()
            options.layout_features = []
            options.hinting = False
            options.notdef_outline = True
            options.name_IDs = ["*"]
            options.font_number = 0
            font = subset.load_font(io.BytesIO(entry.source) if isinstance(entry.source, bytes) else entry.source, options, dontLoadGlyphNames=True)
            subsetter = subset.Subsetter(options)
            subsetter.populate(unicodes={ord(char) for char in chars})
            subsetter.subset(font)
            if "CFF " in font:
                quadratic(font)
            output = io.BytesIO()
            font.save(output)
            font.close()
            data = output.getvalue()
            buffer = (ctypes.c_uint8 * len(data)).from_buffer_copy(data)
            handle = raw.FPDFText_LoadFont(document.raw, buffer, len(data), raw.FPDF_FONT_TRUETYPE, 1)
            if handle:
                self.handles[entry] = handle

    def close(self):
        import pypdfium2.raw as raw
        for handle in self.handles.values():
            raw.FPDFFont_Close(handle)
        self.handles.clear()


def multiply(a, b):
    return (a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
            a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5])


def point(m, x, y):
    return x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]


def paint(value, alpha):
    if not value or value == "none":
        return None
    try:
        rgba = ImageColor.getrgb(value)
    except ValueError:
        return None
    opacity = (rgba[3] / 255 if len(rgba) == 4 else 1.0) * alpha
    return rgba[0], rgba[1], rgba[2], max(0, min(255, round(opacity * 255)))


class Canvas:
    """One output document; with no document it only records the characters a page needs."""

    def __init__(self, fonts, document=None, width=0.0, height=0.0):
        self.fonts, self.document, self.width, self.height, self.page = fonts, document, width, height, None

    def insert(self, obj):
        import pypdfium2.raw as raw
        raw.FPDFPage_InsertObject(self.page.raw, obj)

    def visible(self, m, x0, y0, x1, y1):
        corners = [point(m, x, y) for x, y in ((x0, y0), (x1, y0), (x0, y1), (x1, y1))]
        xs, ys = [c[0] for c in corners], [c[1] for c in corners]
        return max(xs) >= 0 and min(xs) <= self.width and max(ys) >= 0 and min(ys) <= self.height

    def shape(self, segments, m, fill=None, stroke=None, width=1.0, dash=None, cap=0, join=0):
        if self.document is None or not segments or (fill is None and stroke is None):
            return
        import pypdfium2.raw as raw
        obj = None
        for segment in segments:
            kind, values = segment[0], segment[1:]
            if obj is None:
                obj = raw.FPDFPageObj_CreateNewPath(*(values[-2:] if values else (0.0, 0.0)))
                if kind == "M":
                    continue
            if kind == "M":
                raw.FPDFPath_MoveTo(obj, *values)
            elif kind == "L":
                raw.FPDFPath_LineTo(obj, *values)
            elif kind == "C":
                raw.FPDFPath_BezierTo(obj, *values)
            elif kind == "Z":
                raw.FPDFPath_Close(obj)
        if fill is not None:
            raw.FPDFPageObj_SetFillColor(obj, *fill)
        if stroke is not None:
            raw.FPDFPageObj_SetStrokeColor(obj, *stroke)
            raw.FPDFPageObj_SetStrokeWidth(obj, width)
            raw.FPDFPageObj_SetLineCap(obj, cap)
            raw.FPDFPageObj_SetLineJoin(obj, join)
            if dash:
                raw.FPDFPageObj_SetDashArray(obj, (ctypes.c_float * len(dash))(*dash), len(dash), 0.0)
        raw.FPDFPath_SetDrawMode(obj, raw.FPDF_FILLMODE_WINDING if fill is not None else raw.FPDF_FILLMODE_NONE, stroke is not None)
        raw.FPDFPageObj_Transform(obj, *m)
        self.insert(obj)

    def text(self, x, y, text, size, strong=False, emphasis=False, fill=(0, 0, 0, 255), m=TOP_DOWN, outline=None, underline=False):
        """Text with its baseline at (x, y) in a y-down space that `m` maps onto the page; outline is (rgba, width) painted under the fill."""
        if self.document is None:
            self.fonts.note(text, strong, emphasis)
            return
        if not text or not self.visible(m, x - size, y - size * 1.5, x + self.fonts.measure(text, size, strong, emphasis) + size, y + size):
            return
        import pypdfium2.raw as raw
        start, scale = x, math.sqrt(abs(m[0] * m[3] - m[1] * m[2]))
        for entry, piece in self.fonts.pieces(text, strong, emphasis):
            advance = sum(entry.advance(char) for char in piece) * size
            handle = self.fonts.handles.get(entry)
            if handle and not piece.isspace():
                encoded = piece.encode("utf-16-le") + b"\0\0"
                for mode in (("stroke", "fill") if outline else ("fill",)):
                    obj = raw.FPDFPageObj_CreateTextObj(self.document.raw, handle, size)
                    raw.FPDFText_SetText(obj, (ctypes.c_ushort * (len(encoded) // 2)).from_buffer_copy(encoded))
                    if mode == "stroke":
                        raw.FPDFTextObj_SetTextRenderMode(obj, raw.FPDF_TEXTRENDERMODE_STROKE)
                        raw.FPDFPageObj_SetStrokeColor(obj, *outline[0])
                        raw.FPDFPageObj_SetStrokeWidth(obj, outline[1] * scale)
                        raw.FPDFPageObj_SetLineJoin(obj, 1)
                    else:
                        raw.FPDFPageObj_SetFillColor(obj, *fill)
                    raw.FPDFPageObj_Transform(obj, *multiply((1.0, 0.0, 0.0, -1.0, x, y), m))
                    self.insert(obj)
            x += advance
        if underline and fill:
            self.shape([("M", start, y + 2), ("L", x, y + 2)], m, stroke=fill, width=1.0)

    def image(self, picture, width, height, m, x=0.0, y=0.0):
        if self.document is None or not self.visible(m, x, y, x + width, y + height):
            return
        import pypdfium2 as pdfium
        import pypdfium2.raw as raw
        picture = picture() if callable(picture) else picture
        if picture.mode == "RGBA" and picture.getchannel("A").getextrema() == (255, 255):
            picture = picture.convert("RGB")
        elif picture.mode not in {"RGB", "RGBA", "L"}:
            picture = picture.convert("RGBA")
        bitmap = pdfium.PdfBitmap.from_pil(picture)
        obj = raw.FPDFPageObj_NewImageObj(self.document.raw)
        raw.FPDFImageObj_SetBitmap(None, 0, obj, bitmap.raw)
        bitmap.close()
        raw.FPDFPageObj_Transform(obj, *multiply((width, 0.0, 0.0, -height, x, y + height), m))
        self.insert(obj)

    def link(self, x0, y0, x1, y1, uri, m=TOP_DOWN):
        if self.document is None:
            return
        import pypdfium2.raw as raw
        corners = [point(m, x, y) for x, y in ((x0, y0), (x1, y0), (x0, y1), (x1, y1))]
        xs, ys = [c[0] for c in corners], [c[1] for c in corners]
        annot = raw.FPDFPage_CreateAnnot(self.page.raw, raw.FPDF_ANNOT_LINK)
        if annot:
            raw.FPDFAnnot_SetRect(annot, ctypes.byref(raw.FS_RECTF(min(xs), max(ys), max(xs), min(ys))))
            raw.FPDFAnnot_SetBorder(annot, 0.0, 0.0, 0.0)
            raw.FPDFAnnot_SetURI(annot, uri.encode("utf-8"))
            raw.FPDFPage_CloseAnnot(annot)


def render(pages, title, fonts=None):
    """`pages` is a list of (width_pt, height_pt, draw) where draw(canvas) paints one page; returns the PDF bytes."""
    import pypdfium2 as pdfium
    import pypdfium2.raw as raw
    fonts = fonts or Fonts()
    for width, height, draw in pages:
        draw(Canvas(fonts, None, width, height))
    with PDFIUM:
        document = pdfium.PdfDocument.new()
        try:
            fonts.embed(document)
            for width, height, draw in pages:
                canvas = Canvas(fonts, document, width, height)
                canvas.page = document.new_page(width, height)
                draw(canvas)
                raw.FPDFPage_GenerateContent(canvas.page.raw)
                canvas.page.close()
            output = io.BytesIO()
            document.save(output)
        finally:
            fonts.close()
            document.close()
    return with_info(output.getvalue(), title)


def with_info(data, title):
    """PDFium cannot set the document information, so it is added as an incremental update: title and creator, as cairo wrote them."""
    tail = data[-4096:]
    start = int(re.findall(rb"startxref\s+(\d+)", tail)[-1])
    trailer = re.findall(rb"trailer\s*<<(.*?)>>\s*startxref", tail, re.S)[-1]
    size = int(re.search(rb"/Size\s*(\d+)", trailer).group(1))
    root = re.search(rb"/Root\s*(\d+\s+\d+\s+R)", trailer).group(1).decode()
    ids = re.search(rb"/ID\s*\[[^\]]*\]", trailer)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("D:%Y%m%d%H%M%SZ")
    body = (f"{size} 0 obj\n<</Title <FEFF{title.encode('utf-16-be').hex().upper()}> /Creator (FormRef) /CreationDate ({stamp})>>\nendobj\n").encode()
    xref = len(data) + len(body)
    trailer_out = f"xref\n{size} 1\n{len(data):010d} 00000 n \ntrailer\n<</Size {size + 1} /Root {root} /Info {size} 0 R /Prev {start}".encode()
    return data + body + trailer_out + ((b" " + ids.group(0)) if ids else b"") + f">>\nstartxref\n{xref}\n%%EOF\n".encode()


NUMBER = r"[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?"


def numbers(value):
    return [float(entry) for entry in re.findall(NUMBER, value or "")]


def transform(value):
    result = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
    for name, arguments in re.findall(r"(\w+)\s*\(([^)]*)\)", value or ""):
        values = numbers(arguments)
        if name == "translate" and values:
            step = (1.0, 0.0, 0.0, 1.0, values[0], values[1] if len(values) > 1 else 0.0)
        elif name == "rotate" and values:
            angle = math.radians(values[0])
            cx, cy = (values[1], values[2]) if len(values) >= 3 else (0.0, 0.0)
            cos, sin = math.cos(angle), math.sin(angle)
            step = (cos, sin, -sin, cos, cx - cos * cx + sin * cy, cy - sin * cx - cos * cy)
        elif name == "scale" and values:
            step = (values[0], 0.0, 0.0, values[1] if len(values) > 1 else values[0], 0.0, 0.0)
        elif name == "matrix" and len(values) == 6:
            step = tuple(values)
        else:
            continue
        result = multiply(step, result)
    return result


def path_segments(data):
    segments, x, y = [], 0.0, 0.0
    for command, arguments in re.findall(r"([MLHVCZmlhvcz])([^MLHVCZmlhvcz]*)", data or ""):
        values = numbers(arguments)
        if command in "Zz":
            segments.append(("Z",))
        elif command == "M":
            for index in range(0, len(values) - 1, 2):
                x, y = values[index], values[index + 1]
                segments.append(("M" if index == 0 else "L", x, y))
        elif command == "L":
            for index in range(0, len(values) - 1, 2):
                x, y = values[index], values[index + 1]
                segments.append(("L", x, y))
        elif command == "H":
            for x in values:
                segments.append(("L", x, y))
        elif command == "V":
            for y in values:
                segments.append(("L", x, y))
        elif command == "C":
            for index in range(0, len(values) - 5, 6):
                x, y = values[index + 4], values[index + 5]
                segments.append(("C", *values[index:index + 6]))
    return segments


def ellipse(cx, cy, rx, ry):
    k = 0.5522847498
    return [("M", cx + rx, cy), ("C", cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry), ("C", cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy),
            ("C", cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry), ("C", cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy), ("Z",)]


def rectangle(x, y, width, height, radius):
    radius = max(0.0, min(radius, width / 2, height / 2))
    if not radius:
        return [("M", x, y), ("L", x + width, y), ("L", x + width, y + height), ("L", x, y + height), ("Z",)]
    k = radius * (1 - 0.5522847498)
    right, bottom = x + width, y + height
    return [("M", x + radius, y), ("L", right - radius, y), ("C", right - k, y, right, y + k, right, y + radius), ("L", right, bottom - radius),
            ("C", right, bottom - k, right - k, bottom, right - radius, bottom), ("L", x + radius, bottom), ("C", x + k, bottom, x, bottom - k, x, bottom - radius),
            ("L", x, y + radius), ("C", x, y + k, x + k, y, x + radius, y), ("Z",)]


def number(attributes, name, default=0.0):
    found = numbers(attributes.get(name))
    return found[0] if found else default


def decoded(href, alpha):
    def load():
        data = base64.b64decode(href.split(",", 1)[1])
        with Image.open(io.BytesIO(data)) as picture:
            picture.load()
            picture = picture.convert("RGBA") if alpha < 1 or picture.mode not in {"RGB", "RGBA", "L"} else picture.copy()
        if alpha < 1:
            picture.putalpha(picture.getchannel("A").point(lambda value: round(value * alpha)))
        return picture
    return load


def draw_node(canvas, node, m, opacity):
    for child in node:
        tag = child.tag.rsplit("}", 1)[-1]
        attributes = child.attrib
        if tag in {"title", "desc", "defs", "metadata"}:
            continue
        local = multiply(transform(attributes["transform"]), m) if "transform" in attributes else m
        alpha = opacity * number(attributes, "opacity", 1.0)
        if tag in {"g", "a", "svg"}:
            draw_node(canvas, child, local, alpha)
            continue
        if tag == "text":
            draw_text(canvas, child, local, alpha)
            continue
        if tag == "image":
            href = attributes.get("href") or attributes.get("{http://www.w3.org/1999/xlink}href") or ""
            if href.startswith("data:") and "," in href:
                canvas.image(decoded(href, alpha), number(attributes, "width"), number(attributes, "height"), local, number(attributes, "x"), number(attributes, "y"))
            continue
        if tag == "rect":
            segments = rectangle(number(attributes, "x"), number(attributes, "y"), number(attributes, "width"), number(attributes, "height"), number(attributes, "rx", number(attributes, "ry")))
        elif tag == "ellipse":
            segments = ellipse(number(attributes, "cx"), number(attributes, "cy"), number(attributes, "rx"), number(attributes, "ry"))
        elif tag == "circle":
            segments = ellipse(number(attributes, "cx"), number(attributes, "cy"), number(attributes, "r"), number(attributes, "r"))
        elif tag == "line":
            segments = [("M", number(attributes, "x1"), number(attributes, "y1")), ("L", number(attributes, "x2"), number(attributes, "y2"))]
        elif tag in {"polyline", "polygon"}:
            values = numbers(attributes.get("points"))
            segments = [("M" if index == 0 else "L", values[index], values[index + 1]) for index in range(0, len(values) - 1, 2)] + ([("Z",)] if tag == "polygon" else [])
        elif tag == "path":
            segments = path_segments(attributes.get("d"))
        else:
            continue
        fill = paint(attributes.get("fill", "#000000"), alpha * number(attributes, "fill-opacity", 1.0))
        stroke = paint(attributes.get("stroke"), alpha * number(attributes, "stroke-opacity", 1.0))
        dash = [value for value in numbers(attributes.get("stroke-dasharray")) if value >= 0]
        canvas.shape(segments, local, fill, stroke, number(attributes, "stroke-width", 1.0), dash if any(dash) else None,
                     {"round": 1, "square": 2}.get(attributes.get("stroke-linecap"), 0), {"round": 1, "bevel": 2}.get(attributes.get("stroke-linejoin"), 0))


def draw_text(canvas, node, m, alpha):
    attributes = node.attrib
    size = number(attributes, "font-size", 16.0)
    weight = attributes.get("font-weight", "normal")
    strong = weight in {"bold", "bolder"} or (weight.isdigit() and int(weight) >= 550)
    emphasis = attributes.get("font-style") in {"italic", "oblique"}
    fill = paint(attributes.get("fill", "#000000"), alpha * number(attributes, "fill-opacity", 1.0))
    stroke = paint(attributes.get("stroke"), alpha * number(attributes, "stroke-opacity", 1.0))
    outline = (stroke, number(attributes, "stroke-width", 1.0)) if stroke else None
    underline = "underline" in attributes.get("text-decoration", "")
    x, y = number(attributes, "x"), number(attributes, "y")
    if node.text and node.text.strip() and fill:
        canvas.text(x, y, node.text, size, strong, emphasis, fill, m, outline, underline)
    for span in node:
        x = number(span.attrib, "x", x)
        y += number(span.attrib, "dy")
        if span.text and span.text.strip() and fill:
            canvas.text(x, y, span.text, size, strong, emphasis, fill, m, outline, underline)


def svg_page(svg, view, width_pt, height_pt, caption=""):
    """One page showing `view` (x, y, width, height in SVG units) of `svg`, fitted and centred, with an optional caption in the bottom margin."""
    def draw(canvas):
        vx, vy, vw, vh = view
        scale = min(width_pt / vw, height_pt / vh)
        left, top = (width_pt - vw * scale) / 2, (height_pt - vh * scale) / 2
        draw_node(canvas, ET.fromstring(svg), (scale, 0.0, 0.0, -scale, left - vx * scale, height_pt - top + vy * scale), 1.0)
        if caption:
            text = caption
            while text and canvas.fonts.measure(text, 8) > width_pt - 72:
                text = text[:-2] + "…"
            canvas.text(36, height_pt - 16, text, 8, fill=(107, 107, 115, 255), m=(1.0, 0.0, 0.0, -1.0, 0.0, height_pt))
    return width_pt, height_pt, draw
