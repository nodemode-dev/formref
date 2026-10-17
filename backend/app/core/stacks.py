"""Collapsed groups as the window shows them (v0.32.0): an export copy of the board where each collapsed group is one stack card.

Exports normally show every item; when asked for stacks, the picture exports (PNG, SVG, PDF, phone viewer) run on this copy instead. Each collapsed group's visible members give way to:
- a card (kind column, so lines meet its side as in the window) at the members' top-left, STACK_W by STACK_H, titled with the group's title and its item count;
- up to three of its topmost pictures, fitted into the card below the title and fanned like the window's sheets.
Connections to the group or to any member meet the card; a connection inside one collapsed group is dropped.
"""
import copy

from .endpoints import GROUP

STACK_W, STACK_H = 220, 168
PILE = (14, 44, STACK_W - 28, STACK_H - 58)
FAN = (0, -4, 4)


def stacked(board: dict) -> dict:
    collapsed = set((board.get("settings") or {}).get("collapsed_groups") or [])
    if not collapsed:
        return board
    out = copy.deepcopy(board)
    titles = (out.get("settings") or {}).get("group_titles") or {}
    items, ends = [], {}
    members: dict[str, list] = {}
    for item in out["items"]:
        group = item.get("group_id")
        if group in collapsed and not item.get("hidden"):
            members.setdefault(group, []).append(item)
        else:
            items.append(item)
    for group, list_ in members.items():
        card_id = f"stack-{group}"[:64]
        left, top = min(i["x"] for i in list_), min(i["y"] for i in list_)
        z = max(float(i.get("z", 0)) for i in list_)
        name = titles.get(group) or "Untitled group"
        items.append({"id": card_id, "kind": "column", "x": left, "y": top, "width": STACK_W, "height": STACK_H, "rotation": 0, "z": z, "opacity": 1,
                      "locked": False, "hidden": False, "title": f"{name} ({len(list_)})", "text": "", "color": "#252428", "url": "", "asset_id": None, "data": {}})
        ends[GROUP + group] = card_id
        for item in list_:
            ends[item["id"]] = card_id
        pictures = sorted((i for i in list_ if i.get("kind") == "image" and i.get("asset_id")), key=lambda i: float(i.get("z", 0)), reverse=True)[:3]
        px, py, pw, ph = PILE
        # Bottom sheet first so the topmost picture is drawn last, as in the window.
        for index, picture in reversed(list(enumerate(pictures))):
            aspect = picture["width"] / picture["height"] if picture["height"] else 1
            width, height = (pw, pw / aspect) if pw / aspect <= ph else (ph * aspect, ph)
            sheet = {**picture, "id": f"{card_id}-{index}"[:64], "x": left + px + (pw - width) / 2, "y": top + py + (ph - height) / 2,
                     "width": width, "height": height, "rotation": FAN[index], "z": z + (3 - index) * 0.001, "locked": False, "hidden": False,
                     "opacity": 1, "group_id": None, "parent_id": None}
            items.append(sheet)
    out["items"] = items
    links = []
    for link in out.get("connections", []):
        start, end = ends.get(link["from"], link["from"]), ends.get(link["to"], link["to"])
        if start == end:
            continue
        links.append({**link, "from": start, "to": end})
    out["connections"] = links
    settings = out.get("settings")
    if isinstance(settings, dict):
        settings["collapsed_groups"] = []
        if isinstance(settings.get("group_titles"), dict):
            settings["group_titles"] = {g: t for g, t in settings["group_titles"].items() if g not in members}
    return out
