from dataclasses import dataclass
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
VERSION = "0.4.1"

@dataclass(frozen=True)
class Settings:
    data_dir: Path
    engine_path: Path
    max_upload_bytes: int = 64 * 1024 * 1024
    max_archive_bytes: int = 256 * 1024 * 1024
    max_image_pixels: int = 64_000_000
    max_export_pixels: int = 32_000_000
    max_export_edge: int = 8192

settings = Settings(
    data_dir=Path(os.environ.get("FORMREF_DATA_DIR", str(Path.home() / ".formref" / "data"))).expanduser().resolve(),
    engine_path=Path(os.environ.get("FORMREF_ENGINE_PATH", str(ROOT / "native" / "formref-core" / "target" / "release" / ("formref-core.exe" if os.name == "nt" else "formref-core")))).expanduser().resolve(),
)
