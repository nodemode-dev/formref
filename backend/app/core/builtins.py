from functools import partial
from .exports import export_board
from .imports import import_project
from .extensions import registry

registry.register_importer("project", import_project)
for format in ("portable", "json", "png", "svg", "markdown"):
    registry.register_exporter(format, partial(export_board, format=format))
