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
            unpacked = getattr(sys, "_MEIPASS", "")
            if os.path.basename(unpacked).startswith("_MEI"):
                import shutil

                shutil.rmtree(unpacked, ignore_errors=True)
            os._exit(0)


UNPACK_PID_FILE = ".formref-engine-pid"


def pid_in_use(pid: int) -> bool:
    if os.name == "nt":
        import ctypes

        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.OpenProcess.restype = ctypes.c_void_p
        kernel.OpenProcess.argtypes = [ctypes.c_uint32, ctypes.c_int, ctypes.c_uint32]
        kernel.WaitForSingleObject.argtypes = [ctypes.c_void_p, ctypes.c_uint32]
        kernel.CloseHandle.argtypes = [ctypes.c_void_p]
        handle = kernel.OpenProcess(0x00100000, False, pid)
        if not handle:
            return ctypes.get_last_error() == 5
        try:
            return kernel.WaitForSingleObject(handle, 0) == 0x102
        finally:
            kernel.CloseHandle(handle)
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return False
    return True


def sweep_stale_unpacks() -> None:
    unpacked = getattr(sys, "_MEIPASS", "")
    if not os.path.basename(unpacked).startswith("_MEI"):
        return
    import re
    import shutil
    import threading

    def run() -> None:
        root, own = os.path.dirname(unpacked), os.path.basename(unpacked)
        try:
            with open(os.path.join(unpacked, UNPACK_PID_FILE), "w", encoding="ascii") as handle:
                handle.write(str(os.getpid()))
        except OSError:
            pass
        try:
            names = os.listdir(root)
        except OSError:
            return
        for name in names:
            found = re.fullmatch(r"_MEI([0-9a-f]{8})[A-Za-z0-9]{0,6}", name)
            if not found or name == own or pid_in_use(int(found.group(1), 16)):
                continue
            folder = os.path.join(root, name)
            try:
                with open(os.path.join(folder, UNPACK_PID_FILE), encoding="ascii") as handle:
                    engine = handle.read().strip()
            except OSError:
                engine = ""
            if engine.isdigit() and int(engine) > 0 and pid_in_use(int(engine)):
                continue
            shutil.rmtree(folder, ignore_errors=True)

    threading.Thread(target=run, name="formref-unpack-sweep", daemon=True).start()


def selfcheck() -> int:
    info = {"python": sys.version.split()[0]}
    for name in ("fastapi", "uvicorn", "multipart", "httpx", "mcp", "PIL", "numpy", "defusedxml", "websockets", "pypdfium2", "fontTools.subset", "resvg_py"):
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
    sweep_stale_unpacks()
    import uvicorn

    from app.core import window_key
    from app.main import app

    if window_key.stdout_mode():
        print(window_key.LINE + window_key.KEY, flush=True)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
    return 0


if __name__ == "__main__":
    import multiprocessing

    multiprocessing.freeze_support()
    sys.exit(main())
