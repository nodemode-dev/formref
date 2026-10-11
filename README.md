<p align="center"><img src="assets/formref-mark.svg" width="96" alt="FormRef"></p>
<h1 align="center">FormRef</h1>
<p align="center"><b>Reference boards for images, ideas & creative work.</b></p>
<p align="center"><img alt="version" src="https://img.shields.io/badge/version-v0.5.1-f97316"> <img alt="license" src="https://img.shields.io/badge/license-Apache--2.0-blue"> <img alt="stack" src="https://img.shields.io/badge/engine-Rust-orange"></p>

FormRef is a local reference workspace in the Form family. Collect images & files, arrange them on a free canvas, add notes & tasks, connect ideas, organize boards, then export or control the same workspace through MCP.

Rust document engine · vanilla TypeScript/Vite view · Python/FastAPI media & persistence · optional Tauri development shell.

## Highlights

- **One engine:** Rust commands own geometry, locking, grouping, arrangement & undo/redo.
- **Reference media:** original assets, nondestructive crop, flip, per-image and canvas grayscale, opacity controls and ordered reference presentation.
- **Canvas workflow:** persistent grid preferences, snapping with shared-engine undo, explicit pack and distribution spacing.
- **Reference editing:** source-pixel RGBA/RGB/HSV/HEX capture, editable swatches, bounded formatted notes & focused documents with guarded draft saves.
- **Local persistence:** named boards & managed media saved on disk.
- **Interoperability:** iStack import, portable archives & PNG/SVG/Markdown/JSON export.
- **iStack's right-click menu:** File, Edit, Canvas, Organize, Images & Layer in iStack's order & shortcuts, plus Insert & Ask Agent. Press ? for every shortcut.
- **Board tabs:** several boards open at once, restored where you left them.
- **Trash:** deleted boards and removed items wait in the Trash until you empty it; restore puts them back.
- **Your keys:** change any shortcut from the shortcut sheet (?).
- **Synced notes & maps:** linked copies of a note that change together; Google Maps and OpenStreetMap links as map cards.
- **GIF frames & document export:** pause, step, scrub and keep GIF frames; export any document as PDF, Word, Markdown or text.
- **Video, audio & tables:** playable video and audio cards, YouTube, Vimeo, Spotify and SoundCloud players, and table cards with typed columns and formulas.
- **Background removal:** make a plain background transparent with one click, keep the original and restore it any time.
- **Browser clipper:** a Chrome and Firefox extension in `clipper/` saves images, selected text, links and pages to your board, paired by a token from Preferences.
- **Labels & web images:** coloured board labels on any item; drag, paste or fetch images and pages from the web.
- **Comments & templates:** comment threads on any item, resolved or reopened; start boards from starters or your own templates.
- **Organize & draw:** pack, sort by name, aspect or colour similarity, rotate 90, opacity, pixel art, brush, eraser, rectangle, circle & line.
- **Embedded agent:** Agent panel (Ctrl+J) running Claude Code, Codex, Cursor or Ollama on your board, each tool call shown, a yes from you before it removes or bulk-moves items, Stop & Undo This Turn. Vision models can see the board as a picture.
- **Agent access:** official Python MCP SDK stdio server; outside agents edit only once you allow them.
- **Form family UI:** Studio Dark tokens, orange accent, collapsible side panels, one icon per action & stable keyed item views.

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

`.mcp.json`, `.cursor/mcp.json` & `.codex/config.toml` run the root launcher. Outside agents are refused until you allow them in the Agent panel; FormRef asks the first time one tries. Codex reads the project config only after you trust the folder in Codex. Start from the repository root. For clients using another working directory, replace the relative command w/ an absolute path to `formref`. On Windows, configure command `cmd` with arguments `/c`, `C:\path\to\formref\formref.bat`, `mcp`. The server uses the same local API as the editor. SDK line v1 is pinned intentionally for FastMCP compatibility; this is an actual protocol transport, w/ no cloud credentials required.

## Configuration

Set environment variables before launch; local environment files must remain uncommitted.

| Variable | Purpose |
|---|---|
| FORMREF_DATA_DIR | Override local board/asset storage |
| FORMREF_API_URL | MCP's loopback service URL |
| FORMREF_PYTHON | Override launcher Python executable |
| FORMREF_ENGINE_PATH | Override Rust engine executable |
| FORMREF_MCP_IMPORT_DIR | Restrict MCP path imports to this directory; default `~/.formref/imports` |
| FORMREF_CAPTURE_ALLOW_PRIVATE | Set to 1 only for testing: lets web capture fetch local and private-network addresses |

## Architecture

| Path | Role |
|---|---|
| frontend/ | Editor, stable DOM, gestures & theme |
| backend/app/ | HTTP, assets, imports/exports, persistence & MCP |
| native/formref-core/ | UI-independent board semantics & history |
| src-tauri/ | Optional native development shell |
| .claude/skills/formref-harness/ | Routed project development instructions |
| .docs/wiki/ | Usage, engine contract, shell, agent & release guides |
| clipper/ | Browser clipper extension (Chrome, Firefox) |
| licenses/ | Third-party licence texts |

## Status

FormRef covers the PureRef image-board core and Milanote's cards, columns, tasks, tables, links, maps, synced notes and nested boards, behind iStack's menu, with an embedded agent. Background removal works on plain backgrounds without a model; photos with busy or blending backgrounds are refused until a segmentation model is chosen. Cloud collaboration and protected sharing remain gaps; the browser clipper loads unpacked (no store-signed build). The desktop shell (`./formref desktop`) adds always-on-top, always-on-bottom, frameless, fullscreen, window opacity and click-through windows; it was compiled and run on Linux, while compiled, signed macOS/Windows installers are not included. Codex, Cursor & Ollama runners are implemented but were not available on the build machine, so only Claude Code has been run end to end.

Planning, research and parity data live in the planning sidecar, outside this repository; the FormRef tab of the FormAI parity matrix is rendered from it each release. No self-authored test suite is included.

## Development

Work on `main`; see [release conventions](.docs/wiki/Releases.md). Read [CLAUDE.md](CLAUDE.md) & the project harness before changes. The repository logo is documentation artwork; frontend runtime assets live in `frontend/public/`.

## Contributors

| Contributor | Role |
|---|---|
| nodemode-ai / mackin@nodemode.ai | Owner & commit identity |

## Licensing

Apache-2.0. See [LICENSE](LICENSE) & [NOTICE.md](NOTICE.md) for dependency and font notices. The user's iStack format & FormVis design conventions were studied under their supplied permissions. No BeeRef code is included.
