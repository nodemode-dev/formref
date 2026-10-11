"""Open-weight cutout models, as FormCut registers and fetches them.

Ported from FormCut (backend/app/model_manager.py, Apache-2.0, the same owner): the same files, the same sources and
the same SHA-256 pins. Nothing is fetched unless the person asks. One small model ships inside FormRef, U2NetP
(4.6 MB, Apache-2.0), so Object cutout works offline from the first run; a file in the model folder always wins
over the bundled copy. Every ONNX Runtime session takes one provider ordering: the platform accelerator first when
present (Core ML, DirectML, CUDA), the CPU always the floor.
"""
import hashlib
import json
import threading
from pathlib import Path

import httpx

from .config import settings

ROOT = settings.data_dir / "models"
BUNDLED = Path(__file__).resolve().parent.parent / "bundled_models"
PROVIDERS = ("CoreMLExecutionProvider", "DmlExecutionProvider", "CUDAExecutionProvider", "CPUExecutionProvider")
SAM21 = "https://huggingface.co/square-zero-labs/sam2.1-tiny-video-onnx/resolve/main/"
REMBG = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/"

MODELS = {
    "object-cutout": {"name": "Object cutout (U2Net small)", "license": "Apache-2.0", "size": "4.6 MB", "files": {"u2netp.onnx": REMBG + "u2netp.onnx"}},
    "person-cutout": {"name": "Person cutout (U2Net)", "license": "Apache-2.0", "size": "176 MB", "files": {"u2net_human_seg.onnx": REMBG + "u2net_human_seg.onnx"}},
    "sharp-cutout": {"name": "Sharp edges (IS-Net)", "license": "Apache-2.0", "size": "179 MB", "files": {"isnet-general-use.onnx": REMBG + "isnet-general-use.onnx"}},
    # SAM 2.1 Hiera Tiny (Meta, Apache-2.0) as square-zero-labs exported it; a still image needs only the image
    # encoder, the mask decoder and the constants, not the video memory graphs FormCut also fetches for tracking.
    "click-select": {
        "name": "Click to select (SAM 2.1)", "license": "Apache-2.0", "size": "about 150 MB",
        "files": {f"sam21-video-{name}": SAM21 + path for name, path in (
            ("vision_encoder.onnx", "onnx/vision_encoder.onnx"),
            ("mask_decoder.onnx", "onnx/mask_decoder.onnx"),
            ("constants.json", "constants.json"),
        )},
    },
}

# Taken from FormCut's PINNED table (real fetches); a download that does not match is deleted, never cached.
PINNED = {
    "u2netp.onnx": "309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8",
    "u2net_human_seg.onnx": "01eb6a29a5c4d8edb30b56adad9bb3a2a0535338e480724a213e0acfd2d1c73c",
    "isnet-general-use.onnx": "60920e99c45464f2ba57bee2ad08c919a52bbf852739e96947fbb4358c0d964a",
    "sam21-video-vision_encoder.onnx": "aa7a8542942f042e235a993a1ab0ccf5f049918500577802a7f10ec1b39bb873",
    "sam21-video-mask_decoder.onnx": "0461896de3db00936fe1643506f129d71cb6d5d2ae15754811756b7ea1b070c6",
    "sam21-video-constants.json": "172edc70e892aab0aef6caedf97b8e4091fbf6c5d26dac5fd9ea69d093d927d3",
}

MAX_FILE = 600 * 1024 * 1024
_lock = threading.RLock()
_progress: dict[str, dict] = {}


def model_file(name: str) -> Path:
    """Where a model file actually is: the model folder, else the bundle."""
    path = ROOT / name
    if path.is_file() and path.stat().st_size > (1024 if path.suffix == ".onnx" else 0):
        return path
    bundled = BUNDLED / name
    return bundled if bundled.is_file() else path


def ready(model: str) -> bool:
    if model == "auto":
        return ready("person-cutout") and ready("object-cutout")
    if model not in MODELS:
        return False
    for name in MODELS[model]["files"]:
        path = model_file(name)
        if not path.is_file() or path.stat().st_size < (1024 if path.suffix == ".onnx" else 1):
            return False
    return True


