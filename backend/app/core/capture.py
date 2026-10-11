"""Capture images from the web: a direct image URL becomes an asset; a page URL yields the images it shows.

The service fetches on the person's behalf, so every hop is checked: http or https only, no credentials in
the URL, and the host must resolve to a public address (no loopback, private, link-local or reserved
ranges) unless FORMREF_CAPTURE_ALLOW_PRIVATE=1 is set for local testing. Redirects are followed by hand so
each target is checked too.
"""
import asyncio
from html.parser import HTMLParser
import ipaddress
import os
import socket
from urllib.parse import urljoin, urlparse, unquote

import httpx

from .config import settings
from .store import store

MAX_REDIRECTS = 5
MAX_PAGE_BYTES = 4 * 1024 * 1024
MAX_FOUND = 60
TIMEOUT = httpx.Timeout(20.0, connect=8.0)
HEADERS = {"User-Agent": "FormRef/1 (local reference board; image capture)", "Accept": "image/*,text/html;q=0.9,*/*;q=0.5"}


def allow_private() -> bool:
    return os.environ.get("FORMREF_CAPTURE_ALLOW_PRIVATE") == "1"


def checked_url(url: str) -> str:
    if not isinstance(url, str) or len(url) > 4096:
        raise ValueError("Give one http or https address.")
    url = url.strip()
    parts = urlparse(url)
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        raise ValueError("Only http and https addresses can be captured.")
    if parts.username or parts.password:
        raise ValueError("Addresses with a user name or password are not captured.")
    resolve(parts.hostname, parts.port or (443 if parts.scheme == "https" else 80))
    return url


def resolve(host: str, port: int) -> str:
    """Resolve once and return the address to connect to; every answer must be public."""
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError(f"{host} could not be found.") from exc
    addresses = [ipaddress.ip_address(info[4][0]) for info in infos]
    if not allow_private() and any(not address.is_global for address in addresses):
        raise ValueError("That address points inside your computer or network, so FormRef will not fetch it.")
    return str(addresses[0])


def pinned(url: str) -> tuple[str, dict, dict]:
    """The URL rewritten to the checked IP, with Host and TLS server name kept as the original host.

    Connecting to the address that was checked, instead of letting the HTTP client look the name up again,
    closes the DNS-rebinding gap between the check and the connection."""
    parts = urlparse(checked_url(url))
    port = parts.port or (443 if parts.scheme == "https" else 80)
    address = resolve(parts.hostname, port)
    shown = f"[{address}]" if ":" in address else address
    netloc = f"{shown}:{parts.port}" if parts.port else shown
    host_header = parts.netloc.rsplit("@", 1)[-1]
    return parts._replace(netloc=netloc).geturl(), {"Host": host_header}, ({"sni_hostname": parts.hostname} if parts.scheme == "https" else {})


class _Images(HTMLParser):
    def __init__(self, base: str):
        super().__init__()
        self.base, self.found = base, []

    def add(self, value):
        if value and not value.startswith("data:"):
            absolute = urljoin(self.base, value.strip())
            if absolute.startswith(("http://", "https://")) and absolute not in self.found:
                self.found.append(absolute)

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "base" and values.get("href"):
            self.base = urljoin(self.base, values["href"])
        elif tag == "meta" and (values.get("property") or values.get("name") or "").lower() in {"og:image", "og:image:url", "twitter:image"}:
            self.add(values.get("content"))
        elif tag == "img":
            srcset = values.get("srcset") or ""
            best = srcset.split(",")[-1].strip().split(" ")[0] if srcset else ""
            self.add(best or values.get("src") or values.get("data-src"))
        elif tag == "link" and "image_src" in (values.get("rel") or ""):
            self.add(values.get("href"))


async def _fetch(url: str, limit: int):
    # trust_env is off: a proxy would resolve the name again and undo the pinning.
    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=False, headers=HEADERS, trust_env=False) as client:
        for _ in range(MAX_REDIRECTS + 1):
            target, host, extensions = pinned(url)
            async with client.stream("GET", target, headers=host, extensions=extensions) as response:
                if response.is_redirect:
                    url = urljoin(url, response.headers.get("location", ""))
                    continue
                if response.status_code >= 400:
                    raise ValueError(f"The site answered {response.status_code} for that address.")
                declared = response.headers.get("content-length")
                if declared and declared.isdigit() and int(declared) > limit:
                    raise ValueError("That file is larger than FormRef will capture.")
                chunks, size = [], 0
                async for chunk in response.aiter_bytes():
                    size += len(chunk)
                    if size > limit:
                        raise ValueError("That file is larger than FormRef will capture.")
                    chunks.append(chunk)
                return url, response.headers.get("content-type", "").split(";")[0].strip().lower(), b"".join(chunks)
        raise ValueError("That address redirects too many times.")


def _name(url: str, mime: str) -> str:
    name = unquote(urlparse(url).path.rsplit("/", 1)[-1]) or "web-image"
    if "." not in name and mime.startswith("image/"):
        name += "." + mime.split("/")[1].replace("svg+xml", "svg").replace("jpeg", "jpg")
    return name[:120]


async def capture(url: str) -> dict:
    """Return {"asset": {...}} for an image, or {"page": url, "images": [...]} for a web page."""
    final, mime, data = await _fetch(checked_url(url), settings.max_upload_bytes)
    if mime.startswith("image/"):
        asset = await asyncio.to_thread(store.import_asset, _name(final, mime), data)
        return {"asset": asset, "url": final}
    if mime in {"text/html", "application/xhtml+xml"} or data[:200].lstrip().lower().startswith((b"<!doctype html", b"<html")):
        parser = _Images(final)
        parser.feed(data[:MAX_PAGE_BYTES].decode("utf-8", "replace"))
        return {"page": final, "images": parser.found[:MAX_FOUND]}
    try:
        asset = await asyncio.to_thread(store.import_asset, _name(final, mime), data)
    except ValueError as exc:
        raise ValueError("That address is not an image or a web page FormRef can read.") from exc
    return {"asset": asset, "url": final}
