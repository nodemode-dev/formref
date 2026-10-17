"""Connection endpoints: an item id, or a whole group written as "group:" and the group id (v0.25.0), so groups connect like single nodes. An item whose id is exactly the endpoint wins, as in the engine."""

GROUP = "group:"


def group_of(endpoint: str) -> str | None:
    return endpoint[len(GROUP):] if isinstance(endpoint, str) and endpoint.startswith(GROUP) and len(endpoint) > len(GROUP) else None


def present(endpoint: str, ids: set, groups: set) -> bool:
    """True when the endpoint names an item in ids or a group in groups."""
    return endpoint in ids or group_of(endpoint) in groups


def remap(endpoint: str, items: dict, groups: dict) -> str | None:
    """The endpoint after items and groups got new ids (duplicate board, template); None when it does not come along."""
    if endpoint in items:
        return items[endpoint]
    group = group_of(endpoint)
    return GROUP + groups[group] if group in groups else None


def remap_titles(titles: dict, groups: dict) -> dict:
    """Group titles (settings.group_titles, v0.26.0) under the groups' new ids; titles of groups that did not come along are dropped."""
    return {groups[group]: title for group, title in titles.items() if group in groups}


def kept_titles(titles: dict, items: list) -> dict:
    """Group titles for the groups still present among items."""
    present = {item.get("group_id") for item in items if item.get("group_id")}
    return {group: title for group, title in titles.items() if group in present}


def box(items: list, endpoint: str) -> dict | None:
    """x, y, width, height and hidden for an endpoint: the item itself, or the box around a group's visible members (hidden when all are hidden)."""
    for item in items:
        if item["id"] == endpoint:
            found = {"x": item["x"], "y": item["y"], "width": item["width"], "height": item["height"], "hidden": bool(item.get("hidden"))}
            if item.get("kind") == "column":
                # A column is a container too: its lines meet its side, not its centre among the cards (v0.26.0).
                found["side"] = 0
            return found
    group = group_of(endpoint)
    members = [item for item in items if group and item.get("group_id") == group]
    if not members:
        return None
    shown = [item for item in members if not item.get("hidden")]
    if not shown:
        return {"x": members[0]["x"], "y": members[0]["y"], "width": 0, "height": 0, "hidden": True, "group": True}
    left, top = min(i["x"] for i in shown), min(i["y"] for i in shown)
    right, bottom = max(i["x"] + i["width"] for i in shown), max(i["y"] + i["height"] for i in shown)
    return {"x": left, "y": top, "width": right - left, "height": bottom - top, "hidden": False, "group": True}


FRAME_PAD = 12


def anchors(source: dict, target: dict) -> tuple[float, float, float, float]:
    """Line ends as the window draws them: an item's centre, a group's frame side or a column's side facing the other end."""
    sx, tx = source["x"] + source["width"] / 2, target["x"] + target["width"] / 2

    def side(end, centre, other):
        pad = FRAME_PAD if end.get("group") else end.get("side")
        if pad is None:
            return centre
        return end["x"] + end["width"] + pad if other >= centre else end["x"] - pad
    return side(source, sx, tx), source["y"] + source["height"] / 2, side(target, tx, sx), target["y"] + target["height"] / 2


def title(items: list, endpoint: str, titles: dict | None = None) -> str:
    """How Markdown names an endpoint: the item's title or kind, or a group by its title or its first members."""
    for item in items:
        if item["id"] == endpoint:
            return item.get("title") or item["kind"]
    group = group_of(endpoint)
    if group and (titles or {}).get(group):
        return f"Group {titles[group]}"
    names = [(item.get("title") or item["kind"]) for item in items if group and item.get("group_id") == group]
    if not names:
        return "Item"
    shown = ", ".join(names[:3]) + (", ..." if len(names) > 3 else "")
    return f"Group ({shown})"
