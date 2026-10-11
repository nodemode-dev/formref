"""Cutout mattes from the registered models, ported from FormCut's segmentation and SAM 2.1 code.

FormCut (backend/app/segmentation.py and sam_video.py, Apache-2.0, the same owner) runs these with OpenCV; FormRef
already depends on Pillow, so resizing is done with Pillow and the arithmetic with numpy. The inputs, outputs and
normalisation are FormCut's: U2Net at 320 square with ImageNet mean and deviation, IS-Net at 1024 square scaled to
its own maximum minus a half, and SAM 2.1's image encoder and mask decoder at the size and statistics its
constants.json gives, prompted with points and an optional box.
"""
import hashlib
import json
import threading
from collections import OrderedDict

import numpy as np
from PIL import Image

from .models import MODELS, model_file, providers, ready

METHODS = ("auto", "object-cutout", "person-cutout", "sharp-cutout", "click-select")
MEAN = np.array([0.485, 0.456, 0.406], np.float32)
STD = np.array([0.229, 0.224, 0.225], np.float32)
_sessions: dict = {}
_embeddings: OrderedDict = OrderedDict()
_lock = threading.RLock()


def _session(file: str):
    import onnxruntime as ort
    with _lock:
        if file not in _sessions:
            config = ort.SessionOptions()
            config.intra_op_num_threads = 2
            _sessions[file] = ort.InferenceSession(str(model_file(file)), sess_options=config, providers=providers())
        return _sessions[file]


def _resized(image: Image.Image, size: int, resample=Image.Resampling.BILINEAR) -> np.ndarray:
    return np.asarray(image.convert("RGB").resize((size, size), resample), np.float32)


def _stretch(alpha: np.ndarray) -> np.ndarray:
    alpha = alpha.astype(np.float32)
    low, high = float(alpha.min()), float(alpha.max())
    return (alpha - low) / max(1e-6, high - low)


def _to_size(alpha: np.ndarray, width: int, height: int) -> np.ndarray:
    return np.asarray(Image.fromarray(alpha.astype(np.float32), "F").resize((width, height), Image.Resampling.BILINEAR), np.float32)


def _u2net(model: str, image: Image.Image) -> np.ndarray:
    values = (_resized(image, 320, Image.Resampling.BOX) / 255 - MEAN) / STD
    session = _session(next(iter(MODELS[model]["files"])))
    output = session.run(None, {session.get_inputs()[0].name: values.transpose(2, 0, 1)[None]})[0]
    return _stretch(np.squeeze(output))


def _isnet(image: Image.Image) -> np.ndarray:
    big = _resized(image, 1024)
    values = big / max(1.0, float(big.max())) - 0.5
    output = _session("isnet-general-use.onnx").run(["output_image"], {"input_image": values.transpose(2, 0, 1)[None]})[0]
    return _stretch(np.squeeze(output))


def _sam21(image: Image.Image, points: list, box) -> np.ndarray:
    """SAM 2.1: the image is encoded once and kept, and each set of prompts is decoded against it."""
    constants = json.loads(model_file("sam21-video-constants.json").read_text(encoding="utf-8"))
    size = int(constants["image_size"])
    signature = hashlib.blake2b(np.asarray(image.convert("RGB").resize((96, 96))).tobytes(), digest_size=12).digest()
    with _lock:
        feats = _embeddings.get(signature)
    if feats is None:
        values = ((_resized(image, size) / 255 - np.array(constants["image_mean"], np.float32)) / np.array(constants["image_std"], np.float32)).transpose(2, 0, 1)[None]
        session = _session("sam21-video-vision_encoder.onnx")
        names = [output.name for output in session.get_outputs()]
        feats = dict(zip(names, session.run(names, {"pixel_values": values.astype(np.float32)}), strict=True))
        with _lock:
            _embeddings[signature] = feats
            while len(_embeddings) > 4:
                _embeddings.popitem(last=False)
    coords = [[float(p["x"]) * size, float(p["y"]) * size] for p in points[:16]]
    labels = [0 if p.get("keep") is False else 1 for p in points[:16]]
    if box:
        coords += [[float(box["x0"]) * size, float(box["y0"]) * size], [float(box["x1"]) * size, float(box["y1"]) * size]]
        labels += [2, 3]
    session = _session("sam21-video-mask_decoder.onnx")
    names = [output.name for output in session.get_outputs()]
    decoded = dict(zip(names, session.run(names, {
        "feats0": feats["feats0"], "feats1": feats["feats1"], "feats2_cond": feats["feats2_no_mem"],
        "input_points": np.array([[coords]], np.float32), "input_labels": np.array([[labels]], np.int32),
    }), strict=True))
    logits = np.asarray(decoded["high_res_mask"][0, 0], np.float32)
    return 1 / (1 + np.exp(-np.clip(logits, -30, 30)))


def matte(method: str, image: Image.Image, points: list | None = None, box: dict | None = None) -> np.ndarray:
    """A 0..1 matte at the image's own size."""
    if method not in METHODS:
        raise ValueError("Unknown cutout method.")
    if not ready(method):
        if method == "auto":
            raise ValueError("Subject (Auto) chooses between Person cutout and Object cutout: download Person cutout first, from Background models in the inspector.")
        raise ValueError(f"Download {MODELS[method]['name']} first, from Background models in the inspector.")
    if method == "auto":
        # FormCut's BG4: the person model's matte is kept when it holds at least one percent of the frame at half
        # threshold; below that it saw nobody, and the object model answers instead.
        alpha = _u2net("person-cutout", image)
        if float((alpha > 0.5).mean()) < 0.01:
            alpha = _u2net("object-cutout", image)
    elif method in ("object-cutout", "person-cutout"):
        alpha = _u2net(method, image)
    elif method == "sharp-cutout":
        alpha = _isnet(image)
    else:
        if not points and not box:
            raise ValueError("Click the subject first: each click is a point to keep, Alt-click a point to leave out.")
        alpha = _sam21(image, points or [], box)
    return _to_size(alpha, image.width, image.height)


def shaped(alpha: np.ndarray, threshold: float = 0.5, feather: float = 0.1) -> np.ndarray:
    """FormCut's shaping: (alpha - threshold + feather / 2) / feather, clipped."""
    feather = max(0.005, feather)
    return np.clip((alpha - threshold + feather / 2) / feather, 0, 1)
