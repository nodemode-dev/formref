import ast
import asyncio
import json
from pathlib import Path

from .agent.service import MOVES

BACKEND = Path(__file__).resolve().parent
ROOT = BACKEND.parents[1]
PATH = ROOT / "agents" / "manifest.json"
SKILLS = ROOT / ".claude" / "skills"
GATED_TYPES = frozenset({"remove", *MOVES})
DOCK = {"present": True, "positions": ["bottom"], "tabs": ["chat", "terminal", "claude"]}


def _strings(function: ast.AST) -> list[str]:
    docstring = function.body[0].value if isinstance(function.body[0], ast.Expr) and isinstance(function.body[0].value, ast.Constant) else None
    found = []
    for node in ast.walk(function):
        if node is docstring:
            continue
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            found.append(node.value)
        elif isinstance(node, ast.JoinedStr):
            found.append("".join(part.value if isinstance(part, ast.Constant) else "{}" for part in node.values))
    return found


def _calls(function: ast.AST) -> set[str]:
    return {node.func.id for node in ast.walk(function) if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)}


def approval_gated(names: list[str]) -> list[str]:
    """Tools whose calls can wait for the person's Allow: those that send a command type the gate asks about, and those that run a window command."""
    tree = ast.parse((BACKEND / "mcp_server.py").read_text(encoding="utf-8"))
    functions = {node.name: node for node in tree.body if isinstance(node, ast.AsyncFunctionDef)}
    gated = []
    for name in names:
        strings = _strings(functions[name])
        sends_command = "command" in _calls(functions[name]) and GATED_TYPES & set(strings)
        runs_window_command = any(text.startswith("/api/commands/") and text.endswith("/run") for text in strings)
        if sends_command or runs_window_command:
            gated.append(name)
    return gated


def mcp_section() -> dict:
    from . import mcp_server
    tools = asyncio.run(mcp_server.mcp.list_tools())
    names = [tool.name for tool in tools]
    transports = [name for name, present in (("stdio", 'transport="stdio"' in (BACKEND / "mcp_server.py").read_text(encoding="utf-8")), ("http", "streamable_http_app()" in (BACKEND / "main.py").read_text(encoding="utf-8"))) if present]
    return {"tools": names, "read_only": [tool.name for tool in tools if tool.annotations and tool.annotations.readOnlyHint], "approval_gated": approval_gated(names), "transports": transports}


def skills_section() -> list[dict]:
    return [{"name": folder.name, "sub_skills": [sub.parent.name for sub in sorted(folder.glob("sub-skills/*/SUB-SKILL.md"))]} for folder in sorted(SKILLS.iterdir()) if (folder / "SKILL.md").is_file()]


def manifest() -> dict:
    return {"format": "form-agent-manifest", "version": 1, "app": "formref", "mcp": mcp_section(), "skills": skills_section(), "dock": DOCK, "extensions": None}


def text() -> str:
    return json.dumps(manifest(), indent=2, ensure_ascii=False) + "\n"