def providers() -> list[str]:
    import onnxruntime as ort
    available = ort.get_available_providers()
    return [name for name in PROVIDERS if name in available] or ["CPUExecutionProvider"]


def runtime_available() -> bool:
    try:
        import numpy  # noqa: F401
        import onnxruntime  # noqa: F401
    except ImportError:
        return False
    return True


def listing() -> dict:
    with _lock:
        progress = {key: dict(value) for key, value in _progress.items()}
    return {
        "runtime": runtime_available(),
        "processor": providers()[0] if runtime_available() else None,
        "models": [{"id": key, "name": spec["name"], "license": spec["license"], "size": spec["size"], "ready": ready(key),
                    "bundled": all((BUNDLED / name).is_file() for name in spec["files"]), "files": list(spec["files"]),
                    "download": progress.get(key)} for key, spec in MODELS.items()],
    }


def _fetch(model: str):
    entries = list(MODELS[model]["files"].items())
    ROOT.mkdir(parents=True, exist_ok=True)
    try:
        for index, (name, url) in enumerate(entries):
            path = ROOT / name
            if path.is_file() and path.stat().st_size > 0:
                continue
            temporary = path.with_name(path.name + ".download")
            digest = hashlib.sha256()
            try:
                with httpx.stream("GET", url, follow_redirects=True, timeout=120) as response:
                    response.raise_for_status()
                    length = int(response.headers.get("content-length", 0))
                    written = 0
                    with temporary.open("wb") as out:
                        for chunk in response.iter_bytes(1024 * 1024):
                            written += len(chunk)
                            if written > MAX_FILE:
                                raise ValueError("Model exceeds the download limit")
                            out.write(chunk)
                            digest.update(chunk)
                            with _lock:
                                _progress[model] = {"state": "downloading", "fraction": round((index + (written / length if length else 0.5)) / len(entries), 3)}
                if digest.hexdigest() != PINNED[name]:
                    raise ValueError(f"Checksum mismatch for {name}; the file was discarded")
                temporary.replace(path)
                path.with_name(path.name + ".json").write_text(json.dumps({"url": url, "sha256": digest.hexdigest(), "license": MODELS[model]["license"]}))
            finally:
                temporary.unlink(missing_ok=True)
        with _lock:
            _progress[model] = {"state": "done", "fraction": 1.0}
    except (httpx.HTTPError, OSError, ValueError) as exc:
        reason = str(exc) if isinstance(exc, ValueError) else f"Could not download it ({exc.__class__.__name__}). Check the connection, or import the file instead."
        with _lock:
            _progress[model] = {"state": "error", "fraction": 0.0, "error": reason}


def start_download(model: str) -> dict:
    if model not in MODELS:
        raise ValueError("Unknown model.")
    with _lock:
        if _progress.get(model, {}).get("state") == "downloading":
            return listing()
        if ready(model) and not all((BUNDLED / name).is_file() for name in MODELS[model]["files"]):
            return listing()
        _progress[model] = {"state": "downloading", "fraction": 0.0}
    threading.Thread(target=_fetch, args=(model,), daemon=True, name=f"model-{model}").start()
    return listing()


def import_file(model: str, filename: str, data: bytes) -> dict:
    """A file the person already has (for machines that cannot reach the model hosts); it must match its pin."""
    if model not in MODELS:
        raise ValueError("Unknown model.")
    name = Path(filename).name
    if name not in MODELS[model]["files"]:
        raise ValueError(f"{MODELS[model]['name']} takes these files: {', '.join(MODELS[model]['files'])}.")
    if hashlib.sha256(data).hexdigest() != PINNED[name]:
        raise ValueError(f"{name} does not match the published file (SHA-256 differs).")
    ROOT.mkdir(parents=True, exist_ok=True)
    (ROOT / name).write_bytes(data)
    return listing()


def remove(model: str) -> dict:
    if model not in MODELS:
        raise ValueError("Unknown model.")
    for name in MODELS[model]["files"]:
        (ROOT / name).unlink(missing_ok=True)
        (ROOT / (name + ".json")).unlink(missing_ok=True)
    with _lock:
        _progress.pop(model, None)
    return listing()
