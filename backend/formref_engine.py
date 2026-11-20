import json
import logging
import os
import sys
from pathlib import Path

if sys.stdin is None:
    sys.stdin = open(os.devnull, encoding="utf-8")
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")


def resource_dir() -> str:
    return getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))


def parent_pid() -> int:
    raw = os.environ.get("FORMREF_PARENT_PID", "").strip()
    return int(raw) if raw.isascii() and raw.isdigit() else 0


def release(data: Path) -> None:
    from app.core import startup

    path = data / startup.LOCK_NAME
    try:
        if int(json.loads(path.read_text(encoding="utf-8")).get("pid", 0)) == os.getpid():
            path.unlink()
    except (OSError, ValueError, AttributeError, TypeError):
        pass


def watch_shell(shell: int, data: Path) -> None:
    from app.core import startup

    if shell <= 1:
        return

    def leave() -> None:
        logging.getLogger("formref").info("the app that started this engine is gone (process %s), stopping", shell)
        release(data)
        unpacked = getattr(sys, "_MEIPASS", "")
        if os.path.basename(unpacked).startswith("_MEI"):
            import shutil

            shutil.rmtree(unpacked, ignore_errors=True)
        os._exit(0)

    startup.watch(shell, leave)


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


def serve() -> int:
    from app.core import engine_log, startup
    from app.core.config import settings

    data = settings.data_dir
    try:
        data.mkdir(parents=True, exist_ok=True)
        logs = engine_log.start(data).parent
    except OSError as err:
        print(f"formref cannot use its data folder: {err}", file=sys.stderr)
        return 5
    startup.keep_errors(logs)
    log = logging.getLogger("formref")
    shell = startup.shell_pid() or parent_pid()
    if startup.alone() and not shell:
        beside = startup.app_beside(Path(sys.executable))
        if beside is not None and startup.open_app(beside):
            log.info("started without its app, so it opened %s and stopped", beside)
            return 0
        log.error("started without its app, and no app program was found near %s", sys.executable)
        print("formref-engine is a part of FormRef and serves nothing on its own. Open FormRef instead.", file=sys.stderr)
        return 4
    try:
        replaced = startup.claim(data, shell)[1]
    except startup.Busy as err:
        log.error("%s", err)
        print(err, file=sys.stderr)
        return 2
    if replaced:
        log.warning("an engine left running without its app was stopped (process %s)", replaced)
    watch_shell(shell, data)
    port = int(os.environ.get("FORMREF_PORT", "8320") or 8320)
    os.environ.setdefault("FORMREF_API_URL", f"http://127.0.0.1:{port}")
    sweep_stale_unpacks()
    import signal

    import uvicorn

    from app.core import window_key
    from app.main import app

    def leave(_signum, _frame) -> None:
        release(data)
        os._exit(0)

    signal.signal(signal.SIGTERM, leave)
    if window_key.stdout_mode():
        print(window_key.LINE + window_key.KEY, flush=True)
    try:
        uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
    finally:
        release(data)
    return 0


def main() -> int:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    if "--selfcheck" in sys.argv:
        return selfcheck()
    if sys.argv[1:3] == ["-m", "app.mcp_server"] or sys.argv[1:2] == ["mcp"]:
        from app.mcp_server import mcp

        mcp.run(transport="stdio")
        return 0
    try:
        return serve()
    except Exception:
        logging.getLogger("formref").exception("the engine stopped on an error")
        raise


if __name__ == "__main__":
    import multiprocessing

    multiprocessing.freeze_support()
    sys.exit(main())
