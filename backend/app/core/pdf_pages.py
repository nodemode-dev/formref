"""PDF pages as images: render the pages of a PDF reference into image references laid out beside it (researched wishlist: PureRef and BeeRef cannot show PDFs)."""
import io
import uuid

from .config import settings
from .store import MissingBoard, store

MAX_PAGES = 200


def page_items(board_id: str, item_id: str, first: int = 1, last: int = 0, dpi: int = 150) -> dict:
    try:
        import pypdfium2 as pdfium
    except ImportError as exc:
        raise ValueError("PDF pages need the pypdfium2 package; run ./formref install.") from exc
    if not 36 <= dpi <= 600:
        raise ValueError("Resolution is from 36 to 600 dpi.")
    state = store.get(board_id)
    item = next((entry for entry in state["board"]["items"] if entry["id"] == item_id), None)
    if item is None:
        raise MissingBoard("That item does not exist on this board.")
    if not item.get("asset_id"):
        raise ValueError("That item has no file.")
    info, data = store.asset_bytes(item["asset_id"])
    if info.get("mime") != "application/pdf" and not data[:5] == b"%PDF-":
        raise ValueError("That file is not a PDF.")
    try:
        document = pdfium.PdfDocument(data)
    except pdfium.PdfiumError as exc:
        raise ValueError("The PDF cannot be opened (damaged or password protected).") from exc
    try:
        total = len(document)
        last = total if last <= 0 else min(last, total)
        first = max(1, first)
        if first > last:
            raise ValueError(f"The PDF has {total} pages.")
        if last - first + 1 > MAX_PAGES:
            raise ValueError(f"Choose at most {MAX_PAGES} pages at a time.")
        base = (item.get("title") or info.get("name") or "PDF").rsplit(".", 1)[0][:160]
        items, x, y, row = [], item["x"] + item["width"] + 40, item["y"], 0.0
        start_x = x
        z = max([entry["z"] for entry in state["board"]["items"]] + [0]) + 1
        for number in range(first, last + 1):
            page = document[number - 1]
            width_pt, height_pt = page.get_size()
            scale = dpi / 72
            pixels = width_pt * scale * height_pt * scale
            if pixels > settings.max_image_pixels:
                scale *= (settings.max_image_pixels / pixels) ** 0.5
            bitmap = page.render(scale=scale)
            image = bitmap.to_pil()
            output = io.BytesIO()
            image.convert("RGB").save(output, "PNG", optimize=False)
            asset = store.import_asset(f"{base} p{number}.png", output.getvalue())
            w, h = width_pt * 96 / 72, height_pt * 96 / 72
            fit = min(1.0, 480 / max(w, h))
            w, h = w * fit, h * fit
            if x > start_x and x + w > start_x + 2400:
                x, y, row = start_x, y + row + 32, 0.0
            items.append({"id": str(uuid.uuid4()), "kind": "image", "x": x, "y": y, "width": w, "height": h, "rotation": 0, "z": z, "opacity": 1, "locked": False, "hidden": False, "group_id": None, "parent_id": None, "title": f"{base} p{number}", "text": "", "color": "#ffffff", "asset_id": asset["id"], "url": "", "data": {"pdf_page": number, "pdf_source": item["asset_id"]}})
            z += 1
            x, row = x + w + 24, max(row, h)
            page.close()
    finally:
        document.close()
    result = store.mutate(board_id, command={"type": "add", "items": items})
    return {**result, "added": [entry["id"] for entry in items], "pages": total}
