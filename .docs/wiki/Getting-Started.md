# Getting Started

From the extracted `formref/` root, run:

```bash
./formref install
./formref doctor
./formref dev
```

Open the frontend at `http://localhost:5320`. The backend is `http://127.0.0.1:8320`; `/api/health` confirms it is responding. Both services bind loopback. Use `./formref help` for current commands and `./formref build` before production serving or packaging.

The toolchain needs Node/npm, Python and Rust/Cargo. The repository dispatcher coordinates them; an installation failure should identify its specific missing dependency. Do not assume an installer for another Form app provides this project's engine or Python environment.

With no board open FormRef shows Home: create a board, open a board file, or open one of the three demo boards or the starter board (each opens as a new board). FormRef does not create a board by itself, and closing the last tab returns to Home.

Drop or import images, create content from the board toolbar, then select items to transform or edit the inspector. Changes pass through the Rust engine and persist automatically; use Undo/Redo to reverse a board operation. Export a portable package to move the board with its media.

For agent editing, keep the backend running and register the absolute repository command `formref mcp` as a stdio MCP server in the client. The repository skill teaches the workflows after the server is connected. [MCP](MCP.md) covers setup and recovery.

This release's platform/build validation is reported in its planning sidecar and release notes. Source support and a working Linux browser build do not imply that native macOS or Windows installers were compiled. `./build_app` (or `build_app.bat`) makes the installers on the computer it runs on; the installed app starts its own engine, so `./formref serve` is not needed beside it.
