import json
import re

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from ..core.config import settings
from ..core.store import store

router = APIRouter(prefix="/api")

MAX_SHARED = 48
COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")
IDENT = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


class SharedSearch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    text: str = ""
    kind: str = ""
    color: str | None = None
    tolerance: float | None = None
    tags: list[str] = Field(default_factory=list)
    label_names: list[str] = Field(default_factory=list)


class SharedSearches(BaseModel):
    searches: list[SharedSearch] = Field(default_factory=list)


def _limit(value: str, field: str, size: int):
    if len(value.encode("utf-8")) > size:
        raise ValueError(f"{field} is longer than {size} bytes.")


def _check(search: SharedSearch):
    if not IDENT.fullmatch(search.id):
        raise ValueError("A shared search id must be letters, digits, - or _.")
    if not search.name.strip():
        raise ValueError("A shared search needs a name.")
    _limit(search.name, "name", 60)
    _limit(search.text, "text", 200)
    if search.kind and not (IDENT.fullmatch(search.kind) and len(search.kind) <= 32):
        raise ValueError("kind is not a known item kind.")
    if search.color is not None and not COLOR.fullmatch(search.color):
        raise ValueError("color must be #RRGGBB.")
    if search.tolerance is not None and not 1 <= search.tolerance <= 100:
        raise ValueError("tolerance must be between 1 and 100.")
    if len(search.tags) > 12 or len(search.label_names) > 12:
        raise ValueError("A saved search can hold at most 12 tags and 12 labels.")
    for tag in search.tags:
        if not tag.strip():
            raise ValueError("tags cannot hold an empty tag.")
        _limit(tag, "tag", 60)
    for name in search.label_names:
        if not name.strip():
            raise ValueError("label_names cannot hold an empty name.")
        _limit(name, "label name", 40)
    if not (search.text.strip() or search.kind or search.color or search.tags or search.label_names):
        raise ValueError("A shared search needs text, a kind, a color, a tag or a label.")


def read_shared() -> list[dict]:
    try:
        saved = json.loads((settings.data_dir / "searches.json").read_text(encoding="utf-8"))
        return SharedSearches.model_validate(saved).model_dump(exclude_defaults=True)["searches"]
    except (OSError, ValueError):
        return []


@router.get("/searches")
def get_shared():
    return {"searches": read_shared()}


@router.put("/searches")
def put_shared(body: SharedSearches):
    if len(body.searches) > MAX_SHARED:
        raise ValueError(f"FormRef can keep at most {MAX_SHARED} searches for all boards.")
    ids, names = set(), set()
    for search in body.searches:
        _check(search)
        if search.id in ids or search.name.strip().lower() in names:
            raise ValueError("Shared searches need different ids and names.")
        ids.add(search.id)
        names.add(search.name.strip().lower())
    searches = body.model_dump(exclude_defaults=True).get("searches", [])
    store.atomic_write(settings.data_dir / "searches.json", json.dumps({"searches": searches}, ensure_ascii=False).encode())
    return {"searches": searches}
