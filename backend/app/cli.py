"""./formref open and ./formref import: open a board or bring a folder of references in from the command line, through the running local service."""
import json
import mimetypes
import os
import sys
import uuid
import webbrowser
from pathlib import Path
from urllib import error, request

API = os.environ.get("FORMREF_API", "http://127.0.0.1:8320")
WINDOW = os.environ.get("FORMREF_WINDOW", API)
MEDIA = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".avif", ".svg", ".mp4", ".webm", ".mov", ".m4v", ".mp3", ".wav", ".ogg", ".m4a"}


def call(method: str, path: str, body: bytes | None = None, headers: dict | None = None):
    req = request.Request(API + path, data=body, method=method, headers={"X-FormRef-Client": "outside", **(headers or {})})
    try:
        with request.urlopen(req, timeout=120) as response:
            return json.loads(response.read() or b"null")
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        try:
            detail = json.loads(detail).get("detail", detail)
        except ValueError:
            pass
        raise SystemExit(f"formref: {detail}")
    except error.URLError:
        raise SystemExit(f"formref: the local service is not running at {API}. Start it with ./formref dev or ./formref serve.")


def post_json(path: str, value) -> dict:
    return call("POST", path, json.dumps(value).encode(), {"Content-Type": "application/json"})


def upload(file: Path) -> dict:
    boundary = uuid.uuid4().hex
    mime = mimetypes.guess_type(file.name)[0] or "application/octet-stream"
    head = f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{file.name}"\r\nContent-Type: {mime}\r\n\r\n'.encode()
    body = head + file.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    return call("POST", "/api/assets", body, {"Content-Type": f"multipart/form-data; boundary={boundary}"})


def make_active(board_id: str) -> None:
    session = call("GET", "/api/session")
    open_ids = [i for i in session.get("open", []) if i != board_id] + [board_id]
    call("PUT", "/api/session", json.dumps({"open": open_ids, "active": board_id}).encode(), {"Content-Type": "application/json"})


def find_board(name: str) -> dict:
    listing = call("GET", "/api/boards")
    boards = listing.get("boards", listing) if isinstance(listing, dict) else listing
    exact = [b for b in boards if b["id"] == name or b.get("title", "").lower() == name.lower()]
    loose = exact or [b for b in boards if name.lower() in b.get("title", "").lower()]
    if not loose:
        raise SystemExit(f'formref: no board called "{name}". Boards: ' + ", ".join(b.get("title", b["id"]) for b in boards[:20]))
    if len(loose) > 1:
        raise SystemExit(f'formref: "{name}" matches {len(loose)} boards: ' + ", ".join(f'{b.get("title")} ({b["id"]})' for b in loose[:10]))
    return loose[0]


def open_board(args: list[str]) -> None:
    if not args:
        raise SystemExit("Usage: ./formref open <board title or id> [--no-window]")
    board = find_board(" ".join(a for a in args if a != "--no-window"))
    make_active(board["id"])
    print(f'Opened "{board.get("title")}" ({board["id"]}).')
    if "--no-window" not in args:
        webbrowser.open(WINDOW)


def import_folder(args: list[str]) -> None:
    named = [a for i, a in enumerate(args) if not a.startswith("--") and (i == 0 or args[i - 1] != "--title")]
    folder = Path(named[0] if named else "").expanduser()
    if named and not folder.is_absolute():
        folder = Path(os.environ.get("FORMREF_CALLER_DIR", os.getcwd())) / folder
    if not folder.is_dir():
        raise SystemExit("Usage: ./formref import <folder> [--title NAME] [--recursive] [--no-window]")
    title = args[args.index("--title") + 1] if "--title" in args and args.index("--title") + 1 < len(args) else folder.resolve().name
    pattern = "**/*" if "--recursive" in args else "*"
    files = sorted((f for f in folder.glob(pattern) if f.is_file() and f.suffix.lower() in MEDIA and not f.name.startswith(".")), key=lambda f: str(f).lower())
    if not files:
        raise SystemExit(f"formref: no pictures, videos or sounds in {folder}.")
    board = post_json("/api/boards", {"title": title[:200]})["board"]
    items, x, y, row = [], 0.0, 0.0, 0.0
    for index, file in enumerate(files, 1):
        asset = upload(file)
        w, h = float(asset.get("width") or 0), float(asset.get("height") or 0)
        image = asset.get("mime", "").startswith("image/")
        if image and w > 0 and h > 0:
            scale = min(1.0, 360.0 / max(w, h))
            w, h = w * scale, h * scale
        else:
            w, h = 320.0, 240.0
        if x > 0 and x + w > 2400:
            x, y, row = 0.0, y + row + 24, 0.0
        item = {"id": str(uuid.uuid4()), "kind": "image" if image else "file", "x": x, "y": y, "width": w, "height": h, "rotation": 0, "z": index, "opacity": 1, "locked": False, "hidden": False, "group_id": None, "parent_id": None, "title": file.name, "text": "", "color": "#ffffff", "asset_id": asset["id"], "url": "", "data": ({**({"tags": asset["keywords"]} if asset.get("keywords") else {}), **({"rating": asset["rating"]} if asset.get("rating") else {})}) if image else {"mime": asset.get("mime", "")}}
        items.append(item)
        x, row = x + w + 24, max(row, h)
        print(f"  {index}/{len(files)} {file.name}")
    for start in range(0, len(items), 200):
        post_json(f'/api/boards/{board["id"]}/commands', {"command": {"type": "add", "items": items[start:start + 200]}})
    make_active(board["id"])
    print(f'Imported {len(items)} references into "{title}" ({board["id"]}).')
    if "--no-window" not in args:
        webbrowser.open(WINDOW)


