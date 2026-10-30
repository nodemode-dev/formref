import json
import os
import sys
import threading
import time


def resource_dir() -> str:
    return getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))


def alive(pid: int) -> bool:
    if os.name == "nt":
        import ctypes

        kernel = ctypes.windll.kernel32
        handle = kernel.OpenProcess(0x00100000, False, pid)
        if not handle:
            return False
        try:
            return kernel.WaitForSingleObject(handle, 0) == 0x102
        finally:
            kernel.CloseHandle(handle)
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def watch_shell(shell: int) -> None:
    while True:
        time.sleep(2)
        if not alive(shell):
            os._exit(0)


def selfcheck() -> int:
    info = {"python": sys.version.split()[0]}
    for name in ("fastapi", "uvicorn", "multipart", "httpx", "mcp", "PIL", "numpy", "defusedxml", "websockets", "pypdfium2"):
        try:
            module = __import__(name)
            info[name.lower()] = getattr(module, "__version__", "ok")
        except Exception as exc:
            info[name.lower()] = f"missing: {exc}"
    from app.core.config import ROOT, VERSION
    from app.main import app

    info["formref"] = VERSION
    info["routes"] = len(app.routes)
    info["dist_bundled"] = (ROOT / "frontend" / "dist" / "index.html").is_file()
    info["model_bundled"] = os.path.isfile(os.path.join(resource_dir(), "app", "bundled_models", "u2netp.onnx"))
    print(json.dumps(info))
    missing = [key for key, value in info.items() if isinstance(value, str) and value.startswith("missing")]
    return 1 if missing or not info["dist_bundled"] or not info["model_bundled"] else 0


def main() -> int:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    if "--selfcheck" in sys.argv:
        return selfcheck()
    if sys.argv[1:3] == ["-m", "app.mcp_server"] or sys.argv[1:2] == ["mcp"]:
        from app.mcp_server import mcp

        mcp.run(transport="stdio")
        return 0
    port = int(os.environ.get("FORMREF_PORT", "8320") or 8320)
    os.environ.setdefault("FORMREF_API_URL", f"http://127.0.0.1:{port}")
    shell = os.environ.get("FORMREF_PARENT_PID", "")
    if shell.isdigit():
        threading.Thread(target=watch_shell, args=(int(shell),), daemon=True).start()
    import uvicorn

    from app.main import app

    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
    return 0


if __name__ == "__main__":
    import multiprocessing

    multiprocessing.freeze_support()
    sys.exit(main())
