import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path

LOG_NAME = "formref-engine.log"
FOLDER = "Logs"
HANDLER = "formref-file"
LOG_BYTES = 1_048_576
LOG_KEEP = 3
LOGGERS = ("formref", "uvicorn", "uvicorn.access")
FORMAT = "%(asctime)s %(levelname)s %(name)s %(message)s"


def held() -> logging.Handler | None:
    for handler in logging.getLogger("formref").handlers:
        if handler.get_name() == HANDLER:
            return handler
    return None


def join() -> None:
    handler = held()
    if handler is None:
        return
    for name in LOGGERS:
        if handler not in logging.getLogger(name).handlers:
            logging.getLogger(name).addHandler(handler)


def start(data: Path) -> Path:
    folder = data / FOLDER
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / LOG_NAME
    if held() is None:
        handler = RotatingFileHandler(path, maxBytes=LOG_BYTES, backupCount=LOG_KEEP, encoding="utf-8")
        handler.setFormatter(logging.Formatter(FORMAT))
        handler.set_name(HANDLER)
        logging.getLogger("formref").addHandler(handler)
        logging.getLogger("formref").setLevel(logging.INFO)
        logging.getLogger("formref").info("engine started, process %s, data folder %s", os.getpid(), data)
    join()
    return path
