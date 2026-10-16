import io
from fractions import Fraction

from PIL import Image

EXIF_IFD = 0x8769
MAKE, MODEL, SOFTWARE, ORIENTATION = 0x010F, 0x0110, 0x0131, 0x0112
TAKEN, LENS, FOCAL, FNUMBER, EXPOSURE, ISO = 0x9003, 0xA434, 0x920A, 0x829D, 0x829A, 0x8827


def _text(value, limit=120):
    if isinstance(value, bytes):
        value = value.decode("utf-8", "replace")
    if not isinstance(value, str):
        return ""
    return " ".join(value.replace("\x00", " ").split())[:limit]


def _number(value):
    try:
        number = float(value)
    except (TypeError, ValueError, ZeroDivisionError):
        return None
    return number if number == number and abs(number) < 1e9 else None


def _exposure(value):
    seconds = _number(value)
    if not seconds or seconds <= 0:
        return ""
    if seconds >= 1:
        return f"{seconds:g} s"
    fraction = Fraction(seconds).limit_denominator(16000)
    return f"1/{round(1 / seconds)} s" if fraction.numerator != 1 else f"1/{fraction.denominator} s"


def camera_details(data: bytes) -> dict:
    """Camera fields from a picture's EXIF, each left out when missing; Pillow reads only the header here, never the pixels."""
    try:
        with Image.open(io.BytesIO(data)) as image:
            exif = image.getexif()
            if not exif:
                return {}
            sub = exif.get_ifd(EXIF_IFD)
    except Exception:
        return {}
    details = {}
    make, model = _text(exif.get(MAKE)), _text(exif.get(MODEL))
    camera = model if make and model.lower().startswith(make.lower().split()[0]) else " ".join(part for part in (make, model) if part)
    if camera:
        details["camera"] = camera
    lens = _text(sub.get(LENS))
    if lens:
        details["lens"] = lens
    taken = _text(sub.get(TAKEN), 19)
    if len(taken) == 19 and taken[4] == ":" and taken[7] == ":":
        details["taken"] = taken[:10].replace(":", "-") + "T" + taken[11:]
    focal = _number(sub.get(FOCAL))
    if focal:
        details["focal_mm"] = round(focal, 1)
    aperture = _number(sub.get(FNUMBER))
    if aperture:
        details["aperture"] = round(aperture, 1)
    exposure = _exposure(sub.get(EXPOSURE))
    if exposure:
        details["exposure"] = exposure
    iso = sub.get(ISO)
    if isinstance(iso, tuple):
        iso = iso[0] if iso else None
    if isinstance(iso, int) and 0 < iso < 10_000_000:
        details["iso"] = iso
    software = _text(exif.get(SOFTWARE), 80)
    if software:
        details["software"] = software
    return details


def picture_info(info: dict, data: bytes) -> dict:
    result = {key: info.get(key) for key in ("id", "name", "mime", "size", "width", "height") if info.get(key) is not None}
    if info.get("keywords"):
        result["keywords"] = info["keywords"]
    if str(info.get("mime", "")).startswith("image/") and info.get("mime") != "image/svg+xml":
        result.update(camera_details(data))
    return result
