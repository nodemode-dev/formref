from typing import Any
from pydantic import BaseModel, Field

class CreateBoard(BaseModel):
    title: str = Field(default="Untitled board", max_length=200)

class BoardCommand(BaseModel):
    command: dict[str, Any]
