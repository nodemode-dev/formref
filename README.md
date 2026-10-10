<p align="center"><img src="assets/formref-mark.svg" width="96" alt="FormRef"></p>
<h1 align="center">FormRef</h1>
<p align="center"><b>Reference boards for images, ideas & creative work.</b></p>
<p align="center"><img alt="version" src="https://img.shields.io/badge/version-v0.0.0-f97316"> <img alt="license" src="https://img.shields.io/badge/license-Apache--2.0-blue"> <img alt="stack" src="https://img.shields.io/badge/engine-Rust-orange"></p>

FormRef is a local reference workspace in the Form family. Collect images & files, arrange them on a free canvas, add notes & tasks, connect ideas, organize boards, then export or control the same workspace through MCP.

Rust document engine · vanilla TypeScript/Vite view · Python/FastAPI media & persistence · optional Tauri development shell.

## Highlights

- **One engine:** Rust commands own geometry, locking, grouping, arrangement & undo/redo.
- **Reference media:** original assets, nondestructive crop, flip, grayscale & opacity controls.
- **Organization:** notes, tasks, links, columns, nested board cards & connectors.
- **Local persistence:** named boards & managed media saved on disk.
- **Interoperability:** iStack import, portable archives & PNG/SVG/Markdown/JSON export.
- **Agent access:** official Python MCP SDK stdio server w/ tools, resources & prompts.
- **Form family UI:** Studio Dark tokens, orange accent, inline SVG icons & stable keyed item views.

## Quick Start

Requirements: Node 20.19.x or 22.12+, Python 3.12+, Rust/Cargo 1.82+. A native desktop shell additionally needs Rust 1.90+ and the platform's [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). SVG-to-PNG export uses [CairoSVG's native Cairo/libffi prerequisites](https://cairosvg.org/documentation/); other formats can run without native Cairo.

macOS/Linux:

```bash
./formref install
./formref
```

Windows:

```bat
formref_oc_install.bat
formref.bat
```

| Service | URL | Notes |
|---|---|---|
| Editor dev | http://localhost:5196 | Vite, loopback only |
| Backend | http://127.0.0.1:8196 | API & built frontend |
| API docs | http://127.0.0.1:8196/docs | Live API schema |
| MCP | stdio | `./formref mcp` |

Build & serve the frontend from one local service:

```bash
./formref build
./formref serve
```

Then open http://127.0.0.1:8196.

## MCP

`.mcp.json`, `.cursor/mcp.json` & `.codex/config.toml` run the root launcher. Start from the repository root. For clients using another working directory, replace the relative command w/ an absolute path to `formref`. On Windows, configure command `cmd` with arguments `/c`, `C:\path\to\formref\formref.bat`, `mcp`. The server uses the same local API as the editor. SDK line v1 is pinned intentionally for FastMCP compatibility; this is an actual protocol transport, w/ no cloud credentials required.

## Configuration

Set environment variables before launch; local environment files must remain uncommitted.

| Variable | Purpose |
|---|---|
| FORMREF_DATA_DIR | Override local board/asset storage |
| FORMREF_API_URL | MCP's loopback service URL |
| FORMREF_PYTHON | Override launcher Python executable |
| FORMREF_ENGINE_PATH | Override Rust engine executable |
| FORMREF_MCP_IMPORT_DIR | Restrict MCP path imports to this directory; default `~/.formref/imports` |

## Architecture

| Path | Role |
|---|---|
| frontend/ | Editor, stable DOM, gestures & theme |
| backend/app/ | HTTP, assets, imports/exports, persistence & MCP |
| native/formref-core/ | UI-independent board semantics & history |
| src-tauri/ | Optional native development shell |
| .claude/skills/formref-harness/ | Routed project development instructions |
| .docs/wiki/ | Usage, subsystem & release guides |
| docs/ | Contracts, sources, parity & verification |

## Status

This is the first FormRef build. Read `docs/PARITY.md` for row-level capabilities & gaps. Cloud collaboration, protected sharing, tables/formulas, synced notes, browser extensions, background removal & full proprietary project-format compatibility are separate gaps. Native shell sources are provided; compiled, signed macOS/Windows installers are not included.

The planning sidecar contains the roadmap, build record, independent TEST_PLAN & release ledger. No self-authored test suite is included. Current executed verification is in `docs/VERIFICATION.md`.

## Development

Work on `main`; see [.docs/BRANCHING.md](.docs/BRANCHING.md). Read [CLAUDE.md](CLAUDE.md) & the project harness before changes. The repository logo is documentation artwork; frontend runtime assets live in `frontend/public/`.

## Contributors

| Contributor | Role |
|---|---|
| nodemode-ai / mackin@nodemode.ai | Owner & commit identity |

## Licensing

Apache-2.0. See [LICENSE](LICENSE) & [LICENSES.md](LICENSES.md) for dependency notices. The user's iStack format & FormVis design conventions were studied under their supplied permissions. No BeeRef code is included.
