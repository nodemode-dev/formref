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
