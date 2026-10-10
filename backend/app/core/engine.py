import atexit
import json
import logging
import subprocess
import threading
from .config import settings

log = logging.getLogger("formref.engine")

class EngineError(ValueError):
    def __init__(self, message: str, code: str = "invalid_command"):
        super().__init__(message)
        self.code = code

class EngineBroker:
    def __init__(self):
        self.lock = threading.RLock()
        self.process = None
        self.sequence = 0
        self.generation = 0

    def start(self):
        with self.lock:
            if self.process is not None and self.process.poll() is None:
                return
            if not settings.engine_path.is_file():
                raise EngineError("Rust engine is not built. Run ./formref build before starting the service.", "engine_unavailable")
            self.process = subprocess.Popen([str(settings.engine_path)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=None, text=True, encoding="utf-8", bufsize=1)
            self.generation += 1

    def call(self, method: str, params: dict):
        with self.lock:
            self.start()
            self.sequence += 1
            request_id = self.sequence
            try:
                self.process.stdin.write(json.dumps({"id": request_id, "method": method, "params": params}, allow_nan=False, separators=(",", ":")) + "\n")
                self.process.stdin.flush()
                line = self.process.stdout.readline()
            except (BrokenPipeError, OSError) as exc:
                raise EngineError("Rust engine stopped unexpectedly.", "engine_unavailable") from exc
            if not line:
                raise EngineError("Rust engine stopped without a response.", "engine_unavailable")
            try:
                response = json.loads(line)
            except json.JSONDecodeError as exc:
                raise EngineError("Rust engine returned invalid JSON.", "engine_protocol") from exc
            if response.get("id") != request_id:
                raise EngineError("Rust engine response ID mismatch.", "engine_protocol")
            if "error" in response:
                error = response["error"]
                raise EngineError(error.get("message", "Engine rejected the command."), error.get("code", "invalid_command"))
            return response["result"]

    def close(self):
        with self.lock:
            if self.process is None:
                return
            if self.process.poll() is None:
                self.process.terminate()
                try:
                    self.process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    self.process.kill()
                    self.process.wait(timeout=3)
            self.process = None

broker = EngineBroker()
atexit.register(broker.close)
