# Files

FormRef persists local boards and registered original assets through FastAPI. The default data location is `~/.formref/data`; set `FORMREF_DATA_DIR` to use another folder. The Rust executable defaults to `native/formref-core/target/release/formref-core` (`.exe` on Windows); override it with `FORMREF_ENGINE_PATH`. Keep user boards and caches outside the repository.

| Output | Purpose | Limit |
| --- | --- | --- |
| Portable `.formref` package | Move board and registered original assets together | Missing source bytes still require relinking |
| JSON | Inspect or exchange the board model | Geometry alone is not an asset-complete portable board |
| PNG | Raster board image | Check rendered content and exporter size bounds |
| SVG | Vector board composition | Review font/media portability and renderer-specific support |
| Markdown | Editable board text and references | Does not reproduce the canvas layout |

Import maps a portable package into a new board. Inspect image count, transforms and asset availability after importing, then reopen it after restart to verify durability. Archive extraction must validate paths and limits before writing files.

The owned iStack JSON format is supported as a migration input. It uses `format: istack`, version 1.1, numeric item IDs, center rotations, image/note item records and separate drawing records. Embedded `_imageData` can supply actual image bytes. NodeMode-hosted iStack may instead contain only `_sourcePath` values such as `istacks/project/file`; those records cannot reconstruct absent DAM files.

Missing iStack images retain source metadata for recovery and remain visible as missing media. This initial build does not yet provide a dedicated relink dialog. Preserve the original DAM files, import actual source files and update the relevant asset references through the API or MCP when available. Crop coordinates from iStack are converted from displayed item pixels into normalized source fractions. Check migration results and retained unsupported metadata before considering it complete.

PureRef and BeeRef were studied as feature references. Proprietary/native `.pur` and `.bee` compatibility should not be inferred from iStack support; see parity evidence for the current status.
