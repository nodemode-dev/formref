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

Missing iStack images retain source metadata for recovery and remain visible as missing media. Select the image and use Relink to register its original file, or update the registered asset through the API/MCP. Crop coordinates from iStack are converted from displayed item pixels into normalized source fractions. Check migration results and retained unsupported metadata before considering it complete.

PureRef and BeeRef were studied as feature references. Proprietary/native `.pur` and `.bee` compatibility should not be inferred from iStack support; see parity evidence for the current status.

Notes and documents export their complete authoritative source in JSON/portable packages and Markdown; raw HTML is escaped for safe Markdown output. The bounded rendered subset supports headings, lists, strong/emphasis and absolute HTTP(S) links. PNG/SVG render within each card's geometry and at most 4,096 source lines, so a long focused document's entire text is not reproduced in a small canvas card. Font glyph coverage depends on installed exporter fonts. Swatches export their canonical color and readable HEX/RGB/HSV values. The image sampler reports original source pixels, independent of opacity/grayscale preview; animations are sampled at frame zero.

Keywords in picture files (v0.14.0): when a picture is stored, FormRef reads XMP `dc:subject` (from the first XMP packet in the file, with DTDs and entities refused), IPTC keywords (record 2, dataset 25) and the Windows Tags field (EXIF XPKeywords), keeps up to 32 of at most 60 characters each, once ignoring case, and records them with the asset as `keywords`. New image items from the window, the clipper, web capture, `./formref import` and the MCP `capture_from_web` tool get them as `data.tags`. SVG files are not read for keywords.

Tags in exports (v0.13.0): an item's board labels and tags travel as one list, labels first, each once ignoring case. Markdown adds a "Tags:" line under the item; SVG puts them on the item's group as a `data-tags` JSON array, which other SVG readers ignore; a one-page-per-item PDF prints the item's title and tags in the bottom margin; the phone viewer shows a row of tag chips under its title, and tapping chips dims every picture that does not carry all of them.
