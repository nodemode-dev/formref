"""Tags written back into exported pictures as XMP, so Lightroom, Bridge, darktable, digiKam and Windows see them. JPEG and PNG get the packet inside the file without touching the image data; other formats get a sidecar .xmp. Only dc:subject (tags) and dc:title change: any other XMP already in the file is kept."""
import struct
import zlib
from xml.sax.saxutils import escape

import defusedxml.ElementTree as SafeET
from defusedxml import DefusedXmlException
import xml.etree.ElementTree as ET

XMP_JPEG_HEADER = b"http://ns.adobe.com/xap/1.0/\x00"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
PNG_KEYWORD = b"XML:com.adobe.xmp"
NS = {
    "x": "adobe:ns:meta/",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "dc": "http://purl.org/dc/elements/1.1/",
}
for prefix, uri in NS.items():
    ET.register_namespace(prefix, uri)
RDF = "{%s}" % NS["rdf"]
DC = "{%s}" % NS["dc"]


def fresh_packet(tags: list[str], title: str) -> bytes:
    """A complete XMP packet with only dc:subject and dc:title."""
    items = "".join(f"<rdf:li>{escape(tag)}</rdf:li>" for tag in tags)
    title_xml = f'<dc:title><rdf:Alt><rdf:li xml:lang="x-default">{escape(title)}</rdf:li></rdf:Alt></dc:title>' if title else ""
    body = (f'<x:xmpmeta xmlns:x="{NS["x"]}"><rdf:RDF xmlns:rdf="{NS["rdf"]}"><rdf:Description rdf:about="" xmlns:dc="{NS["dc"]}">'
            f"<dc:subject><rdf:Bag>{items}</rdf:Bag></dc:subject>{title_xml}</rdf:Description></rdf:RDF></x:xmpmeta>")
    return ('<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>' + body + '<?xpacket end="w"?>').encode("utf-8")


def merged_packet(existing: bytes | None, tags: list[str], title: str) -> bytes | None:
    """The file's own XMP with dc:subject and dc:title replaced, or a fresh packet when there is none. None when the existing packet cannot be read safely, so the caller leaves the file alone."""
    if not existing:
        return fresh_packet(tags, title)
    start, end = existing.find(b"<x:xmpmeta"), existing.rfind(b"</x:xmpmeta>")
    if start < 0 or end < 0:
        return None
    try:
        root = SafeET.fromstring(existing[start:end + len(b"</x:xmpmeta>")])
    except (SafeET.ParseError, DefusedXmlException):
        return None
    rdf = root.find(RDF + "RDF")
    if rdf is None:
        return None
    for description in rdf.findall(RDF + "Description"):
        for name in ("subject", "title"):
            for element in description.findall(DC + name):
                description.remove(element)
    description = rdf.find(RDF + "Description")
    if description is None:
        description = ET.SubElement(rdf, RDF + "Description", {RDF + "about": ""})
    subject = ET.SubElement(ET.SubElement(description, DC + "subject"), RDF + "Bag")
    for tag in tags:
        ET.SubElement(subject, RDF + "li").text = tag
    if title:
        alt = ET.SubElement(ET.SubElement(description, DC + "title"), RDF + "Alt")
        li = ET.SubElement(alt, RDF + "li", {"{http://www.w3.org/XML/1998/namespace}lang": "x-default"})
        li.text = title
    body = ET.tostring(root, encoding="unicode")
    return ('<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>' + body + '<?xpacket end="w"?>').encode("utf-8")


def _jpeg(data: bytes, tags: list[str], title: str) -> bytes | None:
    """Markers up to the start of scan are walked; an XMP APP1 is replaced in place, or a new one goes after the leading APP0/APP1 segments. Image data is copied as is."""
    if data[:2] != b"\xff\xd8":
        return None
    segments, at, existing, scan = [], 2, None, None
    while at + 4 <= len(data):
        if data[at] != 0xFF:
            return None
        marker = data[at + 1]
        if marker == 0xDA:
            scan = at
            break
        length = struct.unpack(">H", data[at + 2:at + 4])[0]
        segment = data[at:at + 2 + length]
        if len(segment) < 2 + length:
            return None
        if marker == 0xE1 and segment[4:4 + len(XMP_JPEG_HEADER)] == XMP_JPEG_HEADER:
            existing = segment[4 + len(XMP_JPEG_HEADER):]
        else:
            segments.append((marker, segment))
        at += 2 + length
    if scan is None:
        return None
    packet = merged_packet(existing, tags, title)
    if packet is None or len(packet) + len(XMP_JPEG_HEADER) + 2 > 0xFFFF:
        return None
    xmp = b"\xff\xe1" + struct.pack(">H", len(packet) + len(XMP_JPEG_HEADER) + 2) + XMP_JPEG_HEADER + packet
    lead = 0
    while lead < len(segments) and segments[lead][0] in (0xE0, 0xE1):
        lead += 1
    head = b"".join(s for _, s in segments[:lead]) + xmp + b"".join(s for _, s in segments[lead:])
    return b"\xff\xd8" + head + data[scan:]


def _png_chunk(kind: bytes, body: bytes) -> bytes:
    return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)


def _png(data: bytes, tags: list[str], title: str) -> bytes | None:
    """An uncompressed iTXt XML:com.adobe.xmp chunk replaces any existing one (compressed or not), placed before the first IDAT; every other chunk is copied byte for byte."""
    if not data.startswith(PNG_SIGNATURE):
        return None
    chunks, at, existing = [], len(PNG_SIGNATURE), None
    while at + 12 <= len(data):
        length = struct.unpack(">I", data[at:at + 4])[0]
        kind = data[at + 4:at + 8]
        chunk = data[at:at + 12 + length]
        if len(chunk) < 12 + length:
            return None
        body = chunk[8:8 + length]
        if kind == b"iTXt" and body.startswith(PNG_KEYWORD + b"\x00"):
            rest = body[len(PNG_KEYWORD) + 1:]
            parts = rest[2:].split(b"\x00", 2)
            text = parts[2] if len(parts) == 3 else b""
            if rest[:1] == b"\x01":
                try:
                    # Inflated in steps with a cap, so a small chunk cannot expand into gigabytes.
                    inflater = zlib.decompressobj()
                    text = inflater.decompress(text, 4 * 1024 * 1024)
                    if inflater.unconsumed_tail:
                        return None
                except zlib.error:
                    return None
            existing = text or None
        else:
            chunks.append((kind, chunk))
        at += 12 + length
        if kind == b"IEND":
            break
    packet = merged_packet(existing, tags, title)
    if packet is None:
        return None
    itxt = _png_chunk(b"iTXt", PNG_KEYWORD + b"\x00\x00\x00\x00\x00" + packet)
    out, placed = [PNG_SIGNATURE], False
    for kind, chunk in chunks:
        if kind == b"IDAT" and not placed:
            out.append(itxt)
            placed = True
        out.append(chunk)
    return b"".join(out) if placed else None


def with_tags(data: bytes, mime: str, tags: list[str], title: str = "") -> tuple[bytes, bytes | None]:
    """(picture bytes, sidecar or None). JPEG and PNG carry the tags inside; anything else, or a file whose own XMP cannot be read safely, is returned untouched with a sidecar packet beside it."""
    writer = {"image/jpeg": _jpeg, "image/png": _png}.get(mime)
    embedded = writer(data, tags, title) if writer else None
    if embedded is not None:
        return embedded, None
    return data, fresh_packet(tags, title)
