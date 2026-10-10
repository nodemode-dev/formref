from dataclasses import dataclass
from typing import Callable

@dataclass(frozen=True)
class Capability:
    id: str
    title: str
    description: str

class ExtensionRegistry:
    def __init__(self):
        self.capabilities = {}
        self.importers = {}
        self.exporters = {}

    def register_capability(self, capability: Capability):
        if capability.id in self.capabilities:
            raise ValueError("Capability identifier is already registered.")
        self.capabilities[capability.id] = capability

    def register_importer(self, name: str, handler: Callable):
        if name in self.importers:
            raise ValueError("Importer identifier is already registered.")
        self.importers[name] = handler

    def register_exporter(self, name: str, handler: Callable):
        if name in self.exporters:
            raise ValueError("Exporter identifier is already registered.")
        self.exporters[name] = handler

    def describe(self):
        return [{"id": entry.id, "title": entry.title, "description": entry.description} for entry in self.capabilities.values()]

registry = ExtensionRegistry()
for identifier, title, description in (
    ("rust-board-engine", "Rust document engine", "Validated commands, atomic batches, geometry and 100-step session undo/redo."),
    ("persistent-local-boards", "Persistent local projects", "Atomic JSON storage and content-addressed registered assets outside the source tree."),
    ("portable-projects", "Portable projects", "Version 1 manifest and SHA-256 checked embedded assets in .formref ZIP archives."),
    ("istack-import", "iStack project import", "Embedded images, notes, editable drawings, transformations and explicit unresolved DAM sources."),
    ("composited-exports", "Board exports", "PNG raster composition, SVG scene composition, standalone Markdown and JSON snapshots."),
    ("sdk-mcp", "Official SDK MCP", "SDK stdio tools, resources and prompts call the shared loopback service."),
    ("revision-events", "Live local revision events", "HTTP and agent mutations persist and notify the open editor over SSE."),
):
    registry.register_capability(Capability(identifier, title, description))
