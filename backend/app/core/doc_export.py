"""Export one note or document card on its own: Markdown, plain text, Word (.docx) or PDF.

Word and PDF are written here without extra dependencies: the .docx is a minimal WordprocessingML package and the
PDF is drawn with cairo (already present for SVG export), laid out by the same Markdown subset as the board."""
import io
import re
import zipfile
from xml.sax.saxutils import escape

from .reference_text import layout_text, parse_text

FORMATS = {"md": "text/markdown; charset=utf-8", "txt": "text/plain; charset=utf-8",
           "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "pdf": "application/pdf"}


def filename(item: dict, ext: str) -> str:
    base = re.sub(r"[^\w\- .]+", "", item.get("title") or item.get("kind", "document")).strip()[:80] or "document"
    return f"{base}.{ext}"


def blocks(item: dict):
    return list(parse_text(item.get("text", ""), item.get("data", {}).get("text_format", "plain")))


def plain_text(item: dict) -> str:
    lines = []
    for block in blocks(item):
        text = "".join(run["text"] for run in block["runs"])
        lines.append((block.get("prefix") or "") + text)
    return "\n".join(lines)


def markdown(item: dict) -> str:
    title = item.get("title", "")
    body = item.get("text", "") if item.get("data", {}).get("text_format") == "markdown" else plain_text(item)
    return (f"# {title}\n\n" if title else "") + body + "\n"


def _runs_xml(runs, links: list) -> str:
    out = []
    for run in runs:
        props = ("<w:b/>" if run.get("strong") else "") + ("<w:i/>" if run.get("emphasis") else "")
        piece = f'<w:r>{"<w:rPr>" + props + "</w:rPr>" if props else ""}<w:t xml:space="preserve">{escape(run["text"])}</w:t></w:r>'
        if run.get("href"):
            links.append(run["href"])
            rid = f"rIdLink{len(links)}"
            piece = f'<w:hyperlink r:id="{rid}"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/>{props}</w:rPr><w:t xml:space="preserve">{escape(run["text"])}</w:t></w:r></w:hyperlink>'
        out.append(piece)
    return "".join(out)


def docx(item: dict) -> bytes:
    links: list = []
    paragraphs = []
    if item.get("title"):
        paragraphs.append(f'<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t xml:space="preserve">{escape(item["title"])}</w:t></w:r></w:p>')
    for block in blocks(item):
        style = f'Heading{block["level"]}' if block["kind"] == "heading" else "ListParagraph" if block["kind"] == "list" else None
        prefix = [{"text": block["prefix"]}] if block.get("prefix") else []
        props = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
        paragraphs.append(f"<w:p>{props}{_runs_xml(prefix + block['runs'], links)}</w:p>")
    body = "".join(paragraphs) + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'
    ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
    style = lambda sid, name, size, bold=True, extra="": f'<w:style w:type="paragraph" w:styleId="{sid}"><w:name w:val="{name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="240" w:after="120"/>{extra}</w:pPr><w:rPr>{"<w:b/>" if bold else ""}<w:sz w:val="{size}"/></w:rPr></w:style>'
    styles = (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles {ns}>'
              '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
              '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
              + style("Title", "Title", 44) + style("Heading1", "heading 1", 36, extra='<w:outlineLvl w:val="0"/>') + style("Heading2", "heading 2", 30, extra='<w:outlineLvl w:val="1"/>')
              + style("Heading3", "heading 3", 26, extra='<w:outlineLvl w:val="2"/>')
              + '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="360"/></w:pPr></w:style>'
              '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style></w:styles>')
    rels = "".join(f'<Relationship Id="rIdLink{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="{escape(href, {chr(34): "&quot;"})}" TargetMode="External"/>' for i, href in enumerate(links, 1))
    files = {
        "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
        "_rels/.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
        "word/_rels/document.xml.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' + rels + "</Relationships>",
        "word/styles.xml": styles,
        "word/document.xml": f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document {ns}><w:body>{body}</w:body></w:document>',
    }
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, content in files.items():
            archive.writestr(name, content)
    return buffer.getvalue()


def pdf(item: dict) -> bytes:
    import cairocffi as cairo
    width, height, margin, base = 595.0, 842.0, 64.0, 11.0
    buffer = io.BytesIO()
    surface = cairo.PDFSurface(buffer, width, height)
    surface.set_metadata(cairo.PDF_METADATA_TITLE, item.get("title") or "Document")
    surface.set_metadata(cairo.PDF_METADATA_CREATOR, "FormRef")
    context = cairo.Context(surface)

    def face(style):
        context.select_font_face("sans-serif", cairo.FONT_SLANT_ITALIC if style.get("emphasis") else cairo.FONT_SLANT_NORMAL,
                                 cairo.FONT_WEIGHT_BOLD if style.get("strong") else cairo.FONT_WEIGHT_NORMAL)

    def measure(text, size, style):
        face(style)
        context.set_font_size(size)
        return context.text_extents(text)[4]

    content = blocks(item)
    if item.get("title"):
        content = [{"kind": "heading", "level": 1, "runs": [{"text": item["title"], "strong": True, "emphasis": False}]}] + content
    lines = list(layout_text(content, base, width - 2 * margin, float("inf"), measure))
    usable = height - 2 * margin
    page_top = 0.0
    for line in lines:
        if line["y"] - page_top + line["size"] * 1.45 > usable:
            context.show_page()
            page_top = line["y"]
        baseline = margin + (line["y"] - page_top) + line["size"]
        for run in line["runs"]:
            face(run)
            context.set_font_size(line["size"])
            context.set_source_rgb(*((0.02, 0.33, 0.76) if run.get("href") else (0.1, 0.1, 0.1)))
            context.move_to(margin + run["x"], baseline)
            if run.get("href"):
                safe = run["href"].replace("'", "%27")
                context.tag_begin(cairo.TAG_LINK, f"uri='{safe}'")
                context.show_text(run["text"])
                context.tag_end(cairo.TAG_LINK)
            else:
                context.show_text(run["text"])
    surface.finish()
    return buffer.getvalue()


def export_item(item: dict, fmt: str) -> tuple[bytes, str, str]:
    if item.get("kind") not in {"note", "document"}:
        raise ValueError("Only notes and documents can be exported on their own.")
    if fmt not in FORMATS:
        raise ValueError("Choose md, txt, docx or pdf.")
    data = {"md": lambda: markdown(item).encode(), "txt": lambda: (plain_text(item) + "\n").encode(), "docx": lambda: docx(item), "pdf": lambda: pdf(item)}[fmt]()
    return data, FORMATS[fmt], filename(item, fmt)
