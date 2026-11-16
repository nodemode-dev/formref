"""Connection endpoints: an item id, or a whole group written as "group:" and the group id (v0.25.0), so groups connect like single nodes. An item whose id is exactly the endpoint wins, as in the engine."""

import math

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


def remap_group_settings(settings, groups: dict) -> None:
    """Moves every per-group setting (titles, v0.26.0; collapsed groups, v0.31.0) to the groups' new ids in place, dropping groups that did not come along."""
    if not isinstance(settings, dict):
        return
    if isinstance(settings.get("group_titles"), dict):
        settings["group_titles"] = remap_titles(settings["group_titles"], groups)
    if isinstance(settings.get("collapsed_groups"), list):
        settings["collapsed_groups"] = sorted(groups[group] for group in settings["collapsed_groups"] if group in groups)


def keep_group_settings(settings, items: list) -> None:
    """Keeps per-group settings only for the groups still present among items, in place."""
    if not isinstance(settings, dict):
        return
    present = {item.get("group_id") for item in items if item.get("group_id")}
    if isinstance(settings.get("group_titles"), dict):
        settings["group_titles"] = kept_titles(settings["group_titles"], items)
    if isinstance(settings.get("collapsed_groups"), list):
        settings["collapsed_groups"] = [group for group in settings["collapsed_groups"] if group in present]


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


ARROW_GAP, ARROW_LENGTH, ARROW_HALF = 4, 12, 5
DASHES = {"dashed": (8, 6), "dotted": (0, 6)}


def pointed(arrow: str) -> tuple[bool, bool]:
    """Whether the start and the end of a connection carry an arrowhead (arrow is "", end, start or both)."""
    return arrow in ("start", "both"), arrow in ("end", "both")


def route(source: dict, target: dict, arrow: str = "") -> tuple[float, float, float, float, bool]:
    """Line ends as the window draws them, and whether the line runs top to bottom. Ends that clear each other along an axis meet the sides facing each other there (left and right, or top and bottom), each end padded off its box: a group's frame, a column's side, the gap before an arrowhead (v0.28.0), or nothing for a plain item. With room on both axes the shorter line wins, ties going to left and right. Ends that overlap on both axes keep the older rule: an item's centre, or the left or right side towards the other end."""
    at_start, at_end = pointed(arrow)

    def pad(end, head):
        value = FRAME_PAD if end.get("group") else end.get("side")
        return ARROW_GAP if value is None and head else value
    sp, tp = pad(source, at_start), pad(target, at_end)
    sx, sy = source["x"] + source["width"] / 2, source["y"] + source["height"] / 2
    tx, ty = target["x"] + target["width"] / 2, target["y"] + target["height"] / 2

    def across(vertical):
        sa, ss, ta, ts = (source["y"], source["height"], target["y"], target["height"]) if vertical else (source["x"], source["width"], target["x"], target["width"])
        forward, back = ta - sa - ss - (sp or 0) - (tp or 0) > 0, sa - ta - ts - (sp or 0) - (tp or 0) > 0
        if not forward and not back:
            return None
        a = sa + ss + (sp or 0) if forward else sa - (sp or 0)
        b = ta - (tp or 0) if forward else ta + ts + (tp or 0)
        return (sx, a, tx, b, True) if vertical else (a, sy, b, ty, False)
    level, upright = across(False), across(True)
    if level and upright:
        return upright if math.hypot(upright[2] - upright[0], upright[3] - upright[1]) < math.hypot(level[2] - level[0], level[3] - level[1]) else level
    if level or upright:
        return level or upright

    def side(end, centre, other, gap):
        if gap is None:
            return centre
        return end["x"] + end["width"] + gap if other >= centre else end["x"] - gap
    return side(source, sx, tx, sp), sy, side(target, tx, sx, tp), ty, False


def anchors(source: dict, target: dict, arrow: str = "") -> tuple[float, float, float, float]:
    """The line ends of route() without the direction."""
    return route(source, target, arrow)[:4]


