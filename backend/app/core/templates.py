"""Board templates: a few built in, plus boards the person saved as templates."""
import copy
import json
import re
import time
import uuid

from .config import settings
from .store import store

PAPER = "#f5e6a8"
FRAME = "#8d8794"
ID = re.compile(r"^[a-z0-9-]{1,64}$")


def item(kind, x, y, width, height, z, **fields):
    return {"id": uuid.uuid4().hex, "kind": kind, "x": x, "y": y, "width": width, "height": height, "rotation": 0, "z": z,
            "opacity": 1, "locked": False, "hidden": False, "group_id": None, "parent_id": None, "title": "", "text": "",
            "color": "#191919", "asset_id": None, "url": "", "data": {}, **fields}


def moodboard():
    items = [item("note", 0, 0, 1032, 170, 1, title="Moodboard", text="What should this feel like? Drop references into the columns below.", color=PAPER)]
    for index, name in enumerate(["Colour", "Texture", "Type", "Mood"]):
        items.append(item("column", index * 264, 210, 240, 560, 2, title=name))
    return items, []


def character_sheet():
    items = [item("note", 0, 0, 760, 170, 1, title="Character", text="Name, role and one line on who they are.", color=PAPER)]
    for index, name in enumerate(["Front", "Side", "Back"]):
        items.append(item("shape", index * 260, 210, 240, 360, 2, title=name, color=FRAME, data={"shape": "rect", "fill": "none", "stroke_width": 2}))
        items.append(item("note", index * 260, 580, 240, 90, 3, title=name, text="", color=PAPER))
    items.append(item("column", 800, 0, 240, 670, 2, title="Expressions"))
    for index, hex_color in enumerate(["#2b2d42", "#8d99ae", "#edf2f4", "#ef233c"]):
        items.append(item("swatch", 1080, index * 160, 180, 140, 4, color=hex_color, title=f"Palette {index + 1}"))
    return items, []


def storyboard():
    items = []
    for index in range(6):
        x, y = (index % 3) * 340, (index // 3) * 400
        group = uuid.uuid4().hex
        frame = item("shape", x, y, 320, 180, 2, title=f"Shot {index + 1}", color=FRAME, group_id=group, data={"shape": "rect", "fill": "none", "stroke_width": 2})
        caption = item("note", x, y + 190, 320, 170, 3, title=f"Shot {index + 1}", text="Action, camera, sound.", color=PAPER, group_id=group)
        items += [frame, caption]
    return items, []


def project_plan():
    items = []
    for index, name in enumerate(["To do", "Doing", "Done"]):
        column = item("column", index * 300, 0, 280, 560, 1, title=name)
        items.append(column)
        if index == 0:
            for row, task in enumerate(["Collect references", "Pick a direction", "Share the board"]):
                items.append(item("todo", index * 300 + 16, 104 + row * 80, 248, 64, 2, title=task, parent_id=column["id"], data={"checked": False}))
    return items, []


BUILT_IN = {
    "moodboard": ("Moodboard", "A heading and four columns: colour, texture, type and mood.", moodboard),
    "character-sheet": ("Character sheet", "Front, side and back frames, an expressions column and a four-colour palette.", character_sheet),
    "storyboard": ("Storyboard", "Six shot frames, each grouped with a caption note.", storyboard),
    "project-plan": ("Project plan", "To do, doing and done columns with starter tasks.", project_plan),
}


def folder():
    return settings.data_dir / "templates"


def saved_path(template_id: str):
    if not ID.fullmatch(template_id):
        raise ValueError("Invalid template identifier.")
    return folder() / (template_id + ".json")


def list_templates() -> list[dict]:
    out = [{"id": key, "title": title, "description": text, "built_in": True} for key, (title, text, _) in BUILT_IN.items()]
    saved = []
    for path in folder().glob("*.json") if folder().is_dir() else []:
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
            saved.append({"id": record["id"], "title": record["title"], "description": record.get("description", ""), "built_in": False, "item_count": len(record["board"]["items"]), "saved_at": record.get("saved_at", 0)})
        except (OSError, ValueError, KeyError):
            continue
    return out + sorted(saved, key=lambda t: t["saved_at"], reverse=True)


def save_template(board_id: str, title: str, description: str = "") -> dict:
    title = title.strip()
    if not title or len(title) > 120:
        raise ValueError("A template needs a name of at most 120 characters.")
    board = store.get(board_id)["board"]
    template_id = "saved-" + uuid.uuid4().hex[:16]
    record = {"id": template_id, "title": title, "description": description.strip()[:400], "saved_at": time.time(),
              "board": {"items": board["items"], "connections": board.get("connections", []), "background": board.get("background", "#1c1b1d"), "settings": board.get("settings")}}
    folder().mkdir(parents=True, exist_ok=True)
    store.atomic_write(saved_path(template_id), json.dumps(record, ensure_ascii=False, allow_nan=False).encode("utf-8"))
    return {"id": template_id, "title": title, "built_in": False}


def delete_template(template_id: str) -> dict:
    if template_id in BUILT_IN:
        raise ValueError("Built-in templates cannot be deleted.")
    path = saved_path(template_id)
    if not path.is_file():
        raise ValueError("That template does not exist.")
    path.unlink()
    return {"deleted": template_id}


def fresh_ids(items: list, connections: list):
    """New ids for every item, group and connection, keeping parents, groups and links intact."""
    items, connections = copy.deepcopy(items), copy.deepcopy(connections)
    mapping = {entry["id"]: uuid.uuid4().hex for entry in items}
    groups = {entry["group_id"]: uuid.uuid4().hex for entry in items if entry.get("group_id")}
    for entry in items:
        entry["id"] = mapping[entry["id"]]
        entry["parent_id"] = mapping.get(entry.get("parent_id")) if entry.get("parent_id") else None
        entry["group_id"] = groups.get(entry.get("group_id")) if entry.get("group_id") else None
        entry.get("data", {}).pop("comments", None)
    links = []
    for link in connections:
        if link["from"] in mapping and link["to"] in mapping:
            links.append({**link, "id": uuid.uuid4().hex, "from": mapping[link["from"]], "to": mapping[link["to"]]})
    return items, links


def use_template(template_id: str, title: str = "") -> dict:
    if template_id in BUILT_IN:
        name, _, build = BUILT_IN[template_id]
        items, links = build()
        background, board_settings = "#1c1b1d", None
    else:
        path = saved_path(template_id)
        if not path.is_file():
            raise ValueError("That template does not exist.")
        record = json.loads(path.read_text(encoding="utf-8"))
        name = record["title"]
        items, links = fresh_ids(record["board"]["items"], record["board"]["connections"])
        background, board_settings = record["board"].get("background", "#1c1b1d"), record["board"].get("settings")
    board = {"id": "", "title": (title.strip() or name)[:200], "version": 1, "revision": 0, "items": items, "connections": links,
             "viewport": {"x": 0, "y": 0, "zoom": 1}, "background": background}
    if board_settings:
        board["settings"] = board_settings
    return store.open_import(board)
