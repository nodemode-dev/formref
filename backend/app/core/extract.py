"""Selection to a new board (reference-board gap: Milanote moves cards between boards; PureRef and BeeRef can only save the whole scene). The selected items, their column children and the connections between them become a new board; moving also removes them from the source in one undoable step, through the board Trash."""
import copy

from .store import MissingBoard, store


def extract_board(board_id: str, ids: list, title: str = "", move: bool = False) -> dict:
    if not isinstance(ids, list) or not ids or not all(isinstance(i, str) for i in ids) or len(ids) > 10000:
        raise ValueError("Choose the items to put on the new board.")
    state = store.get(board_id)
    source = state["board"]
    by_id = {item["id"]: item for item in source["items"]}
    missing = [i for i in ids if i not in by_id]
    if missing:
        raise MissingBoard("Some of those items are not on this board.")
    chosen = set(ids)
    grew = True
    while grew:
        children = {item["id"] for item in source["items"] if item.get("parent_id") in chosen} - chosen
        chosen |= children
        grew = bool(children)
    if move and any(by_id[i].get("locked") for i in chosen):
        raise ValueError("Unlock the items first, or copy them instead of moving them.")
    items = [copy.deepcopy(item) for item in source["items"] if item["id"] in chosen]
    left = min(item["x"] for item in items)
    top = min(item["y"] for item in items)
    for item in items:
        item["x"] -= left - 80
        item["y"] -= top - 80
        if item.get("parent_id") not in chosen:
            item["parent_id"] = None
    connections = [copy.deepcopy(c) for c in source.get("connections", []) if c.get("from") in chosen and c.get("to") in chosen]
    board = copy.deepcopy(source)
    board.update(title=(title.strip() or f"{source['title']} selection")[:200], items=items, connections=connections, viewport={"x": 0, "y": 0, "zoom": 1})
    settings = board.get("settings")
    if isinstance(settings, dict):
        settings.pop("window", None)
    created = store.open_import(board, {"source_format": "formref-selection", "source_board": board_id, "moved": bool(move), "item_count": len(items)})
    result = {"board_id": created["board"]["id"], "state": created, "count": len(items)}
    if move:
        result["source"] = store.mutate(board_id, command={"type": "remove", "ids": sorted(chosen)})
    return result