def heads(ax: float, ay: float, bx: float, by: float, arrow: str, route: str = "", vertical: bool = False) -> tuple[tuple[float, float, float, float], list]:
    """Arrowheads for the line from (ax, ay) to (bx, by): the line's new ends (each pointed end pulled back to the head's base) and one triangle per head, aligned with the line there. A curve and an elbow (v0.30.0) both leave each end square to its side, towards the middle between the ends (the middle x, or the middle y when vertical); a straight line points at its far end."""
    if vertical:
        (sy, sx, ey, ex), turned = heads(ay, ax, by, bx, arrow, route)
        return (sx, sy, ex, ey), [[(y, x) for x, y in triangle] for triangle in turned]
    middle = (ax + bx) / 2
    straight = route == "straight"
    at_start, at_end = pointed(arrow)
    triangles = []

    def head(tip_x, tip_y, control_x, control_y, far_x, far_y):
        dx, dy = tip_x - control_x, tip_y - control_y
        if abs(dx) + abs(dy) < 1e-6:
            dx, dy = tip_x - far_x, tip_y - far_y
        length = math.hypot(dx, dy) or 1.0
        dx, dy = dx / length, dy / length
        base_x, base_y = tip_x - dx * ARROW_LENGTH, tip_y - dy * ARROW_LENGTH
        triangles.append([(tip_x, tip_y), (base_x - dy * ARROW_HALF, base_y + dx * ARROW_HALF), (base_x + dy * ARROW_HALF, base_y - dx * ARROW_HALF)])
        return base_x, base_y
    start = (head(ax, ay, bx, by, bx, by) if straight else head(ax, ay, middle, ay, bx, by)) if at_start else (ax, ay)
    end = (head(bx, by, ax, ay, ax, ay) if straight else head(bx, by, middle, by, ax, ay)) if at_end else (bx, by)
    return (start[0], start[1], end[0], end[1]), triangles


def path_data(ax: float, ay: float, bx: float, by: float, ends: tuple, route: str = "", vertical: bool = False) -> str:
    """SVG path data for a connection, given the anchors (which fix the middle) and the drawn ends from heads()."""
    sx, sy, ex, ey = ends
    if route == "straight":
        return f"M{sx},{sy} L{ex},{ey}"
    if vertical:
        middle = (ay + by) / 2
        if route == "elbow":
            return f"M{sx},{sy} V{middle} H{ex} V{ey}"
        return f"M{sx},{sy} C{ax},{middle} {bx},{middle} {ex},{ey}"
    middle = (ax + bx) / 2
    if route == "elbow":
        return f"M{sx},{sy} H{middle} V{ey} H{ex}"
    return f"M{sx},{sy} C{middle},{ay} {middle},{by} {ex},{ey}"


def polyline(ax: float, ay: float, bx: float, by: float, ends: tuple, route: str = "", steps: int = 0, vertical: bool = False) -> list:
    """The same line as points, for raster drawing: corners for straight and elbow, the curve sampled in steps otherwise (at least 8)."""
    if vertical and route != "straight":
        return [(x, y) for y, x in polyline(ay, ax, by, bx, (ends[1], ends[0], ends[3], ends[2]), route, steps)]
    sx, sy, ex, ey = ends
    middle = (ax + bx) / 2
    if route == "straight":
        return [(sx, sy), (ex, ey)]
    if route == "elbow":
        return [(sx, sy), (middle, sy), (middle, ey), (ex, ey)]
    steps = max(8, steps)
    points = []
    for index in range(steps + 1):
        t = index / steps
        inverse = 1 - t
        points.append((inverse ** 3 * sx + 3 * inverse ** 2 * t * middle + 3 * inverse * t ** 2 * middle + t ** 3 * ex, inverse ** 3 * sy + 3 * inverse ** 2 * t * ay + 3 * inverse * t ** 2 * by + t ** 3 * ey))
    return points


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
