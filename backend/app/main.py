from contextlib import asynccontextmanager
import ipaddress
import logging
from urllib.parse import urlparse
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from starlette.middleware.cors import CORSMiddleware
from .core.config import ROOT, VERSION, settings
from .core.engine import broker, EngineError
from .core.extensions import registry
from .core.store import MissingBoard
from .routers.boards import router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("formref")

@asynccontextmanager
async def lifespan(app):
    log.info("FormRef %s using %s", VERSION, settings.data_dir)
    yield
    broker.close()

app = FastAPI(title="FormRef", version=VERSION, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$", allow_credentials=False, allow_methods=["GET", "POST", "DELETE", "OPTIONS"], allow_headers=["Content-Type"], expose_headers=["Content-Disposition", "X-FormRef-Scale", "X-FormRef-Width", "X-FormRef-Height"])

@app.middleware("http")
async def local_access(request: Request, call_next):
    host = urlparse("http://" + request.headers.get("host", "")).hostname
    if host not in {"localhost", "127.0.0.1", "::1"}:
        return JSONResponse(status_code=403, content={"detail": "FormRef accepts loopback hosts only."})
    if request.client:
        try:
            local = ipaddress.ip_address(request.client.host).is_loopback
        except ValueError:
            local = False
        if not local:
            return JSONResponse(status_code=403, content={"detail": "FormRef accepts local clients only."})
    origin = request.headers.get("origin")
    if origin:
        parsed = urlparse(origin)
        if parsed.scheme not in {"http", "https"} or parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
            return JSONResponse(status_code=403, content={"detail": "Origin is not an allowed local application."})
    length = request.headers.get("content-length")
    if length:
        try:
            if int(length) > settings.max_upload_bytes + 1024 * 1024:
                return JSONResponse(status_code=413, content={"detail": "Request exceeds the 64 MiB upload limit."})
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Invalid request content length."})
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

@app.exception_handler(MissingBoard)
async def missing_board(request, exc):
    return JSONResponse(status_code=404, content={"detail": str(exc)})

@app.exception_handler(EngineError)
async def engine_error(request, exc):
    code = 503 if exc.code.startswith("engine_") else 409 if "locked" in str(exc).lower() else 422
    return JSONResponse(status_code=code, content={"detail": str(exc), "code": exc.code})

@app.exception_handler(ValueError)
async def bad_input(request, exc):
    return JSONResponse(status_code=422, content={"detail": str(exc)})

@app.exception_handler(OSError)
async def storage_error(request, exc):
    log.error("Storage operation failed: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Local storage operation failed. Check service logs and available disk space."})

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "formref", "version": VERSION, "engine": "rust", "engine_built": settings.engine_path.is_file(), "protocol": "formref-board-v1"}

@app.get("/api/capabilities")
def capabilities():
    return {"capabilities": registry.describe(), "item_kinds": ["image", "note", "link", "board", "column", "todo", "shape", "stroke", "file"], "exports": list(registry.exporters), "limits": {"asset_bytes": settings.max_upload_bytes, "expanded_archive_bytes": settings.max_archive_bytes, "image_pixels": settings.max_image_pixels, "png_pixels": settings.max_export_pixels, "png_edge": settings.max_export_edge, "undo_steps": 100}, "collaboration": "local-agent-sync", "cloud_sync": False, "accounts": False}

app.include_router(router)

@app.get("/{path:path}")
def frontend(path: str):
    if path.startswith("api/"):
        return JSONResponse(status_code=404, content={"detail": "API route does not exist."})
    directory = (ROOT / "frontend" / "dist").resolve()
    candidate = (directory / path).resolve()
    if not candidate.is_relative_to(directory):
        return JSONResponse(status_code=404, content={"detail": "File does not exist."})
    if candidate.is_file():
        return FileResponse(candidate)
    index = directory / "index.html"
    if index.is_file():
        return FileResponse(index, headers={"Cache-Control": "no-cache"})
    return JSONResponse(status_code=503, content={"detail": "Frontend is not built. Run ./formref build or ./formref dev."})
