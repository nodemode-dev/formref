from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from ..core import clipper

router = APIRouter(prefix="/api/clip")

TOKEN_HEADER = "x-formref-clip-token"


def refused():
    return JSONResponse(status_code=401, content={"detail": "This clipper is not paired with FormRef. Copy the token from FormRef's Preferences into the clipper's options.", "code": "not_paired"})


# Token routes serve FormRef's own page only: the middleware refuses extension origins on them.
@router.get("/token")
def get_token():
    return {"token": clipper.token()}


@router.post("/token/reset")
def reset_token():
    return {"token": clipper.token(reset=True)}


@router.get("/boards")
def boards(request: Request):
    if not clipper.paired(request.headers.get(TOKEN_HEADER)):
        return refused()
    return clipper.boards()


@router.post("", status_code=201)
async def clip(request: Request, body: dict):
    if not clipper.paired(request.headers.get(TOKEN_HEADER)):
        return refused()
    return await clipper.clip(body)
