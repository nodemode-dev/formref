from fastapi import APIRouter, HTTPException, Request

from ..core import window_key

router = APIRouter(prefix="/api/window", tags=["window"])


@router.post("/key")
def claim_window_key():
    if window_key.stdout_mode():
        raise HTTPException(status_code=404, detail="Not Found")
    key = window_key.claim()
    if key is None:
        raise HTTPException(status_code=409, detail="Another window already holds this engine's window key; use that window, or restart FormRef.")
    return {"key": key}


@router.post("/ticket")
def window_ticket(request: Request):
    window_key.require(request)
    return {"ticket": window_key.ticket()}
