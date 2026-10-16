"""Keywords stored inside image files, read as tags when a picture is added (reference-board gap: PureRef and BeeRef drop them; Eagle keeps them). Three places hold them: XMP dc:subject (Lightroom, Bridge, Apple Photos, darktable, digiKam), IPTC keywords (record 2, dataset 25; older Photoshop and newsroom tools) and the Windows Tags field (EXIF XPKeywords, 0x9C9E). The star rating is read the same way (v0.23.0)."""
import io
import re

import defusedxml.ElementTree as ET
from defusedxml import DefusedXmlException
from PIL import Image, IptcImagePlugin

MAX_KEYWORDS = 32
MAX_LENGTH = 60
XP_KEYWORDS = 0x9C9E
RDF = "{http://www.w3.org/1999/02/22-rdf-syntax-ns#}"
DC_SUBJECT = "{http://purl.org/dc/elements/1.1/}subject"
PACKET = re.compile(rb"<x:xmpmeta[\s>].*?</x:xmpmeta>", re.S)


def _xmp(data: bytes) -> list[str]:
    """The dc:subject list of the first XMP packet anywhere in the file (JPEG APP1, PNG iTXt, WebP and TIFF all carry it as plain XML). defusedxml refuses DTDs and entities, so nothing in the file is ever expanded."""
    match = PACKET.search(data[:16 * 1024 * 1024])
    if not match:
        return []
    try:
        root = ET.fromstring(match.group(0))
    except (ET.ParseError, DefusedXmlException):
        return []
    out = []
    for subject in root.iter(DC_SUBJECT):
        out.extend((li.text or "") for li in subject.iter(RDF + "li"))
        # Some writers put a single keyword straight in dc:subject instead of an rdf:Bag.
        if not list(subject.iter(RDF + "li")) and subject.text:
            out.append(subject.text)
    return out


def _decode(value: bytes) -> str:
    try:
        return value.decode("utf-8")
    except UnicodeDecodeError:
        return value.decode("latin-1")


def _iptc_and_windows(data: bytes) -> list[str]:
    out = []
    try:
        with Image.open(io.BytesIO(data)) as image:
            iptc = IptcImagePlugin.getiptcinfo(image) or {}
            value = iptc.get((2, 25))
            if isinstance(value, bytes):
                value = [value]
            out.extend(_decode(v) for v in value or [] if isinstance(v, bytes))
            raw = image.getexif().get(XP_KEYWORDS)
            if isinstance(raw, (bytes, tuple, list)):
                text = bytes(raw).decode("utf-16-le", errors="ignore").rstrip("\x00")
                out.extend(text.split(";"))
    except Exception:
        # A file Pillow cannot read further simply has no keywords here; the upload itself was validated earlier.
        return out
    return out


XMP_RATING = "{http://ns.adobe.com/xap/1.0/}Rating"
EXIF_RATING = 0x4746


def _stars(value) -> int | None:
    """1 to 5 stars, or None: Lightroom writes -1 for a rejected picture and 0 for none, and some tools write decimals."""
    try:
        stars = round(float(str(value).strip()))
    except (TypeError, ValueError, OverflowError):
        return None
    return stars if 1 <= stars <= 5 else None


def embedded_rating(data: bytes) -> int | None:
    """The star rating stored in a picture: xmp:Rating, written as an attribute (Lightroom, Bridge) or an element, from the first XMP packet; otherwise the Windows Rating field (EXIF 0x4746)."""
    match = PACKET.search(data[:16 * 1024 * 1024])
    if match:
        try:
            root = ET.fromstring(match.group(0))
        except (ET.ParseError, DefusedXmlException):
            root = None
        if root is not None:
            for description in root.iter(RDF + "Description"):
                found = _stars(description.get(XMP_RATING))
                if found is None:
                    element = description.find(XMP_RATING)
                    found = _stars(element.text) if element is not None else None
                if found is not None:
                    return found
    try:
        with Image.open(io.BytesIO(data)) as image:
            return _stars(image.getexif().get(EXIF_RATING))
    except Exception:
        return None


def embedded_keywords(data: bytes) -> list[str]:
    """Up to 32 keywords, each trimmed and at most 60 characters, once each ignoring case. When the XMP has keywords they are the answer, as the Metadata Working Group advises (tools that edit keywords keep XMP current, while old IPTC or Windows fields may still hold removed ones, including in FormRef's own exports); otherwise IPTC and Windows Tags are read."""
    out: list[str] = []
    words = _xmp(data)
    if not [w for w in words if w.strip()]:
        words = _iptc_and_windows(data)
    for word in words:
        word = " ".join(word.split())[:MAX_LENGTH].strip()
        if word and not any(word.lower() == seen.lower() for seen in out):
            out.append(word)
        if len(out) >= MAX_KEYWORDS:
            break
    return out
