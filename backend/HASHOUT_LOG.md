# Backend hashout log

## Navigation

- [FormRef root](../README.md)
- [Subsystem contract](../docs/CONTRACT.md)
- [Architecture](../.docs/wiki/Architecture.md)

## Contents

- [v0.1.0 · Local board service and SDK MCP](#v010--local-board-service-and-sdk-mcp)
- [boot_backend.bat](#boot_backendbat)

## v0.1.0 · Local board service and SDK MCP

The backend controls storage and export while the decoupled Rust process controls document validation, geometry and history. One persistent JSON-lines process is shared by all API requests, protected by serialized access. A restarted engine reopens saved documents; history is service-session state and is deliberately not fabricated after a restart. Failed disk persistence restores the last durable document before surfacing the original storage error.

| Module | Responsibility |
| --- | --- |
| `app/main.py` | FastAPI service, loopback client/Host/Origin checks, explicit errors, capabilities and production frontend serving |
| `app/core/config.py` | Product version, operator-controlled data path, engine binary and memory/size limits |
| `app/core/engine.py` | Persistent Rust subprocess, strict response IDs, serialized protocol and shutdown |
| `app/core/store.py` | Atomic board and asset writes, board copy/delete, SHA-256 asset deduplication, safe image registration |
| `app/core/imports.py` | Portable archive integrity checks and independently authored iStack data migration |
| `app/core/exports.py` | Real PNG/SVG composition, portable archives, JSON snapshots and standalone Markdown |
| `app/core/extensions.py` | Explicit importer/exporter/capability registration seam |
| `app/routers/boards.py` | Board actions, uploads, missing-reference relinking, download routes and SSE revisions |
| `app/models/requests.py` | Typed board creation and command envelopes |
| `app/mcp_server.py` | Official Python SDK stdio tools/resources/prompt using the same live loopback API |
| `oc_install`, `oc_install.bat` | Isolated dependency installation with macOS unpinned membership parity |
| `boot_backend`, `boot_backend.bat` | Loopback FastAPI development startup |

Uploaded names never determine a filesystem location. Assets use SHA-256 identifiers; archive assets are read by exact manifest identifiers and are never extracted. A location-only iStack file records its missing source path and renders an explicit placeholder until the user relinks it. Blob URLs do not count as portable data. Imported unsupported iStack records remain in `import_report` and in subsequent portable exports.

Images retain original bytes. PNG composition crops source pixels, applies flips and grayscale, scales with the chosen sampling mode, rotates around the item center and composites opacity. Drawings use item-local points. SVG composition embeds prepared image data and preserves vector board drawings/text. PNG output uses scale 1 when within 8192 pixels per edge and 32 megapixels; larger boards are uniformly scaled and expose the actual scale in `X-FormRef-Scale`. Animated images export their first frame. Native archives preserve their original animation bytes.

SVG ingestion uses defusedxml and rejects entities, declarations, active elements, event attributes, external href/src, XML base, CSS escapes and every nonlocal URL reference. CairoSVG receives bytes only, with `unsafe=False` and a URL fetcher that rejects retrieval. This module is installed independently as a server dependency, not vendored or folded into proprietary code. Its LGPL-3.0-or-later license was checked in [upstream metadata](https://github.com/Kozea/CairoSVG/blob/main/setup.cfg). CairoSVG is imported only when rasterizing an SVG asset. A missing system libCairo returns an actionable export error while PNG/JPEG and other Pillow-based workflows remain available; macOS requires `brew install cairo`, and Windows requires a compatible libCairo runtime.

The MCP process auto-starts the same API only when absent, and terminates only the child it owns. Logs go to stderr, leaving stdio protocol output clean. `FORMREF_API_URL` accepts only a loopback HTTP origin. `import_asset` accepts bounded base64 or a file beneath operator-configured `FORMREF_MCP_IMPORT_DIR`; it never reads an arbitrary client path. Tool calls preserve actual HTTP errors. A missing board yields an MCP error, not a success record.

The macOS dependency file keeps bare package names except `mcp<2`. This narrow compatibility bound preserves the v1 FastMCP API used by the build, following the SDK's [v1 documentation](https://py.sdk.modelcontextprotocol.io/v1/). `app/core/builtins.py` registers the real project importer and all five export handlers. HTTP routes dispatch through that registry, and capabilities derive their export list from registration.

Observed manual verification: Python compilation; real Rust-backed HTTP create/add and all five exports; iStack import including a missing DAM source, normalized crop/flip/half-opacity, editable drawing and note; portable roundtrip; multipart relink; SVG raster composition; script/external SVG rejection and external-Origin rejection. An official SDK client negotiated protocol `2025-11-25`, listed 14 tools, read both resource forms, fetched the organization prompt, mutated a persisted board, generated PNG and received a true missing-board tool error. No test files or test scripts were authored. Shell installers/boot scripts passed syntax checking; Windows and macOS execution is not claimed.

## boot_backend.bat

### boot_backend.bat · interpreter selection

- refers-to: boot_backend.bat :: PYTHON_BIN and uvicorn launch
- kind: rationale
- logged: v0.1.0 · 2026-10-10

The default Python executable is an absolute path to this backend's venv. FORMREF_PYTHON overrides it, matching the Unix launcher. A missing executable produces an installation instruction. Invoking the venv interpreter directly makes activation unnecessary. Every selected executable path is quoted. Windows execution remains unverified because this host has no cmd or PowerShell runtime.
