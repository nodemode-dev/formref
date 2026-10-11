---
name: persistence
description: FormRef's storage, assets, import and export. Load for saving or reopening boards, missing or relinked images, iStack or portable .formref import, PNG, SVG, Markdown or JSON export, similarity features, or the open-tabs session.
---

# Persistence

## Map

| File | Holds |
| --- | --- |
| `backend/app/core/store.py` | atomic board writes, revision guard, asset import with SHA-256 identity, SVG safety, the engine hand-off |
| `backend/app/core/imports.py` | portable `.formref` archives and iStack `.istack` files |
| `backend/app/core/exports.py` | portable, JSON, PNG, SVG and Markdown exports |
| `backend/app/core/features.py` | colour and layout vectors for similarity sort, cached on the asset |
| `backend/app/core/media.py`, `sampling.py` | decoding original pixels, colour sampling |
| `backend/app/routers/agent.py` | `/api/session`: open tabs and the active tab; `/api/preferences`: shortcut overrides |
| `store.py` trash methods, `/api/trash` routes in `routers/boards.py` | deleted boards and groups of removed items, restore and purge |
| `backend/app/core/capture.py` | web capture with per-hop address checks and the connection pinned to the checked address (`pinned`); never loosen `checked_url`, `resolve` or the pinning without the owner |
| `backend/app/core/templates.py` | four built-in templates as code, saved templates in `templates/`, fresh ids on use |
| `routers/boards.py` comment routes | comment threads written as one guarded `update` of `data.comments` |

Data lives in `FORMREF_DATA_DIR` (default `~/.formref/data`): `boards/`, `assets/` (`[sha].blob` plus `[sha].json`), `trash/boards/`, `trash/items/[board].json` (last 100 removals per board), `agent.json`, `session.json`, `preferences.json`.

## Trash

Deleting a board moves its record to `trash/boards/` with `deleted_at`. Any applied command containing `remove` diffs the stored board against the new state in `store.mutate` and appends the removed items and connections as one entry; a failure there never undoes the saved edit. Restoring items is one `batch` (add, then connect) so it is one undo step; items already back are skipped, and a parent that no longer exists is cleared. Undo and redo do not write trash entries.

## iStack import

iStack saves `{format: "istack", version: "1.1", canvasRect, zoom, panX, panY, gridMode, gridSize, grayscaleCanvas, bgColor, drawings, nextId, nextZ, items}`; images carry `flipH`, `flipV`, `grayscale`, `nearestNeighbor`, `opacity`, `rotation`, `cropRect`, `groupId`, `locked`, `_imageData` (a data URL) and `_sourcePath`; drawings carry `tool`, `color`, `size`, `points`, `startPos`. The importer maps all of these. An image without `_imageData` arrives unresolved and relinkable; eraser drawings, which subtract raster pixels in iStack, are listed as unsupported in the import report rather than dropped. The `cropRect` unit is not certain from the bundle; treat imported crops as unverified.

## Rules

Original bytes are never rewritten. A failed write restores the engine's previous board. New stored data keys get engine validation (engine specialist) before the UI writes them.
