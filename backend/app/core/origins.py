from urllib.parse import urlsplit

WINDOW_ORIGINS = ("http://localhost:5320", "http://127.0.0.1:5320", "http://localhost:5321", "http://127.0.0.1:5321", "tauri://localhost", "http://tauri.localhost")
LOOPBACK = {"localhost", "127.0.0.1", "::1"}
EXTENSION_SCHEMES = {"chrome-extension", "moz-extension"}
CLIP_PATHS = {"/api/clip", "/api/clip/boards"}


def _key(value: str) -> tuple[str, str, int | None] | None:
    try:
        parts = urlsplit(value.strip())
        port = parts.port
    except ValueError:
        return None
    if not parts.scheme or not parts.hostname:
        return None
    if port is None:
        port = {"http": 80, "https": 443}.get(parts.scheme.lower())
    return parts.scheme.lower(), parts.hostname.lower(), port


ALLOWED = {key for key in (_key(o) for o in WINDOW_ORIGINS) if key is not None}


def loopback_host(host: str) -> bool:
    key = _key(f"http://{host}")
    return key is not None and key[1] in LOOPBACK


def allowed(origin: str, host: str, path: str = "") -> bool:
    key = _key(origin)
    if key is None:
        return False
    if key[0] in EXTENSION_SCHEMES:
        return path in CLIP_PATHS
    if key in ALLOWED:
        return True
    own = _key(f"http://{host}")
    return key[0] == "http" and own is not None and own[1] in LOOPBACK and own == key
