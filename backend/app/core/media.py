import io
import warnings
from PIL import Image
from .config import settings
from .store import store


def deny_fetch(url, resource_type):
    raise ValueError("SVG rasterization cannot fetch external resources.")


def original_image(asset_id):
    info, data = store.asset_bytes(asset_id)
    if not info["mime"].startswith("image/"):
        raise ValueError("Referenced asset is not an image.")
    if info["mime"] == "image/svg+xml":
        width, height = store.check_svg(data)
        try:
            from cairosvg.surface import PNGSurface
        except (ImportError, OSError) as exc:
            raise ValueError("SVG rasterization requires CairoSVG and a system libCairo installation. On macOS run brew install cairo; on Windows install a compatible libCairo runtime.") from exc
        data = PNGSurface.convert(bytestring=data, unsafe=False, output_width=width, output_height=height, url_fetcher=deny_fetch)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as image:
                if image.width * image.height > settings.max_image_pixels:
                    raise ValueError("Image exceeds the 64 megapixel limit.")
                image.seek(0)
                return image.convert("RGBA")
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ValueError("Image exceeds the 64 megapixel limit.") from exc
    except (OSError, SyntaxError) as exc:
        raise ValueError("Registered image cannot be decoded.") from exc


PREVIEW_EDGES = (256, 512, 1024, 2048)


def preview(asset_id: str, edge: int) -> bytes | None:
    """A WebP no longer than `edge` on its long side, resampled with Lanczos and cached beside the asset; None when the original should be served (SVG, animated, or already that small)."""
    info = store.asset_info(asset_id)
    if edge not in PREVIEW_EDGES or not info.get("mime", "").startswith("image/") or info["mime"] in {"image/svg+xml", "image/gif"}:
        return None
    width, height = int(info.get("width") or 0), int(info.get("height") or 0)
    if width and height and max(width, height) <= edge:
        return None
    cache = store.assets_dir / "previews" / f"{asset_id}_{edge}.webp"
    if cache.is_file():
        return cache.read_bytes()
    _, data = store.asset_bytes(asset_id)
    with Image.open(io.BytesIO(data)) as probe:
        if getattr(probe, "n_frames", 1) > 1:
            return None
    image = original_image(asset_id)
    if max(image.size) <= edge:
        return None
    image.thumbnail((edge, edge), Image.Resampling.LANCZOS)
    out = io.BytesIO()
    image.save(out, "WEBP", quality=88, method=4)
    cache.parent.mkdir(parents=True, exist_ok=True)
    with store.lock:
        store.atomic_write(cache, out.getvalue())
    return out.getvalue()