REFERENCE = Path(__file__).resolve().parents[2] / ".claude" / "skills" / "formref-harness" / "references" / "commands.md"


def command_reference(catalogue: dict) -> str:
    """The harness skill's command reference, written from the catalogue the open window publishes. Sorted by group then id, so the file only changes when a command does."""
    commands = sorted(catalogue.get("commands", []), key=lambda c: (c.get("group", ""), c.get("id", "")))
    lines = [
        "# FormRef command reference",
        "",
        "Written by `./formref agents sync` from the command catalogue the FormRef window publishes; do not edit by hand. Run a command with the MCP tools `run_command` or `run_commands` (the window must be open). `window-only` commands are refused for outside agents; `risky` commands ask the person first.",
        "",
        f"{len(commands)} commands.",
    ]
    group = None
    for command in commands:
        if command.get("group") != group:
            group = command.get("group")
            lines += ["", f"## {group}", "", "| Command | Label | Keys | Kind | What it does |", "| --- | --- | --- | --- | --- |"]
        kind = ", ".join(word for word, on in (("changes the board", command.get("mutates")), ("risky", command.get("risky")), ("window-only", command.get("agent") == "window-only")) if on) or "view"
        params = command.get("params") or {}
        words = command.get("description", "")
        if params:
            words += " Parameters: " + "; ".join(f"`{name}` ({spec.get('type', 'value')}): {spec.get('description', '')}".rstrip(": ") for name, spec in params.items()) + "."
        keys = ", ".join(f"`{k}`" for k in command.get("default_keys", command.get("keys")) or [])
        cell = lambda text: str(text).replace("|", "\\|").replace("\n", " ")
        lines.append(f"| `{command.get('id')}` | {cell(command.get('label', ''))} | {keys} | {kind} | {cell(words)} |")
    return "\n".join(lines) + "\n"


def agents_sync(args: list[str]) -> None:
    if not args or args[0] != "sync":
        raise SystemExit("Usage: ./formref agents sync [--check]")
    from .core.config import settings
    source = settings.data_dir / "commands-catalogue.json"
    if not source.is_file():
        raise SystemExit(f"formref: no command catalogue yet at {source}. Open FormRef once (./formref dev) so the window can publish it, then run this again.")
    text = command_reference(json.loads(source.read_text(encoding="utf-8")))
    current = REFERENCE.read_text(encoding="utf-8") if REFERENCE.is_file() else ""
    if "--check" in args:
        if current != text:
            raise SystemExit(f"formref: {REFERENCE.relative_to(REFERENCE.parents[4])} is out of date; run ./formref agents sync.")
        print("Command reference is up to date.")
        return
    REFERENCE.parent.mkdir(parents=True, exist_ok=True)
    REFERENCE.write_text(text, encoding="utf-8")
    print(f"{'Updated' if current != text else 'Unchanged'}: {REFERENCE.relative_to(REFERENCE.parents[4])} ({text.count(chr(10) + '| `')} commands).")


if __name__ == "__main__":
    action, rest = (sys.argv[1] if len(sys.argv) > 1 else ""), sys.argv[2:]
    if action == "open":
        open_board(rest)
    elif action == "import":
        import_folder(rest)
    elif action == "agents":
        agents_sync(rest)
    else:
        raise SystemExit("Usage: python -m app.cli open|import|agents ...")
